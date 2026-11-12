import { describe, expect, it } from 'vitest';
import { addMonths } from './dates';
import { alertes, prochaine, prochainControle, rapportPrevu, relancePrevue } from './rules';
import { METIERS_DEFAUT, interventionVide, type Intervention } from './types';

const base = (p: Partial<Intervention>): Intervention => ({ ...interventionVide('Strasbourg'), id: 'x', ...p });

describe('dates calculées', () => {
  it('prochaine = fin + périodicité du métier', () => {
    expect(prochaine(base({ metiers: ['VLEP'], dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('2026-01-09');
    expect(prochaine(base({ metiers: ['Bruit Env'], dateFin: '2025-09-14' }), METIERS_DEFAUT)).toBe('2030-09-14');
  });
  it('une date saisie à la main n\'est jamais écrasée', () => {
    expect(prochaine(base({ dateFin: '2025-01-09', prochaineManuelle: '2025-07-01' }), METIERS_DEFAUT)).toBe('2025-07-01');
    expect(relancePrevue(base({ dateEnvoiDevis: '2025-01-01', dateRelance: '2025-01-10' }))).toBe('2025-01-10');
  });
  it('relance = envoi + 30 j ; rapport = fin + 42 j', () => {
    expect(relancePrevue(base({ dateEnvoiDevis: '2025-01-01' }))).toBe('2025-01-31');
    expect(rapportPrevu(base({ dateFin: '2025-01-09' }))).toBe('2025-02-20');
  });
  it('plusieurs activités : la périodicité la plus courte ; aucune = pas de prochaine', () => {
    expect(prochaine(base({ metiers: ['Bruit Env', 'VLEP'], dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('2026-01-09');
    expect(prochaine(base({ metiers: ['Radon'], dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('');
  });
  it('fin de mois', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
});

describe('alertes', () => {
  const auj = '2026-11-12';
  it('échéance dépassée / bientôt', () => {
    expect(alertes(base({ echeance: '2026-11-01' }), auj)[0].type).toBe('retard');
    expect(alertes(base({ echeance: '2026-12-20' }), auj)[0].type).toBe('bientot');
    expect(alertes(base({ echeance: '2027-06-01' }), auj)).toHaveLength(0);
  });
  it('pas d\'alerte d\'échéance une fois planifié', () => {
    expect(alertes(base({ echeance: '2026-11-01', statut: 'Planifié', dateFin: '2026-12-01' }), auj)).toHaveLength(0);
  });
  it('devis à relancer', () => {
    expect(alertes(base({ statut: 'Devis envoyé', dateEnvoiDevis: '2026-10-01' }), auj)[0].type).toBe('relance');
    expect(alertes(base({ statut: 'Devis envoyé', dateEnvoiDevis: '2026-10-01', relanceFaite: true }), auj)).toHaveLength(0);
  });
  it('rapport en retard', () => {
    const a = alertes(base({ statut: 'Rapport en cours', dateFin: '2026-09-01' }), auj);
    expect(a.map((x) => x.type)).toContain('rapport');
    expect(alertes(base({ statut: 'Rapport en cours', dateFin: '2026-09-01', dateRapportEnvoye: '2026-10-01' }), auj)).toHaveLength(0);
  });
  it('archivé = aucune alerte', () => {
    expect(alertes(base({ echeance: '2020-01-01', archive: true }), auj)).toHaveLength(0);
  });
});

describe('prochain contrôle', () => {
  it('reprend client et métier, repart à « Devis à faire » avec l\'échéance', () => {
    const n = prochainControle(base({ client: 'ACME', metiers: ['VLEP'], dateFin: '2026-03-10', prixHT: 2000, statut: 'Clôturé' }), METIERS_DEFAUT)!;
    expect(n.client).toBe('ACME');
    expect(n.statut).toBe('Devis à faire');
    expect(n.echeance).toBe('2027-03-10');
    expect(n.prixHT).toBeNull();
    expect(n.origineId).toBe('x');
  });
});
