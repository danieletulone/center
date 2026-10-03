import type { Metadata } from 'next';
import { Play } from '@/ui/Play';

export const metadata: Metadata = {
  title: 'Play',
  description: 'Take a seat at the table. Three rivals. One Center.',
};

export default function PlayPage() {
  return <Play />;
}
