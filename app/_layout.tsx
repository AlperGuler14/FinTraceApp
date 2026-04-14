import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Fontlar yüklenene kadar Splash ekranını tut
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Uygulamanın ilk açılış ekranı (app/index.js) */}
      <Stack.Screen name="index" options={{ animation: "fade" }} />

      {/* Ana uygulama sayfaları (app/(tabs)/...) */}
      <Stack.Screen name="(tabs)" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
