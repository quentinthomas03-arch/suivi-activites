import type { ReactNode } from 'react';

export function Champ({ label, children, aide, large }: { label: string; children: ReactNode; aide?: ReactNode; large?: boolean }) {
  return (
    <label className={large ? 'col-span-2 block' : 'block'}>
      <span className="label">{label}</span>
      {children}
      {aide && <span className="mt-0.5 block text-[12px] text-muted">{aide}</span>}
    </label>
  );
}

export function Section({ titre, icone, children }: { titre: string; icone: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="section-title mb-2.5 flex items-center gap-1.5">
        <span aria-hidden>{icone}</span>
        {titre}
      </h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

/** Choix multiple (ou unique) sous forme de pastilles. */
export function Pastilles({
  options,
  valeurs,
  onChange,
  disabled,
  unique,
}: {
  options: readonly string[];
  valeurs: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  unique?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = valeurs.includes(o);
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(unique ? (on ? [] : [o]) : on ? valeurs.filter((x) => x !== o) : [...valeurs, o])}
            className={`puce border px-3 py-1 text-[13px] transition ${
              on ? 'border-accent bg-accent-soft text-accent-soft-ink' : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {on && !unique ? '✓ ' : ''}
            {o}
          </button>
        );
      })}
    </div>
  );
}
