import { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

// Cadre commun à toutes les pages.
// Téléphone : plein écran.
// Tablette et ordinateur : colonne centrée, sans débordement horizontal.
export default function CadreResponsive({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const estTablette = width >= 481 && width <= 1024;
  const estOrdinateur = width >= 1025;
  const largeurMax = estOrdinateur ? 980 : estTablette ? 820 : undefined;

  return (
    <View style={styles.fond}>
      <View style={[styles.cadre, largeurMax != null && { maxWidth: largeurMax }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    alignItems: "center",
    backgroundColor: "#F4F6FB",
    overflow: "hidden",
  },
  cadre: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
});
