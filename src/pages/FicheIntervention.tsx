import { useMemo, useState, type ReactNode } from 'react';
import { agencesVisibles, estManager, peutModifier, useApp } from '../contexte';
import { fmt } from '../domain/dates';
import { alertes, prochaine, prochainControle, rapportPrevu, relancePrevue } from '../domain/rules';
import { AGENCES, STATUTS, STATUTS_FERMES, type Intervention, type Statut } from '../domain/types';
import { PuceAlerte } from '../ui/Statut';
import { Tiroir } from '../ui/Tiroir';
import { toast } from '../ui/Toast';

function Champ({ label, children, aide, large }: { label: string; children: ReactNode; aide?: string; large?: boolean }) {
  return (
    <label className={large ? 'col-span-2 block' : 'block'}>
      <span className="label">{label}</span>
      {children}
      {aide && <span className="mt-0.5 block text-[12px] text-muted">{aide}</span>}
    </label>
  );
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="section-title mb-2">{titre}</h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

export function FicheIntervention({ initiale, onFermer }: { initiale: Intervention; onFermer: () => void }) {
  const { store, compte, profil, metiers, utilisateurs } = useApp();
  const [i, setI] = useState<Intervention>(initiale);
  const [creerSuivante, setCreerSuivante] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const nouveau = !initiale.id;
  const modifiable = peutModifier(profil, i.agence);
  const set = <K extends keyof Intervention>(k: K, v: Intervention[K]) => setI((x) => ({ ...x, [k]: v }));

  const intervenants = useMemo(
    () => utilisateurs.filter((u) => u.actif && (u.agence === 'Toutes' || u.agence === i.agence)).sort((a, b) => a.nom.localeCompare(b.nom)),
    [utilisateurs, i.agence],
  );
  const fermeture = STATUTS_FERMES.includes(i.statut) && !STATUTS_FERMES.includes(initiale.statut);
  const suivante = i.statut === 'Clôturé' ? prochainControle(i, metiers) : null;
  const al = alertes(i);

  async function enregistrer() {
    if (!i.client.trim()) return toast('Le client est obligatoire.');
    setEnCours(true);
    try {
      const n = { ...i, client: i.client.trim(), archive: STATUTS_FERMES.includes(i.statut) };
      const id = await store.saveIntervention(n, compte.email, nouveau ? null : initiale);
      if (fermeture && suivante && creerSuivante) {
        await store.saveIntervention({ ...suivante, origineId: id }, compte.email, null);
        toast(`Archivé. Prochain contrôle créé (échéance ${fmt(suivante.echeance)}).`);
      } else toast(n.archive ? 'Enregistré et archivé.' : 'Enregistré.');
      onFermer();
    } catch (e) {
      toast("Échec de l'enregistrement : " + (e as Error).message);
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    if (!confirm('Supprimer définitivement cette intervention ?')) return;
    await store.deleteIntervention(i, compte.email);
    toast('Supprimé.');
    onFermer();
  }

  const date = (k: 'echeance' | 'dateEnvoiDevis' | 'dateRelance' | 'dateDebut' | 'dateFin' | 'dateRapportEnvoye' | 'prochaineManuelle') => (
    <input type="date" className="champ" value={i[k]} disabled={!modifiable} onChange={(e) => set(k, e.target.value)} />
  );

  return (
    <Tiroir
      titre={nouveau ? 'Nouvelle intervention' : i.client || 'Intervention'}
      onFermer={onFermer}
      pied={
        modifiable ? (
          <>
            <button className="btn-primaire" disabled={enCours} onClick={enregistrer}>
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button className="btn-secondaire" onClick={onFermer}>
              Annuler
            </button>
            <span className="flex-1" />
            {!nouveau && profil.role === 'admin' && (
              <button className="btn-danger" onClick={supprimer}>
                Supprimer
              </button>
            )}
          </>
        ) : (
          <span className="text-[13px] text-muted">Lecture seule : cette intervention dépend d'une autre agence.</span>
        )
      }
    >
      {al.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {al.map((a) => (
            <PuceAlerte key={a.type} a={a} />
          ))}
        </div>
      )}

      <div className="mb-5">
        <span className="label">Statut</span>
        <div className="flex flex-wrap gap-1.5">
          {STATUTS.map((s: Statut) => (
            <button
              key={s}
              type="button"
              disabled={!modifiable}
              onClick={() => set('statut', s)}
              className={`puce border py-1 transition ${
                i.statut === s ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {fermeture && (
          <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3 text-[13px]">
            La ligne partira dans les <b>archives</b> à l'enregistrement.
            {suivante && (
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={creerSuivante} onChange={(e) => setCreerSuivante(e.target.checked)} />
                Créer le prochain contrôle « Devis à faire », échéance <b>{fmt(suivante.echeance)}</b>
              </label>
            )}
          </div>
        )}
      </div>

      <Groupe titre="Client">
        <Champ label="Client *" large>
          <input className="champ" value={i.client} disabled={!modifiable} onChange={(e) => set('client', e.target.value)} autoFocus={nouveau} />
        </Champ>
        <Champ label="Ville">
          <input className="champ" value={i.ville} disabled={!modifiable} onChange={(e) => set('ville', e.target.value)} />
        </Champ>
        <Champ label="Département">
          <input className="champ" inputMode="numeric" maxLength={3} value={i.dpt} disabled={!modifiable} onChange={(e) => set('dpt', e.target.value)} />
        </Champ>
        <Champ label="N° d'affaire">
          <input className="champ" value={i.numAffaire} disabled={!modifiable} onChange={(e) => set('numAffaire', e.target.value)} />
        </Champ>
        <Champ label="Agence (équipe qui intervient)">
          <select className="champ" value={i.agence} disabled={!modifiable || !estManager(profil)} onChange={(e) => set('agence', e.target.value as Intervention['agence'])}>
            {AGENCES.filter((a) => agencesVisibles(profil).includes(a)).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Champ>
      </Groupe>

      <Groupe titre="Mission">
        <Champ label="Métier">
          <select className="champ" value={i.metier} disabled={!modifiable} onChange={(e) => set('metier', e.target.value)}>
            {metiers.map((m) => (
              <option key={m.nom}>{m.nom}</option>
            ))}
          </select>
        </Champ>
        <Champ label="Intervenant">
          <select className="champ" value={i.intervenant} disabled={!modifiable} onChange={(e) => set('intervenant', e.target.value)}>
            <option value="">—</option>
            {intervenants.map((u) => (
              <option key={u.email} value={u.initiales}>
                {u.nom} ({u.initiales})
              </option>
            ))}
            {i.intervenant && !intervenants.some((u) => u.initiales === i.intervenant) && <option value={i.intervenant}>{i.intervenant}</option>}
          </select>
        </Champ>
        <div className="col-span-2 flex gap-5 text-[14px]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={i.reglementaire} disabled={!modifiable} onChange={(e) => set('reglementaire', e.target.checked)} /> Réglementaire
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={i.scola} disabled={!modifiable} onChange={(e) => set('scola', e.target.checked)} /> Scola
          </label>
        </div>
        <Champ label="Échéance de réalisation" aide="Date limite (contrôle périodique).">
          {date('echeance')}
        </Champ>
      </Groupe>

      <Groupe titre="Devis">
        <Champ label="Envoi du devis">{date('dateEnvoiDevis')}</Champ>
        <Champ label="Relance" aide={!i.dateRelance && relancePrevue(i) ? `Auto : ${fmt(relancePrevue(i))}` : 'Vide = envoi + 30 j'}>
          {date('dateRelance')}
        </Champ>
        <label className="col-span-2 flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={i.relanceFaite} disabled={!modifiable} onChange={(e) => set('relanceFaite', e.target.checked)} /> Relance faite
        </label>
        <Champ label="Prix HT (€)">
          <input className="champ" type="number" min={0} step={10} value={i.prixHT ?? ''} disabled={!modifiable} onChange={(e) => set('prixHT', e.target.value === '' ? null : Number(e.target.value))} />
        </Champ>
        <Champ label="Nb jours d'intervention">
          <input className="champ" type="number" min={0} step={0.5} value={i.nbJours ?? ''} disabled={!modifiable} onChange={(e) => set('nbJours', e.target.value === '' ? null : Number(e.target.value))} />
        </Champ>
      </Groupe>

      <Groupe titre="Intervention et rapport">
        <Champ label="Début">{date('dateDebut')}</Champ>
        <Champ label="Fin">{date('dateFin')}</Champ>
        <Champ label="Rapport envoyé le" aide={rapportPrevu(i) ? `Prévu : ${fmt(rapportPrevu(i))} (fin + 42 j)` : undefined}>
          {date('dateRapportEnvoye')}
        </Champ>
        <Champ label="Prochaine intervention" aide={!i.prochaineManuelle && prochaine(i, metiers) ? `Auto : ${fmt(prochaine(i, metiers))}` : 'Vide = fin + périodicité du métier'}>
          {date('prochaineManuelle')}
        </Champ>
      </Groupe>

      <Groupe titre="Commentaire">
        <div className="col-span-2">
          <textarea className="champ min-h-[90px]" value={i.commentaire} disabled={!modifiable} onChange={(e) => set('commentaire', e.target.value)} />
        </div>
      </Groupe>

      {!nouveau && (
        <p className="text-[12px] text-muted">
          Créé par {initiale.creePar || '—'} · Modifié le {initiale.modifieLe ? new Date(initiale.modifieLe).toLocaleString('fr-FR') : '—'} par {initiale.modifiePar || '—'}
        </p>
      )}
    </Tiroir>
  );
}
