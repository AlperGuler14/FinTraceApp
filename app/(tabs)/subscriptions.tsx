import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// Kendi Supabase yoluna göre kontrol et
import { supabase } from "../../constants/Supabase";

// --- Markaya Göre Otomatik İkon ve Renk ---
const getSubscriptionStyle = (name) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("netflix")) return { color: "#E50914", icon: "film" };
  if (lowerName.includes("spotify")) return { color: "#1DB954", icon: "music" };
  if (lowerName.includes("youtube"))
    return { color: "#FF0000", icon: "youtube" };
  if (lowerName.includes("apple"))
    return { color: "#000000", icon: "aperture" };
  if (lowerName.includes("amazon") || lowerName.includes("prime"))
    return { color: "#00A8E1", icon: "box" };
  if (lowerName.includes("gym") || lowerName.includes("spor"))
    return { color: "#f97316", icon: "activity" };
  if (
    lowerName.includes("internet") ||
    lowerName.includes("turkcell") ||
    lowerName.includes("vodafone")
  )
    return { color: "#3b82f6", icon: "wifi" };

  // Varsayılan Stil
  return { color: "#64748b", icon: "credit-card" };
};

export default function SubscriptionsScreen() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);

  // Form State'leri
  const [formData, setFormData] = useState({
    isim: "",
    tutar: "",
    odeme_gunu: "",
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("abonelikler")
        .select("*")
        .order("odeme_gunu", { ascending: true }); // Ödeme gününe göre sıralı

      if (error) throw error;

      // DB'den gelen veriye dinamik ikon/renk ekleyelim
      if (data) {
        const formattedSubs = data.map((sub) => {
          const style = getSubscriptionStyle(sub.ad);
          return {
            ...sub,
            ikon: style.icon,
            renk: style.color,
          };
        });
        setSubs(formattedSubs);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();

    // Supabase Realtime
    const channel = supabase
      .channel("subscriptions-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "abonelikler" },
        fetchSubscriptions,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenModal = (sub = null) => {
    if (sub) {
      setSelectedSub(sub);
      setFormData({
        isim: sub.ad, // Veritabanındaki sütun adın "ad"
        tutar: sub.tutar.toString(),
        odeme_gunu: sub.odeme_gunu.toString(),
      });
    } else {
      setSelectedSub(null);
      setFormData({ isim: "", tutar: "", odeme_gunu: "" });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validasyon
    if (!formData.isim || !formData.tutar || !formData.odeme_gunu) {
      Alert.alert("Eksik Bilgi", "Lütfen tüm alanları doldurun.");
      return;
    }

    // Virgülden noktaya çevirme ve sayıya dönüştürme
    const numTutar = Number(formData.tutar.replace(",", "."));
    const numGun = parseInt(formData.odeme_gunu);

    if (isNaN(numTutar) || isNaN(numGun) || numGun < 1 || numGun > 31) {
      Alert.alert(
        "Hatalı Veri",
        "Lütfen geçerli bir tutar ve gün (1-31) girin.",
      );
      return;
    }

    // Veritabanı şemana uygun payload ('isim' yerine 'ad' kullanılıyor)
    const payload = {
      ad: formData.isim,
      tutar: numTutar,
      odeme_gunu: numGun,
    };

    try {
      if (selectedSub) {
        // GÜNCELLEME
        const { error } = await supabase
          .from("abonelikler")
          .update(payload)
          .eq("id", selectedSub.id);

        if (error) throw error;
      } else {
        // YENİ EKLEME
        const { error } = await supabase.from("abonelikler").insert([payload]);
        if (error) throw error;
      }

      setModalVisible(false);
      // Realtime zaten fetch'i tetikleyecek, ama anlık tepki için:
      fetchSubscriptions();
    } catch (error) {
      Alert.alert("Kayıt Hatası", error.message);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Aboneliği Sil",
      "Bu aboneliği listeden kaldırmak istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("abonelikler")
                .delete()
                .eq("id", id);

              if (error) throw error;
              fetchSubscriptions();
            } catch (error) {
              Alert.alert("Silme Hatası", error.message);
            }
          },
        },
      ],
    );
  };

  // Toplam Maliyeti Hesaplama (DB'den gelen sayısal verilere göre)
  const totalCost = subs.reduce((sum, s) => sum + (Number(s.tutar) || 0), 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Abonelik Radarı</Text>
          <Text style={styles.subtitle}>
            Fiyat artışlarını ve talimatları yönet
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => handleOpenModal()}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={["#1e293b", "#0f172a"]} style={styles.totalCard}>
        <Text style={styles.totalLabel}>Aylık Sabit Yükün</Text>
        <Text style={styles.totalAmount}>
          ₺
          {totalCost.toLocaleString("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
          <Text style={styles.totalAmountDec}> /ay</Text>
        </Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4f46e5"
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.listContainer}>
          {subs.length > 0 ? (
            subs.map((sub) => (
              <View key={sub.id} style={styles.listItem}>
                <View style={styles.listLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: sub.renk + "15" },
                    ]}
                  >
                    <Feather name={sub.ikon} size={20} color={sub.renk} />
                  </View>
                  <View>
                    <Text style={styles.listName}>{sub.ad}</Text>
                    <Text style={styles.listDesc}>
                      Her ayın {sub.odeme_gunu}. günü
                    </Text>
                  </View>
                </View>
                <View style={styles.listRight}>
                  <Text style={styles.listPrice}>
                    ₺{Number(sub.tutar).toLocaleString("tr-TR")}
                  </Text>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => handleOpenModal(sub)}
                  >
                    <Text style={styles.manageBtnText}>Yönet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text
              style={{ textAlign: "center", padding: 20, color: "#94a3b8" }}
            >
              Takip edilen bir abonelik yok.
            </Text>
          )}
        </View>
      )}

      {/* GÜNCELLEME VE EKLEME MODALI */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedSub ? "Aboneliği Düzenle" : "Yeni Abonelik"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.inputLabel}>Hizmet Adı (Örn: Netflix)</Text>
            <TextInput
              style={styles.input}
              value={formData.isim}
              onChangeText={(t) => setFormData({ ...formData, isim: t })}
              placeholder="Abonelik adı..."
            />

            <Text style={styles.inputLabel}>Aylık Ücret (₺)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.tutar}
              onChangeText={(t) => setFormData({ ...formData, tutar: t })}
              placeholder="0.00"
            />

            <Text style={styles.inputLabel}>Ödeme Günü (Ayın 1-31 arası)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.odeme_gunu}
              onChangeText={(t) => setFormData({ ...formData, odeme_gunu: t })}
              placeholder="Örn: 15"
              maxLength={2}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
            </TouchableOpacity>

            {selectedSub && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(selectedSub.id)}
              >
                <Text style={styles.deleteBtnText}>Aboneliği Sil</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 60,
  },
  title: { fontSize: 26, fontFamily: "Inter_900Black", color: "#1e293b" },
  subtitle: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#64748b" },
  addBtn: {
    backgroundColor: "#4f46e5",
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  totalCard: { borderRadius: 24, padding: 25, marginBottom: 30 },
  totalLabel: { fontSize: 14, color: "#94a3b8", marginBottom: 10 },
  totalAmount: { fontSize: 36, fontFamily: "Inter_900Black", color: "#ffffff" },
  totalAmountDec: { fontSize: 16, color: "#94a3b8" },
  listContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 5,
    elevation: 2,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  listLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  listName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#1e293b" },
  listDesc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  listRight: { alignItems: "flex-end" },
  listPrice: {
    fontSize: 15,
    fontFamily: "Inter_800Black",
    color: "#1e293b",
    marginBottom: 5,
  },
  manageBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  manageBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#64748b",
  },
  modalView: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#64748b",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: "#4f46e5",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold" },
  deleteBtn: { padding: 16, alignItems: "center", marginTop: 10 },
  deleteBtnText: { color: "#ef4444", fontFamily: "Inter_600SemiBold" },
});
