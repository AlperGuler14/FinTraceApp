import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");

// --- AKILLI LOGO & RENK ÇÖZÜCÜ (Kumbaralara Özel) ---
const resolveLogoUrl = (domain: string) => {
  if (!domain) return null;
  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
};

const STATIC_GOALS = [
  {
    keyword: "macbook",
    domain: "apple.com",
    icon: "laptop-outline",
    colors: ["#a855f740", "#a855f7"],
    neon: "#a855f7",
  }, // Mor
  {
    keyword: "telefon",
    domain: "apple.com",
    icon: "phone-portrait-outline",
    colors: ["#10b98140", "#10b981"],
    neon: "#10b981",
  }, // Yeşil
  {
    keyword: "tatil",
    domain: "booking.com",
    icon: "airplane-outline",
    colors: ["#0ea5e940", "#0ea5e9"],
    neon: "#0ea5e9",
  }, // Mavi
  {
    keyword: "araba",
    domain: "mercedes-benz.com",
    icon: "car-sport-outline",
    colors: ["#f59e0b40", "#f59e0b"],
    neon: "#f59e0b",
  }, // Turuncu
  {
    keyword: "ev",
    domain: "sahibinden.com",
    icon: "home-outline",
    colors: ["#ef444440", "#ef4444"],
    neon: "#ef4444",
  }, // Kırmızı
  {
    keyword: "motor",
    domain: "yamaha-motor.com",
    icon: "bicycle-outline",
    colors: ["#f43f5e40", "#f43f5e"],
    neon: "#f43f5e",
  }, // Pembe
  {
    keyword: "düğün",
    domain: "dugun.com",
    icon: "heart-outline",
    colors: ["#ec489940", "#ec4899"],
    neon: "#ec4899",
  }, // Pembe
];

const getGoalDetails = (text: string) => {
  const lower = text.toLowerCase();
  for (const g of STATIC_GOALS) {
    if (lower.includes(g.keyword))
      return { logo: resolveLogoUrl(g.domain), icon: g.icon, neon: g.neon };
  }
  return { logo: null, icon: "cube-outline", neon: "#8b5cf6" }; // Default Mor
};

