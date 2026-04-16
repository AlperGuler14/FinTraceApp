import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
// IMPORT YOLLARI DÜZELTİLDİ
import { supabase } from "../constants/Supabase";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function TimeMachineScreen() {
  const { isDark, colors: theme } = useTheme();

  // State Yönetimi
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [isChallengeVisible, setIsChallengeVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState(false);

  const [pastData, setPastData] = useState({
    balance: 0,
    usdRate: 1,
    goldRate: 1,
    bigMac: 1,
    isReal: false,
  });
  const [presentData, setPresentData] = useState({
    balance: 0,
    usdRate: 1,
    goldRate: 1,
    bigMac: 1,
    isReal: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // VERİ ÇEKME MANTIĞI
  const fetchTimeMachineData = async (monthsAgo: number) => {
    setLoading(true);
    try {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setMonth(today.getMonth() - monthsAgo);
      const pastDateStr = pastDate.toISOString().split("T")[0];

      // 1. Güncel Bakiye (Gerçek İşlemlerden)
      const { data: txData } = await supabase.from("islemler").select("tutar");
      let currentBalance = 0;
      if (txData) txData.forEach((tx) => (currentBalance += Number(tx.tutar)));

      // 2. Market Verileri (SQL'den çek, yoksa yedek değerleri kullan)
      const { data: presentMarket } = await supabase
        .from("market_verileri")
        .select("*")
        .order("donem_tarihi", { ascending: false })
        .limit(1);
      const { data: pastMarket } = await supabase
        .from("market_verileri")
        .select("*")
        .lte("donem_tarihi", pastDateStr)
        .order("donem_tarihi", { ascending: false })
        .limit(1);

      setPresentData({
        balance: currentBalance,
        usdRate: presentMarket?.[0]?.dolar_kuru || 32.5,
        goldRate: presentMarket?.[0]?.altin_gram_fiyati || 2450,
        bigMac: presentMarket?.[0]?.big_mac_fiyati || 180,
        isReal: !!presentMarket?.[0],
      });

      const pastFactor = Math.pow(0.97, monthsAgo); // Geçmişe gidiş simülasyon katsayısı
      setPastData({
        balance: currentBalance * Math.pow(0.95, monthsAgo),
        usdRate: pastMarket?.[0]?.dolar_kuru || 32.5 * pastFactor,
        goldRate: pastMarket?.[0]?.altin_gram_fiyati || 2450 * pastFactor,
        bigMac: pastMarket?.[0]?.big_mac_fiyati || Math.floor(180 * pastFactor),
        isReal: !!pastMarket?.[0],
      });
    } catch (error) {
      console.error("Fetch Hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // SQL KAYIT MANTIĞI (HEDEF EKLEME)
  const handleSetTarget = async () => {
    if (savingTarget) return;
    setSavingTarget(true);

    try {
      // Direkt eklemeyi deniyoruz
      const { error } = await supabase.from("kurtarma_hedefleri").insert([
        {
          hedef_adi: `Enflasyon Savunması (${selectedMonth} Ay)`,
          hedef_kategori: "Dışarıda Yemek",
          tasarruf_orani: 15,
          durum: "aktif",
        },
      ]);

      if (error) {
        // Eğer veritabanındaki UNIQUE kuralına takılırsa bu hata kodu döner (23505)
        if (error.code === "23505") {
          Alert.alert(
            "Zaten Kayıtlı! 🎯",
            "Bu dönem için zaten bir sözün var Alper. Önce onu tutalım!",
          );
        } else {
          throw error;
        }
      } else {
        Alert.alert("Başarılı! ✅", "Sözün veritabanına mühürlendi.");
        setIsChallengeVisible(false);
      }
    } catch (error: any) {
      Alert.alert("Sistem Hatası", error.message);
    } finally {
      setSavingTarget(false);
    }
  };
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    fetchTimeMachineData(selectedMonth);
  }, [selectedMonth]);

  // Alım Gücü Kayıp Hesapları
  const pastUsd = Math.floor(pastData.balance / pastData.usdRate);
  const presentUsd = Math.floor(presentData.balance / presentData.usdRate);
  const pastGold = Math.floor(pastData.balance / pastData.goldRate);
  const presentGold = Math.floor(presentData.balance / presentData.goldRate);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* ÜST PANEL */}
      <LinearGradient
        colors={["#1e293b", "#334155"]}
        style={styles.heroSection}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.push("/")
            }
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Zaman Makinesi</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.timelineContainer}>
          <Text style={styles.timelineLabel}>
            Geçmişe Yolculuk (Mod:{" "}
            {pastData.isReal ? "Canlı SQL" : "Simülasyon"}):
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {[1, 3, 6, 12, 24].map((month) => (
              <TouchableOpacity
                key={month}
                onPress={() => setSelectedMonth(month)}
                style={[
                  styles.timelinePill,
                  selectedMonth === month
                    ? styles.timelinePillActive
                    : styles.timelinePillInactive,
                ]}
              >
                <Text
                  style={{
                    color: selectedMonth === month ? "#fff" : "#94a3b8",
                    fontSize: 13,
                  }}
                >
                  {month} Ay Önce
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <Animated.ScrollView
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        >
          {/* BAKİYE KARŞILAŞTIRMA */}
          <View
            style={[
              styles.mainCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.textMain, marginBottom: 15 },
              ]}
            >
              Sanal Bakiye Artışı
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: theme.textSub, fontSize: 10 }}>
                  {selectedMonth} Ay Önce
                </Text>
                <Text style={{ color: theme.textMain, fontWeight: "bold" }}>
                  ₺{Math.round(pastData.balance).toLocaleString()}
                </Text>
              </View>
              <Feather name="arrow-right" size={20} color={theme.textSub} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: theme.textSub, fontSize: 10 }}>
                  Bugün
                </Text>
                <Text style={{ color: "#10b981", fontWeight: "bold" }}>
                  ₺{Math.round(presentData.balance).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <Text
            style={{
              color: theme.textMain,
              fontWeight: "bold",
              marginBottom: 15,
              fontSize: 16,
            }}
          >
            Gerçek Alım Gücü Kaybın
          </Text>

          {/* DOLAR BAZLI GÜÇ */}
          <View
            style={[
              styles.powerItem,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.iconCircle}>
              <Feather name="dollar-sign" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={{ color: theme.textMain, fontWeight: "bold" }}>
                Dolar Karşılığı
              </Text>
              <Text style={{ color: theme.textSub, fontSize: 12 }}>
                ${pastUsd} iken ${presentUsd} olmuş
              </Text>
            </View>
            <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 16 }}>
              -${pastUsd - presentUsd}
            </Text>
          </View>

          {/* ALTIN BAZLI GÜÇ */}
          <View
            style={[
              styles.powerItem,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                marginTop: 10,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "rgba(245,158,11,0.1)" },
              ]}
            >
              <MaterialCommunityIcons name="gold" size={20} color="#f59e0b" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={{ color: theme.textMain, fontWeight: "bold" }}>
                Altın (Gram)
              </Text>
              <Text style={{ color: theme.textSub, fontSize: 12 }}>
                {pastGold} gr iken {presentGold} gr olmuş
              </Text>
            </View>
            <Text style={{ color: "#ef4444", fontWeight: "900", fontSize: 16 }}>
              -{pastGold - presentGold} gr
            </Text>
          </View>
        </Animated.ScrollView>
      )}

      {/* ALT AKSİYON BUTONU */}
      <View
        style={[
          styles.bottomActionArea,
          { backgroundColor: theme.bg, borderTopColor: theme.border },
        ]}
      >
        <TouchableOpacity
          style={styles.recoverBtn}
          onPress={() => setIsChallengeVisible(true)}
        >
          <LinearGradient
            colors={["#4f46e5", "#3730a3"]}
            style={styles.recoverGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Feather
              name="shield"
              size={18}
              color="#fff"
              style={{ marginRight: 10 }}
            />
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
              KAYBI TELAFİ ET
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MEYDAN OKUMA MODALI */}
      <Modal visible={isChallengeVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.challengeModal, { backgroundColor: theme.cardBg }]}
          >
            <View style={styles.modalIconBg}>
              <Feather name="target" size={40} color="#4f46e5" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Söz Veriyor Musun?
            </Text>
            <Text style={[styles.modalDesc, { color: theme.textSub }]}>
              Enflasyonun erittiği alım gücünü geri kazanmak için bu ay
              "Dışarıda Yemek" kategorisinde{" "}
              <Text style={{ fontWeight: "bold", color: theme.textMain }}>
                %15 tasarruf
              </Text>{" "}
              yapmanı öneriyoruz.
            </Text>

            <TouchableOpacity
              style={[styles.commitBtn, savingTarget && { opacity: 0.7 }]}
              onPress={handleSetTarget}
              disabled={savingTarget}
            >
              {savingTarget ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.commitBtnText}>EVET, SÖZ VERİYORUM</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsChallengeVisible(false)}>
              <Text
                style={{
                  color: theme.textSub,
                  marginTop: 18,
                  fontWeight: "500",
                }}
              >
                Şimdilik kalsın
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  timelineContainer: { marginTop: 20 },
  timelineLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginLeft: 20,
    marginBottom: 8,
    fontWeight: "600",
  },
  timelinePill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  timelinePillActive: { backgroundColor: "#4f46e5", borderColor: "#4f46e5" },
  mainCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 25 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  powerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomActionArea: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    paddingBottom: 35,
    borderTopWidth: 1,
  },
  recoverBtn: { borderRadius: 18, overflow: "hidden", elevation: 3 },
  recoverGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 25,
  },
  challengeModal: { borderRadius: 30, padding: 30, alignItems: "center" },
  modalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(79,70,229,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  modalDesc: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
    fontSize: 15,
  },
  commitBtn: {
    backgroundColor: "#4f46e5",
    width: "100%",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  commitBtnText: {
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 1,
    fontSize: 15,
  },
});
