import { useCallback, useEffect, useMemo, useState } from 'react';
import { agencesVisibles, estManager, peutModifier, useApp } from '../contexte';
import { useClients } from '../data/hooks';
import { fmt } from '../domain/dates';
import { actionsPour } from '../domain/actions';
import { today } from '../domain/dates';
import { CASES, alertes, etape, evenements, prochaine, prochainControle, rapportPrevu, relancePrevue } from '../domain/rules';
import {
  AGENCES,
  ETAPES_PRODUCTION,
  ORIGINES,
  REGLEMENTAIRE,
  SCOLA,
  STATUTS_COMMERCIAUX,
  interventionVide,
  type Etape,
  type EvenementHistorique,
  type Intervention,
} from '../domain/types';
import { PuceAlerte, PuceEtape } from '../ui/Statut';
import { Tiroir } from '../ui/Tiroir';
import { toast } from '../ui/Toast';
import { Champ, Pastilles, Section } from './champs';

/** Cases cochées correspondant à chaque étape « manuelle » de la frise. */
const CASES_ETAPE: Partial<Record<Etape, (keyof Intervention)[]>> = {
  'En relecture': ['enRelecture'],
  'Rapport transmis': ['enRelecture', 'rapportTransmis'],
  'Envoyé au client': ['enRelecture', 'rapportTransmis', 'envoyeClient'],
};

