import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
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

const editSchema = z.object({
  amount: z
    .number()
    .positive("Tutar 0'dan büyük olmalıdır.")
    .max(1000000, "Geçersiz tutar."),
  desc: z.string().min(3, "Açıklama çok kısa.").max(50, "Açıklama çok uzun."),
});

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isYesterday = (date: Date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

const formatDateSection = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return "BUGÜN";
  if (isYesterday(date)) return "DÜN";
  return date
    .toLocaleDateString("tr-TR", { day: "numeric", month: "long" })
    .toUpperCase();
};

// --- YENİ AKILLI LİNK ÇÖZÜCÜ (Direkt resim linklerini bozmaz) ---
const resolveLogoUrl = (domainOrUrl: string) => {
  if (!domainOrUrl) return null;
  // Eğer kullanıcı tam ve uzun bir resim linki verdiyse ona hiç dokunma!
  if (
    domainOrUrl.startsWith("http") &&
    domainOrUrl.includes("/") &&
    domainOrUrl.length > 15
  ) {
    return domainOrUrl;
  }
  // Sadece "trendyol.com" gibi bir şey yazdıysa Google'dan faviconunu çek
  const cleanDomain = domainOrUrl.replace(/^https?:\/\//, "").split("/")[0];
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;
};

type Brand = { keyword: string; domain: string };

const STATIC_BRANDS: Brand[] = [
  { keyword: "amazon prime", domain: "primevideo.com" },
  { keyword: "prime video", domain: "primevideo.com" },
  { keyword: "burger king", domain: "burgerking.com" },
  { keyword: "spotify", domain: "spotify.com" },
  { keyword: "netflix", domain: "netflix.com" },
  { keyword: "youtube", domain: "youtube.com" },
  { keyword: "apple", domain: "apple.com" },
  { keyword: "amazon", domain: "amazon.com" },
  { keyword: "prime", domain: "primevideo.com" },
  { keyword: "steam", domain: "steampowered.com" },
  { keyword: "epic", domain: "epicgames.com" },
  { keyword: "playstation", domain: "playstation.com" },
  { keyword: "xbox", domain: "xbox.com" },
  { keyword: "yemeksepeti", domain: "yemeksepeti.com" },
  { keyword: "getir", domain: "getir.com" },
  { keyword: "trendyol", domain: "trendyol.com" },
  { keyword: "hepsiburada", domain: "hepsiburada.com" },
  { keyword: "starbucks", domain: "starbucks.com" },
  { keyword: "migros", domain: "migros.com.tr" },
  { keyword: "mcdonalds", domain: "mcdonalds.com" },
  { keyword: "uber", domain: "uber.com" },
  { keyword: "binance", domain: "binance.com" },
  { keyword: "exxen", domain: "exxen.com" },
  { keyword: "blutv", domain: "blutv.com" },
  { keyword: "disney", domain: "disneyplus.com" },
  { keyword: "nike", domain: "nike.com" },
  { keyword: "zara", domain: "zara.com" },
  { keyword: "marti", domain: "marti.tech" },
  { keyword: "twitter", domain: "twitter.com" },
  { keyword: "instagram", domain: "instagram.com" },
  { keyword: "linkedin", domain: "linkedin.com" },
  { keyword: "twitch", domain: "twitch.tv" },
  { keyword: "discord", domain: "discord.com" },
  { keyword: "paypal", domain: "paypal.com" },
];

const CATEGORY_EMOJIS: Record<string, string> = {
  Market: "🛒",
  Yemek: "🍕",
  Ulaşım: "🚗",
  Kira: "🏠",
  Fatura: "⚡",
  Eğlence: "🎬",
  Sağlık: "❤️",
  Giyim: "👕",
  Eğitim: "📚",
  Abonelikler: "🔄",
  "Hedeflere Aktarılan": "🎯",
  income: "💰",
};

type CustomBrand = { id: string; keyword: string; domain: string };
const STORAGE_KEY = "custom_brands";

const getBrandLogoUrl = (
  text: string,
  customBrands: CustomBrand[],
): string | null => {
  if (!text) return null;
  const lower = text.toLowerCase();

  const sortedCustom = [...customBrands].sort(
    (a, b) => b.keyword.length - a.keyword.length,
  );
  for (const b of sortedCustom) {
    if (lower.includes(b.keyword.toLowerCase()))
      return resolveLogoUrl(b.domain);
  }

  for (const b of STATIC_BRANDS) {
    if (lower.includes(b.keyword.toLowerCase()))
      return resolveLogoUrl(b.domain);
  }

  return null;
};

const SmartIcon = ({
  tx,
  customBrands,
}: {
  tx: any;
  customBrands: CustomBrand[];
}) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getBrandLogoUrl(tx.desc || tx.category, customBrands);

  if (logoUrl && !imgError) {
    return (
      <View style={[styles.iconBox, { backgroundColor: "#fff", padding: 6 }]}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: 32, height: 32, borderRadius: 6 }}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      </View>
    );
  }

  const isIncome = tx.type === "income";
  const emoji = isIncome
    ? CATEGORY_EMOJIS["income"]
    : (CATEGORY_EMOJIS[tx.category] ?? "💸");

  return (
    <View
      style={[styles.iconBox, { backgroundColor: "rgba(100,100,100,0.1)" }]}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    </View>
  );
};

