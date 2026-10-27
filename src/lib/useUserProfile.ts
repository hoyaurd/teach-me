// src/hooks/useUserProfile.ts
// Rôle : récupérer le profil de l'utilisateur connecté (collection "utilisateurs")
// en utilisant la fonction lireProfil de src/lib/utilisateurs.ts.

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { lireProfil, Utilisateur } from "../lib/utilisateurs";

export function useUserProfile() {
  const [profile, setProfile] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true); // true pendant le chargement
  const [error, setError] = useState("");

  useEffect(() => {
    // Firebase nous prévient dès qu'on sait qui est connecté
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Personne de connecté : rien à afficher
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // On lit le document "utilisateurs/{uid}" avec ta fonction lireProfil
        const resultat = await lireProfil(user.uid);
        setProfile(resultat); // null si le document n'existe pas
      } catch (e: any) {
        console.log("Erreur Firestore :", e.code);
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    });

    // On arrête d'écouter quand l'écran est fermé
    return unsubscribe;
  }, []);

  return { profile, loading, error };
}
