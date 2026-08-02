export const workspaceNavigation = [
  { heading: null, items: [{ href: '/dashboard', label: 'Home' }] },
  { heading: 'EXPLORE', items: [{ href: '/marketplace', label: 'Marketplace' }] },
  { heading: 'LIBRARY', items: [{ href: '/purchases', label: 'Purchases' }] },
  {
    heading: 'PUBLISH',
    items: [
      { href: '/analysis', label: 'Analytics' },
      { href: '/analysis#listings', label: 'Listings' },
      { href: '/publish', label: 'Publish' },
    ],
  },
] as const;
