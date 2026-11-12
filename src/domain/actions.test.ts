import { describe, expect, it } from 'vitest';
import { actionsPour } from './actions';
import { etape } from './rules';
import { interventionVide, type Intervention } from './types';

const auj = '2026-11-12';
const base = (p: Partial<Intervention>): Intervention => ({ ...interventionVide('Metz'), id: 'x', metiers: ['VLEP'], ...p });
const suivante = (i: Intervention) => actionsPour(i, auj)[0].appliquer(i, auj);

describe('actions en un clic', () => {
  it('fait avancer le dossier de bout en bout', () => {
    let i = base({});
    i = suivante(i);
    expect(etape(i, auj)).toBe('Devis envoyé');
    expect(i.dateEnvoiDevis).toBe(auj);
    i = suivante(i);
    expect(etape(i, auj)).toBe('À planifier');
    expect(actionsPour(i, auj)).toHaveLength(0); // les dates se saisissent dans la fiche
    i = { ...i, dateDebut: '2026-11-01', dateFin: '2026-11-02' };
    i = actionsPour(i, auj)[1].appliquer(i, auj); // « Rapport transmis » directement
    expect(etape(i, auj)).toBe('Rapport transmis');
    expect(i.dateRapportEnvoye).toBe(auj);
    i = suivante(i);
    expect(etape(i, auj)).toBe('Envoyé au client');
    expect(actionsPour(i, auj).map((a) => a.id)).toEqual(['facture', 'cloture']);
    i = suivante(i);
    expect(actionsPour(i, auj).map((a) => a.id)).toEqual(['cloture']);
  });
  it('propose la relance quand elle est due', () => {
    expect(actionsPour(base({ statutCommercial: 'Devis envoyé', dateEnvoiDevis: '2026-09-01' }), auj)[0].id).toBe('relance');
  });
  it("n'écrase pas une date déjà saisie", () => {
    const i = base({ statutCommercial: 'Commandé', dateFin: '2026-11-01', dateRapportEnvoye: '2026-11-05' });
    expect(actionsPour(i, auj)[1].appliquer(i, auj).dateRapportEnvoye).toBe('2026-11-05');
  });
});