export default function KumbaralarScreen() {
  const { isDark, colors: theme } = useTheme();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modallar
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isFundModalVisible, setIsFundModalVisible] = useState(false);

  // Input State'leri
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [fundAmount, setFundAmount] = useState("");

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kumbaralar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error: any) {
      console.error("Kumbaralar çekilirken hata:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, []),
  );

  const handleCreateGoal = async () => {
    if (!newTitle || !newTarget) {
      Alert.alert("Eksik Bilgi", "Lütfen hedefin adını ve tutarını girin.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı.");

      const targetAmount = Number(newTarget.replace(/\./g, ""));

      const { error } = await supabase.from("kumbaralar").insert([
        {
          baslik: newTitle.trim(),
          hedef_tutar: targetAmount,
          user_id: user.id,
          ikon: "target",
          renk: "#8b5cf6",
        },
      ]);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsAddModalVisible(false);
      setNewTitle("");
      setNewTarget("");
      fetchGoals();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleAddFund = async () => {
    if (!fundAmount || !selectedGoal) return;

    try {
      const amountToAdd = Number(fundAmount.replace(/\./g, ""));
      const newSaved = Number(selectedGoal.biriken_tutar) + amountToAdd;
      const target = Number(selectedGoal.hedef_tutar);
      const durum = newSaved >= target ? "tamamlandi" : "aktif";

      const { error: goalError } = await supabase
        .from("kumbaralar")
        .update({ biriken_tutar: newSaved, durum: durum })
        .eq("id", selectedGoal.id);

      if (goalError) throw goalError;

      const { error: txError } = await supabase.from("islemler").insert([
        {
          tutar: -amountToAdd,
          aciklama: `${selectedGoal.baslik} Kumbarasına Aktarıldı`,
          kategori_adi: "Hedeflere Aktarılan",
          tarih: new Date().toISOString(),
        },
      ]);

      if (txError) throw txError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (durum === "tamamlandi") {
        Alert.alert(
          "Tebrikler! 🎉",
          `"${selectedGoal.baslik}" hedefine ulaştın!`,
        );
      } else {
        Alert.alert(
          "Başarılı",
          "Para kumbaraya aktarıldı ve bakiyenden düşüldü.",
        );
      }

      setIsFundModalVisible(false);
      setFundAmount("");
      setSelectedGoal(null);
      fetchGoals();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleDeleteGoal = async (id: string, baslik: string) => {
    Alert.alert(
      "Kumbarayı Kır",
      `"${baslik}" hedefini iptal etmek istiyor musun?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kır ve Sil",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("kumbaralar")
              .delete()
              .eq("id", id);
            if (error) Alert.alert("Hata", error.message);
            else fetchGoals();
          },
        },
      ],
    );
  };

  // --- PREMIUM SİBERPUNK KUMBARA KARTI ---
  const GoalCard = ({ item }: { item: any }) => {
    const target = Number(item.hedef_tutar) || 1;
    const saved = Number(item.biriken_tutar) || 0;
    const progress = Math.min(saved / target, 1);
    const percentage = Math.floor(progress * 100);
    const isCompleted = item.durum === "tamamlandi" || saved >= target;

    const details = getGoalDetails(item.baslik);
    const neonColor = isCompleted ? "#10B981" : details.neon; // Tamamlandıysa altın yeşili

    return (
      <View style={[styles.cardWrapper, { shadowColor: neonColor }]}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(30,41,59,0.8)", "rgba(15,23,42,0.95)"]
              : ["rgba(255,255,255,1)", "rgba(248,250,252,1)"]
          }
          style={[styles.cardBase, { borderColor: `${neonColor}40` }]}
        >
          {/* Üst Metalik Başlık Alanı */}
          <LinearGradient
            colors={isDark ? ["#334155", "#1E293B"] : ["#E2E8F0", "#F1F5F9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.envelopeFlap}
          >
            <View style={styles.flapContent}>
              {/* Neon Parlayan İkon Halkası */}
              <View
                style={[
                  styles.iconCircle,
                  { borderColor: neonColor, shadowColor: neonColor },
                ]}
              >
                {details.logo ? (
                  <Image
                    source={{ uri: details.logo }}
                    style={styles.logoImg}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons
                    name={details.icon as any}
                    size={22}
                    color={neonColor}
                  />
                )}
              </View>

              <View style={styles.titleContainer}>
                <Text
                  style={[styles.goalTitle, { color: theme.textMain }]}
                  numberOfLines={1}
                >
                  {item.baslik}
                </Text>
                <Text style={[styles.goalStatus, { color: theme.textSub }]}>
                  {isCompleted ? "Hedefe Ulaşıldı 🏆" : "Birikim Yapılıyor"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDeleteGoal(item.id, item.baslik)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Ana İçerik */}
          <View style={styles.cardContent}>
            {/* Tutar & İlerleme Etiketi */}
            <View style={styles.amountHeader}>
              <View style={styles.amountRow}>
                <Text style={[styles.savedAmount, { color: theme.textMain }]}>
                  ₺{saved.toLocaleString("tr-TR")}
                </Text>
                <Text style={[styles.targetAmount, { color: theme.textSub }]}>
                  {" "}
                  / ₺{target.toLocaleString("tr-TR")}
                </Text>
              </View>

              {/* Hap Şeklinde İlerleme (Pill Badge) */}
              <View
                style={[
                  styles.percentagePill,
                  {
                    backgroundColor: `${neonColor}20`,
                    borderColor: `${neonColor}50`,
                  },
                ]}
              >
                <Text style={[styles.percentageText, { color: neonColor }]}>
                  %{percentage} Tamamlandı
                </Text>
                {isCompleted && (
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color={neonColor}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>

            {/* Neon İlerleme Çubuğu */}
            <View
              style={[
                styles.progressBarBg,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: neonColor,
                    shadowColor: neonColor,
                  },
                ]}
              />
            </View>

            {/* Buton Alanı */}
            <View style={styles.cardFooter}>
              {/* Sol Taraf Süsleme Çizgileri */}
              <View style={styles.decorativeLines}>
                <View
                  style={[
                    styles.decLine,
                    { width: 10, backgroundColor: theme.border },
                  ]}
                />
                <View
                  style={[
                    styles.decLine,
                    { width: 25, backgroundColor: theme.border },
                  ]}
                />
                <View
                  style={[
                    styles.decLine,
                    { width: 10, backgroundColor: theme.border },
                  ]}
                />
              </View>

              {!isCompleted ? (
                <TouchableOpacity
                  style={[
                    styles.addFundBtn,
                    {
                      borderColor: neonColor,
                      backgroundColor: `${neonColor}15`,
                    },
                  ]}
                  onPress={() => {
                    setSelectedGoal(item);
                    setIsFundModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={16} color={neonColor} />
                  <Text style={[styles.addFundText, { color: neonColor }]}>
                    Para At
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addFundBtn,
                    {
                      borderColor: neonColor,
                      backgroundColor: `${neonColor}15`,
                    },
                  ]}
                  disabled
                >
                  <Ionicons name="star" size={16} color={neonColor} />
                  <Text style={[styles.addFundText, { color: neonColor }]}>
                    Tamamlandı
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.textMain }]}>
            Kumbaralarım
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSub }]}>
            Geleceğini tasarla 🚀
          </Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
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
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <GoalCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="rocket-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyStateTitle, { color: theme.textMain }]}>
                Hedef Belirlemedin
              </Text>
              <Text style={[styles.emptyStateSub, { color: theme.textSub }]}>
                Tasarruf etmek için bir neden bul!
              </Text>
            </View>
          }
        />
      )}

      {/* YENİ HEDEF MODALI */}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Yeni Kumbara
            </Text>
            <TextInput
              placeholder="Hedefin ne? (örn: Macbook)"
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              placeholder="Kaç para lazım? (₺)"
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              value={newTarget}
              onChangeText={(text) => {
                const num = text.replace(/[^0-9]/g, "");
                setNewTarget(num ? Number(num).toLocaleString("tr-TR") : "");
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.iconBg }]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={[styles.btnCancelText, { color: theme.textMain }]}>
                  İptal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleCreateGoal}
              >
                <Text style={styles.btnSaveText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PARA ATMA MODALI */}
      <Modal
        visible={isFundModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              {selectedGoal?.baslik}
            </Text>
            <Text
              style={{
                color: theme.textSub,
                marginBottom: 15,
                textAlign: "center",
              }}
            >
              Kumbaraya ne kadar atacaksın?
            </Text>
            <TextInput
              placeholder="₺0"
              style={[
                styles.input,
                {
                  backgroundColor: theme.iconBg,
                  color: theme.textMain,
                  fontSize: 32,
                  fontWeight: "bold",
                  textAlign: "center",
                },
              ]}
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              value={fundAmount}
              onChangeText={(text) => {
                const num = text.replace(/[^0-9]/g, "");
                setFundAmount(num ? Number(num).toLocaleString("tr-TR") : "");
              }}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.iconBg }]}
                onPress={() => setIsFundModalVisible(false)}
              >
                <Text style={[styles.btnCancelText, { color: theme.textMain }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btn,
                  {
                    backgroundColor: getGoalDetails(selectedGoal?.baslik || "")
                      .neon,
                  },
                ]}
                onPress={handleAddFund}
              >
                <Text style={styles.btnSaveText}>Aktar</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  createBtn: {
    backgroundColor: "#4F46E5",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },

  // --- PREMIUM KUMBARA KARTI STİLLERİ ---
  cardWrapper: {
    marginBottom: 25,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  cardBase: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  envelopeFlap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  flapContent: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  logoImg: { width: "60%", height: "60%" },
  titleContainer: { flex: 1, marginLeft: 15 },
  goalTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  goalStatus: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },

  cardContent: { padding: 20, paddingTop: 15 },
  amountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  savedAmount: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  targetAmount: { fontSize: 14, fontWeight: "600", opacity: 0.6 },

  percentagePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  percentageText: { fontSize: 11, fontWeight: "800" },

  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  decorativeLines: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    opacity: 0.5,
  },
  decLine: { height: 2, borderRadius: 1 },

  addFundBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  addFundText: { fontWeight: "800", fontSize: 13 },

  // BOŞ DURUM & MODALLAR
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateSub: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 0,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 10 },
  btn: { flex: 1, padding: 18, borderRadius: 16, alignItems: "center" },
  btnSave: { backgroundColor: "#4F46E5" },
  btnCancelText: { fontSize: 16, fontWeight: "700" },
  btnSaveText: { color: "white", fontSize: 16, fontWeight: "700" },
});
