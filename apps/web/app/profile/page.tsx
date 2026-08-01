import type { Metadata } from 'next';
import ProfileRoute from './ProfileRoute';

export const metadata: Metadata = {
  title: 'Publisher profile',
  description: 'Set up your publisher account for the Meris dataset market.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileRoute />;
}
