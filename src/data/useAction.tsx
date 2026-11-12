import { useState } from 'react';
import { useApp, peutModifier } from '../contexte';
import { actionsPour, type ActionRapide } from '../domain/actions';
import { fmt, today } from '../domain/dates';
import { evenements, prochainControle } from '../domain/rules';
import type { Intervention } from '../domain/types';
import { toast } from '../ui/Toast';

/** Applique une action en un clic, avec historique et « Annuler ». */
export function useActionRapide() {
  const { store, compte, profil, metiers } = useApp();
  const [enCours, setEnCours] = useState<string | null>(null);

  async function executer(avant: Intervention, a: ActionRapide) {
    const maintenant = new Date().toISOString();
    const n = a.appliquer(avant, today());
    const suivante = a.cloture ? prochainControle(n, metiers) : null;
    if (a.cloture && !confirm(`Clôturer « ${avant.client} » ?${suivante ? `\nLe prochain contrôle sera créé (échéance ${fmt(suivante.echeance)}).` : ''}`)) return;
    setEnCours(avant.id);
    try {
      n.historique = [...evenements(avant, n, profil.initiales, maintenant), ...avant.historique].slice(0, 200);
      await store.saveIntervention(n, compte.email, avant);
      if (suivante) {
        await store.saveIntervention({ ...suivante, historique: evenements(null, suivante, profil.initiales, maintenant) }, compte.email, null);
        toast(`« ${avant.client} » clôturé. Prochain contrôle : ${fmt(suivante.echeance)}.`);
        return;
      }
      toast(`« ${avant.client} » : ${a.libelle.toLowerCase()}.`, {
        libelle: 'Annuler',
        fn: () => {
          const retour = { ...avant, historique: [{ date: new Date().toISOString(), par: profil.initiales, type: 'modification' as const, texte: `Annulé : ${a.libelle}` }, ...n.historique] };
          void store.saveIntervention(retour, compte.email, n).then(() => toast('Action annulée.'));
        },
      });
    } catch (e) {
      toast('Échec : ' + (e as Error).message);
    } finally {
      setEnCours(null);
    }
  }

  return { executer, enCours, actions: (i: Intervention) => (peutModifier(profil, i.agence) ? actionsPour(i) : []) };
}

/** Boutons d'action d'une ligne (le premier mis en avant). */
export function BoutonsAction({ i, compact = false }: { i: Intervention; compact?: boolean }) {
  const { executer, enCours, actions } = useActionRapide();
  const l = actions(i);
  if (l.length === 0) return null;
  return (
    <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      {l.map((a, k) => (
        <button
          key={a.id}
          title={a.aide}
          disabled={enCours === i.id}
          onClick={() => executer(i, a)}
          className={`whitespace-nowrap rounded-md border px-2 ${compact ? 'py-0.5 text-[12px]' : 'py-1 text-[13px]'} font-medium transition disabled:opacity-50 ${
            k === 0 ? 'border-accent bg-accent text-accent-ink hover:opacity-90' : 'border-line bg-surface text-ink hover:bg-surface-2'
          }`}
        >
          {k === 0 ? '✓ ' : ''}
          {a.libelle}
        </button>
      ))}
    </span>
  );
}
