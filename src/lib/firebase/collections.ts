export const COLLECTIONS = {
  releases: 'releases',
  visuals: 'visuals',
  campaigns: 'campaigns',
  events: 'events',
  products: 'products',
  site: 'site',
  users: 'users',
  orders: 'orders',
  newsletterSignups: 'newsletterSignups',
  contactRequests: 'contactRequests',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
