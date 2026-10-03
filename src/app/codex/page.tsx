import type { Metadata } from 'next';
import { Codex } from '@/ui/Codex';

export const metadata: Metadata = {
  title: 'Codex',
  description: 'All 82 cards of CENTER — 64 base library cards across seven suits and 18 Genesis cards across three temperaments.',
};

export default function CodexPage() {
  return <Codex />;
}
