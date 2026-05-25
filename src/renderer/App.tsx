// src/renderer/App.tsx
import { useEffect } from 'react';
import { useStore } from './state';

export default function App() {
  const ready = useStore(s => s.ready);
  const hydrate = useStore(s => s.hydrate);
  const mode = useStore(s => s.config.windowState.mode);

  useEffect(() => { hydrate(); }, [hydrate]);

  if (!ready) return null;

  return mode === 'folded' ? <div>folded stub</div> : <div>expanded stub</div>;
}
