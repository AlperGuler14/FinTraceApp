import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { z } from "zod";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

// --- ZOD ŞEMASI ---
const editSchema = z.object({
  amount: z
    .number()
    .positive("Tutar 0'dan büyük olmalıdır.")
    .max(1000000, "Geçersiz tutar."),
  desc: z.string().min(3, "Açıklama çok kısa.").max(50, "Açıklama çok uzun."),
});

export default function TransactionsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // DÜZENLEME MODALI STATE'LERİ
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const getCategoryDetails = (category: string, type: string) => {
    if (type === "income")
      return {
        icon: <Feather name="plus-circle" size={24} color="#10b981" />,
        bg: isDark ? "rgba(16,185,129,0.2)" : "#d1fae5",
      };
    switch (category) {
      case "Market":
        return {
          icon: <Feather name="shopping-cart" size={24} color="#6366f1" />,
          bg: isDark ? "rgba(99,102,241,0.2)" : "#e0e7ff",
        };
      case "Yemek":
        return {
          icon: <Feather name="coffee" size={24} color="#f59e0b" />,
          bg: isDark ? "rgba(245,158,11,0.2)" : "#fef3c7",
        };
      case "Ulaşım":
        return {
          icon: <Feather name="navigation" size={24} color="#3b82f6" />,
          bg: isDark ? "rgba(59,130,246,0.2)" : "#dbeafe",
        };
      case "Kira":
        return {
          icon: <Feather name="home" size={24} color="#8b5cf6" />,
          bg: isDark ? "rgba(139,92,246,0.2)" : "#ede9fe",
        };
      case "Fatura":
        return {
          icon: <Feather name="zap" size={24} color="#eab308" />,
          bg: isDark ? "rgba(234,179,8,0.2)" : "#fef08a",
        };
      case "Eğlence":
        return {
          icon: <Feather name="film" size={24} color="#ec4899" />,
          bg: isDark ? "rgba(236,72,153,0.2)" : "#fce7f3",
        };
      case "Sağlık":
        return {
          icon: <Feather name="heart" size={24} color="#ef4444" />,
          bg: isDark ? "rgba(239,68,68,0.2)" : "#fee2e2",
        };
      case "Giyim":
        return {
          icon: <Feather name="shopping-bag" size={24} color="#14b8a6" />,
          bg: isDark ? "rgba(20,184,166,0.2)" : "#ccfbf1",
        };
      case "Eğitim":
        return {
          icon: <Feather name="book" size={24} color="#8b5cf6" />,
          bg: isDark ? "rgba(139,92,246,0.2)" : "#ede9fe",
        };
      case "Abonelik":
        return {
          icon: <Feather name="refresh-cw" size={24} color="#64748b" />,
          bg: isDark ? "rgba(100,116,139,0.2)" : "#f1f5f9",
        };
      default:
        return {
          icon: <Feather name="help-circle" size={24} color="#94a3b8" />,
          bg: isDark ? "rgba(148,163,184,0.2)" : "#f1f5f9",
        };
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("islemler")
        .select("*")
        .order("tarih", { ascending: false });
      if (error) throw error;
      if (data) {
        const formattedData = data.map((item) => ({
          id: item.id,
          amount: Math.abs(item.tutar),
          type: item.tutar < 0 ? "expense" : "income",
          category: item.kategori_adi,
          desc: item.aciklama,
          date: item.tarih,
          isUpdated: item.is_updated, // Güncellendi etiketini kontrol ediyoruz
        }));
        setTransactions(formattedData);
      }
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, []),
  );

  const openEditModal = (tx: any) => {
    setSelectedTx(tx);
    setEditAmount(tx.amount.toString());
    setEditDesc(tx.desc || "");
    setIsEditModalVisible(true);
  };

  const handleAmountChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    setEditAmount(
      numericValue ? Number(numericValue).toLocaleString("tr-TR") : "",
    );
  };

  // --- GÜNCELLEME FONKSİYONU ---
  const handleUpdate = async () => {
    if (!selectedTx) return;
    setIsSaving(true);

    try {
      const rawNewAmount = Number(editAmount.replace(/\./g, ""));
      editSchema.parse({ amount: rawNewAmount, desc: editDesc.trim() });

      // Giderse aradaki farkı bulup zarfı düzeltmemiz lazım
      if (selectedTx.type === "expense" && rawNewAmount !== selectedTx.amount) {
        const difference = rawNewAmount - selectedTx.amount;

        const { data: walletData } = await supabase
          .from("wallets")
          .select("*")
          .eq("name", selectedTx.category)
          .single();

        if (walletData) {
          await supabase
            .from("wallets")
            .update({ spent: Number(walletData.spent) + difference })
            .eq("id", walletData.id);
        }
      }

      const isExpense = selectedTx.type === "expense";
      const dbAmount = isExpense ? -rawNewAmount : rawNewAmount;

      const { error: updateError } = await supabase
        .from("islemler")
        .update({
          tutar: dbAmount,
          aciklama: editDesc.trim(),
          is_updated: true, // Güncellendi etiketini basıyoruz
        })
        .eq("id", selectedTx.id);

      if (updateError) throw updateError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditModalVisible(false);
      fetchTransactions();
    } catch (error: any) {
      if (error instanceof z.ZodError)
        Alert.alert("Hata", error.errors[0].message);
      else Alert.alert("Güncelleme Hatası", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- SİLME FONKSİYONU (AĞIR HATA AYIKLAMA İLE) ---
  const handleDelete = () => {
    if (!selectedTx?.id) {
      Alert.alert("Hata", "İşlem ID'si bulunamadı!");
      return;
    }

    Alert.alert(
      "İşlemi Sil",
      "Bu işlemi tamamen silmek istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Evet, Sil",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Zarf İadesi
              if (selectedTx.type === "expense") {
                console.log("Zarf iadesi yapılıyor...");
                const { data: walletData } = await supabase
                  .from("wallets")
                  .select("*")
                  .eq("name", selectedTx.category)
                  .single();

                if (walletData) {
                  await supabase
                    .from("wallets")
                    .update({
                      spent: Number(walletData.spent) - selectedTx.amount,
                    })
                    .eq("id", walletData.id);
                }
              }

              // 2. İşlemi sil ve SİLİNEN VERİYİ GERİ İSTE (.select() eklendi)
              console.log("Supabase'den silme komutu gidiyor...");
              const { data: deletedData, error: deleteError } = await supabase
                .from("islemler")
                .delete()
                .eq("id", selectedTx.id)
                .select(); // <--- Sessiz başarısızlığı yakalar

              if (deleteError) throw deleteError;

              // 3. Supabase hata vermedi ama veri de silmediyse
              if (!deletedData || deletedData.length === 0) {
                throw new Error(
                  "Veritabanı güvenlik kuralları (RLS) veya bir Trigger bu işlemi silmeni engelliyor. Lütfen Supabase SQL editöründen 'islem_silinince_logla' trigger'ını silin.",
                );
              }

              // Her şey başarılıysa
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              setIsEditModalVisible(false);
              fetchTransactions();
            } catch (error: any) {
              console.error("TAM SİLME HATASI:", error);
              Alert.alert(
                "Silme İşlemi Başarısız",
                error.message || "Bilinmeyen bir hata oluştu.",
              );
            }
          },
        },
      ],
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <LottieView
        source={require("../../assets/animations/empty.json")}
        autoPlay
        loop
        style={styles.emptyAnimation}
      />
      <Text style={[styles.emptyText, { color: theme.textMain }]}>
        Henüz hiç işlem bulunmuyor.
      </Text>
      <Text style={[styles.emptySubText, { color: theme.textSub }]}>
        İlk gelir veya giderini ekleyerek başla!
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isIncome = item.type === "income";
    const { icon, bg } = getCategoryDetails(item.category, item.type);
    const dateObj = new Date(item.date);
    const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString("tr-TR", { month: "short" })}`;

    return (
      <TouchableOpacity
        style={[
          styles.transactionCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
            borderWidth: isDark ? 1 : 0,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openEditModal(item);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          {icon}
        </View>
        <View style={styles.detailsContainer}>
          <Text style={[styles.categoryText, { color: theme.textMain }]}>
            {item.category}
          </Text>
          {item.desc ? (
            <Text
              style={[styles.descText, { color: theme.textSub }]}
              numberOfLines={1}
            >
              {item.desc}
            </Text>
          ) : (
            <Text style={[styles.descText, { color: theme.textSub }]}>
              {formattedDate}
            </Text>
          )}
        </View>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amountText,
              isIncome ? styles.incomeText : styles.expenseText,
            ]}
          >
            {isIncome ? "+" : "-"}₺
            {item.amount.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
          </Text>

          {/* TARİH VE (DÜZENLENDİ) ETİKETİ YAN YANA */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.dateText, { color: theme.textSub }]}>
              {item.desc && formattedDate}
            </Text>
            {item.isUpdated && (
              <Text
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  fontStyle: "italic",
                  marginLeft: 4,
                }}
              >
                (Düzenlendi)
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textMain }]}>
          İşlem Geçmişi
        </Text>
        <Text style={[styles.transactionCount, { color: theme.textSub }]}>
          {transactions.length} İşlem
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={
            transactions.length === 0
              ? styles.emptyListContent
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmptyComponent}
        />
      )}

      {/* DÜZENLE / SİL MODALI */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              İşlemi Düzenle
            </Text>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ marginBottom: 20, alignItems: "center" }}>
              <Text
                style={{ color: theme.textSub, fontSize: 13, marginBottom: 5 }}
              >
                Kategori
              </Text>
              <Text
                style={{
                  color: theme.textMain,
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              >
                {selectedTx?.category}
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSub }]}>
              Tutar (₺)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.textMain,
                  fontSize: 24,
                  fontWeight: "bold",
                },
              ]}
              keyboardType="number-pad"
              value={editAmount}
              onChangeText={handleAmountChange}
            />

            <Text style={[styles.inputLabel, { color: theme.textSub }]}>
              Açıklama
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.textMain,
                },
              ]}
              value={editDesc}
              onChangeText={setEditDesc}
              maxLength={50}
            />

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={isSaving}
              style={[styles.saveBtn, { backgroundColor: theme.textMain }]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.bg} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.bg }]}>
                  Değişiklikleri Kaydet
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>Bu İşlemi Sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 60,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  transactionCount: { fontSize: 14, fontWeight: "500" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  emptyListContent: { flex: 1, justifyContent: "center" },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailsContainer: { flex: 1 },
  categoryText: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  descText: { fontSize: 13 },
  amountContainer: { alignItems: "flex-end" },
  amountText: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  incomeText: { color: "#10b981" },
  expenseText: { color: "#ef4444" },
  dateText: { fontSize: 12 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyAnimation: { width: 200, height: 200 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubText: { fontSize: 14, marginTop: 8 },

  // MODAL STİLLERİ
  modalContent: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { fontWeight: "bold", fontSize: 16 },
  deleteBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  deleteBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },
});
