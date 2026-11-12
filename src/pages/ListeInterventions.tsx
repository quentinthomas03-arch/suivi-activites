import { useMemo, useState } from 'react';
import { estManager, peutModifier, useApp } from '../contexte';
import { telechargerCsv } from '../domain/csv';
import { fmt, today } from '../domain/dates';
import { alertes, prochaine, relancePrevue } from '../domain/rules';
import { STATUTS, interventionVide, type Agence, type Intervention } from '../domain/types';
import { PuceAlerte, PuceStatut } from '../ui/Statut';
import { FicheIntervention } from './FicheIntervention';

type Tri = 'urgence' | 'client' | 'statut' | 'date';

/** Date la plus parlante selon l'avancement. */
function dateCle(i: Intervention): { libelle: string; date: string } {
  if (['Planifié', 'Rapport en cours', 'Rapport envoyé', 'Clôturé'].includes(i.statut) && i.dateFin)
    return { libelle: 'Interv.', date: i.dateFin };
  if (i.statut === 'Devis envoyé' && i.dateEnvoiDevis) return { libelle: 'Devis', date: i.dateEnvoiDevis };
  if (i.echeance) return { libelle: 'Échéance', date: i.echeance };
  return { libelle: '', date: '' };
}

export function ListeInterventions({ agence, liste, archives = false }: { agence?: Agence; liste: Intervention[] | null; archives?: boolean }) {
  const { profil, metiers } = useApp();
  const [q, setQ] = useState('');
  const [metier, setMetier] = useState('');
  const [statut, setStatut] = useState('');
  const [intervenant, setIntervenant] = useState('');
  const [mesMissions, setMesMissions] = useState(false);
  const [alerteSeule, setAlerteSeule] = useState(false);
  const [tri, setTri] = useState<Tri>(archives ? 'date' : 'urgence');
  const [ouverte, setOuverte] = useState<Intervention | null>(null);
  const auj = today();

  const lignes = useMemo(() => {
    if (!liste) return [];
    const t = q.trim().toLowerCase();
    return liste
      .map((i) => ({ i, al: alertes(i, auj) }))
      .filter(({ i, al }) => {
        if (metier && i.metier !== metier) return false;
        if (statut && i.statut !== statut) return false;
        if (intervenant && i.intervenant !== intervenant) return false;
        if (mesMissions && i.intervenant !== profil.initiales) return false;
        if (alerteSeule && al.length === 0) return false;
        if (t && !`${i.client} ${i.ville} ${i.dpt} ${i.numAffaire} ${i.commentaire}`.toLowerCase().includes(t)) return false;
        return true;
      })
      .sort((a, b) => {
        if (tri === 'client') return a.i.client.localeCompare(b.i.client);
        if (tri === 'statut') return STATUTS.indexOf(a.i.statut) - STATUTS.indexOf(b.i.statut);
        const da = dateCle(a.i).date || '9999';
        const db = dateCle(b.i).date || '9999';
        if (tri === 'date') return archives ? db.localeCompare(da) : da.localeCompare(db);
        const ua = a.al[0]?.jours ?? 99999;
        const ub = b.al[0]?.jours ?? 99999;
        return ua - ub || da.localeCompare(db);
      });
  }, [liste, q, metier, statut, intervenant, mesMissions, alerteSeule, tri, profil.initiales, auj, archives]);

  const intervenants = useMemo(() => [...new Set((liste ?? []).map((i) => i.intervenant).filter(Boolean))].sort(), [liste]);
  const nbAlertes = useMemo(() => (liste ?? []).filter((i) => alertes(i, auj).length > 0).length, [liste, auj]);

  function exporter() {
    telechargerCsv(
      `suivi-${agence ?? 'archives'}-${auj}.csv`,
      ['Agence', 'N° affaire', 'Client', 'Ville', 'Dpt', 'Métier', 'Réglementaire', 'Scola', 'Intervenant', 'Statut', 'Échéance', 'Envoi devis', 'Relance', 'Relance faite', 'Début', 'Fin', 'Nb jours', 'Prix HT', 'Rapport envoyé', 'Prochaine', 'Commentaire'],
      lignes.map(({ i }) => [
        i.agence, i.numAffaire, i.client, i.ville, i.dpt, i.metier, i.reglementaire, i.scola, i.intervenant, i.statut,
        fmt(i.echeance), fmt(i.dateEnvoiDevis), fmt(relancePrevue(i)), i.relanceFaite, fmt(i.dateDebut), fmt(i.dateFin),
        i.nbJours, i.prixHT, fmt(i.dateRapportEnvoye), fmt(prochaine(i, metiers)), i.commentaire,
      ]),
    );
  }

  const enTete = (t: Tri, txt: string) => (
    <button className={`font-semibold ${tri === t ? 'text-ink' : ''}`} onClick={() => setTri(t)}>
      {txt}
      {tri === t ? ' ↓' : ''}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="champ max-w-xs flex-1" placeholder="Rechercher client, ville, n° affaire…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="champ w-auto" value={statut} onChange={(e) => setStatut(e.target.value)} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUTS.filter((s) => (archives ? ['Clôturé', 'Perdu'] : STATUTS.slice(0, 6)).includes(s)).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="champ w-auto" value={intervenant} onChange={(e) => setIntervenant(e.target.value)} aria-label="Intervenant">
          <option value="">Tous les intervenants</option>
          {intervenants.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="flex-1" />
        {estManager(profil) && (
          <button className="btn-secondaire" onClick={exporter}>
            Export Excel
          </button>
        )}
        {agence && peutModifier(profil, agence) && (
          <button className="btn-primaire" onClick={() => setOuverte(interventionVide(agence))}>
            + Nouvelle intervention
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {['', ...metiers.map((m) => m.nom)].map((m) => (
          <button
            key={m || 'tous'}
            onClick={() => setMetier(m)}
            className={`puce border py-1 ${metier === m ? 'border-accent bg-accent-soft text-accent-soft-ink' : 'border-line bg-surface text-muted hover:text-ink'}`}
          >
            {m || 'Tous les métiers'}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <button
          onClick={() => setMesMissions((v) => !v)}
          className={`puce border py-1 ${mesMissions ? 'border-accent bg-accent-soft text-accent-soft-ink' : 'border-line bg-surface text-muted hover:text-ink'}`}
        >
          Mes missions ({profil.initiales})
        </button>
        {!archives && (
          <button
            onClick={() => setAlerteSeule((v) => !v)}
            className={`puce border py-1 ${alerteSeule ? 'border-danger bg-danger-soft text-danger' : 'border-line bg-surface text-muted hover:text-ink'}`}
          >
            À traiter ({nbAlertes})
          </button>
        )}
        <span className="ml-auto text-[13px] text-muted">
          {liste ? `${lignes.length} ligne${lignes.length > 1 ? 's' : ''}` : 'Chargement…'}
        </span>
      </div>

      {/* Tableau (écran large) */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-[14px]">
          <thead className="bg-surface-2 text-left text-[12px] text-muted">
            <tr>
              <th className="px-4 py-2.5">{enTete('client', 'Client')}</th>
              <th className="px-3 py-2.5">Métier</th>
              <th className="px-3 py-2.5">Interv.</th>
              <th className="px-3 py-2.5">{enTete('statut', 'Statut')}</th>
              <th className="px-3 py-2.5">{enTete('date', 'Date')}</th>
              <th className="px-3 py-2.5">{archives ? 'Prochaine' : enTete('urgence', 'À traiter')}</th>
              <th className="px-4 py-2.5 text-right">Prix HT</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ i, al }) => {
              const d = dateCle(i);
              return (
                <tr key={i.id} onClick={() => setOuverte(i)} className="cursor-pointer border-t border-line/70 hover:bg-surface-2">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{i.client}</div>
                    <div className="text-[12px] text-muted">
                      {[i.ville, i.dpt && `(${i.dpt})`].filter(Boolean).join(' ')}
                      {!agence && ` · ${i.agence}`}
                      {i.reglementaire && ' · Réglementaire'}
                      {i.scola && ' · Scola'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">{i.metier}</td>
                  <td className="px-3 py-2.5 font-semibold tracking-wide [font-variant-ligatures:none] text-[13px]">{i.intervenant || '—'}</td>
                  <td className="px-3 py-2.5">
                    <PuceStatut statut={i.statut} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {d.date ? (
                      <>
                        <span className="text-[12px] text-muted">{d.libelle} </span>
                        {fmt(d.date)}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {archives ? (
                      fmt(prochaine(i, metiers)) || '—'
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {al.slice(0, 2).map((a) => (
                          <PuceAlerte key={a.type} a={a} court />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{i.prixHT ? `${i.prixHT.toLocaleString('fr-FR')} €` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {liste && lignes.length === 0 && <p className="px-4 py-10 text-center text-muted">Aucune intervention ne correspond aux filtres.</p>}
      </div>

      {/* Cartes (téléphone) */}
      <div className="space-y-2 md:hidden">
        {lignes.map(({ i, al }) => {
          const d = dateCle(i);
          return (
            <button key={i.id} onClick={() => setOuverte(i)} className="card block w-full p-3.5 text-left">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{i.client}</div>
                  <div className="text-[12px] text-muted">
                    {i.metier} · {i.intervenant || '—'} · {i.ville} {i.dpt && `(${i.dpt})`}
                  </div>
                </div>
                <PuceStatut statut={i.statut} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]">
                {d.date && (
                  <span className="text-muted">
                    {d.libelle} {fmt(d.date)}
                  </span>
                )}
                {al.slice(0, 2).map((a) => (
                  <PuceAlerte key={a.type} a={a} court />
                ))}
              </div>
            </button>
          );
        })}
        {liste && lignes.length === 0 && <p className="py-10 text-center text-muted">Aucune intervention ne correspond aux filtres.</p>}
      </div>

      {ouverte && <FicheIntervention initiale={ouverte} onFermer={() => setOuverte(null)} />}
    </div>
  );
}