export default function TransactionsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [customBrands, setCustomBrands] = useState<CustomBrand[]>([]);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  const loadCustomBrands = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setCustomBrands(JSON.parse(raw));
    } catch (e) {
      console.error("AsyncStorage read error:", e);
    }
  };

  useEffect(() => {
    loadCustomBrands();
  }, []);

  const getCategoryColor = (category: string, type: string) => {
    if (type === "income")
      return { color: "#10b981", bg: "rgba(16,185,129,0.15)" };
    const map: Record<string, { color: string; bg: string }> = {
      Market: { color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
      Yemek: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
      Ulaşım: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
      Kira: { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
      Fatura: { color: "#eab308", bg: "rgba(234,179,8,0.15)" },
      Eğlence: { color: "#ec4899", bg: "rgba(236,72,153,0.15)" },
      Sağlık: { color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
      Giyim: { color: "#14b8a6", bg: "rgba(20,184,166,0.15)" },
      Eğitim: { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
      Abonelikler: { color: "#64748b", bg: "rgba(100,116,139,0.15)" },
      "Hedeflere Aktarılan": { color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
    };
    return map[category] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.15)" };
  };

  const groupTransactions = useCallback((list: any[]) => {
    if (!Array.isArray(list)) return;
    const groups: Record<string, any[]> = {};
    list.forEach((item) => {
      const key = formatDateSection(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    const result: any[] = [];
    Object.keys(groups).forEach((key) => {
      result.push({ type: "header", title: key, id: `header-${key}` });
      groups[key].forEach((item) =>
        result.push({ type: "item", data: item, id: item.id }),
      );
    });
    setGroupedData(result);
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("islemler")
        .select("*")
        .order("tarih", { ascending: false });
      if (error) throw error;
      if (data && Array.isArray(data)) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          amount: Math.abs(item.tutar),
          type: item.tutar < 0 ? "expense" : "income",
          category: item.kategori_adi,
          desc: item.aciklama,
          date: item.tarih,
          isUpdated: item.is_updated,
        }));
        setAllTransactions(formatted);
        groupTransactions(formatted);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, []),
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      groupTransactions(allTransactions);
      return;
    }
    const lower = text.toLowerCase();
    const filtered = allTransactions.filter(
      (tx) =>
        tx.desc?.toLowerCase().includes(lower) ||
        tx.category?.toLowerCase().includes(lower),
    );
    groupTransactions(filtered);
  };

  const openEditModal = (tx: any) => {
    setSelectedTx(tx);
    setEditAmount(tx.amount.toString());
    setEditDesc(tx.desc || "");
    setIsEditModalVisible(true);
  };

  const handleAmountChange = (text: string) => {
    const numeric = text.replace(/[^0-9]/g, "");
    setEditAmount(numeric ? Number(numeric).toLocaleString("tr-TR") : "");
  };

  const handleUpdate = async () => {
    if (!selectedTx) return;
    setIsSaving(true);
    try {
      const rawAmount = Number(editAmount.replace(/\./g, ""));
      editSchema.parse({ amount: rawAmount, desc: editDesc.trim() });
      if (selectedTx.type === "expense" && rawAmount !== selectedTx.amount) {
        const diff = rawAmount - selectedTx.amount;
        const { data: w } = await supabase
          .from("wallets")
          .select("*")
          .eq("name", selectedTx.category)
          .single();
        if (w)
          await supabase
            .from("wallets")
            .update({ spent: Number(w.spent) + diff })
            .eq("id", w.id);
      }
      const dbAmount = selectedTx.type === "expense" ? -rawAmount : rawAmount;
      const { error } = await supabase
        .from("islemler")
        .update({
          tutar: dbAmount,
          aciklama: editDesc.trim(),
          is_updated: true,
        })
        .eq("id", selectedTx.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditModalVisible(false);
      fetchTransactions();
    } catch (e: any) {
      if (e instanceof z.ZodError) Alert.alert("Hata", e.errors[0].message);
      else Alert.alert("Güncelleme Hatası", e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedTx?.id) return;
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
              if (selectedTx.type === "expense") {
                const { data: w } = await supabase
                  .from("wallets")
                  .select("*")
                  .eq("name", selectedTx.category)
                  .single();
                if (w)
                  await supabase
                    .from("wallets")
                    .update({ spent: Number(w.spent) - selectedTx.amount })
                    .eq("id", w.id);
              }
              const { error } = await supabase
                .from("islemler")
                .delete()
                .eq("id", selectedTx.id);
              if (error) throw error;
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              setIsEditModalVisible(false);
              fetchTransactions();
            } catch (e: any) {
              Alert.alert("Silme Başarısız", e.message);
            }
          },
        },
      ],
    );
  };

  const handleAddBrand = async () => {
    if (!newKeyword.trim() || !newDomain.trim()) {
      Alert.alert("Hata", "Tüm alanları doldurun.");
      return;
    }
    setIsAddingSaving(true);
    try {
      const newBrand: CustomBrand = {
        id: Date.now().toString(),
        keyword: newKeyword.trim().toLowerCase(),
        domain: newDomain.trim(), // Linki parçalamadan direkt kaydediyoruz
      };

      const updated = [...customBrands, newBrand];
      setCustomBrands(updated); // UI'ı anında yenile
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); // Hafızaya yaz

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewKeyword("");
      setNewDomain("");
    } catch (e: any) {
      Alert.alert("Hata", e.message);
    } finally {
      setIsAddingSaving(false);
    }
  };

  const handleDeleteCustomBrand = async (id: string) => {
    const updated = customBrands.filter((b) => b.id !== id);
    setCustomBrands(updated); // UI anında yenilensin
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const stickyIndices = groupedData.reduce<number[]>((acc, item, index) => {
    if (item?.type === "header") acc.push(index);
    return acc;
  }, []);

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {searchQuery ? (
        <Text style={[styles.emptyText, { color: theme.textMain }]}>
          "{searchQuery}" bulunamadı.
        </Text>
      ) : (
        <>
          <LottieView
            source={require("../../assets/animations/empty.json")}
            autoPlay
            loop
            style={styles.emptyAnimation}
          />
          <Text style={[styles.emptyText, { color: theme.textMain }]}>
            Geçmişin tertemiz.
          </Text>
          <Text style={[styles.emptySubText, { color: theme.textSub }]}>
            Henüz bir finansal izin yok.
          </Text>
        </>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (!item) return null;
    if (item.type === "header") {
      return (
        <Text style={[styles.dateHeader, { color: theme.textSub }]}>
          {item.title}
        </Text>
      );
    }
    const tx = item.data;
    if (!tx) return null;
    const isIncome = tx.type === "income";
    const { color, bg } = getCategoryColor(tx.category, tx.type);
    const emoji = isIncome
      ? CATEGORY_EMOJIS["income"]
      : (CATEGORY_EMOJIS[tx.category] ?? "💸");

    return (
      <TouchableOpacity
        style={styles.txCard}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openEditModal(tx);
        }}
      >
        <View style={styles.txCardLeft}>
          <SmartIcon tx={tx} customBrands={customBrands} />
          <View style={styles.textContainer}>
            <Text
              style={[styles.txDesc, { color: theme.textMain }]}
              numberOfLines={1}
            >
              {tx.desc || tx.category}
            </Text>
            <View style={styles.categoryPillWrapper}>
              <View style={[styles.categoryPill, { backgroundColor: bg }]}>
                <Text style={{ fontSize: 10, marginRight: 3 }}>{emoji}</Text>
                <Text style={[styles.categoryPillText, { color }]}>
                  {tx.category}
                </Text>
              </View>
              {tx.isUpdated && (
                <Text style={[styles.editedTag, { color: theme.textSub }]}>
                  (Düzenlendi)
                </Text>
              )}
            </View>
          </View>
        </View>
        <Text
          style={[
            styles.txAmount,
            { color: isIncome ? "#10b981" : theme.textMain },
          ]}
        >
          {isIncome ? "+" : ""}₺
          {tx.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
        </Text>
      </TouchableOpacity>
    );
  };

  // Admin modalında önizleme artık yeni link koruyucu sistemle çalışıyor
  const previewUrl = newDomain.trim() ? resolveLogoUrl(newDomain.trim()) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.mainWrapper}>
        <View style={styles.premiumContainer}>
          <View style={styles.headerArea}>
            <View style={styles.headerTitles}>
              <Text style={[styles.headerTitle, { color: theme.textMain }]}>
                Zaman Tüneli
              </Text>
              <Text style={[styles.headerSub, { color: theme.textSub }]}>
                Finansal geçmişini incele
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setIsAdminModalVisible(true)}
                style={[
                  styles.adminBtn,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>🏷️</Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
              >
                <Feather
                  name="search"
                  size={18}
                  color={theme.textSub}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: theme.textMain }]}
                  placeholder="İşlem ara..."
                  placeholderTextColor={theme.textSub}
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
              </View>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.primary}
              style={{ marginTop: 50 }}
            />
          ) : (
            <FlatList
              data={groupedData}
              extraData={customBrands} /* İŞTE KRİTİK ÇÖZÜM BURADA! */
              keyExtractor={(item) => String(item?.id ?? Math.random())}
              renderItem={renderItem}
              contentContainerStyle={
                groupedData.length === 0
                  ? styles.emptyListContent
                  : styles.listContent
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={ListEmptyComponent}
              stickyHeaderIndices={stickyIndices}
            />
          )}
        </View>
      </View>

      {/* DÜZENLEME MODALİ */}
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

      {/* ADMİN MODALİ */}
      <Modal
        visible={isAdminModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              🏷️ Marka Logo Yönetimi
            </Text>
            <TouchableOpacity onPress={() => setIsAdminModalVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.adminSectionTitle, { color: theme.textMain }]}>
              Yeni Marka Ekle
            </Text>

            <Text style={[styles.inputLabel, { color: theme.textSub }]}>
              Anahtar Kelime (işlemde ne yazıyor?)
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
              value={newKeyword}
              onChangeText={setNewKeyword}
              placeholder="örn: vodafone"
              placeholderTextColor={theme.textSub}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: theme.textSub }]}>
              Domain veya Direkt Resim Linki
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
              value={newDomain}
              onChangeText={setNewDomain}
              placeholder="örn: vodafone.com veya https://.../resim.png"
              placeholderTextColor={theme.textSub}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Önizleme */}
            {previewUrl && (
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: theme.textSub }]}>
                  Önizleme:
                </Text>
                <View
                  style={{
                    backgroundColor: "#fff",
                    padding: 10,
                    borderRadius: 14,
                  }}
                >
                  <Image
                    source={{ uri: previewUrl }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handleAddBrand}
              disabled={isAddingSaving}
              style={[styles.saveBtn, { backgroundColor: theme.textMain }]}
            >
              {isAddingSaving ? (
                <ActivityIndicator color={theme.bg} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.bg }]}>
                  Markayı Kaydet
                </Text>
              )}
            </TouchableOpacity>

            {/* Mevcut custom markalar */}
            {customBrands.length > 0 && (
              <>
                <Text
                  style={[
                    styles.adminSectionTitle,
                    { color: theme.textMain, marginTop: 32 },
                  ]}
                >
                  Eklenen Markalar ({customBrands.length})
                </Text>
                {customBrands.map((brand) => (
                  <View
                    key={brand.id}
                    style={[
                      styles.brandRow,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={{
                        backgroundColor: "#fff",
                        padding: 4,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    >
                      <Image
                        source={{ uri: resolveLogoUrl(brand.domain) }}
                        style={{ width: 36, height: 36, borderRadius: 6 }}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: theme.textMain,
                          fontWeight: "700",
                          fontSize: 15,
                        }}
                      >
                        {brand.keyword}
                      </Text>
                      <Text
                        style={{ color: theme.textSub, fontSize: 11 }}
                        numberOfLines={1}
                      >
                        {brand.domain}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCustomBrand(brand.id)}
                      style={styles.brandDeleteBtn}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Yerleşik markalar listesi (bilgi amaçlı) */}
            <Text
              style={[
                styles.adminSectionTitle,
                { color: theme.textMain, marginTop: 32 },
              ]}
            >
              Yerleşik Markalar ({STATIC_BRANDS.length})
            </Text>
            <Text
              style={{ color: theme.textSub, fontSize: 12, marginBottom: 12 }}
            >
              Bu markalar otomatik tanınır, eklemeye gerek yok.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATIC_BRANDS.map((b) => (
                <View
                  key={b.keyword}
                  style={[
                    styles.staticBrandChip,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: resolveLogoUrl(b.domain) }}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      marginRight: 5,
                    }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: theme.textMain, fontSize: 11 }}>
                    {b.keyword}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainWrapper: { flex: 1, alignItems: "center" },
  premiumContainer: { width: "100%", maxWidth: 800, flex: 1 },
  headerArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  headerSub: { fontSize: 14, fontWeight: "500", marginTop: 4, opacity: 0.8 },
  adminBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    width: 140,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, height: "100%" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  emptyListContent: { flex: 1, justifyContent: "center" },
  dateHeader: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 25,
    marginBottom: 12,
    backgroundColor: "transparent",
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.15)",
  },
  txCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    overflow: "hidden",
  },
  textContainer: { flex: 1, paddingRight: 10 },
  txDesc: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  categoryPillWrapper: { flexDirection: "row", alignItems: "center" },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: { fontSize: 10, fontWeight: "700" },
  editedTag: { fontSize: 10, fontStyle: "italic", marginLeft: 6 },
  txAmount: { fontSize: 16, fontWeight: "800" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyAnimation: { width: 200, height: 200 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubText: { fontSize: 14, marginTop: 8 },
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
  adminSectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 16 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  brandDeleteBtn: {
    padding: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
  },
  staticBrandChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
});
