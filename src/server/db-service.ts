import { db } from '../db/index.ts';
import {
  users,
  categories,
  suppliers,
  products,
  stockMovements,
  inventorySessions,
  inventoryItems,
  auditLogs,
  goodsReturns,
} from '../db/schema.ts';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

// Helper to generate unique serial numbers
export function generateMovementNumber(type: 'IN' | 'OUT' | 'ADJUSTMENT'): string {
  const prefix = type === 'IN' ? 'ENT' : type === 'OUT' ? 'SOR' : 'REG';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomPart}`;
}

export function generateSessionNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomPart}`;
}

// Log audit action
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  userId?: number,
  userEmail?: string
) {
  try {
    await db.insert(auditLogs).values({
      action,
      entityType,
      entityId,
      details,
      userId: userId || null,
      userEmail: userEmail || null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// ----------------- DASHBOARD -----------------
export async function getDashboardStats() {
  try {
    // Total active product references
    const activeProducts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        minStockThreshold: products.minStockThreshold,
        purchasePrice: products.purchasePrice,
        unit: products.unit,
        isArchived: products.isArchived,
      })
      .from(products)
      .where(eq(products.isArchived, false));

    const totalReferences = activeProducts.length;
    let totalStockQuantity = 0;
    let totalStockValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const replenishmentList: typeof activeProducts = [];

    for (const p of activeProducts) {
      totalStockQuantity += p.currentStock;
      totalStockValuation += p.currentStock * p.purchasePrice;

      if (p.currentStock === 0) {
        outOfStockCount++;
        replenishmentList.push(p);
      } else if (p.currentStock <= p.minStockThreshold) {
        lowStockCount++;
        replenishmentList.push(p);
      }
    }

    // Today's movements
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMovements = await db
      .select()
      .from(stockMovements)
      .where(gte(stockMovements.createdAt, today));

    let entriesToday = 0;
    let exitsToday = 0;
    for (const m of todayMovements) {
      if (m.movementType === 'IN') entriesToday += m.quantity;
      if (m.movementType === 'OUT') exitsToday += m.quantity;
    }

    // Last 10 movements with product details
    const recentMovements = await db
      .select({
        id: stockMovements.id,
        movementNumber: stockMovements.movementNumber,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        stockBefore: stockMovements.stockBefore,
        stockAfter: stockMovements.stockAfter,
        reason: stockMovements.reason,
        recipient: stockMovements.recipient,
        userEmail: stockMovements.userEmail,
        createdAt: stockMovements.createdAt,
        productName: products.name,
        productSku: products.sku,
        unit: products.unit,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(10);

    // Chart: Movements over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const pastWeekMovements = await db
      .select({
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .where(gte(stockMovements.createdAt, sevenDaysAgo));

    const chartMap: Record<string, { date: string; entries: number; exits: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      chartMap[key] = { date: key, entries: 0, exits: 0 };
    }

    for (const m of pastWeekMovements) {
      if (!m.createdAt) continue;
      const key = new Date(m.createdAt).toISOString().slice(5, 10);
      if (chartMap[key]) {
        if (m.movementType === 'IN') chartMap[key].entries += m.quantity;
        if (m.movementType === 'OUT') chartMap[key].exits += m.quantity;
      }
    }

    return {
      totalReferences,
      totalStockQuantity,
      totalStockValuation,
      lowStockCount,
      outOfStockCount,
      entriesToday,
      exitsToday,
      recentMovements,
      replenishmentList: replenishmentList.slice(0, 15),
      chartData: Object.values(chartMap),
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Impossible de charger les données du tableau de bord.', { cause: error });
  }
}

// ----------------- PRODUCTS -----------------
export async function getProducts(filters?: {
  search?: string;
  categoryId?: number;
  status?: 'all' | 'available' | 'low_stock' | 'out_of_stock';
  isArchived?: boolean;
}) {
  try {
    const list = await db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        brand: products.brand,
        description: products.description,
        purchasePrice: products.purchasePrice,
        sellingPrice: products.sellingPrice,
        currentStock: products.currentStock,
        minStockThreshold: products.minStockThreshold,
        unit: products.unit,
        location: products.location,
        isArchived: products.isArchived,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.id));

    return list.filter((p) => {
      // Archive filter
      const archivedMatch = filters?.isArchived !== undefined ? p.isArchived === filters.isArchived : !p.isArchived;
      if (!archivedMatch) return false;

      // Category filter
      if (filters?.categoryId && p.categoryId !== filters.categoryId) {
        return false;
      }

      // Status filter
      if (filters?.status === 'available' && p.currentStock <= p.minStockThreshold) {
        return false;
      }
      if (filters?.status === 'low_stock' && (p.currentStock === 0 || p.currentStock > p.minStockThreshold)) {
        return false;
      }
      if (filters?.status === 'out_of_stock' && p.currentStock > 0) {
        return false;
      }

      // Search filter
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const inSku = p.sku.toLowerCase().includes(q);
        const inName = p.name.toLowerCase().includes(q);
        const inBrand = (p.brand || '').toLowerCase().includes(q);
        const inBarcode = (p.barcode || '').toLowerCase().includes(q);
        const inLocation = (p.location || '').toLowerCase().includes(q);
        if (!inSku && !inName && !inBrand && !inBarcode && !inLocation) return false;
      }

      return true;
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Impossible de charger les produits.', { cause: error });
  }
}

export async function getProductById(id: number) {
  try {
    const pList = await db
      .select({
        id: products.id,
        sku: products.sku,
        barcode: products.barcode,
        name: products.name,
        categoryId: products.categoryId,
        categoryName: categories.name,
        brand: products.brand,
        description: products.description,
        purchasePrice: products.purchasePrice,
        sellingPrice: products.sellingPrice,
        currentStock: products.currentStock,
        minStockThreshold: products.minStockThreshold,
        unit: products.unit,
        location: products.location,
        isArchived: products.isArchived,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (pList.length === 0) return null;
    const product = pList[0];

    const movements = await db
      .select({
        id: stockMovements.id,
        movementNumber: stockMovements.movementNumber,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        stockBefore: stockMovements.stockBefore,
        stockAfter: stockMovements.stockAfter,
        unitCost: stockMovements.unitCost,
        totalCost: stockMovements.totalCost,
        reason: stockMovements.reason,
        documentRef: stockMovements.documentRef,
        recipient: stockMovements.recipient,
        userEmail: stockMovements.userEmail,
        createdAt: stockMovements.createdAt,
        supplierName: suppliers.name,
      })
      .from(stockMovements)
      .leftJoin(suppliers, eq(stockMovements.supplierId, suppliers.id))
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.createdAt));

    return { product, movements };
  } catch (error) {
    console.error('Error fetching product by id:', error);
    throw new Error('Erreur lors du chargement de la fiche produit.', { cause: error });
  }
}

export async function createProduct(data: {
  sku: string;
  barcode?: string;
  name: string;
  categoryId: number;
  brand?: string;
  description?: string;
  purchasePrice: number;
  sellingPrice?: number;
  initialStock?: number;
  minStockThreshold: number;
  unit: string;
  location?: string;
  user?: { id: number; email: string };
}) {
  try {
    // Check SKU uniqueness
    const existing = await db.select().from(products).where(eq(products.sku, data.sku.trim())).limit(1);
    if (existing.length > 0) {
      throw new Error(`La référence produit (SKU) "${data.sku}" existe déjà. Veuillez utiliser un code unique.`);
    }

    const initialQty = Math.max(0, Math.floor(data.initialStock || 0));

    const result = await db
      .insert(products)
      .values({
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || null,
        name: data.name.trim(),
        categoryId: data.categoryId,
        brand: data.brand?.trim() || null,
        description: data.description?.trim() || null,
        purchasePrice: Math.max(0, Math.floor(data.purchasePrice || 0)),
        sellingPrice: Math.max(0, Math.floor(data.sellingPrice || 0)),
        currentStock: initialQty,
        minStockThreshold: Math.max(1, Math.floor(data.minStockThreshold || 5)),
        unit: data.unit?.trim() || 'Unité',
        location: data.location?.trim() || null,
        isArchived: false,
      })
      .returning();

    const created = result[0];

    // If initial stock was provided, create an initial inventory movement
    if (initialQty > 0) {
      const movNumber = generateMovementNumber('IN');
      await db.insert(stockMovements).values({
        movementNumber: movNumber,
        movementType: 'IN',
        productId: created.id,
        quantity: initialQty,
        stockBefore: 0,
        stockAfter: initialQty,
        unitCost: created.purchasePrice,
        totalCost: initialQty * created.purchasePrice,
        reason: 'Stock initial à la création du produit',
        userId: data.user?.id || null,
        userEmail: data.user?.email || null,
        notes: 'Enregistrement initial automatique',
      });
    }

    await logAudit(
      'CREATE_PRODUCT',
      'product',
      created.id.toString(),
      `Création du produit ${created.name} (${created.sku}), stock initial: ${initialQty}`,
      data.user?.id,
      data.user?.email
    );

    return created;
  } catch (error: any) {
    console.error('Error creating product:', error);
    throw new Error(error.message || 'Impossible de créer le produit.', { cause: error });
  }
}

export async function updateProduct(
  id: number,
  data: {
    sku: string;
    barcode?: string;
    name: string;
    categoryId: number;
    brand?: string;
    description?: string;
    purchasePrice: number;
    sellingPrice?: number;
    minStockThreshold: number;
    unit: string;
    location?: string;
  },
  user?: { id: number; email: string }
) {
  try {
    // Check SKU collision with other products
    const existing = await db.select().from(products).where(eq(products.sku, data.sku.trim().toUpperCase())).limit(2);
    const conflict = existing.find((p) => p.id !== id);
    if (conflict) {
      throw new Error(`La référence (SKU) "${data.sku}" est déjà utilisée par un autre produit.`);
    }

    const updated = await db
      .update(products)
      .set({
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || null,
        name: data.name.trim(),
        categoryId: data.categoryId,
        brand: data.brand?.trim() || null,
        description: data.description?.trim() || null,
        purchasePrice: Math.max(0, Math.floor(data.purchasePrice || 0)),
        sellingPrice: Math.max(0, Math.floor(data.sellingPrice || 0)),
        minStockThreshold: Math.max(1, Math.floor(data.minStockThreshold || 5)),
        unit: data.unit?.trim() || 'Unité',
        location: data.location?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    await logAudit(
      'UPDATE_PRODUCT',
      'product',
      id.toString(),
      `Mise à jour des informations du produit ${data.name} (${data.sku})`,
      user?.id,
      user?.email
    );

    return updated[0];
  } catch (error: any) {
    console.error('Error updating product:', error);
    throw new Error(error.message || 'Impossible de mettre à jour le produit.', { cause: error });
  }
}

export async function archiveProduct(id: number, user?: { id: number; email: string }) {
  try {
    const updated = await db
      .update(products)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    await logAudit(
      'ARCHIVE_PRODUCT',
      'product',
      id.toString(),
      `Archivage du produit ${updated[0].name} (${updated[0].sku})`,
      user?.id,
      user?.email
    );

    return updated[0];
  } catch (error) {
    console.error('Error archiving product:', error);
    throw new Error("Impossible d'archiver le produit.", { cause: error });
  }
}

export async function deleteProductPermanently(id: number, user?: { id: number; email: string }) {
  try {
    // Check if movements exist
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.productId, id)).limit(1);
    if (movements.length > 0) {
      throw new Error(
        'Suppression impossible : Ce produit possède un historique de mouvements de stock. Pour préserver la traçabilité comptable et l\'audit, veuillez utiliser l\'archivage.'
      );
    }

    const deleted = await db.delete(products).where(eq(products.id, id)).returning();
    await logAudit(
      'DELETE_PRODUCT',
      'product',
      id.toString(),
      `Suppression définitive du produit sans mouvement: ${deleted[0]?.name}`,
      user?.id,
      user?.email
    );
    return deleted[0];
  } catch (error: any) {
    console.error('Error deleting product:', error);
    throw new Error(error.message || 'Erreur lors de la suppression.', { cause: error });
  }
}

// ----------------- STOCK MOVEMENTS (ENTRÉES & SORTIES) -----------------
export async function createStockEntry(data: {
  productId: number;
  quantity: number;
  purchasePrice?: number;
  supplierId?: number;
  documentRef?: string;
  reason: string;
  notes?: string;
  user?: { id: number; email: string };
}) {
  try {
    const qty = Math.floor(data.quantity);
    if (!qty || qty <= 0) {
      throw new Error('La quantité reçue doit être un nombre entier strictement positif.');
    }

    // Atomic transaction
    const result = await db.transaction(async (tx) => {
      const pList = await tx.select().from(products).where(eq(products.id, data.productId)).limit(1);
      if (pList.length === 0) {
        throw new Error('Produit introuvable.');
      }
      const product = pList[0];

      const stockBefore = product.currentStock;
      const stockAfter = stockBefore + qty;
      const unitCost = data.purchasePrice !== undefined ? Math.floor(data.purchasePrice) : product.purchasePrice;
      const totalCost = unitCost * qty;

      // Update product current stock
      await tx
        .update(products)
        .set({
          currentStock: stockAfter,
          purchasePrice: unitCost,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      const movementNum = generateMovementNumber('IN');
      const movementResult = await tx
        .insert(stockMovements)
        .values({
          movementNumber: movementNum,
          movementType: 'IN',
          productId: product.id,
          quantity: qty,
          stockBefore,
          stockAfter,
          unitCost,
          totalCost,
          supplierId: data.supplierId || null,
          reason: data.reason || 'Réception fournisseur',
          documentRef: data.documentRef?.trim() || null,
          userId: data.user?.id || null,
          userEmail: data.user?.email || null,
          notes: data.notes?.trim() || null,
        })
        .returning();

      return { movement: movementResult[0], newStock: stockAfter };
    });

    await logAudit(
      'STOCK_ENTRY',
      'movement',
      result.movement.movementNumber,
      `Entrée de stock de ${data.quantity} unité(s) pour produit ID ${data.productId}`,
      data.user?.id,
      data.user?.email
    );

    return result;
  } catch (error: any) {
    console.error('Error creating stock entry:', error);
    throw new Error(error.message || "Échec de l'enregistrement de l'entrée de stock.", { cause: error });
  }
}

export async function createStockExit(data: {
  productId: number;
  quantity: number;
  reason: string;
  recipient?: string;
  documentRef?: string;
  notes?: string;
  user?: { id: number; email: string };
}) {
  try {
    const qty = Math.floor(data.quantity);
    if (!qty || qty <= 0) {
      throw new Error('La quantité sortie doit être un nombre entier strictement positif.');
    }

    if (!data.reason || !data.reason.trim()) {
      throw new Error('Le motif de sortie est obligatoire.');
    }

    // Atomic transaction preventing race conditions and negative stock
    const result = await db.transaction(async (tx) => {
      const pList = await tx.select().from(products).where(eq(products.id, data.productId)).limit(1);
      if (pList.length === 0) {
        throw new Error('Produit introuvable.');
      }
      const product = pList[0];

      const stockBefore = product.currentStock;

      // CRITICAL SECURITY RULE: Reject if quantity > stockBefore
      if (qty > stockBefore) {
        throw new Error(
          `Stock insuffisant : vous tentez de sortir ${qty} unité(s) du produit "${product.name}", alors que le stock disponible n'est que de ${stockBefore} unité(s).`
        );
      }

      const stockAfter = stockBefore - qty;
      const unitCost = product.purchasePrice;
      const totalCost = unitCost * qty;

      await tx
        .update(products)
        .set({
          currentStock: stockAfter,
          updatedAt: new Date(),
        })
        .where(eq(products.id, product.id));

      const movementNum = generateMovementNumber('OUT');
      const movementResult = await tx
        .insert(stockMovements)
        .values({
          movementNumber: movementNum,
          movementType: 'OUT',
          productId: product.id,
          quantity: qty,
          stockBefore,
          stockAfter,
          unitCost,
          totalCost,
          reason: data.reason.trim(),
          recipient: data.recipient?.trim() || null,
          documentRef: data.documentRef?.trim() || null,
          userId: data.user?.id || null,
          userEmail: data.user?.email || null,
          notes: data.notes?.trim() || null,
        })
        .returning();

      return { movement: movementResult[0], newStock: stockAfter };
    });

    await logAudit(
      'STOCK_EXIT',
      'movement',
      result.movement.movementNumber,
      `Sortie de stock de ${data.quantity} unité(s) pour ${data.reason}`,
      data.user?.id,
      data.user?.email
    );

    return result;
  } catch (error: any) {
    console.error('Error creating stock exit:', error);
    throw new Error(error.message || "Échec de l'enregistrement de la sortie de stock.", { cause: error });
  }
}

// ----------------- MOVEMENTS HISTORY -----------------
export async function getStockMovements(filters?: {
  productId?: number;
  categoryId?: number;
  movementType?: 'IN' | 'OUT' | 'ADJUSTMENT';
  startDate?: string;
  endDate?: string;
  reason?: string;
}) {
  try {
    const list = await db
      .select({
        id: stockMovements.id,
        movementNumber: stockMovements.movementNumber,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        stockBefore: stockMovements.stockBefore,
        stockAfter: stockMovements.stockAfter,
        unitCost: stockMovements.unitCost,
        totalCost: stockMovements.totalCost,
        reason: stockMovements.reason,
        documentRef: stockMovements.documentRef,
        recipient: stockMovements.recipient,
        userEmail: stockMovements.userEmail,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        unit: products.unit,
        categoryId: products.categoryId,
        categoryName: categories.name,
        supplierName: suppliers.name,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(stockMovements.supplierId, suppliers.id))
      .orderBy(desc(stockMovements.createdAt));

    return list.filter((m) => {
      if (filters?.productId && m.productId !== filters.productId) return false;
      if (filters?.categoryId && m.categoryId !== filters.categoryId) return false;
      if (filters?.movementType && m.movementType !== filters.movementType) return false;
      if (filters?.reason && !m.reason.toLowerCase().includes(filters.reason.toLowerCase())) return false;

      if (filters?.startDate && m.createdAt) {
        const start = new Date(filters.startDate);
        if (new Date(m.createdAt) < start) return false;
      }
      if (filters?.endDate && m.createdAt) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(m.createdAt) > end) return false;
      }

      return true;
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw new Error("Impossible de charger l'historique des mouvements.", { cause: error });
  }
}

// ----------------- PHYSICAL INVENTORY -----------------
export async function getInventorySheet() {
  try {
    return await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        categoryName: categories.name,
        brand: products.brand,
        location: products.location,
        unit: products.unit,
        purchasePrice: products.purchasePrice,
        theoreticalStock: products.currentStock,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.isArchived, false))
      .orderBy(products.name);
  } catch (error) {
    console.error('Error generating inventory sheet:', error);
    throw new Error("Impossible d'éditer la feuille d'inventaire.", { cause: error });
  }
}

export async function submitPhysicalInventory(data: {
  title: string;
  notes?: string;
  counts: Array<{
    productId: number;
    countedStock: number;
  }>;
  user?: { id: number; email: string };
}) {
  try {
    if (!data.counts || data.counts.length === 0) {
      throw new Error('Aucun article renseigné pour cet inventaire.');
    }

    const sessionNum = generateSessionNumber();

    const result = await db.transaction(async (tx) => {
      // 1. Create inventory session
      const sessionRes = await tx
        .insert(inventorySessions)
        .values({
          sessionNumber: sessionNum,
          title: data.title || `Inventaire physique du ${new Date().toLocaleDateString('fr-FR')}`,
          status: 'COMPLETED',
          userId: data.user?.id || null,
          userEmail: data.user?.email || null,
          notes: data.notes?.trim() || null,
        })
        .returning();

      const session = sessionRes[0];

      let totalCounted = 0;
      let totalDiscrepancy = 0;
      let valuationDiscrepancy = 0;

      for (const item of data.counts) {
        const pList = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (pList.length === 0) continue;
        const prod = pList[0];

        const theoretical = prod.currentStock;
        const counted = Math.max(0, Math.floor(item.countedStock));
        const diff = counted - theoretical;
        const diffValue = diff * prod.purchasePrice;

        totalCounted++;
        totalDiscrepancy += diff;
        valuationDiscrepancy += diffValue;

        let regularisationMovementId: number | null = null;

        // If discrepancy exists, create adjustment movement and update stock
        if (diff !== 0) {
          const movNum = generateMovementNumber('ADJUSTMENT');
          const isSurplus = diff > 0;
          const reasonText = isSurplus
            ? `Régularisation inventaire (Surplus de ${diff} ${prod.unit})`
            : `Régularisation inventaire (Manquant de ${Math.abs(diff)} ${prod.unit})`;

          const movRes = await tx
            .insert(stockMovements)
            .values({
              movementNumber: movNum,
              movementType: 'ADJUSTMENT',
              productId: prod.id,
              quantity: Math.abs(diff),
              stockBefore: theoretical,
              stockAfter: counted,
              unitCost: prod.purchasePrice,
              totalCost: Math.abs(diffValue),
              reason: reasonText,
              documentRef: session.sessionNumber,
              userId: data.user?.id || null,
              userEmail: data.user?.email || null,
              notes: `Session: ${session.title}`,
            })
            .returning();

          regularisationMovementId = movRes[0].id;

          // Update product stock to counted
          await tx
            .update(products)
            .set({
              currentStock: counted,
              updatedAt: new Date(),
            })
            .where(eq(products.id, prod.id));
        }

        // Insert inventory item
        await tx.insert(inventoryItems).values({
          sessionId: session.id,
          productId: prod.id,
          theoreticalStock: theoretical,
          countedStock: counted,
          discrepancy: diff,
          unitCost: prod.purchasePrice,
          discrepancyValue: diffValue,
          movementId: regularisationMovementId,
        });
      }

      // Update session totals
      await tx
        .update(inventorySessions)
        .set({
          totalItemsCounted: totalCounted,
          totalDiscrepancy,
          valuationDiscrepancy,
        })
        .where(eq(inventorySessions.id, session.id));

      return { sessionNumber: sessionNum, totalCounted, totalDiscrepancy, valuationDiscrepancy };
    });

    await logAudit(
      'INVENTORY_REGULARIZE',
      'inventory',
      result.sessionNumber,
      `Clôture inventaire: ${result.totalCounted} articles comptés, écart net: ${result.totalDiscrepancy}`,
      data.user?.id,
      data.user?.email
    );

    return result;
  } catch (error: any) {
    console.error('Error submitting inventory:', error);
    throw new Error(error.message || "Échec de l'enregistrement de l'inventaire.", { cause: error });
  }
}

export async function getInventorySessions() {
  try {
    return await db
      .select()
      .from(inventorySessions)
      .orderBy(desc(inventorySessions.createdAt));
  } catch (error) {
    console.error('Error fetching inventory sessions:', error);
    throw new Error('Impossible de charger les sessions d’inventaire.', { cause: error });
  }
}

export async function getInventorySessionDetails(id: number) {
  try {
    const sessions = await db.select().from(inventorySessions).where(eq(inventorySessions.id, id)).limit(1);
    if (sessions.length === 0) return null;

    const items = await db
      .select({
        id: inventoryItems.id,
        productId: inventoryItems.productId,
        productName: products.name,
        productSku: products.sku,
        unit: products.unit,
        theoreticalStock: inventoryItems.theoreticalStock,
        countedStock: inventoryItems.countedStock,
        discrepancy: inventoryItems.discrepancy,
        unitCost: inventoryItems.unitCost,
        discrepancyValue: inventoryItems.discrepancyValue,
      })
      .from(inventoryItems)
      .leftJoin(products, eq(inventoryItems.productId, products.id))
      .where(eq(inventoryItems.sessionId, id));

    return { session: sessions[0], items };
  } catch (error) {
    console.error('Error fetching inventory session details:', error);
    throw new Error('Impossible de charger le détail de l’inventaire.', { cause: error });
  }
}

// ----------------- SUPPLIERS -----------------
export async function getSuppliers() {
  try {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw new Error('Impossible de charger les fournisseurs.', { cause: error });
  }
}

export async function getSupplierById(id: number) {
  try {
    const list = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (list.length === 0) return null;

    const deliveries = await db
      .select({
        id: stockMovements.id,
        movementNumber: stockMovements.movementNumber,
        quantity: stockMovements.quantity,
        totalCost: stockMovements.totalCost,
        documentRef: stockMovements.documentRef,
        createdAt: stockMovements.createdAt,
        productName: products.name,
        productSku: products.sku,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .where(eq(stockMovements.supplierId, id))
      .orderBy(desc(stockMovements.createdAt));

    return { supplier: list[0], deliveries };
  } catch (error) {
    console.error('Error fetching supplier by id:', error);
    throw new Error('Impossible de charger le fournisseur.', { cause: error });
  }
}

export async function createSupplier(
  data: {
    name: string;
    contactName?: string;
    phone: string;
    address?: string;
    email?: string;
    notes?: string;
  },
  user?: { id: number; email: string }
) {
  try {
    if (!data.name?.trim() || !data.phone?.trim()) {
      throw new Error('Le nom et le numéro de téléphone du fournisseur sont obligatoires.');
    }

    const res = await db
      .insert(suppliers)
      .values({
        name: data.name.trim(),
        contactName: data.contactName?.trim() || null,
        phone: data.phone.trim(),
        address: data.address?.trim() || null,
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .returning();

    await logAudit('CREATE_SUPPLIER', 'supplier', res[0].id.toString(), `Fournisseur ajouté: ${res[0].name}`, user?.id, user?.email);
    return res[0];
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    throw new Error(error.message || 'Impossible de créer le fournisseur.', { cause: error });
  }
}

export async function updateSupplier(
  id: number,
  data: {
    name: string;
    contactName?: string;
    phone: string;
    address?: string;
    email?: string;
    notes?: string;
  },
  user?: { id: number; email: string }
) {
  try {
    const res = await db
      .update(suppliers)
      .set({
        name: data.name.trim(),
        contactName: data.contactName?.trim() || null,
        phone: data.phone.trim(),
        address: data.address?.trim() || null,
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
      .returning();

    await logAudit('UPDATE_SUPPLIER', 'supplier', id.toString(), `Fournisseur modifié: ${res[0].name}`, user?.id, user?.email);
    return res[0];
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    throw new Error(error.message || 'Impossible de mettre à jour le fournisseur.', { cause: error });
  }
}

// ----------------- CATEGORIES -----------------
export async function getCategories() {
  try {
    const catList = await db.select().from(categories).orderBy(categories.name);
    // Count products per category
    const counts = await db
      .select({
        categoryId: products.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(eq(products.isArchived, false))
      .groupBy(products.categoryId);

    const countMap = new Map<number, number>();
    for (const c of counts) {
      countMap.set(c.categoryId, c.count);
    }

    return catList.map((c) => ({
      ...c,
      productCount: countMap.get(c.id) || 0,
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Impossible de charger les catégories.', { cause: error });
  }
}

export async function createCategory(data: { name: string; code?: string; description?: string }) {
  try {
    if (!data.name?.trim()) {
      throw new Error('Le nom de la catégorie est obligatoire.');
    }
    const res = await db
      .insert(categories)
      .values({
        name: data.name.trim(),
        code: data.code?.trim().toUpperCase() || null,
        description: data.description?.trim() || null,
      })
      .returning();
    return res[0];
  } catch (error: any) {
    console.error('Error creating category:', error);
    throw new Error(error.message || 'Impossible de créer la catégorie.', { cause: error });
  }
}

// ----------------- AUDIT LOGS -----------------
export async function getAuditLogs() {
  try {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Impossible de charger le journal d’audit.', { cause: error });
  }
}

// ----------------- SEED DEMO DATA -----------------
export async function seedDemoData(adminUser?: { id: number; email: string }) {
  try {
    // 1. Seed realistic security suppliers
    const demoSuppliers = [
      { name: 'SecuriTech International Abidjan', contactName: 'M. Touré Amadou', phone: '+225 07 08 09 10 11', email: 'commercial@securitech.ci', address: 'Zone 4C, Rue des Carrossiers, Abidjan' },
      { name: 'Dahua & Hikvision West Africa', contactName: 'Mme Kouamé Estelle', phone: '+225 05 44 33 22 11', email: 'distribution@dahuawest.com', address: 'Boulevard de Marseille, Treichville' },
      { name: 'Protection & Incendie Sahel', contactName: 'M. Bakary Diallo', phone: '+225 01 23 45 67 89', email: 'contact@pis-securite.com', address: 'Yopougon Zone Industrielle' },
    ];

    const insertedSuppliers: any[] = [];
    for (const sup of demoSuppliers) {
      const existing = await db.select().from(suppliers).where(eq(suppliers.name, sup.name)).limit(1);
      if (existing.length === 0) {
        const ins = await db.insert(suppliers).values(sup).returning();
        insertedSuppliers.push(ins[0]);
      } else {
        insertedSuppliers.push(existing[0]);
      }
    }

    // 2. Fetch categories map
    const catList = await db.select().from(categories);
    const catMap = new Map<string, number>();
    for (const c of catList) {
      catMap.set(c.name, c.id);
    }

    // 3. Realistic security products
    const demoProducts = [
      {
        sku: 'CAM-IP-DOME-4MP',
        barcode: '693444550012',
        name: 'Caméra Dôme IP 4MP IR 30m PoE',
        categoryName: 'Caméras de surveillance',
        brand: 'Hikvision',
        description: 'Capteur CMOS 1/3, vision nocturne infrarouge 30m, indice de protection IP67, alimentation PoE.',
        purchasePrice: 42000,
        sellingPrice: 65000,
        currentStock: 18,
        minStockThreshold: 5,
        unit: 'Unité',
        location: 'Rayon A1 - Étagère 2',
      },
      {
        sku: 'CAM-TUBE-8MP-4K',
        barcode: '693444550029',
        name: 'Caméra Tube IP 8MP 4K Ultra HD Motorisée',
        categoryName: 'Caméras de surveillance',
        brand: 'Dahua',
        description: 'Objectif varifocale motorisé 2.7-13.5mm, détection intelligente de véhicules et personnes.',
        purchasePrice: 85000,
        sellingPrice: 130000,
        currentStock: 4, // Stock faible!
        minStockThreshold: 5,
        unit: 'Unité',
        location: 'Rayon A1 - Étagère 4',
      },
      {
        sku: 'NVR-16CH-4K-POE',
        barcode: '693444550036',
        name: 'Enregistreur NVR 16 Canaux 4K 16 Ports PoE',
        categoryName: 'Enregistreurs DVR et NVR',
        brand: 'Hikvision',
        description: 'Support 2 disques SATA jusqu\'à 16 To, compression H.265+, sortie HDMI 4K.',
        purchasePrice: 195000,
        sellingPrice: 280000,
        currentStock: 6,
        minStockThreshold: 2,
        unit: 'Unité',
        location: 'Rayon B2 - Coffre',
      },
      {
        sku: 'NVR-32CH-ENTERPRISE',
        barcode: '693444550043',
        name: 'Enregistreur NVR 32 Canaux Professionnel',
        categoryName: 'Enregistreurs DVR et NVR',
        brand: 'Dahua',
        description: 'Enregistreur rackable 4 disques SATA, double port Gigabit LAN, bande passante 384 Mbps.',
        purchasePrice: 380000,
        sellingPrice: 520000,
        currentStock: 0, // Rupture de stock!
        minStockThreshold: 2,
        unit: 'Unité',
        location: 'Rayon B2 - Baie',
      },
      {
        sku: 'ALM-CENTRALE-IP-4G',
        barcode: '693444550050',
        name: 'Centrale d\'Alarme Sans Fil IP & 4G Secourue',
        categoryName: 'Alarmes anti-intrusion',
        brand: 'Ajax Systems',
        description: 'Hub intelligent jusqu\'à 100 détecteurs sans fil, portée radio 2000m, batterie secours 16h.',
        purchasePrice: 165000,
        sellingPrice: 245000,
        currentStock: 8,
        minStockThreshold: 3,
        unit: 'Kit',
        location: 'Rayon C1 - Vitrine',
      },
      {
        sku: 'DET-PIR-EXT-ANTI-MASQ',
        barcode: '693444550067',
        name: 'Détecteur de Mouvement Extérieur Rideau Anti-masquage',
        categoryName: 'Détecteurs de mouvement et d\'ouverture',
        brand: 'Optex',
        description: 'Détection double faisceau infrarouge, immunité aux animaux jusqu\'à 25 kg, portée 12m.',
        purchasePrice: 38000,
        sellingPrice: 58000,
        currentStock: 3, // Stock faible!
        minStockThreshold: 6,
        unit: 'Unité',
        location: 'Rayon C2 - Tiroir 1',
      },
      {
        sku: 'ACC-BIOMETRIC-FACE',
        barcode: '693444550074',
        name: 'Terminal de Contrôle d\'Accès Reconnaissance Faciale & Badge',
        categoryName: 'Contrôle d\'accès et badges',
        brand: 'ZKTeco',
        description: 'Capacité 3000 visages, écran tactile 5 pouces, communication TCP/IP et WiFi.',
        purchasePrice: 140000,
        sellingPrice: 215000,
        currentStock: 5,
        minStockThreshold: 2,
        unit: 'Unité',
        location: 'Rayon D1 - Coffre',
      },
      {
        sku: 'ACC-VENTOUSE-300KG',
        barcode: '693444550081',
        name: 'Ventouse Électromagnétique 300 kg 12V avec Équerre ZL',
        categoryName: 'Contrôle d\'accès et badges',
        brand: 'CDVI',
        description: 'Force de rétention 300 daN, contact de signalisation NO/NF intégré.',
        purchasePrice: 28000,
        sellingPrice: 45000,
        currentStock: 22,
        minStockThreshold: 8,
        unit: 'Unité',
        location: 'Rayon D2 - Bac 4',
      },
      {
        sku: 'CAB-RJ45-CAT6-FTP-305M',
        barcode: '693444550098',
        name: 'Touret Câble Réseau RJ45 Catégorie 6 FTP Cuivre 305m',
        categoryName: 'Câbles et connectiques',
        brand: 'Legrand',
        description: 'Gaine extérieure bleue PVC résistant, 100% cuivre désoxygéné, blindage aluminium.',
        purchasePrice: 62000,
        sellingPrice: 90000,
        currentStock: 14,
        minStockThreshold: 4,
        unit: 'Rouleau',
        location: 'Zone Stock Câblerie',
      },
      {
        sku: 'PWR-BOX-12V-10A-9CH',
        barcode: '693444550104',
        name: 'Alimentation Secourue Centrale 12V 10A 9 Canaux Fusibles',
        categoryName: 'Alimentations et batteries',
        brand: 'Mean Well',
        description: 'Boîtier métallique sécurisé avec serrure, emplacement pour batterie 12V 7Ah.',
        purchasePrice: 34000,
        sellingPrice: 52000,
        currentStock: 12,
        minStockThreshold: 4,
        unit: 'Unité',
        location: 'Rayon E1 - Étagère 1',
      },
      {
        sku: 'BAT-PLOMB-12V-7AH',
        barcode: '693444550111',
        name: 'Batterie au Plomb Étanche Rechargeable 12V 7Ah',
        categoryName: 'Alimentations et batteries',
        brand: 'Yuasa',
        description: 'Technologie AGM sans entretien, cosses Faston 4.8mm, idéale centrales et alimentations.',
        purchasePrice: 12000,
        sellingPrice: 19000,
        currentStock: 2, // Stock faible!
        minStockThreshold: 10,
        unit: 'Unité',
        location: 'Rayon E1 - Bac 3',
      },
      {
        sku: 'INC-EXTINCTEUR-ABC-6KG',
        barcode: '693444550128',
        name: 'Extincteur à Poudre Polyvalente ABC 6 kg avec Manomètre',
        categoryName: 'Extincteurs et équipements incendie',
        brand: 'Andrieu',
        description: 'Certifié NF EN3, pression permanente, livré avec support mural de fixation.',
        purchasePrice: 22000,
        sellingPrice: 35000,
        currentStock: 9,
        minStockThreshold: 5,
        unit: 'Unité',
        location: 'Rayon F1 - Sécurité Incendie',
      },
    ];

    for (const dp of demoProducts) {
      const catId = catMap.get(dp.categoryName) || 1;
      const existing = await db.select().from(products).where(eq(products.sku, dp.sku)).limit(1);

      if (existing.length === 0) {
        const prod = await db
          .insert(products)
          .values({
            sku: dp.sku,
            barcode: dp.barcode,
            name: dp.name,
            categoryId: catId,
            brand: dp.brand,
            description: dp.description,
            purchasePrice: dp.purchasePrice,
            sellingPrice: dp.sellingPrice,
            currentStock: dp.currentStock,
            minStockThreshold: dp.minStockThreshold,
            unit: dp.unit,
            location: dp.location,
            isArchived: false,
          })
          .returning();

        // Add initial movement
        if (dp.currentStock > 0) {
          const movNum = generateMovementNumber('IN');
          await db.insert(stockMovements).values({
            movementNumber: movNum,
            movementType: 'IN',
            productId: prod[0].id,
            quantity: dp.currentStock,
            stockBefore: 0,
            stockAfter: dp.currentStock,
            unitCost: dp.purchasePrice,
            totalCost: dp.currentStock * dp.purchasePrice,
            supplierId: insertedSuppliers[0]?.id || null,
            reason: 'Approvisionnement initial du stock',
            documentRef: 'BL-INITIAL-DEMO',
            userId: adminUser?.id || null,
            userEmail: adminUser?.email || 'admin@secustock.ci',
            notes: 'Jeu de démonstration initial',
          });
        }
      }
    }

    await logAudit('SEED_DEMO_DATA', 'system', '0', 'Génération du jeu de données de démonstration de sécurité', adminUser?.id, adminUser?.email);
    return { success: true, message: 'Données de démonstration générées avec succès.' };
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    throw new Error(error.message || 'Impossible de charger le jeu de données.', { cause: error });
  }
}

// ----------------- GOODS RETURNS (RETOURS DE MARCHANDISE) -----------------
export function generateReturnNumber(direction: 'CUSTOMER' | 'SUPPLIER'): string {
  const prefix = direction === 'CUSTOMER' ? 'RET-CLI' : 'RET-FOU';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomPart}`;
}

export async function createGoodsReturn(data: {
  returnDirection: 'CUSTOMER' | 'SUPPLIER';
  productId: number;
  quantity: number;
  itemCondition: 'NEW' | 'DEFECTIVE' | 'TO_INSPECT';
  stockAction: 'RESTOCK' | 'NO_RESTOCK' | 'SUPPLIER_EXIT';
  thirdPartyName?: string;
  supplierId?: number;
  documentRef?: string;
  reason: string;
  notes?: string;
  user?: { id: number; email: string };
}) {
  try {
    const qty = Math.floor(data.quantity);
    if (!qty || qty <= 0) {
      throw new Error('La quantité retournée doit être un nombre entier strictement positif.');
    }
    if (!data.reason || !data.reason.trim()) {
      throw new Error('Le motif du retour est obligatoire.');
    }

    const returnNum = generateReturnNumber(data.returnDirection);

    const result = await db.transaction(async (tx) => {
      const pList = await tx.select().from(products).where(eq(products.id, data.productId)).limit(1);
      if (pList.length === 0) {
        throw new Error('Produit introuvable.');
      }
      const product = pList[0];

      let stockMovementId: number | null = null;
      let newStock = product.currentStock;

      if (data.returnDirection === 'CUSTOMER') {
        // Return from client/site
        if (data.stockAction === 'RESTOCK') {
          // Increase stock
          const stockBefore = product.currentStock;
          newStock = stockBefore + qty;

          await tx
            .update(products)
            .set({ currentStock: newStock, updatedAt: new Date() })
            .where(eq(products.id, product.id));

          const movNum = generateMovementNumber('IN');
          const movRes = await tx
            .insert(stockMovements)
            .values({
              movementNumber: movNum,
              movementType: 'IN',
              productId: product.id,
              quantity: qty,
              stockBefore,
              stockAfter: newStock,
              unitCost: product.purchasePrice,
              totalCost: product.purchasePrice * qty,
              reason: `Retour Client : ${data.reason.trim()}`,
              documentRef: data.documentRef?.trim() || returnNum,
              recipient: data.thirdPartyName?.trim() || 'Client',
              userId: data.user?.id || null,
              userEmail: data.user?.email || null,
              notes: `Retour ${returnNum} - État: ${data.itemCondition}`,
            })
            .returning();

          stockMovementId = movRes[0].id;
        }
      } else {
        // Return to supplier
        const stockBefore = product.currentStock;
        if (qty > stockBefore) {
          throw new Error(
            `Stock insuffisant : vous tentez de renvoyer ${qty} unité(s) au fournisseur, alors que le stock actuel n'est que de ${stockBefore} unité(s).`
          );
        }

        newStock = stockBefore - qty;
        await tx
          .update(products)
          .set({ currentStock: newStock, updatedAt: new Date() })
          .where(eq(products.id, product.id));

        const movNum = generateMovementNumber('OUT');
        const movRes = await tx
          .insert(stockMovements)
          .values({
            movementNumber: movNum,
            movementType: 'OUT',
            productId: product.id,
            quantity: qty,
            stockBefore,
            stockAfter: newStock,
            unitCost: product.purchasePrice,
            totalCost: product.purchasePrice * qty,
            supplierId: data.supplierId || null,
            reason: `Retour Fournisseur : ${data.reason.trim()}`,
            documentRef: data.documentRef?.trim() || returnNum,
            userId: data.user?.id || null,
            userEmail: data.user?.email || null,
            notes: `Retour ${returnNum} - Motif: ${data.reason}`,
          })
          .returning();

        stockMovementId = movRes[0].id;
      }

      // Record goods return
      const retRes = await tx
        .insert(goodsReturns)
        .values({
          returnNumber: returnNum,
          returnDirection: data.returnDirection,
          productId: product.id,
          quantity: qty,
          unitCost: product.purchasePrice,
          totalCost: product.purchasePrice * qty,
          itemCondition: data.itemCondition,
          stockAction: data.stockAction,
          thirdPartyName: data.thirdPartyName?.trim() || null,
          supplierId: data.supplierId || null,
          documentRef: data.documentRef?.trim() || null,
          reason: data.reason.trim(),
          status: 'COMPLETED',
          movementId: stockMovementId,
          userId: data.user?.id || null,
          userEmail: data.user?.email || null,
          notes: data.notes?.trim() || null,
        })
        .returning();

      return { returnRecord: retRes[0], newStock };
    });

    await logAudit(
      'GOODS_RETURN',
      'return',
      result.returnRecord.returnNumber,
      `Retour de marchandise (${data.returnDirection}): ${data.quantity} unité(s) pour produit ID ${data.productId}`,
      data.user?.id,
      data.user?.email
    );

    return result;
  } catch (error: any) {
    console.error('Error creating goods return:', error);
    throw new Error(error.message || 'Échec de l\'enregistrement du retour.', { cause: error });
  }
}

export async function getGoodsReturns(filters?: {
  direction?: 'CUSTOMER' | 'SUPPLIER';
  productId?: number;
  condition?: string;
}) {
  try {
    const list = await db
      .select({
        id: goodsReturns.id,
        returnNumber: goodsReturns.returnNumber,
        returnDirection: goodsReturns.returnDirection,
        productId: goodsReturns.productId,
        productName: products.name,
        productSku: products.sku,
        unit: products.unit,
        categoryName: categories.name,
        quantity: goodsReturns.quantity,
        unitCost: goodsReturns.unitCost,
        totalCost: goodsReturns.totalCost,
        itemCondition: goodsReturns.itemCondition,
        stockAction: goodsReturns.stockAction,
        thirdPartyName: goodsReturns.thirdPartyName,
        supplierName: suppliers.name,
        documentRef: goodsReturns.documentRef,
        reason: goodsReturns.reason,
        status: goodsReturns.status,
        movementId: goodsReturns.movementId,
        userEmail: goodsReturns.userEmail,
        notes: goodsReturns.notes,
        createdAt: goodsReturns.createdAt,
      })
      .from(goodsReturns)
      .leftJoin(products, eq(goodsReturns.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(goodsReturns.supplierId, suppliers.id))
      .orderBy(desc(goodsReturns.createdAt));

    return list.filter((r) => {
      if (filters?.direction && r.returnDirection !== filters.direction) return false;
      if (filters?.productId && r.productId !== filters.productId) return false;
      if (filters?.condition && r.itemCondition !== filters.condition) return false;
      return true;
    });
  } catch (error) {
    console.error('Error fetching goods returns:', error);
    throw new Error('Impossible de charger les retours de marchandise.', { cause: error });
  }
}

// ----------------- RESET STORE TO ZERO -----------------
export async function resetAllStoreData(user?: { id: number; email: string }) {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(inventoryItems);
      await tx.delete(inventorySessions);
      await tx.delete(goodsReturns);
      await tx.delete(stockMovements);
      await tx.delete(products);
      await tx.delete(suppliers);
      await tx.delete(auditLogs);
    });

    await logAudit(
      'STORE_RESET_TO_ZERO',
      'system',
      '0',
      'Remise à zéro complète de toutes les informations du magasin',
      user?.id,
      user?.email
    );

    return { success: true, message: 'Le magasin a été entièrement remis à zéro. Aucune information résiduelle.' };
  } catch (error: any) {
    console.error('Error resetting store data:', error);
    throw new Error('Échec de la remise à zéro : ' + error.message, { cause: error });
  }
}

