export const workspaceNavigation = [
  { heading: null, items: [{ href: '/app', label: 'Home' }] },
  { heading: 'EXPLORE', items: [{ href: '/app/marketplace', label: 'Marketplace' }] },
  { heading: 'LIBRARY', items: [{ href: '/app/purchases', label: 'Purchases' }] },
  {
    heading: 'PUBLISH',
    items: [
      { href: '/app/analysis', label: 'Analytics' },
      { href: '/app/listings', label: 'Listings' },
      { href: '/app/publish', label: 'Publish' },
    ],
  },
] as const;
