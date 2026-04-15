import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

const getSubscriptionStyle = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("netflix")) return { color: "#E50914", icon: "film" };
  if (lowerName.includes("spotify")) return { color: "#1DB954", icon: "music" };
  if (lowerName.includes("youtube"))
    return { color: "#FF0000", icon: "youtube" };
  if (lowerName.includes("amazon") || lowerName.includes("prime"))
    return { color: "#00A8E1", icon: "box" };
  return { color: "#6366f1", icon: "credit-card" };
};

export default function SubscriptionsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
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
        .order("odeme_gunu", { ascending: true });
      if (error) throw error;
      if (data) {
        const formattedSubs = data.map((sub) => {
          const style = getSubscriptionStyle(sub.ad);
          return { ...sub, ikon: style.icon, renk: style.color };
        });
        setSubs(formattedSubs);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSave = async () => {
    if (!formData.isim || !formData.tutar || !formData.odeme_gunu)
      return Alert.alert("Hata", "Tüm alanları doldur.");
    const payload = {
      ad: formData.isim,
      tutar: Number(formData.tutar),
      odeme_gunu: parseInt(formData.odeme_gunu),
    };
    try {
      if (selectedSub)
        await supabase
          .from("abonelikler")
          .update(payload)
          .eq("id", selectedSub.id);
      else await supabase.from("abonelikler").insert([payload]);
      setModalVisible(false);
      fetchSubscriptions();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  const totalCost = subs.reduce((sum, s) => sum + (Number(s.tutar) || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.textMain }]}>
            Abonelik Radarı
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSub }]}>
            Sabit giderlerini yönet
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            setSelectedSub(null);
            setFormData({ isim: "", tutar: "", odeme_gunu: "" });
            setModalVisible(true);
          }}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={["#1e293b", "#0f172a"]} style={styles.totalCard}>
        <Text style={styles.totalLabel}>Aylık Sabit Yükün</Text>
        <Text style={styles.totalAmount}>
          ₺{totalCost.toLocaleString("tr-TR")}
          <Text style={styles.totalAmountDec}> /ay</Text>
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          subs.map((sub) => (
            <View
              key={sub.id}
              style={[
                styles.listItem,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View
                style={[styles.iconBox, { backgroundColor: sub.renk + "20" }]}
              >
                <Feather name={sub.ikon as any} size={20} color={sub.renk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.listName, { color: theme.textMain }]}>
                  {sub.ad}
                </Text>
                <Text style={[styles.listDesc, { color: theme.textSub }]}>
                  Ayın {sub.odeme_gunu}. günü
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.listPrice, { color: theme.textMain }]}>
                  ₺{sub.tutar}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSub(sub);
                    setFormData({
                      isim: sub.ad,
                      tutar: sub.tutar.toString(),
                      odeme_gunu: sub.odeme_gunu.toString(),
                    });
                    setModalVisible(true);
                  }}
                >
                  <Text
                    style={{
                      color: theme.primary,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    Yönet
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalView, { backgroundColor: theme.bg }]}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Abonelik Detayı
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            <TextInput
              placeholder="Hizmet Adı"
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textMain,
                  borderColor: theme.border,
                },
              ]}
              placeholderTextColor={theme.textSub}
              value={formData.isim}
              onChangeText={(t) => setFormData({ ...formData, isim: t })}
            />
            <TextInput
              placeholder="Ücret (₺)"
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textMain,
                  borderColor: theme.border,
                },
              ]}
              placeholderTextColor={theme.textSub}
              keyboardType="numeric"
              value={formData.tutar}
              onChangeText={(t) => setFormData({ ...formData, tutar: t })}
            />
            <TextInput
              placeholder="Ödeme Günü (1-31)"
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  color: theme.textMain,
                  borderColor: theme.border,
                },
              ]}
              placeholderTextColor={theme.textSub}
              keyboardType="numeric"
              value={formData.odeme_gunu}
              onChangeText={(t) => setFormData({ ...formData, odeme_gunu: t })}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
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
    padding: 20,
    marginTop: 20,
  },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  totalCard: { borderRadius: 24, padding: 25, margin: 20, marginTop: 0 },
  totalLabel: { fontSize: 14, color: "#94a3b8", marginBottom: 10 },
  totalAmount: { fontSize: 36, fontWeight: "900", color: "#ffffff" },
  totalAmountDec: { fontSize: 16, color: "#94a3b8" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  listName: { fontSize: 16, fontWeight: "700" },
  listDesc: { fontSize: 12, marginTop: 2 },
  listPrice: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  modalView: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  saveBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
