/**
 * ==============================================================================
 * MODULES D'EXTENSION FUTURE : SECONDE VIE
 * Préparation architecturale pour :
 * 1. Paiements sécurisés Mobile Money (Wave, Orange Money, MTN, Moov)
 * 2. Suivi et livraison par coursiers à Abidjan
 * 3. Messagerie interne instantanée chiffrée
 * ==============================================================================
 */

// 1. Architecture Paiements Mobile Money (v2)
export const PaymentGatewayService = {
  providers: [
    { id: 'wave', name: 'Wave Côte d\'Ivoire', feeRate: 0.01, active: false, badge: 'Bientôt disponible' },
    { id: 'orange_money', name: 'Orange Money CI', feeRate: 0.01, active: false, badge: 'Bientôt disponible' },
    { id: 'mtn_momo', name: 'MTN Mobile Money CI', feeRate: 0.01, active: false, badge: 'Bientôt disponible' },
    { id: 'moov_money', name: 'Moov Money CI', feeRate: 0.01, active: false, badge: 'Bientôt disponible' }
  ],

  // Méthode préparée pour l'initialisation de séquestre (escrow)
  async initiateEscrowPayment({ adId, buyerId, amountFcfa, provider }) {
    console.info(`[Escrow Préparation] Transaction pour annonce ${adId} de ${amountFcfa} FCFA via ${provider}`);
    return {
      status: 'pending_v2_activation',
      message: 'En v1, les transactions s\'effectuent directement en main propre sans intermédiaire.'
    };
  }
};

// 2. Architecture Partenaires Livraison Abidjan (v2)
export const DeliveryPartnersService = {
  hubs: [
    { commune: 'Cocody', hubName: 'Point Relais Angré 8ème tranche / Sococé', leadTimeHours: 4 },
    { commune: 'Yopougon', hubName: 'Point Relais Cosmos Yopougon', leadTimeHours: 4 },
    { commune: 'Marcory', hubName: 'Point Relais Cap Sud / Zone 4', leadTimeHours: 3 },
    { commune: 'Plateau', hubName: 'Point Relais Cité Administrative', leadTimeHours: 3 }
  ],

  estimateDeliveryFee(sourceCommune, destCommune) {
    if (sourceCommune.toLowerCase() === destCommune.toLowerCase()) {
      return 1500; // 1 500 FCFA intra-commune
    }
    return 2500; // 2 500 FCFA inter-communes à Abidjan
  }
};

// 3. Points de rencontre sécurisés recommandés à Abidjan
export const SAFE_MEETING_POINTS = {
  "Cocody": [
    "Devant le Centre Commercial Playce Palmeraie",
    "Parking Sococé Deux-Plateaux",
    "Carrefour Duncan (près du commissariat)",
    "Pharmacie Sainte Cécile du Vallon"
  ],
  "Yopougon": [
    "Esplanade du Centre Commercial Cosmos Yopougon",
    "Carrefour Keneya (Zone commerçante)",
    "Place Figayo (en journée)",
    "Pharmacie Bel Air"
  ],
  "Marcory": [
    "Centre Commercial Cap Sud (Boulevard VGE)",
    "Playce Marcory",
    "Pharmacie du Grand Marché de Marcory"
  ],
  "Plateau": [
    "Place de la République (Zone sécurisée)",
    "Galerie Peyrissac / Avenue Chardy",
    "Devant l'Agence Principale La Poste"
  ],
  "Koumassi": [
    "Grand Carrefour de Koumassi",
    "Supermarché King Cash Remblais",
    "Pharmacie Maraîchers"
  ],
  "Port-Bouët": [
    "Carrefour Akwaba",
    "Marché de nuit / Commissariat de Port-Bouët",
    "Supermarché CDCI Vridi"
  ]
};

