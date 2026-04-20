import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

// --- LOGO ÇÖZÜCÜ ---
const resolveLogoUrl = (domain: string) => {
  if (!domain) return null;
  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
};

const STATIC_BRANDS = [
  {
    keyword: "spotify",
    domain: "spotify.com",
    colors: ["#1db95430", "#121212"],
  },
  {
    keyword: "netflix",
    domain: "netflix.com",
    colors: ["#e5091430", "#121212"],
  },
  {
    keyword: "youtube",
    domain: "youtube.com",
    colors: ["#ff000030", "#121212"],
  },
  { keyword: "apple", domain: "apple.com", colors: ["#55555530", "#121212"] },
  {
    keyword: "prime",
    domain: "primevideo.com",
    colors: ["#00a8e130", "#121212"],
  },
  {
    keyword: "trendyol",
    domain: "trendyol.com",
    colors: ["#f27a1a30", "#121212"],
  },
  { keyword: "exxen", domain: "exxen.com", colors: ["#f7941d30", "#121212"] },
  { keyword: "blutv", domain: "blutv.com", colors: ["#0056b330", "#121212"] },
  {
    keyword: "disney",
    domain: "disneyplus.com",
    colors: ["#00336630", "#121212"],
  },
];

const getBrandDetails = (text: string) => {
  const lower = text.toLowerCase();
  for (const b of STATIC_BRANDS) {
    if (lower.includes(b.keyword))
      return { logo: resolveLogoUrl(b.domain), colors: b.colors };
  }
  return { logo: null, colors: ["rgba(100,100,100,0.15)", "#121212"] };
};

