// notification.ts
// Notifications de Teach-Me :
// - notifications locales (affichées par le téléphone)
// - notifications push (reçues même quand l'app est fermée)
//
// VERSION SÉCURISÉE : expo-notifications est chargé dans un try/catch.
// Si le module est indisponible (ex : Expo Go), l'app démarre quand même
// et les fonctions ci-dessous ne font simplement rien.

import Constants from "expo-constants";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "./firebase";

// Contiendra le module expo-notifications, ou null s'il est indisponible
let Notifications: any = null;

try {
  Notifications = require("expo-notifications");

  // Comment la notification s'affiche quand l'app est ouverte
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (erreur) {
  console.log(
    "expo-notifications indisponible : les notifications sont désactivées.",
    erreur,
  );
  Notifications = null;
}

// Dit si les notifications fonctionnent sur cet appareil / ce build
export function notificationsDisponibles() {
  return Notifications !== null;
}

// Demande l'autorisation d'afficher des notifications (une seule fois suffit)
// Retourne true si l'autorisation est accordée
export async function demanderPermission() {
  if (!Notifications) return false;

  try {
    // Android a besoin d'un canal de notification
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Teach-Me",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return true;

    const reponse = await Notifications.requestPermissionsAsync();
    return reponse.status === "granted";
  } catch (erreur) {
    console.log("Erreur permission notifications :", erreur);
    return false;
  }
}

// Affiche tout de suite une notification locale sur le téléphone
export async function envoyerNotification(texte: string) {
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Teach-Me", body: texte },
      trigger: null, // null = immédiatement
    });
  } catch (erreur) {
    console.log("Erreur envoi notification :", erreur);
  }
}

// ---------------------------------------------------------------
// PUSH : notifications reçues même quand l'app est fermée
// ---------------------------------------------------------------

// 1) À appeler quand l'utilisateur est connecté :
//    demande la permission et enregistre son token dans Firestore
export async function enregistrerToken() {
  if (!Notifications) return;

  try {
    const user = auth.currentUser;
    if (!user) return;

    // Permission (et canal Android)
    const autorise = await demanderPermission();
    if (!autorise) return;

    // Token push de cet appareil
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;

    // On le range dans utilisateurs/{uid}
    await setDoc(
      doc(db, "utilisateurs", user.uid),
      { pushToken: token },
      { merge: true },
    );
  } catch (erreur) {
    // Normal dans Expo Go ou sur un émulateur sans Google Play
    console.log("Erreur enregistrement token push :", erreur);
  }
}

// 2) À appeler pour notifier quelqu'un, même app fermée
//    Exemple : envoyerPush(idDestinataire, "Vous avez un nouveau message")
export async function envoyerPush(uidDestinataire: string, message: string) {
  try {
    // On lit le token du destinataire
    const snap = await getDoc(doc(db, "utilisateurs", uidDestinataire));
    const token = snap.data()?.pushToken;
    if (!token) return;

    // On envoie au service gratuit d'Expo
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: token,
        title: "Teach-Me",
        body: message,
        sound: "default",
        channelId: "default",
      }),
    });
  } catch (erreur) {
    console.log("Erreur envoi push :", erreur);
  }
}
