export const workspaceNavigation = [
  { heading: null, items: [{ href: '/dashboard', label: 'Home' }] },
  { heading: 'EXPLORE', items: [{ href: '/catalog', label: 'Marketplace' }] },
  { heading: 'LIBRARY', items: [{ href: '/purchases', label: 'Purchases' }] },
  {
    heading: 'PUBLISH',
    items: [
      { href: '/dashboard#analysis', label: 'Analysis' },
      { href: '/dashboard#listings', label: 'Listings' },
      { href: '/publish', label: 'Publish' },
    ],
  },
] as const;
