import { useEffect, useState } from 'react';

let pousser: (m: string) => void = () => {};
export const toast = (m: string) => pousser(m);

export function Toasts() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    pousser = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 3200);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[14px] text-bg shadow-lg" role="status">
      {msg}
    </div>
  );
}
