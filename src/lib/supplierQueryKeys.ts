// Fábrica central de query keys do portal fornecedor.
// Convenção: ['supplier', orgId, domínio, params] — invalidar por prefixo.

export const supplierKeys = {
  all: ['supplier'] as const,
  org: (userId: string | null | undefined) => ['supplier', 'org', userId] as const,
  scope: (orgId: string) => ['supplier', orgId] as const,
  fulfillments: (orgId: string, params?: Record<string, unknown>) =>
    params ? (['supplier', orgId, 'fulfillments', params] as const) : (['supplier', orgId, 'fulfillments'] as const),
  fulfillment: (orgId: string, id: string) => ['supplier', orgId, 'fulfillments', 'detail', id] as const,
  dashboard: (orgId: string) => ['supplier', orgId, 'dashboard'] as const,
  products: (orgId: string, params?: Record<string, unknown>) =>
    params ? (['supplier', orgId, 'products', params] as const) : (['supplier', orgId, 'products'] as const),
  product: (orgId: string, id: string) => ['supplier', orgId, 'products', 'detail', id] as const,
  referenceCandidates: (orgId: string, productId: string) =>
    ['supplier', orgId, 'reference-candidates', productId] as const,
  referenceImports: (orgId: string, productId: string) =>
    ['supplier', orgId, 'reference-imports', productId] as const,
  stock: (orgId: string, params?: Record<string, unknown>) =>
    params ? (['supplier', orgId, 'stock', params] as const) : (['supplier', orgId, 'stock'] as const),
  movements: (orgId: string, params?: Record<string, unknown>) =>
    params ? (['supplier', orgId, 'movements', params] as const) : (['supplier', orgId, 'movements'] as const),
  occurrences: (orgId: string, params?: Record<string, unknown>) =>
    params ? (['supplier', orgId, 'occurrences', params] as const) : (['supplier', orgId, 'occurrences'] as const),
  locations: (orgId: string) => ['supplier', orgId, 'locations'] as const,
  settings: (orgId: string) => ['supplier', orgId, 'settings'] as const,
};
