// src/lib/estimerCompatibilite.ts
//
// Calcule les chances qu'une demande soit acceptée, dans l'app.
//   1. On compte les points communs entre mon profil et celui que je regarde.
//   2. Le modèle (appris par entrainer_compatibilite.py) donne un poids à chaque critère.
//   3. On transforme le total en pourcentage.
//
// Mets modele_compatibilite.json dans le MÊME dossier que ce fichier (lib).

import {
  calculerCompatibilite,
  type InfosProfil,
} from "./calculerCompatibilite";
import modeleJson from "./modele_compatibilite.json";

// La forme du fichier JSON créé par entrainer_compatibilite.py
type Modele = {
  colonnes: string[];
  coefficients: number[];
  intercept: number;
  seuils: { elevees: number; moyennes: number };
};

const modele = modeleJson as Modele;

// Ce que la fonction renvoie
export type ResultatEstimation = {
  points: number; // ex : 3
  total: number; // ex : 5
  pourcentage: number; // ex : 72 (donné par le modèle)
  niveau: "elevees" | "moyennes" | "faibles";
  libelle: string; // ex : "Élevées"
  communs: string[]; // ex : ["Matière", "Niveau", "Lieu"]
};

export function estimerCompatibilite(
  miennes: InfosProfil,
  vues: InfosProfil,
): ResultatEstimation {
  // 1. Les points communs
  const comparaison = calculerCompatibilite(miennes, vues);

  // 2. Score du modèle : constante + somme (poids x critère en commun)
  let score = modele.intercept;
  modele.colonnes.forEach((colonne, i) => {
    score += modele.coefficients[i] * (comparaison.indicateurs[colonne] ?? 0);
  });

  // 3. Le score devient une probabilité entre 0 et 1
  const probabilite = 1 / (1 + Math.exp(-score));
  const pourcentage = Math.round(probabilite * 100);

  const base = {
    points: comparaison.points,
    total: comparaison.total,
    pourcentage,
    communs: comparaison.communs,
  };

  if (probabilite >= modele.seuils.elevees) {
    return { ...base, niveau: "elevees", libelle: "Élevées" };
  }
  if (probabilite >= modele.seuils.moyennes) {
    return { ...base, niveau: "moyennes", libelle: "Moyennes" };
  }
  return { ...base, niveau: "faibles", libelle: "Faibles" };
}