export default function SubscriptionsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMonthly, setTotalMonthly] = useState(0); // TOPLAM GİDER STATE'İ

  // Ekleme Modalı State'leri
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDay, setNewDay] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("abonelikler")
        .select("*")
        .order("odeme_gunu", { ascending: true });
      if (error) throw error;

      if (data) {
        setSubscriptions(data);
        // TOPLAM GİDER HESAPLAMASI
        const total = data.reduce(
          (sum, item) => sum + Math.abs(Number(item.tutar)),
          0,
        );
        setTotalMonthly(total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptions();
    }, []),
  );

  const handleAddSubscription = async () => {
    if (!newName || !newAmount || !newDay) {
      Alert.alert("Eksik Bilgi", "Lütfen tüm alanları doldur.");
      return;
    }
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("abonelikler").insert([
        {
          ad: newName,
          tutar: Number(newAmount.replace(/[^0-9]/g, "")),
          odeme_gunu: Number(newDay),
          user_id: user?.id,
        },
      ]);
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsAddModalVisible(false);
      setNewName("");
      setNewAmount("");
      setNewDay("");
      fetchSubscriptions();
    } catch (e: any) {
      Alert.alert("Hata", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Aboneliği Sil",
      `"${name}" aboneliğini radarından çıkarmak istiyor musun?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("abonelikler")
              .delete()
              .eq("id", id);
            if (error) Alert.alert("Hata", error.message);
            else {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              fetchSubscriptions();
            }
          },
        },
      ],
    );
  };

  // --- GERİ GELEN "WAOW" HERO KARTIMIZ ---
  const renderHeader = () => (
    <View style={styles.heroContainer}>
      <LinearGradient
        colors={isDark ? ["#312e81", "#1e1b4b"] : ["#4f46e5", "#3730a3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroGlow} />
        <View style={{ zIndex: 2, alignItems: "center" }}>
          <Text style={styles.heroTitle}>Aylık Sabit Yükün</Text>
          <Text style={styles.heroAmount}>
            ₺{totalMonthly.toLocaleString("tr-TR")}
          </Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Gelecek ayın tahmini yükü</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const brand = getBrandDetails(item.ad);
    const today = new Date().getDate();
    const isToday = item.odeme_gunu === today;
    const isPast = item.odeme_gunu < today;

    return (
      <View style={styles.cardContainer}>
        {/* SOL TARAF: Şık Tarih Alanı */}
        <View style={styles.dateSection}>
          <View
            style={[
              styles.dateBubble,
              {
                backgroundColor: isToday
                  ? "#ef4444"
                  : isPast
                    ? "#10b981"
                    : theme.cardBg,
              },
            ]}
          >
            <Text
              style={[
                styles.dateText,
                { color: isToday || isPast ? "#fff" : theme.textMain },
              ]}
            >
              {item.odeme_gunu}
            </Text>
          </View>
          {index !== subscriptions.length - 1 && (
            <View
              style={[styles.connector, { backgroundColor: theme.border }]}
            />
          )}
        </View>

        {/* SAĞ TARAF: Abonelik Kartı */}
        <LinearGradient
          colors={brand.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.subCard,
            {
              borderColor: isToday ? "#ef444460" : theme.border,
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.logoAndTitle}>
              <View style={styles.logoCircle}>
                {brand.logo ? (
                  <Image source={{ uri: brand.logo }} style={styles.logoImg} />
                ) : (
                  <Feather name="refresh-cw" size={14} color={theme.textSub} />
                )}
              </View>
              <Text
                style={[styles.subName, { color: theme.textMain }]}
                numberOfLines={1}
              >
                {item.ad}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.ad)}
              style={styles.deleteIcon}
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.subAmount, { color: theme.textMain }]}>
              ₺{Number(item.tutar).toLocaleString("tr-TR")}
            </Text>
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor: isToday
                    ? "#ef444420"
                    : isPast
                      ? "#10b98120"
                      : "rgba(255,255,255,0.05)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusTabText,
                  {
                    color: isToday
                      ? "#ef4444"
                      : isPast
                        ? "#10b981"
                        : theme.textSub,
                  },
                ]}
              >
                {isToday
                  ? "BUGÜN"
                  : isPast
                    ? "ÖDENDİ"
                    : `${item.odeme_gunu - today} Gün Kaldı`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.textMain }]}>
            Abonelik Radarı
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSub }]}>
            Sabit giderlerini yönet
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader} // HERO KARTI BURADA EKLENDİ
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LottieView
                source={require("../../assets/animations/empty.json")}
                autoPlay
                loop
                style={{ width: 200, height: 200 }}
              />
              <Text style={{ color: theme.textSub, marginTop: 10 }}>
                Henüz bir abonelik eklemedin.
              </Text>
            </View>
          }
        />
      )}

      {/* ABONELİK EKLEME MODALI */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textMain }]}>
                Yeni Abonelik
              </Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Feather name="x" size={24} color={theme.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={[styles.label, { color: theme.textSub }]}>
                Abonelik Adı
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBg,
                    color: theme.textMain,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Örn: Netflix"
                placeholderTextColor="#666"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={[styles.label, { color: theme.textSub }]}>
                Aylık Tutar (₺)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBg,
                    color: theme.textMain,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Örn: 199"
                keyboardType="numeric"
                value={newAmount}
                onChangeText={setNewAmount}
              />

              <Text style={[styles.label, { color: theme.textSub }]}>
                Ödeme Günü (1-31)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.cardBg,
                    color: theme.textMain,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Örn: 15"
                keyboardType="numeric"
                maxLength={2}
                value={newDay}
                onChangeText={setNewDay}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddSubscription}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Radara Ekle</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 20,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "900" },
  headerSub: { fontSize: 14, marginTop: 4 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  // HERO KART STİLLERİ
  heroContainer: { marginBottom: 25 },
  heroCard: {
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 100,
    zIndex: 1,
  },
  heroTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  heroAmount: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroBadge: {
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 15,
  },
  heroBadgeText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
  },

  listPadding: { paddingHorizontal: 20, paddingBottom: 100 },
  cardContainer: { flexDirection: "row", marginBottom: 5 },
  dateSection: { width: 50, alignItems: "center", paddingTop: 10 },
  dateBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  dateText: { fontSize: 14, fontWeight: "900" },
  connector: { width: 2, flex: 1, marginVertical: 4, opacity: 0.3 },
  subCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  logoAndTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: { width: "100%", height: "100%" },
  subName: { fontSize: 16, fontWeight: "800" },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subAmount: { fontSize: 22, fontWeight: "900" },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusTabText: { fontSize: 10, fontWeight: "900" },
  empty: { alignItems: "center", marginTop: 50 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 25,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 15 },
  input: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16 },
  saveBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  deleteIcon: { padding: 5 },
});
