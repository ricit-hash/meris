import type { Metadata } from 'next';
import { Suspense } from 'react';
import EditRoute from './EditRoute';

export const metadata: Metadata = {
  title: 'Edit listing — Meris',
  description: 'Edit price, description, and license of your published listing.',
};

export default function EditPage() {
  return (
    <Suspense>
      <EditRoute />
    </Suspense>
  );
}
