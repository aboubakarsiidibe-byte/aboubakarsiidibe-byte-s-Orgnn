import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (authenticated via Firebase Auth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('storekeeper'), // 'admin' | 'storekeeper'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Categories for security equipment
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Suppliers table
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  phone: text('phone').notNull(),
  address: text('address'),
  email: text('email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(), // Référence unique
  barcode: text('barcode'), // Code-barres facultatif
  name: text('name').notNull(), // Nom du produit
  categoryId: integer('category_id')
    .references(() => categories.id)
    .notNull(),
  brand: text('brand'), // Marque
  description: text('description'),
  purchasePrice: integer('purchase_price').notNull().default(0), // Prix d'achat en FCFA
  sellingPrice: integer('selling_price').default(0), // Prix de vente en FCFA
  currentStock: integer('current_stock').notNull().default(0), // Quantité en stock
  minStockThreshold: integer('min_stock_threshold').notNull().default(5), // Seuil minimal
  unit: text('unit').notNull().default('Unité'), // Unité de mesure (Unité, Mètre, Kit, etc.)
  location: text('location'), // Emplacement dans le magasin
  isArchived: boolean('is_archived').notNull().default(false), // Archivage
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Stock Movements (Entrées, Sorties, Régularisations)
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  movementNumber: text('movement_number').notNull().unique(), // ENT-..., SOR-..., REG-...
  movementType: text('movement_type').notNull(), // 'IN' | 'OUT' | 'ADJUSTMENT'
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(), // Quantité positive déplacée
  stockBefore: integer('stock_before').notNull(),
  stockAfter: integer('stock_after').notNull(),
  unitCost: integer('unit_cost'), // Prix unitaire FCFA
  totalCost: integer('total_cost'), // Montant total FCFA
  supplierId: integer('supplier_id').references(() => suppliers.id),
  reason: text('reason').notNull(), // Motif
  documentRef: text('document_ref'), // Facture, Bon de livraison, Bon de sortie
  recipient: text('recipient'), // Client ou destinataire
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Physical Inventory Sessions
export const inventorySessions = pgTable('inventory_sessions', {
  id: serial('id').primaryKey(),
  sessionNumber: text('session_number').notNull().unique(),
  title: text('title').notNull(),
  status: text('status').notNull().default('COMPLETED'), // 'IN_PROGRESS' | 'COMPLETED'
  totalItemsCounted: integer('total_items_counted').notNull().default(0),
  totalDiscrepancy: integer('total_discrepancy').notNull().default(0),
  valuationDiscrepancy: integer('valuation_discrepancy').notNull().default(0),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Physical Inventory Items
export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => inventorySessions.id)
    .notNull(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  theoreticalStock: integer('theoretical_stock').notNull(),
  countedStock: integer('counted_stock').notNull(),
  discrepancy: integer('discrepancy').notNull(),
  unitCost: integer('unit_cost').notNull().default(0),
  discrepancyValue: integer('discrepancy_value').notNull().default(0),
  movementId: integer('movement_id').references(() => stockMovements.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Goods Returns (Retours Marchandises - Client ou Fournisseur)
export const goodsReturns = pgTable('goods_returns', {
  id: serial('id').primaryKey(),
  returnNumber: text('return_number').notNull().unique(), // RET-CLI-... or RET-FOU-...
  returnDirection: text('return_direction').notNull(), // 'CUSTOMER' | 'SUPPLIER'
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: integer('unit_cost').notNull().default(0),
  totalCost: integer('total_cost').notNull().default(0),
  itemCondition: text('item_condition').notNull().default('NEW'), // 'NEW' | 'DEFECTIVE' | 'TO_INSPECT'
  stockAction: text('stock_action').notNull().default('RESTOCK'), // 'RESTOCK' | 'NO_RESTOCK' | 'SUPPLIER_EXIT'
  thirdPartyName: text('third_party_name'),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  documentRef: text('document_ref'),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('COMPLETED'),
  movementId: integer('movement_id').references(() => stockMovements.id),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  movements: many(stockMovements),
  inventories: many(inventorySessions),
  returns: many(goodsReturns),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  movements: many(stockMovements),
  returns: many(goodsReturns),
}));

export const goodsReturnsRelations = relations(goodsReturns, ({ one }) => ({
  product: one(products, {
    fields: [goodsReturns.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [goodsReturns.supplierId],
    references: [suppliers.id],
  }),
  movement: one(stockMovements, {
    fields: [goodsReturns.movementId],
    references: [stockMovements.id],
  }),
  user: one(users, {
    fields: [goodsReturns.userId],
    references: [users.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  movements: many(stockMovements),
  inventoryItems: many(inventoryItems),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [stockMovements.supplierId],
    references: [suppliers.id],
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
  }),
}));

export const inventorySessionsRelations = relations(inventorySessions, ({ one, many }) => ({
  user: one(users, {
    fields: [inventorySessions.userId],
    references: [users.id],
  }),
  items: many(inventoryItems),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  session: one(inventorySessions, {
    fields: [inventoryItems.sessionId],
    references: [inventorySessions.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  movement: one(stockMovements, {
    fields: [inventoryItems.movementId],
    references: [stockMovements.id],
  }),
}));
