import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
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

export default function WalletsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [wallets, setWallets] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);

  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [activeWallet, setActiveWallet] = useState<any>(null);
  const [expenseAmount, setExpenseAmount] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Zarfları Çek
      const { data: walletsData, error: walletsError } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false });
      if (walletsError) throw walletsError;
      setWallets(walletsData || []);

      // 2. Bu Ayın Gelirini Çek (İşlemler tablosundan pozitif tutarlar)
      const date = new Date();
      const firstDayOfMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ).toISOString();

      const { data: incomeData, error: incomeError } = await supabase
        .from("islemler")
        .select("tutar")
        .gte("tarih", firstDayOfMonth)
        .gt("tutar", 0); // Sadece gelirler

      if (!incomeError && incomeData) {
        const currentIncome = incomeData.reduce(
          (sum, item) => sum + item.tutar,
          0,
        );
        setTotalIncome(currentIncome);
      }
    } catch (error: any) {
      console.error("Yükleme hatası:", error.message);
    }
  };

  const handleAddWallet = async () => {
    if (!newName || !newLimit) {
      Alert.alert("Eksik Bilgi", "Lütfen zarf adı ve limit girin.");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("wallets").insert([
        {
          name: newName,
          limit: parseFloat(newLimit),
          spent: 0,
          type: "Aylık Harcama Zarfı",
          user_id: user.id,
        },
      ]);
      if (error) throw error;
      setNewName("");
      setNewLimit("");
      setWalletModalVisible(false);
      fetchData();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || !activeWallet) return;

    const currentSpent = parseFloat(activeWallet.spent || 0);
    const expenseNum = parseFloat(expenseAmount);
    const newSpentAmount = currentSpent + expenseNum;
    const limit = parseFloat(activeWallet.limit || 0);

    const proceedWithExpense = async () => {
      try {
        const { error } = await supabase
          .from("wallets")
          .update({ spent: newSpentAmount })
          .eq("id", activeWallet.id);
        if (error) throw error;
        setExpenseAmount("");
        setExpenseModalVisible(false);
        setActiveWallet(null);
        fetchData();
      } catch (error: any) {
        Alert.alert("Hata", error.message);
      }
    };

    if (newSpentAmount > limit) {
      const asimMiktari = newSpentAmount - limit;
      Alert.alert(
        "🚨 Limit Aşımı Uyarısı",
        `Bu harcama ile "${activeWallet.name}" zarfınızın limitini ₺${asimMiktari.toLocaleString("tr-TR")} aşacaksınız.\n\nYine de işleme devam edilsin mi?`,
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Evet, Ekle",
            style: "destructive",
            onPress: proceedWithExpense,
          },
        ],
      );
    } else {
      proceedWithExpense();
    }
  };

  const handleDeleteWallet = async (id: string, name: string) => {
    Alert.alert(
      "Zarfı Sil",
      `"${name}" zarfını silmek istediğine emin misin?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("wallets")
              .delete()
              .eq("id", id);
            if (error) Alert.alert("Hata", error.message);
            else fetchData();
          },
        },
      ],
    );
  };

  const getWalletIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("market") || lower.includes("alışveriş"))
      return "cart-outline";
    if (lower.includes("fatura") || lower.includes("elektrik"))
      return "flash-outline";
    if (lower.includes("yemek") || lower.includes("kahve"))
      return "cafe-outline";
    if (lower.includes("eğlence") || lower.includes("oyun"))
      return "game-controller-outline";
    if (
      lower.includes("yol") ||
      lower.includes("ulaşım") ||
      lower.includes("benzin")
    )
      return "car-sport-outline";
    return "wallet-outline";
  };

  // --- YENİ EKLENEN AYLIK ÖZET KARTI (HERO SECTION) ---
  const renderSummaryHeader = () => {
    const currentMonthName = new Date()
      .toLocaleString("tr-TR", { month: "long" })
      .toUpperCase();
    const totalLimit = wallets.reduce((sum, w) => sum + (w.limit || 0), 0);
    const totalSpent = wallets.reduce((sum, w) => sum + (w.spent || 0), 0);

    return (
      <View style={styles.summaryContainer}>
        <LinearGradient
          colors={isDark ? ["#2D3748", "#1A202C"] : ["#475569", "#1e293b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryTitle}>
            {currentMonthName} BÜTÇE ÖZETİ
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Gelir: </Text>
            <Text style={styles.summaryValue}>
              ₺{totalIncome.toLocaleString("tr-TR")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Zarf Bakiyesi: </Text>
            <Text style={styles.summaryValue}>
              ₺{totalLimit.toLocaleString("tr-TR")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Harcanan: </Text>
            <Text style={styles.summaryValue}>
              ₺{totalSpent.toLocaleString("tr-TR")}
            </Text>
          </View>
        </LinearGradient>

        {/* Alt kısımdaki zarif asılı halka detayı */}
        <View
          style={[
            styles.summaryAnchorRing,
            { backgroundColor: isDark ? "#1A202C" : "#1e293b" },
          ]}
        />
      </View>
    );
  };

  const WalletCard = ({ item, index }: { item: any; index: number }) => {
    const limit = item.limit || 1;
    const spent = item.spent || 0;
    const progress = Math.min(spent / limit, 1);
    const percentage = Math.round((spent / limit) * 100);
    const remaining = limit - spent;
    const isOverLimit = spent > limit;

    const neonColor = isOverLimit
      ? "#EF4444"
      : percentage > 80
        ? "#F59E0B"
        : "#10B981";
    const iconName = getWalletIcon(item.name);

    return (
      <View style={[styles.cardWrapper, { shadowColor: neonColor }]}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(30,41,59,0.9)", "rgba(15,23,42,0.95)"]
              : ["rgba(255,255,255,1)", "rgba(248,250,252,1)"]
          }
          style={[styles.cardBase, { borderColor: `${neonColor}40` }]}
        >
          <LinearGradient
            colors={isDark ? ["#334155", "#1E293B"] : ["#E2E8F0", "#F1F5F9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.envelopeFlap}
          >
            <View style={styles.flapContent}>
              <View
                style={[
                  styles.iconCircle,
                  { borderColor: neonColor, shadowColor: neonColor },
                ]}
              >
                <Ionicons name={iconName as any} size={22} color={neonColor} />
              </View>
              <View style={styles.titleContainer}>
                <Text
                  style={[styles.walletName, { color: theme.textMain }]}
                  numberOfLines={1}
                >
                  {item.name}{" "}
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSub,
                      fontWeight: "500",
                    }}
                  >
                    (Zarf #{index + 1})
                  </Text>
                </Text>
                <Text style={[styles.walletType, { color: theme.textSub }]}>
                  {item.type}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteWallet(item.id, item.name)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.cardContent}>
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressPercent, { color: neonColor }]}>
                  %{percentage}
                </Text>
                <Text style={[styles.progressLimit, { color: theme.textMain }]}>
                  ₺{limit.toLocaleString("tr-TR")}
                </Text>
              </View>
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
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: neonColor }]}>
                  ₺{spent.toLocaleString("tr-TR")} TL
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSub }]}>
                  HARCANAN
                </Text>
              </View>
              <View style={[styles.statBox, { alignItems: "flex-end" }]}>
                <Text
                  style={[
                    styles.statValue,
                    { color: isOverLimit ? "#EF4444" : "#10B981" },
                  ]}
                >
                  {isOverLimit ? "-" : ""}₺
                  {Math.abs(remaining).toLocaleString("tr-TR")} TL
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSub }]}>
                  {isOverLimit ? "AŞILAN" : "KALAN"}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    borderColor: neonColor,
                    borderWidth: 1,
                    backgroundColor: `${neonColor}15`,
                  },
                ]}
                onPress={() => {
                  setActiveWallet(item);
                  setExpenseModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color={neonColor} />
                <Text style={[styles.actionBtnText, { color: neonColor }]}>
                  Hemen Para Ekle
                </Text>
              </TouchableOpacity>
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
            Bütçe Planım
          </Text>
          <Text style={{ color: theme.textSub, marginTop: 4 }}>
            Zarflarını akıllıca yönet
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setWalletModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={wallets}
        keyExtractor={(item) => item.id?.toString()}
        ListHeaderComponent={renderSummaryHeader} // ÖZET KARTI BURADA EKLENDİ
        renderItem={({ item, index }) => (
          <WalletCard item={item} index={index} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* YENİ ZARF MODALI */}
      <Modal
        visible={isWalletModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.cardBg }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Yeni Zarf Oluştur
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              placeholder="Zarf Adı (Örn: Market)"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              placeholder="Aylık Limit (₺)"
              keyboardType="numeric"
              value={newLimit}
              onChangeText={setNewLimit}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.iconBg }]}
                onPress={() => setWalletModalVisible(false)}
              >
                <Text style={[styles.btnCancelText, { color: theme.textMain }]}>
                  İptal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleAddWallet}
              >
                <Text style={styles.btnSaveText}>Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HARCAMA MODALI */}
      <Modal
        visible={isExpenseModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.cardBg }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              {activeWallet?.name} Zarfından Harca
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              placeholder="Harcadığın Tutar (₺)"
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.iconBg }]}
                onPress={() => setExpenseModalVisible(false)}
              >
                <Text style={[styles.btnCancelText, { color: theme.textMain }]}>
                  Vazgeç
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#10B981" }]}
                onPress={handleAddExpense}
              >
                <Text style={styles.btnSaveText}>Onayla</Text>
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
    paddingTop: 30,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  addButton: {
    backgroundColor: "#4F46E5",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  listContainer: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },

  // --- ÖZET KARTI (HERO) STİLLERİ ---
  summaryContainer: {
    marginBottom: 40,
    alignItems: "center",
    position: "relative",
    marginTop: 10,
  },
  summaryCard: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)", // Altın/Gold parlama
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  summaryTitle: {
    color: "#D4AF37", // Gold
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "500",
  },
  summaryValue: {
    color: "#D4AF37",
    fontSize: 16,
    fontWeight: "800",
  },
  summaryAnchorRing: {
    position: "absolute",
    bottom: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: "rgba(212, 175, 55, 0.4)", // Gold yüzük
    zIndex: 10,
  },

  // --- ZARF KARTI STİLLERİ ---
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  titleContainer: { flex: 1, marginLeft: 12 },
  walletName: { fontSize: 18, fontWeight: "800" },
  walletType: { fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 8 },
  cardContent: { padding: 20, paddingTop: 10 },
  progressSection: { marginVertical: 15 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressPercent: { fontSize: 16, fontWeight: "800" },
  progressLimit: { fontSize: 16, fontWeight: "800" },
  progressBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  statBox: { flex: 1 },
  statValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 1,
  },
  actionRow: { marginTop: 20, alignItems: "flex-end" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: { fontWeight: "800", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 25,
    textAlign: "center",
  },
  input: { padding: 18, borderRadius: 16, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 10 },
  btn: { flex: 1, padding: 18, borderRadius: 16, alignItems: "center" },
  btnSave: { backgroundColor: "#4F46E5" },
  btnCancelText: { fontSize: 16, fontWeight: "700" },
  btnSaveText: { color: "white", fontSize: 16, fontWeight: "700" },
});
