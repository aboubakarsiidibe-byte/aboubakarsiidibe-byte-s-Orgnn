import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { requireAuth, requireAdmin, AuthRequest } from './src/middleware/auth.ts';
import { getAllUsers, updateUserRole } from './src/db/users.ts';
import {
  getDashboardStats,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProductPermanently,
  createStockEntry,
  createStockExit,
  getStockMovements,
  getInventorySheet,
  submitPhysicalInventory,
  getInventorySessions,
  getInventorySessionDetails,
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  getCategories,
  createCategory,
  getAuditLogs,
  seedDemoData,
  createGoodsReturn,
  getGoodsReturns,
  resetAllStoreData,
} from './src/server/db-service.ts';
import { db } from './src/db/index.ts';
import { products, categories, suppliers, stockMovements, inventorySessions, inventoryItems, auditLogs, users, goodsReturns } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SecuStock API', timestamp: new Date().toISOString() });
});

// Current user profile
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Dashboard
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors du calcul des statistiques.' });
  }
});

// Products
app.get('/api/products', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, status, isArchived } = req.query;
    const items = await getProducts({
      search: search as string,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      status: status as any,
      isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Erreur lors de la récupération des produits.' });
  }
});

app.get('/api/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getProductById(id);
    if (!data) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { sku, barcode, name, categoryId, brand, description, purchasePrice, sellingPrice, initialStock, minStockThreshold, unit, location } = req.body;
    if (!sku || !name || !categoryId) {
      return res.status(400).json({ error: 'La référence (SKU), le nom et la catégorie sont obligatoires.' });
    }
    const created = await createProduct({
      sku,
      barcode,
      name,
      categoryId: parseInt(categoryId, 10),
      brand,
      description,
      purchasePrice: parseInt(purchasePrice, 10) || 0,
      sellingPrice: parseInt(sellingPrice, 10) || 0,
      initialStock: parseInt(initialStock, 10) || 0,
      minStockThreshold: parseInt(minStockThreshold, 10) || 5,
      unit: unit || 'Unité',
      location,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { sku, barcode, name, categoryId, brand, description, purchasePrice, sellingPrice, minStockThreshold, unit, location } = req.body;
    if (!sku || !name || !categoryId) {
      return res.status(400).json({ error: 'La référence (SKU), le nom et la catégorie sont obligatoires.' });
    }
    const updated = await updateProduct(
      id,
      {
        sku,
        barcode,
        name,
        categoryId: parseInt(categoryId, 10),
        brand,
        description,
        purchasePrice: parseInt(purchasePrice, 10) || 0,
        sellingPrice: parseInt(sellingPrice, 10) || 0,
        minStockThreshold: parseInt(minStockThreshold, 10) || 5,
        unit: unit || 'Unité',
        location,
      },
      req.user ? { id: req.user.id, email: req.user.email } : undefined
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/products/:id/archive', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const archived = await archiveProduct(id, req.user ? { id: req.user.id, email: req.user.email } : undefined);
    res.json(archived);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/products/:id/unarchive', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const unarchived = await db
      .update(products)
      .set({ isArchived: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    res.json(unarchived[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await deleteProductPermanently(id, req.user ? { id: req.user.id, email: req.user.email } : undefined);
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// CSV Export for Products
app.get('/api/products/export-csv', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const items = await getProducts();
    const headers = [
      'ID',
      'Référence (SKU)',
      'Code-barres',
      'Désignation',
      'Catégorie',
      'Marque',
      'Stock actuel',
      'Unité',
      'Seuil minimal',
      'Prix achat (FCFA)',
      'Prix vente (FCFA)',
      'Valeur stock (FCFA)',
      'Emplacement',
    ];

    const rows = items.map((p) => [
      p.id,
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.categoryName || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      p.currentStock,
      `"${p.unit}"`,
      p.minStockThreshold,
      p.purchasePrice,
      p.sellingPrice || 0,
      p.currentStock * p.purchasePrice,
      `"${(p.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inventaire_produits_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CSV Import for Products
app.post('/api/products/import-csv', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { csvData } = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ error: 'Données CSV manquantes.' });
    }

    const lines = csvData.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'Le fichier CSV ne contient aucune donnée à importer.' });
    }

    // Parse header to find column indices
    const separator = lines[0].includes(';') ? ';' : ',';
    const headerCols = lines[0].split(separator).map((h) => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());

    const skuIdx = headerCols.findIndex((c) => c.includes('ref') || c.includes('sku') || c === 'reference');
    const nameIdx = headerCols.findIndex((c) => c.includes('nom') || c.includes('designation') || c.includes('name'));
    const catIdx = headerCols.findIndex((c) => c.includes('cat'));
    const priceIdx = headerCols.findIndex((c) => c.includes('achat') || c.includes('prix'));
    const stockIdx = headerCols.findIndex((c) => c.includes('stock') || c.includes('quantite'));
    const minIdx = headerCols.findIndex((c) => c.includes('seuil') || c.includes('min'));
    const unitIdx = headerCols.findIndex((c) => c.includes('unit'));
    const brandIdx = headerCols.findIndex((c) => c.includes('marque') || c.includes('brand'));

    if (skuIdx === -1 || nameIdx === -1) {
      return res.status(400).json({
        error: 'Colonnes obligatoires manquantes dans l\'en-tête CSV. Le fichier doit comporter au moins "Référence" (ou SKU) et "Nom" (ou Désignation).',
      });
    }

    const categoriesList = await getCategories();
    const defaultCatId = categoriesList[0]?.id || 1;

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(separator).map((c) => c.replace(/^["'\s]+|["'\s]+$/g, ''));
      const sku = cols[skuIdx]?.trim();
      const name = cols[nameIdx]?.trim();

      if (!sku || !name) continue;

      let catId = defaultCatId;
      if (catIdx !== -1 && cols[catIdx]) {
        const found = categoriesList.find((c) => c.name.toLowerCase() === cols[catIdx].toLowerCase());
        if (found) catId = found.id;
      }

      const purchasePrice = priceIdx !== -1 ? parseInt(cols[priceIdx], 10) || 0 : 0;
      const initialStock = stockIdx !== -1 ? parseInt(cols[stockIdx], 10) || 0 : 0;
      const minThreshold = minIdx !== -1 ? parseInt(cols[minIdx], 10) || 5 : 5;
      const unit = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : 'Unité';
      const brand = brandIdx !== -1 ? cols[brandIdx] : undefined;

      try {
        await createProduct({
          sku,
          name,
          categoryId: catId,
          brand,
          purchasePrice,
          initialStock,
          minStockThreshold: minThreshold,
          unit,
          user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
        });
        importedCount++;
      } catch (err: any) {
        errors.push(`Ligne ${i + 1} (${sku}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      importedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Categories
app.get('/api/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getCategories();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;
    const created = await createCategory({ name, code, description });
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Suppliers
app.get('/api/suppliers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getSuppliers();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getSupplierById(id);
    if (!data) return res.status(404).json({ error: 'Fournisseur non trouvé.' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, contactName, phone, address, email, notes } = req.body;
    const created = await createSupplier(
      { name, contactName, phone, address, email, notes },
      req.user ? { id: req.user.id, email: req.user.email } : undefined
    );
    res.status(201).json(created);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, contactName, phone, address, email, notes } = req.body;
    const updated = await updateSupplier(
      id,
      { name, contactName, phone, address, email, notes },
      req.user ? { id: req.user.id, email: req.user.email } : undefined
    );
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Stock Movements: Entries & Exits
app.post('/api/movements/entry', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity, purchasePrice, supplierId, documentRef, reason, notes } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Le produit et la quantité sont obligatoires.' });
    }
    const result = await createStockEntry({
      productId: parseInt(productId, 10),
      quantity: parseInt(quantity, 10),
      purchasePrice: purchasePrice !== undefined && purchasePrice !== '' ? parseInt(purchasePrice, 10) : undefined,
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
      documentRef,
      reason: reason || 'Réception fournisseur',
      notes,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/movements/exit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity, reason, recipient, documentRef, notes } = req.body;
    if (!productId || !quantity || !reason) {
      return res.status(400).json({ error: 'Le produit, la quantité et le motif de sortie sont obligatoires.' });
    }
    const result = await createStockExit({
      productId: parseInt(productId, 10),
      quantity: parseInt(quantity, 10),
      reason,
      recipient,
      documentRef,
      notes,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
    res.status(201).json(result);
  } catch (error: any) {
    // Return 400 with exact safety message
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/movements', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, categoryId, movementType, startDate, endDate, reason } = req.query;
    const list = await getStockMovements({
      productId: productId ? parseInt(productId as string, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      movementType: movementType as any,
      startDate: startDate as string,
      endDate: endDate as string,
      reason: reason as string,
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/movements/export-csv', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, categoryId, movementType, startDate, endDate } = req.query;
    const items = await getStockMovements({
      productId: productId ? parseInt(productId as string, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      movementType: movementType as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    const headers = [
      'Date & Heure',
      'N° Mouvement',
      'Type',
      'Référence (SKU)',
      'Produit',
      'Catégorie',
      'Quantité',
      'Stock Avant',
      'Stock Après',
      'Coût Unitaire (FCFA)',
      'Montant Total (FCFA)',
      'Motif',
      'Fournisseur / Tiers',
      'Réf. Document',
      'Utilisateur',
    ];

    const rows = items.map((m) => [
      `"${m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : ''}"`,
      `"${m.movementNumber}"`,
      `"${m.movementType === 'IN' ? 'Entrée' : m.movementType === 'OUT' ? 'Sortie' : 'Régularisation'}"`,
      `"${m.productSku || ''}"`,
      `"${(m.productName || '').replace(/"/g, '""')}"`,
      `"${(m.categoryName || '').replace(/"/g, '""')}"`,
      m.movementType === 'OUT' ? -m.quantity : m.quantity,
      m.stockBefore,
      m.stockAfter,
      m.unitCost || 0,
      m.totalCost || 0,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${(m.supplierName || m.recipient || '').replace(/"/g, '""')}"`,
      `"${(m.documentRef || '').replace(/"/g, '""')}"`,
      `"${m.userEmail || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mouvements_stock_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Goods Returns (Retours de Marchandise)
app.get('/api/returns', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { direction, productId, condition } = req.query;
    const items = await getGoodsReturns({
      direction: direction as any,
      productId: productId ? parseInt(productId as string, 10) : undefined,
      condition: condition as string,
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/returns', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { returnDirection, productId, quantity, itemCondition, stockAction, thirdPartyName, supplierId, documentRef, reason, notes } = req.body;
    if (!returnDirection || !productId || !quantity || !reason) {
      return res.status(400).json({ error: 'La direction du retour, le produit, la quantité et le motif sont obligatoires.' });
    }
    const result = await createGoodsReturn({
      returnDirection,
      productId: parseInt(productId, 10),
      quantity: parseInt(quantity, 10),
      itemCondition: itemCondition || 'NEW',
      stockAction: stockAction || (returnDirection === 'CUSTOMER' ? 'RESTOCK' : 'SUPPLIER_EXIT'),
      thirdPartyName,
      supplierId: supplierId ? parseInt(supplierId, 10) : undefined,
      documentRef,
      reason,
      notes,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/returns/export-csv', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const items = await getGoodsReturns();
    const headers = [
      'Date & Heure',
      'N° Retour',
      'Direction',
      'Référence SKU',
      'Désignation',
      'Quantité',
      'État Matériel',
      'Action Stock',
      'Montant Total (FCFA)',
      'Tiers (Client/Fournisseur)',
      'N° Bon / Réf',
      'Motif',
      'Opérateur',
    ];

    const rows = items.map((r) => [
      `"${r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : ''}"`,
      `"${r.returnNumber}"`,
      `"${r.returnDirection === 'CUSTOMER' ? 'Retour Client' : 'Retour Fournisseur'}"`,
      `"${r.productSku || ''}"`,
      `"${(r.productName || '').replace(/"/g, '""')}"`,
      r.quantity,
      `"${r.itemCondition === 'NEW' ? 'Neuf' : r.itemCondition === 'DEFECTIVE' ? 'Défectueux' : 'À expertiser'}"`,
      `"${r.stockAction === 'RESTOCK' ? 'Réintégré au stock' : r.stockAction === 'NO_RESTOCK' ? 'Quarantaine (Sans stock)' : 'Sortie vers fournisseur'}"`,
      r.totalCost || 0,
      `"${(r.thirdPartyName || r.supplierName || '').replace(/"/g, '""')}"`,
      `"${(r.documentRef || '').replace(/"/g, '""')}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${r.userEmail || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="retours_marchandises_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Physical Inventory
app.get('/api/inventory/sheet', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const sheet = await getInventorySheet();
    res.json(sheet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/submit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, notes, counts } = req.body;
    const result = await submitPhysicalInventory({
      title,
      notes,
      counts,
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/inventory/sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getInventorySessions();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/sessions/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await getInventorySessionDetails(id);
    if (!data) return res.status(404).json({ error: 'Session introuvable.' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reports & Statistics
app.get('/api/reports/summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const allProducts = await getProducts();
    const categoriesList = await getCategories();

    // Valuation by category
    const valuationByCat = categoriesList.map((cat) => {
      const prods = allProducts.filter((p) => p.categoryId === cat.id);
      const totalQty = prods.reduce((sum, p) => sum + p.currentStock, 0);
      const totalValuation = prods.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        productsCount: prods.length,
        totalQty,
        totalValuation,
      };
    });

    const outOfStock = allProducts.filter((p) => p.currentStock === 0);
    const lowStock = allProducts.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold);

    res.json({
      valuationByCat,
      outOfStock,
      lowStock,
      totalValuation: allProducts.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0),
      totalProductsCount: allProducts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Users & Roles Management (Admin only)
app.get('/api/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const list = await getAllUsers();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:id/role', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (role !== 'admin' && role !== 'storekeeper') {
      return res.status(400).json({ error: 'Rôle invalide. Doit être "admin" ou "storekeeper".' });
    }
    const updated = await updateUserRole(id, role);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Audit Logs (Admin only)
app.get('/api/audit-logs', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await getAuditLogs();
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Seed demo data (Admin only or if DB is empty)
app.post('/api/demo/seed', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await seedDemoData(req.user ? { id: req.user.id, email: req.user.email } : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset all store data to zero (Admin only)
app.post('/api/store/reset', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await resetAllStoreData(req.user ? { id: req.user.id, email: req.user.email } : undefined);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Backup Database (Admin only)
app.get('/api/backup', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const p = await db.select().from(products);
    const c = await db.select().from(categories);
    const s = await db.select().from(suppliers);
    const m = await db.select().from(stockMovements);
    const is = await db.select().from(inventorySessions);
    const ii = await db.select().from(inventoryItems);
    const al = await db.select().from(auditLogs);
    const u = await db.select().from(users);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      app: 'SecuStock',
      data: {
        categories: c,
        products: p,
        suppliers: s,
        stockMovements: m,
        inventorySessions: is,
        inventoryItems: ii,
        auditLogs: al,
        users: u.map((usr) => ({ id: usr.id, email: usr.email, role: usr.role, displayName: usr.displayName })),
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="secustock_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Restore Database from JSON backup (Admin only)
app.post('/api/restore', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { backup } = req.body;
    if (!backup || !backup.data) {
      return res.status(400).json({ error: 'Format de sauvegarde invalide.' });
    }

    const { categories: backupCats, products: backupProds, suppliers: backupSups } = backup.data;

    let restoredCats = 0;
    let restoredProds = 0;
    let restoredSups = 0;

    if (Array.isArray(backupCats)) {
      for (const cat of backupCats) {
        try {
          await db
            .insert(categories)
            .values({ name: cat.name, code: cat.code, description: cat.description })
            .onConflictDoNothing();
          restoredCats++;
        } catch (_) {}
      }
    }

    if (Array.isArray(backupSups)) {
      for (const sup of backupSups) {
        try {
          await db.insert(suppliers).values({
            name: sup.name,
            contactName: sup.contactName,
            phone: sup.phone,
            address: sup.address,
            email: sup.email,
            notes: sup.notes,
          });
          restoredSups++;
        } catch (_) {}
      }
    }

    if (Array.isArray(backupProds)) {
      for (const prod of backupProds) {
        try {
          await db
            .insert(products)
            .values({
              sku: prod.sku,
              barcode: prod.barcode,
              name: prod.name,
              categoryId: prod.categoryId,
              brand: prod.brand,
              description: prod.description,
              purchasePrice: prod.purchasePrice,
              sellingPrice: prod.sellingPrice,
              currentStock: prod.currentStock,
              minStockThreshold: prod.minStockThreshold,
              unit: prod.unit,
              location: prod.location,
              isArchived: prod.isArchived || false,
            })
            .onConflictDoNothing();
          restoredProds++;
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      message: `Restauration réussie : ${restoredCats} catégories, ${restoredSups} fournisseurs, ${restoredProds} produits restaurés.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start Express server and mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SecuStock server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
