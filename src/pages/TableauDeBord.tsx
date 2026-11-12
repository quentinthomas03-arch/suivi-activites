import { useMemo, useState } from 'react';
import { agencesVisibles, useApp } from '../contexte';
import { useInterventions } from '../data/hooks';
import { today } from '../domain/dates';
import { alertes, type Alerte } from '../domain/rules';
import { STATUTS, type Agence, type Intervention } from '../domain/types';
import { POINT_STATUT, PuceAlerte, PuceStatut } from '../ui/Statut';
import { FicheIntervention } from './FicheIntervention';

interface Indicateurs {
  retard: number;
  bientot: number;
  relance: number;
  rapport: number;
  devisEnAttente: number;
  carnet: number;
  parStatut: Record<string, number>;
}

function calculer(l: Intervention[], auj: string): Indicateurs {
  const r: Indicateurs = { retard: 0, bientot: 0, relance: 0, rapport: 0, devisEnAttente: 0, carnet: 0, parStatut: {} };
  for (const i of l) {
    const al = alertes(i, auj).map((a) => a.type);
    if (al.includes('retard')) r.retard++;
    if (al.includes('bientot')) r.bientot++;
    if (al.includes('relance')) r.relance++;
    if (al.includes('rapport') || al.includes('planif')) r.rapport++;
    if (i.statut === 'Devis envoyé') r.devisEnAttente++;
    if (['Commandé', 'Planifié', 'Rapport en cours'].includes(i.statut)) r.carnet += i.prixHT ?? 0;
    r.parStatut[i.statut] = (r.parStatut[i.statut] ?? 0) + 1;
  }
  return r;
}

function Tuile({ titre, valeur, ton, aide }: { titre: string; valeur: string | number; ton?: 'danger' | 'warn' | 'ok'; aide: string }) {
  const couleur = ton === 'danger' ? 'text-danger' : ton === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="rounded-xl border border-line/70 bg-surface p-3.5" title={aide}>
      <div className="text-[12px] font-medium text-muted">{titre}</div>
      <div className={`mt-1 text-[26px] font-semibold tabular-nums leading-none ${valeur === 0 ? 'text-muted' : couleur}`}>{valeur}</div>
    </div>
  );
}

function BlocAgence({ agence, l, auj }: { agence: Agence; l: Intervention[]; auj: string }) {
  const k = calculer(l, auj);
  const total = l.length || 1;
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[18px] font-semibold">{agence}</h2>
        <span className="text-[13px] text-muted">{l.length} interventions en cours</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Tuile titre="Échéances dépassées" valeur={k.retard} ton="danger" aide="Contrôles dont l'échéance est passée et qui ne sont pas encore planifiés" />
        <Tuile titre="Échéances < 2 mois" valeur={k.bientot} ton="warn" aide="Contrôles à lancer dans les 60 prochains jours" />
        <Tuile titre="Rapports en retard" valeur={k.rapport} ton="danger" aide="Rapport non envoyé 42 jours après la fin, ou intervention passée encore « Planifié »" />
        <Tuile titre="Devis à relancer" valeur={k.relance} ton="warn" aide="Devis envoyés depuis plus de 30 jours sans relance" />
        <Tuile titre="Devis en attente" valeur={k.devisEnAttente} aide="Devis envoyés, sans réponse" />
        <Tuile titre="Carnet de commandes" valeur={`${Math.round(k.carnet / 1000).toLocaleString('fr-FR')} k€`} aide="Somme des prix HT : Commandé, Planifié, Rapport en cours" />
      </div>
      <div className="mt-5">
        <div className="section-title mb-2">Avancement</div>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          {STATUTS.filter((s) => k.parStatut[s]).map((s) => (
            <div key={s} className={POINT_STATUT[s]} style={{ width: `${(k.parStatut[s] / total) * 100}%` }} title={`${s} : ${k.parStatut[s]}`} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
          {STATUTS.filter((s) => k.parStatut[s]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${POINT_STATUT[s]}`} />
              {s} <b className="text-ink">{k.parStatut[s]}</b>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TableauDeBord() {
  const { profil } = useApp();
  const agences = agencesVisibles(profil);
  const liste = useInterventions(agences, false);
  const [ouverte, setOuverte] = useState<Intervention | null>(null);
  const auj = today();

  const prioritaires = useMemo(() => {
    const out: { i: Intervention; a: Alerte }[] = [];
    for (const i of liste ?? []) {
      const al = alertes(i, auj);
      if (al.length) out.push({ i, a: al[0] });
    }
    const poids = { retard: 0, rapport: 1, planif: 2, relance: 3, bientot: 4 } as const;
    return out.sort((x, y) => poids[x.a.type] - poids[y.a.type] || x.a.jours - y.a.jours).slice(0, 12);
  }, [liste, auj]);

  const charge = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of liste ?? []) if (['Commandé', 'Planifié'].includes(i.statut) && i.intervenant) m.set(i.intervenant, (m.get(i.intervenant) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [liste]);

  if (!liste) return <p className="text-muted">Chargement…</p>;
  const max = Math.max(1, ...charge.map((c) => c[1]));

  return (
    <div className="space-y-5">
      <div className={`grid gap-5 ${agences.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {agences.map((a) => (
          <BlocAgence key={a} agence={a} l={liste.filter((i) => i.agence === a)} auj={auj} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-[16px] font-semibold">À traiter en priorité</h2>
          {prioritaires.length === 0 ? (
            <p className="text-muted">Rien d'urgent. 👍</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {prioritaires.map(({ i, a }) => (
                <li key={i.id}>
                  <button className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-surface-2" onClick={() => setOuverte(i)}>
                    <PuceAlerte a={a} court />
                    <span className="min-w-0 flex-1 truncate">
                      <b className="font-medium">{i.client}</b>
                      <span className="text-muted">
                        {' '}
                        · {i.metier} · {i.agence} · {i.intervenant || '—'}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <PuceStatut statut={i.statut} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-[16px] font-semibold">Charge des intervenants</h2>
          <p className="mb-3 text-[12px] text-muted">Missions commandées ou planifiées</p>
          <div className="space-y-2">
            {charge.map(([x, n]) => (
              <div key={x} className="flex items-center gap-2 text-[13px]">
                <span className="w-9 font-semibold tracking-wide [font-variant-ligatures:none]">{x}</span>
                <div className="h-2.5 flex-1 rounded-full bg-surface-2">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </div>
            ))}
            {charge.length === 0 && <p className="text-muted">—</p>}
          </div>
        </section>
      </div>
      {ouverte && <FicheIntervention initiale={ouverte} onFermer={() => setOuverte(null)} />}
    </div>
  );
}
