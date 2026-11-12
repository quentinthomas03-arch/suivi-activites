import { useMemo, useState } from 'react';
import { estMoi, estManager, peutModifier, useApp } from '../contexte';
import { telechargerCsv } from '../domain/csv';
import { fmt, today } from '../domain/dates';
import { alertes, etape, libelleMetiers, prochaine, rapportPrevu, relancePrevue, type Alerte } from '../domain/rules';
import { ETAPES, type Agence, type Etape, type Intervention } from '../domain/types';
import { PuceAlerte, PuceEtape, POINT_ETAPE } from '../ui/Statut';
import { FicheIntervention } from './FicheIntervention';
import { NouvelleDemande } from './NouvelleDemande';

interface Ligne {
  i: Intervention;
  e: Etape;
  al: Alerte[];
  rapport: string;
}

type Cle = 'client' | 'dpt' | 'metiers' | 'intervenant' | 'etape' | 'echeance' | 'devis' | 'interv' | 'rapport' | 'montant' | 'urgence';

const valeurTri = (l: Ligne, c: Cle, archives: boolean): string | number => {
  switch (c) {
    case 'client': return l.i.client.toLowerCase();
    case 'dpt': return l.i.dpt || 'zz';
    case 'metiers': return libelleMetiers(l.i);
    case 'intervenant': return l.i.intervenant.toLowerCase() || 'zz';
    case 'etape': return ETAPES.indexOf(l.e);
    case 'echeance': return l.i.echeance || '9999';
    case 'devis': return l.i.dateEnvoiDevis || '9999';
    case 'interv': return l.i.dateDebut || l.i.dateFin || (archives ? '0000' : '9999');
    case 'rapport': return l.i.dateRapportEnvoye || l.rapport || '9999';
    case 'montant': return -(l.i.prixHT ?? 0);
    case 'urgence': return l.al[0]?.jours ?? 99999;
  }
};

function lireDensite(): boolean {
  try {
    return localStorage.getItem('densite') !== 'confort';
  } catch {
    return true;
  }
}

