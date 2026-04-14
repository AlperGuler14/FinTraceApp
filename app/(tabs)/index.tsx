import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";

const { width } = Dimensions.get("window");

// --- TİP TANIMLAMALARI ---
interface Budget {
  title: string;
  limit: number;
  spent: number;
}
interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  desc: string;
  category: string;
  date: string;
}

export default function IntegratedAssistantDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [healthData, setHealthData] = useState({
    score: 742,
    message: "Analiz ediliyor...",
  });
  const [assistantNote, setAssistantNote] = useState(
    "Verilerin hazırlanıyor...",
  );

  const [isAiVisible, setIsAiVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isGuideVisible, setIsGuideVisible] = useState(false);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data: txData } = await supabase
        .from("islemler")
        .select("*")
        .order("tarih", { ascending: false });
      const { data: budgetData } = await supabase.from("butceler").select("*");
      if (txData) {
        let inc = 0,
          exp = 0;
        txData.forEach((item: any) => {
          const val = Number(item.tutar) || 0;
          if (val > 0) inc += val;
          else exp += Math.abs(val);
        });
        const budgetStatus: Budget[] =
          budgetData?.map((b: any) => ({
            title: b.kategori_adi,
            limit: b.limit_tutar,
            spent: txData
              .filter(
                (t: any) => t.kategori_adi === b.kategori_adi && t.tutar < 0,
              )
              .reduce((sum: number, t: any) => sum + Math.abs(t.tutar), 0),
          })) || [];

        // Basitleştirilmiş Analiz (Gerçek işlev için önceki mantığı kullanabilirsin)
        const top = [...budgetStatus].sort((a, b) => b.spent - a.spent)[0];

        setTotalBalance(inc - exp);
        setMonthlyIncome(inc);
        setMonthlyExpense(exp);
        setAssistantNote(
          top && top.spent > 0
            ? `Alper, bu ay en çok "${top.title}" harcaması yaptın.`
            : "Harcamaların stabil.",
        );
        setHealthData({ score: 750, message: "Finansal durumun dengeli." }); // Örnek Sabit
        setTransactions(
          txData.slice(0, 4).map((t: any) => ({
            id: t.id,
            amount: Math.abs(t.tutar),
            type: t.tutar < 0 ? "expense" : "income",
            desc: t.aciklama,
            category: t.kategori_adi,
            date: t.tarih,
          })),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFinancialData();
    }, []),
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.headerArea}>
        <View>
          <Text style={styles.greetingText}>Merhaba Alper,</Text>
          <Text style={styles.statusText}>Analizlerin Hazır ⚡</Text>
        </View>
        <TouchableOpacity
          style={styles.aiBtn}
          onPress={() => setIsAiVisible(true)}
        >
          <LinearGradient
            colors={["#4f46e5", "#8b5cf6"]}
            style={styles.aiGradient}
          >
            <Feather name="cpu" size={18} color="#fff" />
            <Text style={styles.aiText}>AI Sor</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BAKİYE KARTI */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Toplam Kullanılabilir Bakiye</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: totalBalance >= 0 ? "#1e293b" : "#ef4444" },
            ]}
          >
            ₺
            {totalBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Feather name="arrow-up-right" size={14} color="#10b981" />
              <Text style={styles.summaryText}>
                {" "}
                Gelir:{" "}
                <Text style={{ color: "#10b981" }}>
                  +₺{monthlyIncome.toLocaleString()}
                </Text>
              </Text>
            </View>
            <View style={[styles.summaryItem, { marginLeft: 20 }]}>
              <Feather name="arrow-down-left" size={14} color="#ef4444" />
              <Text style={styles.summaryText}>
                {" "}
                Gider:{" "}
                <Text style={{ color: "#ef4444" }}>
                  -₺{monthlyExpense.toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* HIZLI AKSİYONLAR */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setIsAddModalVisible(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#d1fae5" }]}>
              <Feather name="plus" size={22} color="#10b981" />
            </View>
            <Text style={styles.actionLabel}>Ekle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/wallets")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#e0e7ff" }]}>
              <Feather name="target" size={22} color="#4f46e5" />
            </View>
            <Text style={styles.actionLabel}>Zarflar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/reports")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#fef3c7" }]}>
              <Feather name="pie-chart" size={22} color="#f59e0b" />
            </View>
            <Text style={styles.actionLabel}>Analiz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setIsGuideVisible(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#ede9fe" }]}>
              <Feather name="compass" size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.actionLabel}>Rehber</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Son Hareketler</Text>
        {loading ? (
          <ActivityIndicator color="#4f46e5" />
        ) : (
          transactions.map((item) => (
            <View key={item.id} style={styles.txItem}>
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIconBox,
                    {
                      backgroundColor:
                        item.type === "income" ? "#d1fae5" : "#f1f5f9",
                    },
                  ]}
                >
                  <Feather
                    name={
                      item.type === "income"
                        ? "arrow-down-left"
                        : "shopping-bag"
                    }
                    size={16}
                    color={item.type === "income" ? "#10b981" : "#64748b"}
                  />
                </View>
                <View>
                  <Text style={styles.txCategory}>{item.category}</Text>
                  <Text style={styles.txDesc}>{item.desc || "İşlem"}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: item.type === "income" ? "#10b981" : "#1e293b" },
                ]}
              >
                {item.type === "income" ? "+" : "-"}₺
                {item.amount.toLocaleString()}
              </Text>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- MODAL: GÖRSEL REHBER --- */}
      <GuideModal
        visible={isGuideVisible}
        onClose={() => setIsGuideVisible(false)}
      />

      {/* --- MODAL: AI ASISTAN --- */}
      <AiAssistantModal
        visible={isAiVisible}
        onClose={() => setIsAiVisible(false)}
      />

      {/* --- MODAL: ISLEM EKLE --- */}
      <AddTransactionModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onRefresh={fetchFinancialData}
      />
    </View>
  );
}

