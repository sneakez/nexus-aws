import { useEffect, useState } from 'react';
import { omsStore } from '@/stores/omsStore';

export function useOmsRevision() {
  const [, setRevision] = useState(0);
  useEffect(() => omsStore.subscribe(() => setRevision(revision => revision + 1)), []);
}
