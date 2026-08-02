import type { Metadata } from 'next';
import PublicProfile from '../../../components/profile/PublicProfile';

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username} · Meris`;
  return {
    title,
    description: `Datasets published by ${username} on Meris — range-ready blobs on Shelby.`,
    robots: { index: true, follow: true },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  return <PublicProfile username={decodeURIComponent(username)} />;
}
