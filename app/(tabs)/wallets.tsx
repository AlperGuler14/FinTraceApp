import { Ionicons } from "@expo/vector-icons";
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
import { useTheme } from "../../context/ThemeContext"; // TEMA MOTORU EKLENDİ

const { width } = Dimensions.get("window");

const WalletsScreen = () => {
  const { isDark, colors: theme } = useTheme(); // TEMAYI ÇEKİYORUZ
  const [wallets, setWallets] = useState([]);

  // State'ler aynı kalıyor
  const [isWalletModalVisible, setWalletModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [isExpenseModalVisible, setExpenseModalVisible] = useState(false);
  const [activeWallet, setActiveWallet] = useState<any>(null);
  const [expenseAmount, setExpenseAmount] = useState("");

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setWallets(data || []);
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
      const { error } = await supabase.from("wallets").insert([
        {
          name: newName,
          limit: parseFloat(newLimit),
          spent: 0,
          type: "Aylık Harcama Zarfı",
        },
      ]);
      if (error) throw error;
      setNewName("");
      setNewLimit("");
      setWalletModalVisible(false);
      fetchWallets();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseAmount || !activeWallet) return;
    try {
      const currentSpent = parseFloat(activeWallet.spent || 0);
      const newSpentAmount = currentSpent + parseFloat(expenseAmount);
      const { error } = await supabase
        .from("wallets")
        .update({ spent: newSpentAmount })
        .eq("id", activeWallet.id);
      if (error) throw error;
      setExpenseAmount("");
      setExpenseModalVisible(false);
      setActiveWallet(null);
      fetchWallets();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const handleDeleteWallet = async (id: string, name: string) => {
    Alert.alert(
      "Zarfı Sil",
      `"${name}" zarfını silmek istediğine emin misin? Bu işlem geri alınamaz.`,
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
            else fetchWallets();
          },
        },
      ],
    );
  };

  const WalletCard = ({ item }: { item: any }) => {
    const progress = Math.min((item.spent || 0) / (item.limit || 1), 1);
    const percentage = Math.round(progress * 100);
    const remaining = (item.limit || 0) - (item.spent || 0);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
            borderWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.walletName, { color: theme.textMain }]}>
              {item.name}
            </Text>
            <Text style={[styles.walletType, { color: theme.textSub }]}>
              {item.type}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteWallet(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: theme.textMain }]}>
            ₺{(item.spent || 0).toLocaleString("tr-TR")} / ₺
            {(item.limit || 0).toLocaleString("tr-TR")}
          </Text>
        </View>

        <View
          style={[
            styles.progressBarBg,
            { backgroundColor: isDark ? "#334155" : "#E5E7EB" },
          ]}
        >
          <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.percentageText}>%{percentage} Tamamlandı</Text>
            <Text style={[styles.remainingText, { color: theme.textSub }]}>
              Kalan: ₺{remaining.toLocaleString("tr-TR")}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.addExpenseBtn,
              { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" },
            ]}
            onPress={() => {
              setActiveWallet(item);
              setExpenseModalVisible(true);
            }}
          >
            <Ionicons name="remove-circle-outline" size={16} color="#EF4444" />
            <Text style={styles.addExpenseText}>Harcama</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textMain }]}>
          Bütçe Planım
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setWalletModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSub }]}>
        AKTİF ZARFLARIN
      </Text>

      <FlatList
        data={wallets}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <WalletCard item={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Yeni Zarf Modalı */}
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
              placeholder="Zarf Adı"
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

      {/* Harcama Modalı */}
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
              {activeWallet?.name} Harcaması
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.iconBg, color: theme.textMain },
              ]}
              placeholderTextColor={theme.textSub}
              placeholder="Tutar (₺)"
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
                style={[styles.btn, { backgroundColor: "#EF4444" }]}
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
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  addButton: {
    backgroundColor: "#4F46E5",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 20,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 1,
  },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  walletName: { fontSize: 18, fontWeight: "700" },
  walletType: { fontSize: 12, marginTop: 2 },
  amountRow: { marginTop: 15, marginBottom: 8 },
  amountText: { fontSize: 15, fontWeight: "600" },
  progressBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 15,
  },
  percentageText: { fontSize: 12, fontWeight: "600", color: "#10B981" },
  remainingText: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  addExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addExpenseText: { color: "#EF4444", fontWeight: "600", fontSize: 13 },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: { padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 10 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center" },
  btnSave: { backgroundColor: "#4F46E5" },
  btnCancelText: { fontSize: 16, fontWeight: "600" },
  btnSaveText: { color: "white", fontSize: 16, fontWeight: "600" },
});

export default WalletsScreen;