function Frise({ i, onEtape, disabled }: { i: Intervention; onEtape: (e: Etape) => void; disabled: boolean }) {
  const actuelle = etape(i);
  const idx = ETAPES_PRODUCTION.indexOf(actuelle);
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-[560px] items-start">
        {ETAPES_PRODUCTION.map((e, k) => {
          const fait = idx > k || actuelle === 'Clôturé';
          const courant = idx === k;
          const cliquable = !disabled && k >= 4; // les 4 premières dépendent des dates
          return (
            <li key={e} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${k === 0 ? 'opacity-0' : fait || courant ? 'bg-ok' : 'bg-line'}`} />
                <button
                  type="button"
                  disabled={!cliquable}
                  onClick={() => onEtape(e)}
                  title={cliquable ? `Passer à « ${e} »` : 'Étape calculée à partir des dates'}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    fait ? 'bg-ok text-white' : courant ? 'bg-accent text-accent-ink ring-4 ring-accent/20' : 'border border-line bg-surface text-muted'
                  } ${cliquable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                >
                  {fait ? '✓' : k + 1}
                </button>
                <span className={`h-0.5 flex-1 ${k === ETAPES_PRODUCTION.length - 1 ? 'opacity-0' : fait ? 'bg-ok' : 'bg-line'}`} />
              </div>
              <span className={`mt-1 px-0.5 text-[11px] leading-tight ${courant ? 'font-semibold text-ink' : 'text-muted'}`}>{e}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Historique({ h, onAnnuler, onAjouter, disabled }: { h: EvenementHistorique[]; onAnnuler: (e: EvenementHistorique) => void; onAjouter: (t: string) => void; disabled: boolean }) {
  const [txt, setTxt] = useState('');
  return (
    <section className="mb-4">
      <h3 className="section-title mb-2.5">💬 Historique</h3>
      {h.length > 0 && (
        <ol className="mb-3 max-h-64 divide-y divide-line/70 overflow-y-auto rounded-xl border border-line bg-surface">
          {h.map((e, k) => (
            <li key={k} className={`border-l-[3px] px-3 py-2 ${e.type === 'commentaire' ? 'border-l-accent' : 'border-l-line'}`}>
              <div className={`text-[14px] ${e.type === 'commentaire' ? '' : 'italic text-ink/80'}`}>{e.texte}</div>
              <div className="text-[12px] text-muted">
                {e.par} · {new Date(e.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                {e.type === 'case' && k === h.findIndex((x) => x.type === 'case' && x.champ === e.champ) && !disabled && (
                  <button className="ml-2 underline hover:text-ink" onClick={() => onAnnuler(e)}>
                    Annuler
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <input
            className="champ"
            placeholder="Ajouter un commentaire…"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && txt.trim()) {
                onAjouter(txt.trim());
                setTxt('');
              }
            }}
          />
          <button
            className="btn-secondaire shrink-0"
            disabled={!txt.trim()}
            onClick={() => {
              onAjouter(txt.trim());
              setTxt('');
            }}
          >
            + Ajouter
          </button>
        </div>
      )}
    </section>
  );
}

export function FicheIntervention({ initiale, onFermer }: { initiale: Intervention; onFermer: () => void }) {
  const { store, compte, profil, metiers, utilisateurs } = useApp();
  const [base, setBase] = useState<Intervention>(initiale); // version enregistrée
  const [i, setI] = useState<Intervention>(initiale);
  const [cloture, setCloture] = useState(false);
  const [creerSuivante, setCreerSuivante] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const clients = useClients([i.agence]);
  const nouveau = !base.id;
  const modifiable = peutModifier(profil, i.agence);
  const set = <K extends keyof Intervention>(k: K, v: Intervention[K]) => setI((x) => ({ ...x, [k]: v }));
  const autre = AGENCES.find((a) => a !== i.agence)!;
  const peutBasculer = modifiable && agencesVisibles(profil).includes(autre) && !nouveau;

  const personnes = useMemo(
    () => utilisateurs.filter((u) => u.actif && (u.agence === 'Toutes' || u.agence === i.agence)).sort((a, b) => a.initiales.localeCompare(b.initiales)),
    [utilisateurs, i.agence],
  );
  const al = alertes(i);
  const et = etape(i);
  const suivante = prochainControle({ ...i, archive: true }, metiers);
  const modifie = JSON.stringify(i) !== JSON.stringify(base);

  /** Enregistre la fiche ; renvoie l'id ou null en cas d'échec. */
  const enregistrer = useCallback(
    async (n: Intervention, opts: { fermer?: boolean; message?: string } = {}) => {
      if (!n.client.trim()) return toast('Le client est obligatoire.'), null;
      if (n.metiers.length === 0) return toast('Choisis au moins une activité.'), null;
      setEnCours(true);
      try {
        const propre = { ...n, client: n.client.trim(), archive: n.archive || n.statutCommercial === 'Perdu' };
        if (propre.statutCommercial !== 'Perdu' && n.statutCommercial !== base.statutCommercial && base.statutCommercial === 'Perdu') propre.archive = false;
        const ev = evenements(nouveau ? null : base, propre, profil.initiales, new Date().toISOString());
        propre.historique = [...ev, ...propre.historique].slice(0, 200);
        const id = await store.saveIntervention(propre, compte.email, nouveau ? null : base);
        const enreg = { ...propre, id };
        setBase(enreg);
        setI(enreg);
        if (opts.message !== '') toast(opts.message ?? 'Enregistré.');
        if (opts.fermer) onFermer();
        return id;
      } catch (e) {
        toast("Échec de l'enregistrement : " + (e as Error).message);
        return null;
      } finally {
        setEnCours(false);
      }
    },
    [base, nouveau, profil.initiales, store, compte.email, onFermer],
  );

  // Ctrl+S / Cmd+S : enregistrer
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (modifiable) void enregistrer(i, { fermer: true });
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [i, modifiable, enregistrer]);

  function choisirClient(nom: string) {
    const c = (clients ?? []).find((x) => x.nom.toLowerCase() === nom.trim().toLowerCase());
    setI((x) => ({ ...x, client: nom, ville: x.ville || c?.commune || '', dpt: x.dpt || c?.codePostal.slice(0, 2) || '' }));
  }

  function allerEtape(e: Etape) {
    const actives = CASES_ETAPE[e] ?? [];
    setI((x) => ({ ...x, enRelecture: actives.includes('enRelecture'), rapportTransmis: actives.includes('rapportTransmis'), envoyeClient: actives.includes('envoyeClient') }));
  }

  async function clore() {
    const id = await enregistrer({ ...i, archive: true }, { message: '' });
    if (!id) return;
    if (suivante && creerSuivante) {
      const n = { ...suivante, origineId: id, historique: evenements(null, suivante, profil.initiales, new Date().toISOString()) };
      await store.saveIntervention(n, compte.email, null);
      toast(`Dossier clôturé. Prochain contrôle créé (échéance ${fmt(suivante.echeance)}).`);
    } else toast('Dossier clôturé et archivé.');
    onFermer();
  }

  function dupliquer() {
    const c = { ...interventionVide(i.agence), client: i.client, ville: i.ville, dpt: i.dpt, origine: i.origine, metiers: i.metiers, reglementaire: i.reglementaire, intervenant: i.intervenant, chefMission: i.chefMission, chargeAffaire: i.chargeAffaire };
    setBase(c);
    setI(c);
    setCloture(false);
    toast('Copie créée : complète-la puis enregistre.');
  }

  async function supprimer() {
    if (!confirm('Supprimer définitivement cette intervention ?')) return;
    await store.deleteIntervention(base, compte.email);
    toast('Supprimé.');
    onFermer();
  }

  const date = (k: 'echeance' | 'dateEnvoiDevis' | 'dateRelance' | 'dateDebut' | 'dateFin' | 'dateRapportEnvoye' | 'prochaineManuelle') => (
    <input type="date" className="champ" value={i[k]} disabled={!modifiable} onChange={(e) => set(k, e.target.value)} />
  );
  const nombre = (k: 'nbJoursPrevus' | 'nbJoursRealises' | 'prixHT', step = 0.5) => (
    <input className="champ" type="number" min={0} step={step} value={i[k] ?? ''} disabled={!modifiable} onChange={(e) => set(k, e.target.value === '' ? null : Number(e.target.value))} />
  );
  const choixPersonne = (k: 'intervenant' | 'chefMission', placeholder: string) => (
    <select className="champ" value={i[k]} disabled={!modifiable} onChange={(e) => set(k, e.target.value)}>
      <option value="">{placeholder}</option>
      {personnes.map((u) => (
        <option key={u.email} value={u.initiales}>
          {u.initiales === u.nom ? u.nom : `${u.initiales} — ${u.nom}`}
        </option>
      ))}
      {i[k] && !personnes.some((u) => u.initiales === i[k]) && <option value={i[k]}>{i[k]}</option>}
    </select>
  );

  return (
    <Tiroir
      large
      titre={nouveau ? (base.client ? `Copie — ${base.client}` : 'Nouvelle intervention') : `✎ ${base.client}`}
      onFermer={() => (!modifie || confirm('Fermer sans enregistrer les modifications ?')) && onFermer()}
      pied={
        modifiable ? (
          <>
            <button className="btn-primaire" disabled={enCours || (!modifie && !nouveau)} onClick={() => enregistrer(i, { fermer: true })} title="Ctrl+S">
              ✓ {enCours ? 'Enregistrement…' : nouveau ? 'Enregistrer' : 'Enregistrer les modifications'}
            </button>
            <button className="btn-secondaire" onClick={onFermer}>
              Annuler
            </button>
            <span className="flex-1" />
            {!nouveau && (
              <button className="btn-secondaire" onClick={dupliquer} title="Nouvelle intervention pour le même client">
                ⧉ Dupliquer
              </button>
            )}
            {peutBasculer && (
              <button
                className="btn-secondaire"
                onClick={() => confirm(`Basculer cette intervention vers ${autre} ?`) && enregistrer({ ...i, agence: autre }, { fermer: true, message: `Basculé vers ${autre}.` })}
              >
                ⇄ Basculer vers {autre}
              </button>
            )}
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
      {/* En-tête : étape, alertes, statut commercial */}
      <div className="mb-5 rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PuceEtape etape={et} />
          {al.map((a) => (
            <PuceAlerte key={a.type} a={a} />
          ))}
          {modifiable && !nouveau && (
            <span className="ml-auto flex flex-wrap gap-1.5">
              {actionsPour(i)
                .filter((a) => !a.cloture)
                .map((a, k) => (
                  <button
                    key={a.id}
                    title={a.aide}
                    disabled={enCours}
                    onClick={() => enregistrer(a.appliquer(i, today()), { message: `${a.libelle} ✓` })}
                    className={k === 0 ? 'btn-primaire !px-3 !py-1.5' : 'btn-secondaire !px-3 !py-1.5'}
                  >
                    {k === 0 ? '✓ ' : ''}
                    {a.libelle}
                  </button>
                ))}
            </span>
          )}
        </div>
        <span className="label">Statut commercial</span>
        <div className="mb-3 inline-flex flex-wrap rounded-lg border border-line bg-surface-2 p-0.5">
          {STATUTS_COMMERCIAUX.map((s) => (
            <button
              key={s}
              type="button"
              disabled={!modifiable || i.archive}
              onClick={() => set('statutCommercial', s)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${i.statutCommercial === s ? (s === 'Perdu' ? 'bg-danger text-white' : 'bg-accent text-accent-ink') : 'text-muted hover:text-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {i.statutCommercial === 'Commandé' && <Frise i={i} onEtape={allerEtape} disabled={!modifiable || i.archive} />}
        {i.statutCommercial === 'Perdu' && base.statutCommercial !== 'Perdu' && <p className="text-[13px] text-muted">La demande partira dans les archives à l'enregistrement.</p>}
        {i.archive && modifiable && (
          <button className="btn-secondaire mt-2" onClick={() => enregistrer({ ...i, archive: false, statutCommercial: i.statutCommercial === 'Perdu' ? 'Devis à faire' : i.statutCommercial }, { message: 'Dossier rouvert.' })}>
            ↺ Rouvrir le dossier
          </button>
        )}
        {!i.archive && !nouveau && modifiable && i.statutCommercial === 'Commandé' && (
          <div className="mt-3">
            {!cloture ? (
              <button className="btn-secondaire" onClick={() => setCloture(true)}>
                ✔ Clôturer le dossier
              </button>
            ) : (
              <div className="rounded-lg border border-line bg-surface-2 p-3 text-[13px]">
                Le dossier partira dans les <b>archives</b>.
                {suivante ? (
                  <label className="mt-2 flex items-center gap-2">
                    <input type="checkbox" checked={creerSuivante} onChange={(e) => setCreerSuivante(e.target.checked)} />
                    Créer le prochain contrôle « Devis à faire », échéance <b>{fmt(suivante.echeance)}</b>
                  </label>
                ) : (
                  <p className="mt-1 text-muted">Pas de contrôle périodique pour ces activités (ou pas de date de fin).</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button className="btn-primaire !py-1.5" onClick={clore}>
                    Confirmer la clôture
                  </button>
                  <button className="btn-secondaire !py-1.5" onClick={() => setCloture(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Section titre="Client & activité" icone="▦">
        <Champ label="Client *" large>
          <input className="champ" list="fiche-clients" value={i.client} disabled={!modifiable} onChange={(e) => choisirClient(e.target.value)} autoFocus={nouveau} />
          <datalist id="fiche-clients">
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.nom} />
            ))}
          </datalist>
        </Champ>
        <Champ label="Ville">
          <input className="champ" value={i.ville} disabled={!modifiable} onChange={(e) => set('ville', e.target.value)} />
        </Champ>
        <Champ label="Département">
          <input className="champ" maxLength={3} value={i.dpt} disabled={!modifiable} onChange={(e) => set('dpt', e.target.value)} />
        </Champ>
        <Champ label="Numéro d'affaire">
          <input className="champ" value={i.numAffaire} disabled={!modifiable} onChange={(e) => set('numAffaire', e.target.value)} />
        </Champ>
        <Champ label="N° d'opportunité">
          <input className="champ" value={i.numOpportunite} disabled={!modifiable} onChange={(e) => set('numOpportunite', e.target.value)} />
        </Champ>
        <div className="col-span-2">
          <span className="label">Origine de la demande</span>
          <Pastilles unique disabled={!modifiable} options={ORIGINES} valeurs={i.origine ? [i.origine] : []} onChange={(v) => set('origine', v[0] ?? '')} />
        </div>
        <div className="col-span-2">
          <span className="label">Activités *</span>
          <Pastilles
            disabled={!modifiable}
            options={[...metiers.map((m) => m.nom), ...i.metiers.filter((n) => !metiers.some((m) => m.nom === n))]}
            valeurs={i.metiers}
            onChange={(v) => set('metiers', v)}
          />
        </div>
      </Section>

      <Section titre="Réglementaire" icone="§">
        <Champ label="Réglementaire">
          <select className="champ" value={i.reglementaire} disabled={!modifiable} onChange={(e) => set('reglementaire', e.target.value)}>
            {REGLEMENTAIRE.map((r) => (
              <option key={r} value={r}>
                {r === '' ? '—' : r === 'R' ? 'R (réglementaire)' : r === 'NR' ? 'NR (non réglementaire)' : 'CNR'}
              </option>
            ))}
          </select>
        </Champ>
        <Champ label="Scola">
          <select className="champ" value={i.scola} disabled={!modifiable} onChange={(e) => set('scola', e.target.value)}>
            {SCOLA.map((r) => (
              <option key={r} value={r}>
                {r || '—'}
              </option>
            ))}
          </select>
        </Champ>
      </Section>

      <Section titre="Suivi" icone="👤">
        <Champ label="Intervenant">{choixPersonne('intervenant', '—')}</Champ>
        <Champ label="Chef de mission" aide="Rédacteur du rapport">
          {choixPersonne('chefMission', '—')}
        </Champ>
        <Champ label="Chargé d'affaire" aide="Suivi commercial du dossier">
          <input className="champ" value={i.chargeAffaire} disabled={!modifiable} onChange={(e) => set('chargeAffaire', e.target.value)} />
        </Champ>
        <Champ label="Agence (équipe qui intervient)">
          <select className="champ" value={i.agence} disabled={!modifiable || !estManager(profil)} onChange={(e) => set('agence', e.target.value as Intervention['agence'])}>
            {AGENCES.filter((a) => agencesVisibles(profil).includes(a)).map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </Champ>
      </Section>

      <Section titre="Dates & montants" icone="▣">
        <Champ label="Échéance de réalisation" aide="Date limite (contrôle périodique)">
          {date('echeance')}
        </Champ>
        <Champ label="Envoi devis">{date('dateEnvoiDevis')}</Champ>
        <Champ label="Relance devis" aide={!i.dateRelance && relancePrevue(i) ? `Auto : ${fmt(relancePrevue(i))} (envoi + 30 j)` : 'Vide = envoi + 30 j'}>
          {date('dateRelance')}
        </Champ>
        <Champ label="Montant HT (€)">{nombre('prixHT', 10)}</Champ>
        <Champ label="Début intervention">{date('dateDebut')}</Champ>
        <Champ label="Fin intervention">{date('dateFin')}</Champ>
        <Champ label="Jours prévus">{nombre('nbJoursPrevus')}</Champ>
        <Champ label="Jours réalisés">{nombre('nbJoursRealises')}</Champ>
        <Champ label="Sortie rapport" aide={rapportPrevu(i) ? `Échéance indicative : ${fmt(rapportPrevu(i))} (fin + 6 sem.)` : undefined}>
          {date('dateRapportEnvoye')}
        </Champ>
        <Champ label="Prochaine intervention" aide={!i.prochaineManuelle && prochaine(i, metiers) ? `Auto : ${fmt(prochaine(i, metiers))}` : 'Vide = fin + périodicité'}>
          {date('prochaineManuelle')}
        </Champ>
      </Section>

      <section className="mb-6">
        <h3 className="section-title mb-2.5">⏱ Avancement & relances</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CASES.map((c) => (
            <label key={c.champ} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px] ${i[c.champ] ? 'border-accent/40 bg-accent-soft' : 'border-line bg-surface'}`}>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={i[c.champ] as boolean} disabled={!modifiable} onChange={(e) => set(c.champ, e.target.checked as never)} />
              {c.libelle}
            </label>
          ))}
        </div>
      </section>

      <Section titre="Autres informations" icone="📎">
        <Champ label="Lien du devis" large aide="Lien vers le PDF (SharePoint, Drive…)">
          <div className="flex gap-2">
            <input className="champ" type="url" placeholder="https://…" value={i.lienDevis} disabled={!modifiable} onChange={(e) => set('lienDevis', e.target.value)} />
            {/^https?:\/\//.test(i.lienDevis) && (
              <a className="btn-secondaire shrink-0" href={i.lienDevis} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            )}
          </div>
        </Champ>
        <Champ label="Notes" large>
          <textarea className="champ min-h-[80px]" value={i.commentaire} disabled={!modifiable} onChange={(e) => set('commentaire', e.target.value)} />
        </Champ>
      </Section>

      {!nouveau && (
        <Historique
          h={i.historique}
          disabled={!modifiable}
          onAjouter={(t) => {
            const c: EvenementHistorique = { date: new Date().toISOString(), par: profil.initiales, type: 'commentaire', texte: t };
            void enregistrer({ ...i, historique: [c, ...i.historique] }, { message: 'Commentaire ajouté.' });
          }}
          onAnnuler={(e) => e.champ && void enregistrer({ ...i, [e.champ]: e.valeurAvant }, { message: 'Annulé.' })}
        />
      )}
    </Tiroir>
  );
}