export function ListeInterventions({ agence, liste, archives = false }: { agence?: Agence; liste: Intervention[] | null; archives?: boolean }) {
  const { profil, metiers } = useApp();
  const [q, setQ] = useState('');
  const [metier, setMetier] = useState('');
  const [etapeFiltre, setEtapeFiltre] = useState<Etape | ''>('');
  const [intervenant, setIntervenant] = useState('');
  const [mesMissions, setMesMissions] = useState(false);
  const [alerteSeule, setAlerteSeule] = useState(false);
  const [tri, setTri] = useState<{ c: Cle; asc: boolean }>({ c: archives ? 'interv' : 'urgence', asc: !archives });
  const [compact, setCompact] = useState(lireDensite);
  const [ouverte, setOuverte] = useState<Intervention | null>(null);
  const [nouvelle, setNouvelle] = useState(false);
  const auj = today();

  const toutes = useMemo<Ligne[]>(() => (liste ?? []).map((i) => ({ i, e: etape(i, auj), al: alertes(i, auj), rapport: rapportPrevu(i) })), [liste, auj]);

  // Filtres hors étape (pour que les compteurs d'étape restent parlants)
  const filtrees = useMemo(() => {
    const t = q.trim().toLowerCase();
    return toutes.filter(({ i, al }) => {
      if (metier && !i.metiers.includes(metier)) return false;
      if (intervenant && i.intervenant !== intervenant && i.chefMission !== intervenant) return false;
      if (mesMissions && !estMoi(profil, i.intervenant) && !estMoi(profil, i.chefMission)) return false;
      if (alerteSeule && al.length === 0) return false;
      if (t && !`${i.client} ${i.ville} ${i.dpt} ${i.numAffaire} ${i.numOpportunite} ${i.commentaire} ${i.chargeAffaire}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [toutes, q, metier, intervenant, mesMissions, alerteSeule, profil]);

  const compteurs = useMemo(() => {
    const m = new Map<Etape, number>();
    for (const l of filtrees) m.set(l.e, (m.get(l.e) ?? 0) + 1);
    return m;
  }, [filtrees]);

  const lignes = useMemo(() => {
    const l = etapeFiltre ? filtrees.filter((x) => x.e === etapeFiltre) : filtrees;
    return [...l].sort((a, b) => {
      const va = valeurTri(a, tri.c, archives);
      const vb = valeurTri(b, tri.c, archives);
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return (tri.asc ? r : -r) || a.i.client.localeCompare(b.i.client);
    });
  }, [filtrees, etapeFiltre, tri, archives]);

  const intervenants = useMemo(() => [...new Set((liste ?? []).flatMap((i) => [i.intervenant, i.chefMission]).filter(Boolean))].sort(), [liste]);
  const activites = useMemo(() => metiers.map((m) => m.nom).filter((n) => (liste ?? []).some((i) => i.metiers.includes(n))), [metiers, liste]);
  const nbAlertes = toutes.filter((l) => l.al.length > 0).length;
  const totalMontant = lignes.reduce((s, l) => s + (l.i.prixHT ?? 0), 0);

  function basculerDensite() {
    setCompact((c) => {
      try {
        localStorage.setItem('densite', c ? 'confort' : 'compact');
      } catch {
        /* rien */
      }
      return !c;
    });
  }

  function exporter() {
    telechargerCsv(
      `suivi-${agence ?? 'archives'}-${auj}.csv`,
      ['Agence', 'N° affaire', 'N° opportunité', 'Client', 'Ville', 'Dpt', 'Origine', 'Activités', 'Réglementaire', 'Scola', 'Intervenant', 'Chef de mission', "Chargé d'affaire", 'Statut commercial', 'Étape', 'Échéance', 'Envoi devis', 'Relance', 'Relance faite', 'Début', 'Fin', 'Jours prévus', 'Jours réalisés', 'Montant HT', 'Rapport prévu', 'Sortie rapport', 'En relecture', 'Rapport transmis', 'Envoyé au client', 'Facturé', 'Contrôle périodique proposé', 'Prochaine', 'Notes'],
      lignes.map(({ i, e }) => [
        i.agence, i.numAffaire, i.numOpportunite, i.client, i.ville, i.dpt, i.origine, libelleMetiers(i), i.reglementaire, i.scola, i.intervenant, i.chefMission, i.chargeAffaire, i.statutCommercial, e,
        fmt(i.echeance), fmt(i.dateEnvoiDevis), fmt(relancePrevue(i)), i.relanceFaite, fmt(i.dateDebut), fmt(i.dateFin), i.nbJoursPrevus, i.nbJoursRealises, i.prixHT,
        fmt(rapportPrevu(i)), fmt(i.dateRapportEnvoye), i.enRelecture, i.rapportTransmis, i.envoyeClient, i.facture, i.controlePeriodiquePropose, fmt(prochaine(i, metiers)), i.commentaire,
      ]),
    );
  }

  const th = (c: Cle, txt: string, cls = '') => (
    <th className={`whitespace-nowrap px-2.5 py-2 font-semibold ${cls}`}>
      <button className={`inline-flex items-center gap-0.5 hover:text-ink ${tri.c === c ? 'text-ink' : ''}`} onClick={() => setTri((t) => ({ c, asc: t.c === c ? !t.asc : true }))}>
        {txt}
        <span className="w-2.5 text-[10px]">{tri.c === c ? (tri.asc ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
  const pad = compact ? 'py-1.5' : 'py-2.5';
  const pastille = (actif: boolean, ton = 'accent') =>
    `puce border py-1 ${actif ? (ton === 'danger' ? 'border-danger bg-danger-soft text-danger' : 'border-accent bg-accent-soft text-accent-soft-ink') : 'border-line bg-surface text-muted hover:text-ink'}`;

  const fermees: Etape[] = ['Clôturé', 'Perdu'];
  const etapesVisibles = ETAPES.filter((e) => (archives ? fermees.includes(e) : !fermees.includes(e)));

  return (
    <div>
      {/* Barre d'outils */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="champ min-w-[220px] max-w-xs flex-1" placeholder="Rechercher client, ville, n° affaire…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="champ w-auto" value={metier} onChange={(e) => setMetier(e.target.value)} aria-label="Activité">
          <option value="">Toutes les activités</option>
          {activites.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="champ w-auto" value={intervenant} onChange={(e) => setIntervenant(e.target.value)} aria-label="Intervenant">
          <option value="">Tous les intervenants</option>
          {intervenants.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button onClick={() => setMesMissions((v) => !v)} className={pastille(mesMissions)}>
          Mes missions
        </button>
        {!archives && (
          <button onClick={() => setAlerteSeule((v) => !v)} className={pastille(alerteSeule, 'danger')}>
            À traiter ({nbAlertes})
          </button>
        )}
        <span className="flex-1" />
        <button className="btn-secondaire hidden md:inline-flex" onClick={basculerDensite} title="Densité du tableau">
          {compact ? '☰ Compact' : '☰ Confort'}
        </button>
        {estManager(profil) && (
          <button className="btn-secondaire" onClick={exporter}>
            Export Excel
          </button>
        )}
        {agence && peutModifier(profil, agence) && (
          <button className="btn-primaire" onClick={() => setNouvelle(true)}>
            + Nouvelle demande
          </button>
        )}
      </div>

      {/* Compteurs par étape : vue d'ensemble + filtre en un clic */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setEtapeFiltre('')} className={`${pastille(etapeFiltre === '')} shrink-0`}>
          Toutes <b className="tabular-nums">{filtrees.length}</b>
        </button>
        {etapesVisibles.map((e) => (
          <button key={e} disabled={!compteurs.get(e)} onClick={() => setEtapeFiltre(etapeFiltre === e ? '' : e)} className={`${pastille(etapeFiltre === e)} shrink-0 disabled:opacity-40`}>
            <span className={`h-2 w-2 rounded-full ${POINT_ETAPE[e]}`} />
            {e} <b className="tabular-nums">{compteurs.get(e) ?? 0}</b>
          </button>
        ))}
      </div>

      {/* Tableau dense (écran large) */}
      <div className="card hidden overflow-hidden md:block">
        <div className="max-h-[calc(100vh-250px)] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-surface-2 text-left text-[12px] text-muted shadow-[0_1px_0_rgb(var(--line))]">
              <tr>
                {th('client', 'Client', 'pl-4')}
                {th('dpt', 'Dpt')}
                {th('metiers', 'Activités')}
                {th('intervenant', 'Interv.')}
                {th('etape', 'Étape')}
                {th('echeance', 'Échéance')}
                {th('devis', 'Devis')}
                {th('interv', 'Intervention')}
                {th('rapport', 'Rapport')}
                {th('montant', 'Montant', 'text-right')}
                {!archives && th('urgence', 'À traiter')}
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ i, e, al, rapport }) => (
                <tr key={i.id} onClick={() => setOuverte(i)} className="cursor-pointer border-t border-line/60 hover:bg-accent-soft/40">
                  <td className={`max-w-[260px] px-2.5 pl-4 ${pad}`}>
                    <div className="truncate font-medium" title={i.client}>
                      {i.client}
                      {!compact && i.ville && <span className="font-normal text-muted"> · {i.ville}</span>}
                    </div>
                    {!compact && (i.numAffaire || i.reglementaire || i.scola) && (
                      <div className="truncate text-[12px] text-muted">{[i.numAffaire, i.reglementaire, i.scola && `Scola ${i.scola.toLowerCase()}`].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>
                  <td className={`px-2.5 tabular-nums text-muted ${pad}`}>{i.dpt}</td>
                  <td className={`max-w-[150px] truncate px-2.5 ${pad}`} title={libelleMetiers(i)}>
                    {libelleMetiers(i)}
                  </td>
                  <td className={`whitespace-nowrap px-2.5 font-medium ${pad}`}>{i.intervenant || <span className="text-muted">—</span>}</td>
                  <td className={`px-2.5 ${pad}`}>
                    <PuceEtape etape={e} />
                  </td>
                  <td className={`whitespace-nowrap px-2.5 tabular-nums ${pad}`}>{fmt(i.echeance)}</td>
                  <td className={`whitespace-nowrap px-2.5 tabular-nums ${pad}`}>
                    {fmt(i.dateEnvoiDevis)}
                    {i.relanceFaite && <span className="ml-1 text-ok" title="Relance faite">↻</span>}
                  </td>
                  <td className={`whitespace-nowrap px-2.5 tabular-nums ${pad}`}>
                    {i.dateDebut && i.dateFin && i.dateDebut !== i.dateFin ? `${fmt(i.dateDebut).slice(0, 5)} → ${fmt(i.dateFin)}` : fmt(i.dateFin || i.dateDebut)}
                  </td>
                  <td className={`whitespace-nowrap px-2.5 tabular-nums ${pad}`}>
                    {i.dateRapportEnvoye ? (
                      <span title="Sortie du rapport">{fmt(i.dateRapportEnvoye)}</span>
                    ) : rapport ? (
                      <span className="text-muted" title="Échéance indicative (fin + 6 sem.)">
                        ~{fmt(rapport)}
                      </span>
                    ) : (
                      ''
                    )}
                    {i.facture && <span className="ml-1 text-ok" title="Facturé">€</span>}
                  </td>
                  <td className={`whitespace-nowrap px-2.5 text-right tabular-nums ${pad}`}>{i.prixHT ? `${i.prixHT.toLocaleString('fr-FR')} €` : ''}</td>
                  {!archives && (
                    <td className={`px-2.5 pr-4 ${pad}`}>
                      <div className="flex gap-1">
                        {al.slice(0, 2).map((a) => (
                          <PuceAlerte key={a.type} a={a} court />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {lignes.length > 0 && (
              <tfoot className="sticky bottom-0 bg-surface-2 text-[12px] text-muted shadow-[0_-1px_0_rgb(var(--line))]">
                <tr>
                  <td className="px-2.5 py-2 pl-4" colSpan={9}>
                    {lignes.length} ligne{lignes.length > 1 ? 's' : ''}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold tabular-nums text-ink">{totalMontant ? `${totalMontant.toLocaleString('fr-FR')} €` : ''}</td>
                  {!archives && <td />}
                </tr>
              </tfoot>
            )}
          </table>
          {liste && lignes.length === 0 && <p className="px-4 py-10 text-center text-muted">Aucune intervention ne correspond aux filtres.</p>}
          {!liste && <p className="px-4 py-10 text-center text-muted">Chargement…</p>}
        </div>
      </div>

      {/* Cartes (téléphone) */}
      <div className="space-y-2 md:hidden">
        {lignes.map(({ i, e, al }) => (
          <button key={i.id} onClick={() => setOuverte(i)} className="card block w-full p-3.5 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{i.client}</div>
                <div className="truncate text-[12px] text-muted">
                  {libelleMetiers(i)} · {i.intervenant || '—'} {i.ville && `· ${i.ville}`} {i.dpt && `(${i.dpt})`}
                </div>
              </div>
              <PuceEtape etape={e} />
            </div>
            {al.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {al.slice(0, 2).map((a) => (
                  <PuceAlerte key={a.type} a={a} court />
                ))}
              </div>
            )}
          </button>
        ))}
        {liste && lignes.length === 0 && <p className="py-10 text-center text-muted">Aucune intervention ne correspond aux filtres.</p>}
      </div>

      {ouverte && <FicheIntervention initiale={ouverte} onFermer={() => setOuverte(null)} />}
      {nouvelle && agence && <NouvelleDemande agence={agence} onFermer={() => setNouvelle(false)} />}
    </div>
  );
}
