import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// --- KARŞILAMA EKRANI VERİLERİ ---
const ONBOARDING_DATA = [
  {
    id: "1",
    title: "Finansal Kontrol Sende",
    description:
      "Tüm hesaplarını, gelirlerini ve giderlerini tek bir ekranda, kolayca takip et. Paran nereye gidiyor anında gör.",
    icon: "pie-chart",
    colors: ["#4f46e5", "#8b5cf6"],
  },
  {
    id: "2",
    title: "Akıllı Zeka Asistanı",
    description:
      "Harcama alışkanlıklarını analiz eden AI asistanınla tanış. Sana özel tasarruf tavsiyeleri al ve hedeflerine daha hızlı ulaş.",
    icon: "cpu",
    colors: ["#10b981", "#059669"],
  },
  {
    id: "3",
    title: "Zarflar ve Kumbaralar",
    description:
      "Aylık bütçeni zarflara böl, disiplinden kopma. Hayalindeki araba veya teknoloji hedeflerin için kumbaranda para biriktir.",
    icon: "target",
    colors: ["#f59e0b", "#ea580c"],
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isChecking, setIsChecking] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  // Uygulama açılışında kontrol: Kullanıcı daha önce geçti mi?
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("@onboarding_completed");
        if (value === "true") {
          router.replace("/(tabs)");
        } else {
          setIsChecking(false);
        }
      } catch (e) {
        setIsChecking(false);
      }
    };
    checkStatus();
  }, []);

  // Onboarding'i tamamla ve hafızaya kaydet
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@onboarding_completed", "true");
      router.replace("/(tabs)");
    } catch (e) {
      router.replace("/(tabs)");
    }
  };

  const scrollToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const skipToApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeOnboarding();
  };

  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const Slide = ({ item }) => (
    <View style={styles.slideContainer}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={item.colors}
          style={styles.gradientCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name={item.icon} size={60} color="#ffffff" />
        </LinearGradient>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        {currentIndex < ONBOARDING_DATA.length - 1 && (
          <TouchableOpacity onPress={skipToApp}>
            <Text style={styles.skipText}>Atla</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={ONBOARDING_DATA}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(event) =>
          setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        ref={slidesRef}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={scrollToNext}>
          <LinearGradient
            colors={["#1e293b", "#0f172a"]}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>
              {currentIndex === ONBOARDING_DATA.length - 1
                ? "Hadi Başlayalım"
                : "Devam Et"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    height: 100,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  skipText: { fontSize: 16, color: "#64748b", fontWeight: "600" },
  slideContainer: { width, alignItems: "center", padding: 40 },
  iconContainer: { flex: 0.6, justifyContent: "center" },
  gradientCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: { flex: 0.4, alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: { padding: 40 },
  btn: { borderRadius: 16, overflow: "hidden" },
  btnGradient: { paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
