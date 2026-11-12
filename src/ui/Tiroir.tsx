import { useEffect, type ReactNode } from 'react';

/** Panneau latéral (plein écran sur téléphone). */
export function Tiroir({ titre, onFermer, children, pied }: { titre: string; onFermer: () => void; children: ReactNode; pied?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onFermer} />
      <div role="dialog" aria-label={titre} className="relative flex h-full w-full max-w-xl flex-col bg-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
          <h2 className="text-[17px] font-semibold">{titre}</h2>
          <button className="btn-secondaire !px-2.5 !py-1.5" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pied && <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface px-5 py-3">{pied}</div>}
      </div>
    </div>
  );
}
