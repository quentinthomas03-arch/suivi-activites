import { useEffect, useState } from 'react';

interface Msg {
  texte: string;
  action?: { libelle: string; fn: () => void };
}

let pousser: (m: Msg) => void = () => {};
/** Notification ; avec `action`, un bouton (ex. « Annuler ») reste disponible quelques secondes. */
export const toast = (texte: string, action?: Msg['action']) => pousser({ texte, action });

export function Toasts() {
  const [msg, setMsg] = useState<Msg | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    pousser = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), m.action ? 7000 : 3200);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-[14px] text-bg shadow-lg" role="status">
      {msg.texte}
      {msg.action && (
        <button
          className="rounded-md bg-bg/15 px-2.5 py-1 font-semibold hover:bg-bg/25"
          onClick={() => {
            msg.action!.fn();
            setMsg(null);
          }}
        >
          {msg.action.libelle}
        </button>
      )}
    </div>
  );
}
