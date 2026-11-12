import { describe, expect, it } from 'vitest';
import { addMonths } from './dates';
import { alertes, etape, evenements, prochaine, prochainControle, rapportPrevu, relancePrevue } from './rules';
import { METIERS_DEFAUT, interventionVide, normaliser, type Intervention } from './types';

const base = (p: Partial<Intervention>): Intervention => ({ ...interventionVide('Strasbourg'), id: 'x', metiers: ['VLEP'], ...p });
const auj = '2026-11-12';

describe('étape calculée', () => {
  const cmd = (p: Partial<Intervention>) => base({ statutCommercial: 'Commandé', ...p });
  it('suit les dates puis les cases cochées', () => {
    expect(etape(base({}), auj)).toBe('Devis à faire');
    expect(etape(cmd({}), auj)).toBe('À planifier');
    expect(etape(cmd({ dateDebut: '2026-12-01', dateFin: '2026-12-02' }), auj)).toBe('Planifié');
    expect(etape(cmd({ dateDebut: '2026-11-10', dateFin: '2026-11-14' }), auj)).toBe('En cours');
    expect(etape(cmd({ dateDebut: '2026-11-01', dateFin: '2026-11-02' }), auj)).toBe('Rapport attendu');
    expect(etape(cmd({ dateFin: '2026-11-02', enRelecture: true }), auj)).toBe('En relecture');
    expect(etape(cmd({ dateFin: '2026-11-02', enRelecture: true, rapportTransmis: true }), auj)).toBe('Rapport transmis');
    expect(etape(cmd({ envoyeClient: true }), auj)).toBe('Envoyé au client');
    expect(etape(cmd({ archive: true }), auj)).toBe('Clôturé');
    expect(etape(base({ statutCommercial: 'Perdu', archive: true }), auj)).toBe('Perdu');
  });
});

describe('dates calculées', () => {
  it('prochaine = fin + périodicité', () => {
    expect(prochaine(base({ dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('2026-01-09');
    expect(prochaine(base({ metiers: ['Bruit Env'], dateFin: '2025-09-14' }), METIERS_DEFAUT)).toBe('2030-09-14');
    expect(prochaine(base({ metiers: ['Bruit Env', 'VLEP'], dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('2026-01-09');
    expect(prochaine(base({ metiers: ['Radon'], dateFin: '2025-01-09' }), METIERS_DEFAUT)).toBe('');
  });
  it("une date saisie à la main n'est jamais écrasée", () => {
    expect(prochaine(base({ dateFin: '2025-01-09', prochaineManuelle: '2025-07-01' }), METIERS_DEFAUT)).toBe('2025-07-01');
    expect(relancePrevue(base({ dateEnvoiDevis: '2025-01-01', dateRelance: '2025-01-10' }))).toBe('2025-01-10');
  });
  it('relance = envoi + 30 j ; rapport = fin + 6 semaines', () => {
    expect(relancePrevue(base({ dateEnvoiDevis: '2025-01-01' }))).toBe('2025-01-31');
    expect(rapportPrevu(base({ dateFin: '2026-08-26' }))).toBe('2026-10-07');
  });
  it('fin de mois', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
});

describe('alertes', () => {
  it('échéance dépassée / bientôt, seulement avant planification', () => {
    expect(alertes(base({ echeance: '2026-11-01' }), auj)[0].type).toBe('retard');
    expect(alertes(base({ echeance: '2026-12-20' }), auj)[0].type).toBe('bientot');
    expect(alertes(base({ echeance: '2027-06-01' }), auj)).toHaveLength(0);
    expect(alertes(base({ echeance: '2026-11-01', statutCommercial: 'Commandé', dateDebut: '2026-12-01' }), auj)).toHaveLength(0);
  });
  it('devis à relancer', () => {
    expect(alertes(base({ statutCommercial: 'Devis envoyé', dateEnvoiDevis: '2026-10-01' }), auj)[0].type).toBe('relance');
    expect(alertes(base({ statutCommercial: 'Devis envoyé', dateEnvoiDevis: '2026-10-01', relanceFaite: true }), auj)).toHaveLength(0);
  });
  it('rapport en retard, levée quand le rapport est transmis', () => {
    expect(alertes(base({ statutCommercial: 'Commandé', dateFin: '2026-09-01' }), auj).map((x) => x.type)).toContain('rapport');
    expect(alertes(base({ statutCommercial: 'Commandé', dateFin: '2026-09-01', rapportTransmis: true }), auj)).toHaveLength(0);
  });
  it('à facturer', () => {
    expect(alertes(base({ statutCommercial: 'Commandé', envoyeClient: true }), auj)[0].type).toBe('facture');
    expect(alertes(base({ statutCommercial: 'Commandé', envoyeClient: true, facture: true }), auj)).toHaveLength(0);
  });
  it('archivé = aucune alerte', () => {
    expect(alertes(base({ echeance: '2020-01-01', archive: true }), auj)).toHaveLength(0);
  });
});

describe('prochain contrôle', () => {
  it("reprend client et activités, repart à « Devis à faire » avec l'échéance", () => {
    const n = prochainControle(base({ client: 'ACME', dateFin: '2026-03-10', prixHT: 2000, statutCommercial: 'Commandé', envoyeClient: true, archive: true }), METIERS_DEFAUT)!;
    expect(n.client).toBe('ACME');
    expect(n.statutCommercial).toBe('Devis à faire');
    expect(n.echeance).toBe('2027-03-10');
    expect(n.prixHT).toBeNull();
    expect(n.envoyeClient).toBe(false);
    expect(n.origineId).toBe('x');
  });
});

describe('historique', () => {
  it('trace les cases cochées (annulables) et les autres modifications', () => {
    const avant = base({});
    const ev = evenements(avant, { ...avant, rapportTransmis: true, intervenant: 'Quentin' }, 'Quentin', '2026-11-12T10:00:00');
    expect(ev[0]).toMatchObject({ type: 'case', texte: 'Rapport transmis coché', champ: 'rapportTransmis', valeurAvant: false });
    expect(ev[1].texte).toContain('Intervenant : Quentin');
  });
});

describe("conversion de l'ancien format", () => {
  it('statut unique → statut commercial + cases', () => {
    const i = normaliser({ agence: 'Metz', statut: 'Rapport envoyé', metier: 'VLEP', nbJours: 2 });
    expect(i.statutCommercial).toBe('Commandé');
    expect(i.envoyeClient).toBe(true);
    expect(i.metiers).toEqual(['VLEP']);
    expect(i.nbJoursPrevus).toBe(2);
    expect('statut' in i).toBe(false);
  });
});
