import { useMemo, useState } from 'react';
import { useApp } from '../contexte';
import { useClients } from '../data/hooks';
import { evenements } from '../domain/rules';
import { ORIGINES, interventionVide, type Agence } from '../domain/types';
import { Tiroir } from '../ui/Tiroir';
import { toast } from '../ui/Toast';
import { Champ, Pastilles, Section } from './champs';

/** Saisie rapide d'une demande : le reste se complète ensuite dans la fiche. */
export function NouvelleDemande({ agence, onFermer }: { agence: Agence; onFermer: () => void }) {
  const { store, compte, profil, metiers } = useApp();
  const clients = useClients([agence]);
  const [i, setI] = useState(() => interventionVide(agence));
  const [enCours, setEnCours] = useState(false);
  const fiche = useMemo(() => (clients ?? []).find((c) => c.nom.toLowerCase() === i.client.trim().toLowerCase()), [clients, i.client]);

  async function enregistrer() {
    if (!i.client.trim()) return toast('Le client est obligatoire.');
    if (i.metiers.length === 0) return toast('Choisis au moins une activité.');
    setEnCours(true);
    try {
      const n = { ...i, client: i.client.trim(), ville: fiche?.commune ?? '', dpt: fiche?.codePostal.slice(0, 2) ?? '' };
      n.historique = evenements(null, n, profil.initiales, new Date().toISOString());
      await store.saveIntervention(n, compte.email, null);
      toast('Demande enregistrée.');
      onFermer();
    } catch (e) {
      toast("Échec de l'enregistrement : " + (e as Error).message);
      setEnCours(false);
    }
  }

  return (
    <Tiroir
      titre={`Nouvelle demande — ${agence}`}
      onFermer={onFermer}
      pied={
        <>
          <button className="btn-primaire" disabled={enCours} onClick={enregistrer}>
            ✓ Enregistrer la demande
          </button>
          <button className="btn-secondaire" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <Section titre="Client & activité" icone="▦">
        <Champ label="Client *" large aide={fiche ? `Client connu : ${[fiche.commune, fiche.contact].filter(Boolean).join(' · ')}` : undefined}>
          <input className="champ" list="clients-connus" value={i.client} autoFocus onChange={(e) => setI({ ...i, client: e.target.value })} />
          <datalist id="clients-connus">
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.nom} />
            ))}
          </datalist>
        </Champ>
        <div className="col-span-2">
          <span className="label">Origine de la demande</span>
          <Pastilles unique options={ORIGINES} valeurs={i.origine ? [i.origine] : []} onChange={(v) => setI({ ...i, origine: v[0] ?? '' })} />
        </div>
        <Champ label="N° d'opportunité">
          <input className="champ" placeholder="Optionnel" value={i.numOpportunite} onChange={(e) => setI({ ...i, numOpportunite: e.target.value })} />
        </Champ>
        <Champ label="Chargé d'affaire">
          <input className="champ" placeholder="Optionnel" value={i.chargeAffaire} onChange={(e) => setI({ ...i, chargeAffaire: e.target.value })} />
        </Champ>
        <div className="col-span-2">
          <span className="label">Activités *</span>
          <Pastilles options={metiers.map((m) => m.nom)} valeurs={i.metiers} onChange={(v) => setI({ ...i, metiers: v })} />
        </div>
      </Section>
      <Section titre="Notes" icone="✎">
        <div className="col-span-2">
          <textarea className="champ min-h-[90px]" placeholder="Contexte, contact, demande particulière…" value={i.commentaire} onChange={(e) => setI({ ...i, commentaire: e.target.value })} />
        </div>
      </Section>
    </Tiroir>
  );
}
