import { useState } from 'react';
import { useApp } from '../contexte';
import type { Client, Intervention } from '../domain/types';
import { toast } from '../ui/Toast';

interface Fichier {
  format: 'suivi-activites-import';
  interventions: Intervention[];
  clients: Client[];
  resume?: string[];
}

/** Import d'un fichier préparé à partir de l'ancien Google Sheet. */
export function Import() {
  const { store, compte } = useApp();
  const [f, setF] = useState<Fichier | null>(null);
  const [avance, setAvance] = useState<[number, number] | null>(null);
  const [fini, setFini] = useState(false);

  async function lire(file: File) {
    try {
      const j = JSON.parse(await file.text()) as Fichier;
      if (j.format !== 'suivi-activites-import' || !Array.isArray(j.interventions)) throw new Error();
      setF(j);
      setFini(false);
    } catch {
      toast("Ce fichier n'est pas un fichier d'import valide.");
    }
  }

  async function lancer() {
    if (!f || !confirm(`Importer ${f.interventions.length} interventions et ${f.clients.length} clients ?`)) return;
    setAvance([0, f.interventions.length + f.clients.length]);
    try {
      await store.importer(f.interventions, f.clients, compte.email, (a, b) => setAvance([a, b]));
      setFini(true);
      toast('Import terminé.');
    } catch (e) {
      toast("Échec de l'import : " + (e as Error).message);
    } finally {
      setAvance(null);
    }
  }

  const compte_ = (pred: (i: Intervention) => boolean) => f?.interventions.filter(pred).length ?? 0;
  return (
    <section className="card p-5">
      <h2 className="mb-1 text-[16px] font-semibold">Importer des données</h2>
      <p className="mb-3 text-[13px] text-muted">
        Fichier préparé à partir de l'ancien Sheet. Réimporter le même fichier met à jour les lignes au lieu de les dupliquer.
      </p>
      <input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && lire(e.target.files[0])} className="text-[13px]" />
      {f && (
        <div className="mt-4 rounded-lg bg-surface-2 p-3 text-[13px]">
          <div className="grid grid-cols-2 gap-1">
            <span>Metz en cours</span>
            <b>{compte_((i) => i.agence === 'Metz' && !i.archive)}</b>
            <span>Strasbourg en cours</span>
            <b>{compte_((i) => i.agence === 'Strasbourg' && !i.archive)}</b>
            <span>Archives</span>
            <b>{compte_((i) => i.archive)}</b>
            <span>Clients</span>
            <b>{f.clients.length}</b>
          </div>
          {f.resume && (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {f.resume.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          <button className="btn-primaire mt-3" disabled={!!avance || fini} onClick={lancer}>
            {avance ? `Import… ${avance[0]} / ${avance[1]}` : fini ? 'Import terminé ✓' : 'Lancer l’import'}
          </button>
        </div>
      )}
    </section>
  );
}
