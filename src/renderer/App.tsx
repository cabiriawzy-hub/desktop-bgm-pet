// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';
import { FoldedPet } from './components/FoldedPet';
import { ExpandedPlayer } from './components/ExpandedPlayer';
import { useAutoAdvance } from './auto-advance';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);
  useAutoAdvance();

  if (!ready) return null;

  return mode === 'folded' ? <FoldedPet /> : <ExpandedPlayer />;
}
