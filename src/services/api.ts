// API Service for SecuStock

let currentAuthToken = '';

export function setApiAuthToken(token: string) {
  currentAuthToken = token;
}

export function getApiAuthToken(): string {
  return currentAuthToken;
}

export function formatFCFA(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const token = currentAuthToken || localStorage.getItem('secustock_auth_token') || 'demo-user:admin-1:admin@secustock.ci:Administrateur';
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Erreur ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  getMe: () => request<{ user: any }>('/api/auth/me'),

  // Dashboard
  getDashboard: () => request<any>('/api/dashboard'),

  // Products
  getProducts: (filters?: { search?: string; categoryId?: number; status?: string; isArchived?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId.toString());
    if (filters?.status) params.set('status', filters.status);
    if (filters?.isArchived !== undefined) params.set('isArchived', filters.isArchived.toString());
    return request<any[]>(`/api/products?${params.toString()}`);
  },
  getProduct: (id: number) => request<{ product: any; movements: any[] }>(`/api/products/${id}`),
  createProduct: (data: any) => request<any>('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) => request<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveProduct: (id: number) => request<any>(`/api/products/${id}/archive`, { method: 'PATCH' }),
  deleteProduct: (id: number) => request<any>(`/api/products/${id}`, { method: 'DELETE' }),
  importCsv: (csvData: string) => request<any>('/api/products/import-csv', { method: 'POST', body: JSON.stringify({ csvData }) }),

  // Categories
  getCategories: () => request<any[]>('/api/categories'),
  createCategory: (data: any) => request<any>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),

  // Suppliers
  getSuppliers: () => request<any[]>('/api/suppliers'),
  getSupplier: (id: number) => request<{ supplier: any; deliveries: any[] }>(`/api/suppliers/${id}`),
  createSupplier: (data: any) => request<any>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: any) => request<any>(`/api/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Movements
  createStockEntry: (data: any) => request<any>('/api/movements/entry', { method: 'POST', body: JSON.stringify(data) }),
  createStockExit: (data: any) => request<any>('/api/movements/exit', { method: 'POST', body: JSON.stringify(data) }),
  getMovements: (filters?: { productId?: number; categoryId?: number; movementType?: string; startDate?: string; endDate?: string; reason?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productId) params.set('productId', filters.productId.toString());
    if (filters?.categoryId) params.set('categoryId', filters.categoryId.toString());
    if (filters?.movementType) params.set('movementType', filters.movementType);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.reason) params.set('reason', filters.reason);
    return request<any[]>(`/api/movements?${params.toString()}`);
  },

  // Physical Inventory
  getInventorySheet: () => request<any[]>('/api/inventory/sheet'),
  submitInventory: (data: any) => request<any>('/api/inventory/submit', { method: 'POST', body: JSON.stringify(data) }),
  getInventorySessions: () => request<any[]>('/api/inventory/sessions'),
  getInventorySession: (id: number) => request<{ session: any; items: any[] }>(`/api/inventory/sessions/${id}`),

  // Reports
  getReportsSummary: () => request<any>('/api/reports/summary'),

  // Users & Admin
  getUsers: () => request<any[]>('/api/users'),
  updateUserRole: (id: number, role: string) => request<any>(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  getAuditLogs: () => request<any[]>('/api/audit-logs'),

  // Seed Demo
  seedDemo: () => request<any>('/api/demo/seed', { method: 'POST' }),

  // Reset store to zero
  resetStore: () => request<any>('/api/store/reset', { method: 'POST' }),

  // Goods Returns (Retours de marchandise)
  getReturns: (filters?: { direction?: string; productId?: number; condition?: string }) => {
    const params = new URLSearchParams();
    if (filters?.direction) params.set('direction', filters.direction);
    if (filters?.productId) params.set('productId', filters.productId.toString());
    if (filters?.condition) params.set('condition', filters.condition);
    return request<any[]>(`/api/returns?${params.toString()}`);
  },
  createReturn: (data: any) => request<any>('/api/returns', { method: 'POST', body: JSON.stringify(data) }),

  // Backup & Restore
  restoreBackup: (backup: any) => request<any>('/api/restore', { method: 'POST', body: JSON.stringify({ backup }) }),
};
