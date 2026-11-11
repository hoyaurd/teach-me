// src/lib/calculerCompatibilite.ts
//
// Compare MES infos avec les infos du profil que je regarde.
// On compte combien de critères sont en commun, sur 5 :
//   matière, niveau, lieu, type de rémunération, lieu de cours.
//
// Cette comparaison suit EXACTEMENT la même règle que le script Python
// exporter_compatibilite.py (minuscules, sans accents, listes séparées par des virgules).
// C'est important : le modèle a appris avec cette règle.

// Les infos que l'on compare (les mêmes noms que dans une publication)
export type InfosProfil = {
  matiere?: string;
  niveau?: string;
  lieu?: string;
  remuneration?: string;
  lieuTravail?: string;
};

// Les 5 critères, dans le MÊME ORDRE que COLONNES dans entrainer_compatibilite.py
const CRITERES: { champ: keyof InfosProfil; colonne: string; nom: string }[] = [
  { champ: "matiere", colonne: "match_matiere", nom: "Matière" },
  { champ: "niveau", colonne: "match_niveau", nom: "Niveau" },
  { champ: "lieu", colonne: "match_lieu", nom: "Lieu" },
  { champ: "remuneration", colonne: "match_remuneration", nom: "Rémunération" },
  { champ: "lieuTravail", colonne: "match_lieuTravail", nom: "Lieu de cours" },
];

// Transforme un texte en liste de mots propres.
// "Maths, Physique" devient ["maths", "physique"] (minuscules, sans accents)
function versListe(valeur?: string): string[] {
  return String(valeur ?? "")
    .split(",")
    .map((mot) =>
      mot
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )
    .filter((mot) => mot !== "");
}

// true si les deux textes ont au moins un mot en commun
function enCommun(a?: string, b?: string): boolean {
  const listeB = versListe(b);
  return versListe(a).some((mot) => listeB.includes(mot));
}

// Ce que la fonction renvoie
export type ResultatComparaison = {
  points: number; // nombre de critères en commun (ex : 3)
  total: number; // nombre de critères comparés (5)
  communs: string[]; // ex : ["Matière", "Niveau", "Lieu"]
  indicateurs: Record<string, number>; // ex : { match_matiere: 1, match_niveau: 0, ... }
};

export function calculerCompatibilite(
  miennes: InfosProfil,
  vues: InfosProfil,
): ResultatComparaison {
  const indicateurs: Record<string, number> = {};
  const communs: string[] = [];

  CRITERES.forEach((c) => {
    const commun = enCommun(miennes[c.champ], vues[c.champ]);
    indicateurs[c.colonne] = commun ? 1 : 0;
    if (commun) communs.push(c.nom);
  });

  return {
    points: communs.length,
    total: CRITERES.length,
    communs,
    indicateurs,
  };
}
