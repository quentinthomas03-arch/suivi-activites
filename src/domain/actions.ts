/**
 * Actions en un clic : faire avancer une intervention sans ouvrir la fiche.
 * Chaque action ne fait que cocher / renseigner ce qu'il faut ; l'étape se recalcule toute seule.
 */
import { today } from './dates';
import { alertes, etape } from './rules';
import type { Intervention } from './types';

export interface ActionRapide {
  id: string;
  libelle: string; // texte du bouton
  aide: string; // info-bulle
  appliquer: (i: Intervention, auj: string) => Intervention;
  cloture?: boolean; // clôture : archive + prochain contrôle (demande confirmation)
}

const A = {
  devisEnvoye: {
    id: 'devisEnvoye',
    libelle: 'Devis envoyé',
    aide: "Passe en « Devis envoyé » avec la date d'aujourd'hui (relance auto à +30 j)",
    appliquer: (i, auj) => ({ ...i, statutCommercial: 'Devis envoyé', dateEnvoiDevis: i.dateEnvoiDevis || auj }),
  },
  relance: {
    id: 'relance',
    libelle: 'Relancé',
    aide: 'Marque le devis comme relancé',
    appliquer: (i) => ({ ...i, relanceFaite: true }),
  },
  commande: {
    id: 'commande',
    libelle: 'Commandé',
    aide: 'Le client a accepté le devis : passe en « À planifier »',
    appliquer: (i) => ({ ...i, statutCommercial: 'Commandé' }),
  },
  relecture: {
    id: 'relecture',
    libelle: 'En relecture',
    aide: 'Le rapport est rédigé et part en relecture',
    appliquer: (i) => ({ ...i, enRelecture: true }),
  },
  transmis: {
    id: 'transmis',
    libelle: 'Rapport transmis',
    aide: "Rapport terminé (date de sortie = aujourd'hui si elle est vide)",
    appliquer: (i, auj) => ({ ...i, enRelecture: true, rapportTransmis: true, dateRapportEnvoye: i.dateRapportEnvoye || auj }),
  },
  client: {
    id: 'client',
    libelle: 'Envoyé au client',
    aide: 'Le rapport a été envoyé au client',
    appliquer: (i, auj) => ({ ...i, enRelecture: true, rapportTransmis: true, envoyeClient: true, dateRapportEnvoye: i.dateRapportEnvoye || auj }),
  },
  facture: {
    id: 'facture',
    libelle: 'Facturé',
    aide: 'La mission est facturée',
    appliquer: (i) => ({ ...i, facture: true }),
  },
  cloture: {
    id: 'cloture',
    libelle: 'Clôturer',
    aide: 'Archive le dossier et crée le prochain contrôle périodique',
    appliquer: (i) => ({ ...i, archive: true }),
    cloture: true,
  },
} satisfies Record<string, ActionRapide>;

/** Actions proposées pour une ligne, la plus logique en premier (0, 1 ou 2 actions). */
export function actionsPour(i: Intervention, auj = today()): ActionRapide[] {
  if (i.archive) return [];
  const e = etape(i, auj);
  const relancer = alertes(i, auj).some((a) => a.type === 'relance');
  switch (e) {
    case 'Devis à faire':
      return [A.devisEnvoye];
    case 'Devis envoyé':
      return relancer ? [A.relance, A.commande] : [A.commande];
    case 'Rapport attendu':
      return [A.relecture, A.transmis];
    case 'En relecture':
      return [A.transmis];
    case 'Rapport transmis':
      return [A.client];
    case 'Envoyé au client':
      return i.facture ? [A.cloture] : [A.facture, A.cloture];
    default:
      return []; // À planifier / Planifié / En cours : dépendent des dates, à saisir dans la fiche
  }
}