// --- GÖRSEL REHBER BİLEŞENİ ---
const GuideModal = ({ visible, onClose }: any) => {
  const steps = [
    {
      title: "Bütçe Yönetimi",
      desc: "Gelir ve giderlerini anlık takip ederek finansal özgürlüğe adım at.",
      icon: "activity",
      colors: ["#4f46e5", "#8b5cf6"],
    },
    {
      title: "Zarf Sistemi",
      desc: "Harcamalarını kategorize et, bütçeni aşmadan birikim yapmaya başla.",
      icon: "briefcase",
      colors: ["#10b981", "#059669"],
    },
    {
      title: "AI Analiz",
      desc: "Yapay zeka asistanın sana özel tasarruf planları hazırlasın.",
      icon: "cpu",
      colors: ["#f59e0b", "#ea580c"],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.guideContainer}>
        <LinearGradient
          colors={["#f8fafc", "#e2e8f0"]}
          style={styles.guideContent}
        >
          <TouchableOpacity style={styles.closeGuide} onPress={onClose}>
            <Feather name="x" size={28} color="#1e293b" />
          </TouchableOpacity>

          <Text style={styles.guideMainTitle}>FinTrace'e Hoş Geldin</Text>
          <Text style={styles.guideSubTitle}>
            Harcamalarını yönetmenin en akıllı yolu.
          </Text>

          <ScrollView
            style={{ width: "100%", marginTop: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {steps.map((step, i) => (
              <View key={i} style={styles.guideCard}>
                <LinearGradient
                  colors={step.colors}
                  style={styles.guideIconBox}
                >
                  <Feather name={step.icon as any} size={28} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Text style={styles.guideStepTitle}>{step.title}</Text>
                  <Text style={styles.guideStepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.guideDoneBtn} onPress={onClose}>
            <LinearGradient
              colors={["#1e293b", "#0f172a"]}
              style={styles.guideDoneGradient}
            >
              <Text style={styles.guideDoneText}>Uygulamayı Keşfet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

// --- MODAL: AI ASISTAN (Tam Ekran Sohbet) ---
const AiAssistantModal = ({ visible, onClose }: any) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <View style={styles.aiAvatar}>
          <Feather name="cpu" size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.modalTitle}>FinTrace Zeka Asistanı</Text>
          <Text style={styles.modalSub}>
            Çevrimiçi • Verilerini Analiz Ediyor
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 20 }}>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>
            Selam Alper! Harcamalarını inceledim. Giyim kategorisinde bütçeni
            aşmışsın ama markette harikalar yaratmışsın.
          </Text>
        </View>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>
            MacBook hedefim için ne kadar daha biriktirmeliyim?
          </Text>
        </View>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>
            Mevcut tasarruf hızınla 3 ayda hedefine ulaşıyorsun. Eğer dışarıda
            yemeyi azaltırsan bu süreyi öne çekebiliriz.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.chatInputArea}>
        <View style={styles.chatInputWrapper}>
          <TextInput
            placeholder="Asistanınla konuş..."
            style={styles.chatInput}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.sendBtn}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// --- ISLEM EKLEME MODALI ---
const AddTransactionModal = ({ visible, onClose, onRefresh }: any) => {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const handleSave = async () => {
    if (!amount || !desc)
      return Alert.alert("Hata", "Lütfen tüm alanları doldur.");
    const { error } = await supabase.from("islemler").insert([
      {
        tutar: -Math.abs(Number(amount)),
        aciklama: desc,
        kategori_adi: "Market",
        tarih: new Date().toISOString(),
      },
    ]);
    if (!error) {
      setAmount("");
      setDesc("");
      onRefresh();
      onClose();
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>İşlem Ekle</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Tutar (₺)"
          style={styles.input}
          keyboardType="numeric"
          onChangeText={setAmount}
        />
        <TextInput
          placeholder="Açıklama"
          style={styles.input}
          onChangeText={setDesc}
        />
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  greetingText: { fontSize: 13, color: "#64748b" },
  statusText: { fontSize: 18, fontWeight: "900", color: "#1e293b" },
  aiBtn: { borderRadius: 12, overflow: "hidden" },
  aiGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  aiText: { color: "#fff", fontWeight: "bold", marginLeft: 6 },
  scrollContent: { padding: 20 },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    elevation: 2,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 13, color: "#64748b", marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: "900" },
  summaryRow: {
    flexDirection: "row",
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 15,
    width: "100%",
    justifyContent: "center",
  },
  summaryItem: { flexDirection: "row", alignItems: "center" },
  summaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  actionBtn: { alignItems: "center", width: width / 4 - 15 },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: { fontSize: 11, color: "#475569", fontWeight: "600" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 15,
  },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
  },
  txLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  txCategory: { fontSize: 15, fontWeight: "700" },
  txDesc: { fontSize: 12, color: "#64748b" },
  txAmount: { fontSize: 15, fontWeight: "900" },

  // REHBER MODAL STILLERI
  guideContainer: { flex: 1 },
  guideContent: { flex: 1, padding: 30, alignItems: "center", paddingTop: 80 },
  closeGuide: { position: "absolute", top: 50, right: 25, zIndex: 10 },
  guideMainTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
  },
  guideSubTitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 10,
    textAlign: "center",
  },
  guideCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    width: "100%",
    elevation: 3,
  },
  guideIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  guideStepTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  guideStepDesc: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 20,
  },
  guideDoneBtn: {
    width: "100%",
    marginTop: 20,
    borderRadius: 18,
    overflow: "hidden",
  },
  guideDoneGradient: { paddingVertical: 18, alignItems: "center" },
  guideDoneText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // MODAL STANDART
  modalContent: { flex: 1, backgroundColor: "#f8fafc" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // --- AI CHAT STİLLERİ ---
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSub: { fontSize: 11, color: "#10b981", fontWeight: "600" },
  aiBubble: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    marginBottom: 15,
    maxWidth: "85%",
    elevation: 1,
  },
  aiText: { color: "#334155", fontSize: 14, lineHeight: 20 },
  userBubble: {
    backgroundColor: "#4f46e5",
    padding: 15,
    borderRadius: 18,
    borderTopRightRadius: 4,
    marginBottom: 15,
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  chatInputArea: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  chatInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 8,
    paddingLeft: 15,
  },
  chatInput: { flex: 1, fontSize: 15, color: "#1e293b", paddingVertical: 5 },
  sendBtn: {
    backgroundColor: "#4f46e5",
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
