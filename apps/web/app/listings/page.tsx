import type { Metadata } from 'next';
import ListingsRoute from './ListingsRoute';

export const metadata: Metadata = { title: 'Listings — Meris', description: 'Manage publisher listings inside Meris.', robots: { index: false, follow: false } };
export default function ListingsPage() { return <ListingsRoute />; }
