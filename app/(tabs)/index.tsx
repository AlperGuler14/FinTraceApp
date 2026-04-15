import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useTheme } from "../../context/ThemeContext"; // TEMA MOTORU EKLENDİ

const { width } = Dimensions.get("window");

// --- TİP TANIMLAMALARI ---
interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  desc: string;
  category: string;
  date: string;
}

// --- FİNANSAL SAĞLIK ALGORİTMASI ---
const calculateFinancialScore = (
  income: number,
  expense: number,
  wallets: any[],
  transactions: any[],
) => {
  let totalScore = 0;
  let balanceScore = 0;
  if (income > 0) {
    const expenseRatio = expense / income;
    if (expenseRatio <= 0.5) balanceScore = 40;
    else if (expenseRatio <= 0.8)
      balanceScore = 40 - (expenseRatio - 0.5) * 100;
    else if (expenseRatio <= 1.0) balanceScore = 5;
    else balanceScore = 0;
  } else if (income === 0 && expense === 0) {
    balanceScore = 20;
  }

  let limitScore = 30;
  let totalOverspend = 0;
  if (wallets && wallets.length > 0) {
    wallets.forEach((wallet: any) => {
      const limit = Number(wallet.limit) || 0;
      const spent = Number(wallet.spent) || 0;
      if (spent > limit) totalOverspend += spent - limit;
    });
    if (expense > 0 && totalOverspend > 0) {
      const penaltyRatio = totalOverspend / expense;
      const penalty = penaltyRatio * 30;
      limitScore = Math.max(0, 30 - penalty);
    }
  }

  let categoryScore = 30;
  const riskyCategories = [
    "Eğlence",
    "Dışarıda Yemek",
    "Oyun & Dijital",
    "Sneaker & Giyim",
    "Abonelikler",
  ];
  let riskyExpenseTotal = 0;
  if (transactions && transactions.length > 0) {
    transactions.forEach((tx: any) => {
      const cat = tx.kategori_adi || tx.category;
      if (riskyCategories.includes(cat)) {
        riskyExpenseTotal += Math.abs(Number(tx.tutar || tx.amount));
      }
    });
    if (expense > 0) {
      const riskyRatio = riskyExpenseTotal / expense;
      if (riskyRatio > 0.3) {
        const penalty = (riskyRatio - 0.3) * 100;
        categoryScore = Math.max(0, 30 - penalty);
      }
    }
  }

  return Math.round(
    Math.max(0, Math.min(100, balanceScore + limitScore + categoryScore)),
  );
};

export default function IntegratedAssistantDashboard() {
  const { isDark, colors: theme } = useTheme(); // TEMAYI ÇEKİYORUZ
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  const [healthData, setHealthData] = useState({
    score: 0,
    message: "Verilerin analiz ediliyor...",
    color: "#64748b",
    bgColor: "#f1f5f9",
  });

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
      const { data: walletsData } = await supabase.from("wallets").select("*");

      if (txData) {
        let inc = 0,
          exp = 0;
        txData.forEach((item: any) => {
          const val = Number(item.tutar) || 0;
          if (val > 0) inc += val;
          else exp += Math.abs(val);
        });

        setTotalBalance(inc - exp);
        setMonthlyIncome(inc);
        setMonthlyExpense(exp);

        const calculatedScore = calculateFinancialScore(
          inc,
          exp,
          walletsData || [],
          txData,
        );
        let msg = "";
        let themeColor = "";
        let themeBg = "";

        if (calculatedScore >= 80) {
          msg =
            "Finansal sağlığın mükemmel! Zarfların güvende, bütçen tıkır tıkır işliyor.";
          themeColor = "#10b981";
          themeBg = isDark ? "rgba(16,185,129,0.15)" : "#d1fae5";
        } else if (calculatedScore >= 50) {
          msg =
            "Dengedesin ama dikkatli olmalısın. İstek kategorileri limitleri zorluyor olabilir.";
          themeColor = "#f59e0b";
          themeBg = isDark ? "rgba(245,158,11,0.15)" : "#fef3c7";
        } else {
          msg =
            "Alarm zilleri çalıyor! Gelir-gider dengen sarsılmış, harcama detoksu gerekiyor.";
          themeColor = "#ef4444";
          themeBg = isDark ? "rgba(239,68,68,0.15)" : "#fee2e2";
        }

        setHealthData({
          score: calculatedScore,
          message: msg,
          color: themeColor,
          bgColor: themeBg,
        });
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
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER */}
      <View
        style={[
          styles.headerArea,
          { backgroundColor: theme.bg, borderBottomColor: theme.border },
        ]}
      >
        <View>
          <Text style={[styles.greetingText, { color: theme.textSub }]}>
            Merhaba Alper,
          </Text>
          <Text style={[styles.statusText, { color: theme.textMain }]}>
            Analizlerin Hazır ⚡
          </Text>
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
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: theme.cardBg,
              shadowColor: isDark ? "#000" : "#cbd5e1",
            },
          ]}
        >
          <Text style={[styles.balanceLabel, { color: theme.textSub }]}>
            Toplam Kullanılabilir Bakiye
          </Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: totalBalance >= 0 ? theme.textMain : "#ef4444" },
            ]}
          >
            ₺
            {totalBalance.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
          </Text>
          <View style={[styles.summaryRow, { borderTopColor: theme.border }]}>
            <View style={styles.summaryItem}>
              <Feather name="arrow-up-right" size={14} color="#10b981" />
              <Text style={[styles.summaryText, { color: theme.textMain }]}>
                {" "}
                Gelir:{" "}
                <Text style={{ color: "#10b981" }}>
                  +₺{monthlyIncome.toLocaleString()}
                </Text>
              </Text>
            </View>
            <View style={[styles.summaryItem, { marginLeft: 20 }]}>
              <Feather name="arrow-down-left" size={14} color="#ef4444" />
              <Text style={[styles.summaryText, { color: theme.textMain }]}>
                {" "}
                Gider:{" "}
                <Text style={{ color: "#ef4444" }}>
                  -₺{monthlyExpense.toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* FİNANSAL SAĞLIK KARTI */}
        <View
          style={[
            styles.healthCard,
            {
              backgroundColor: theme.cardBg,
              borderLeftColor: healthData.color,
            },
          ]}
        >
          <View
            style={[
              styles.healthScoreBox,
              { backgroundColor: healthData.bgColor },
            ]}
          >
            <Text style={[styles.healthScoreText, { color: healthData.color }]}>
              {healthData.score}
            </Text>
            <Text style={[styles.healthScoreSub, { color: healthData.color }]}>
              /100
            </Text>
          </View>
          <View style={styles.healthInfo}>
            <Text style={[styles.healthTitle, { color: theme.textMain }]}>
              Finansal Sağlık Skoru
            </Text>
            <Text style={[styles.healthMessage, { color: theme.textSub }]}>
              {healthData.message}
            </Text>
          </View>
        </View>

        {/* HIZLI AKSİYONLAR */}
        <View style={styles.quickActions}>
          {[
            {
              label: "Ekle",
              icon: "plus",
              color: "#10b981",
              bg: isDark ? "rgba(16,185,129,0.2)" : "#d1fae5",
              onPress: () => setIsAddModalVisible(true),
            },
            {
              label: "Zarflar",
              icon: "target",
              color: "#4f46e5",
              bg: isDark ? "rgba(79,70,229,0.2)" : "#e0e7ff",
              onPress: () => router.push("/wallets"),
            },
            {
              label: "Analiz",
              icon: "pie-chart",
              color: "#f59e0b",
              bg: isDark ? "rgba(245,158,11,0.2)" : "#fef3c7",
              onPress: () => router.push("/reports"),
            },
            {
              label: "Rehber",
              icon: "compass",
              color: "#8b5cf6",
              bg: isDark ? "rgba(139,92,246,0.2)" : "#ede9fe",
              onPress: () => setIsGuideVisible(true),
            },
          ].map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionBtn}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Feather
                  name={action.icon as any}
                  size={22}
                  color={action.color}
                />
              </View>
              <Text style={[styles.actionLabel, { color: theme.textMain }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textMain }]}>
          Son Hareketler
        </Text>
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          transactions.map((item) => (
            <View
              key={item.id}
              style={[styles.txItem, { backgroundColor: theme.cardBg }]}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txIconBox,
                    {
                      backgroundColor:
                        item.type === "income"
                          ? isDark
                            ? "rgba(16,185,129,0.2)"
                            : "#d1fae5"
                          : theme.iconBg,
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
                    color={item.type === "income" ? "#10b981" : theme.textSub}
                  />
                </View>
                <View>
                  <Text style={[styles.txCategory, { color: theme.textMain }]}>
                    {item.category}
                  </Text>
                  <Text style={[styles.txDesc, { color: theme.textSub }]}>
                    {item.desc || "İşlem"}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  {
                    color: item.type === "income" ? "#10b981" : theme.textMain,
                  },
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

      {/* MODALLAR */}
      <GuideModal
        visible={isGuideVisible}
        onClose={() => setIsGuideVisible(false)}
        theme={theme}
        isDark={isDark}
      />
      <AiAssistantModal
        visible={isAiVisible}
        onClose={() => setIsAiVisible(false)}
        theme={theme}
        isDark={isDark}
      />
      <AddTransactionModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onRefresh={fetchFinancialData}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

// --- MODAL BİLEŞENLERİ (TEMA UYUMLU) ---

const GuideModal = ({ visible, onClose, theme, isDark }: any) => {
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
      <View style={[styles.guideContainer, { backgroundColor: theme.bg }]}>
        <LinearGradient
          colors={isDark ? ["#1e293b", "#0f172a"] : ["#f8fafc", "#e2e8f0"]}
          style={styles.guideContent}
        >
          <TouchableOpacity style={styles.closeGuide} onPress={onClose}>
            <Feather name="x" size={28} color={theme.textMain} />
          </TouchableOpacity>
          <Text style={[styles.guideMainTitle, { color: theme.textMain }]}>
            FinTrace'e Hoş Geldin
          </Text>
          <Text style={[styles.guideSubTitle, { color: theme.textSub }]}>
            Harcamalarını yönetmenin en akıllı yolu.
          </Text>
          <ScrollView
            style={{ width: "100%", marginTop: 30 }}
            showsVerticalScrollIndicator={false}
          >
            {steps.map((step, i) => (
              <View
                key={i}
                style={[styles.guideCard, { backgroundColor: theme.cardBg }]}
              >
                <LinearGradient
                  colors={step.colors}
                  style={styles.guideIconBox}
                >
                  <Feather name={step.icon as any} size={28} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Text
                    style={[styles.guideStepTitle, { color: theme.textMain }]}
                  >
                    {step.title}
                  </Text>
                  <Text
                    style={[styles.guideStepDesc, { color: theme.textSub }]}
                  >
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.guideDoneBtn} onPress={onClose}>
            <LinearGradient
              colors={["#4f46e5", "#3730a3"]}
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

const AiAssistantModal = ({ visible, onClose, theme, isDark }: any) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
      <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
        <View
          style={[
            styles.aiAvatar,
            { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#e0e7ff" },
          ]}
        >
          <Feather name="cpu" size={24} color="#4f46e5" />
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={[styles.modalTitle, { color: theme.textMain }]}>
            FinTrace Zeka Asistanı
          </Text>
          <Text style={styles.modalSub}>
            Çevrimiçi • Verilerini Analiz Ediyor
          </Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={theme.textSub} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ padding: 20 }}>
        <View style={[styles.aiBubble, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.aiText, { color: theme.textMain }]}>
            Selam Alper! Harcamalarını inceledim. Giyim kategorisinde bütçeni
            aşmışsın ama markette harikalar yaratmışsın.
          </Text>
        </View>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>
            MacBook hedefim için ne kadar daha biriktirmeliyim?
          </Text>
        </View>
        <View style={[styles.aiBubble, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.aiText, { color: theme.textMain }]}>
            Mevcut tasarruf hızınla 3 ayda hedefine ulaşıyorsun. Eğer dışarıda
            yemeyi azaltırsan bu süreyi öne çekebiliriz.
          </Text>
        </View>
      </ScrollView>
      <View
        style={[
          styles.chatInputArea,
          { backgroundColor: theme.cardBg, borderTopColor: theme.border },
        ]}
      >
        <View style={[styles.chatInputWrapper, { backgroundColor: theme.bg }]}>
          <TextInput
            placeholder="Asistanınla konuş..."
            style={[styles.chatInput, { color: theme.textMain }]}
            placeholderTextColor={theme.textSub}
          />
          <TouchableOpacity style={styles.sendBtn}>
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const AddTransactionModal = ({
  visible,
  onClose,
  onRefresh,
  theme,
  isDark,
}: any) => {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);

  useEffect(() => {
    if (visible) fetchWallets();
  }, [visible]);
  const fetchWallets = async () => {
    const { data } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setWallets(data);
  };

  const handleSave = async () => {
    if (!amount || !desc)
      return Alert.alert("Eksik Bilgi", "Lütfen tutar ve açıklama girin.");
    if (type === "expense" && !selectedWallet)
      return Alert.alert(
        "Zarf Seçilmedi",
        "Lütfen bu harcamanın düşeceği zarfı seçin.",
      );
    try {
      const numAmount = Math.abs(Number(amount));
      const isExpense = type === "expense";
      const { error: txError } = await supabase.from("islemler").insert([
        {
          tutar: isExpense ? -numAmount : numAmount,
          aciklama: desc,
          kategori_adi: isExpense ? selectedWallet.name : "Gelir",
          tarih: new Date().toISOString(),
        },
      ]);
      if (txError) throw txError;
      if (isExpense && selectedWallet) {
        await supabase
          .from("wallets")
          .update({ spent: Number(selectedWallet.spent || 0) + numAmount })
          .eq("id", selectedWallet.id);
      }
      setAmount("");
      setDesc("");
      setSelectedWallet(null);
      onRefresh();
      onClose();
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.textMain }]}>
            Yeni İşlem
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color={theme.textSub} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding: 20 }}>
          <View
            style={[styles.typeSelector, { backgroundColor: theme.iconBg }]}
          >
            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === "expense" && styles.typeBtnActiveExpense,
              ]}
              onPress={() => setType("expense")}
            >
              <Text
                style={[
                  styles.typeText,
                  type === "expense" && { color: "#fff" },
                ]}
              >
                Gider
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === "income" && styles.typeBtnActiveIncome,
              ]}
              onPress={() => setType("income")}
            >
              <Text
                style={[
                  styles.typeText,
                  type === "income" && { color: "#fff" },
                ]}
              >
                Gelir
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Tutar (₺)"
            style={[
              styles.input,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.textMain,
              },
            ]}
            placeholderTextColor={theme.textSub}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            placeholder="Nereye harcadın? (Açıklama)"
            style={[
              styles.input,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                color: theme.textMain,
              },
            ]}
            placeholderTextColor={theme.textSub}
            value={desc}
            onChangeText={setDesc}
          />
          {type === "expense" && (
            <View style={styles.walletSection}>
              <Text
                style={[styles.walletSectionTitle, { color: theme.textMain }]}
              >
                Hangi Zarftan Düşülecek?
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10, paddingBottom: 10 }}
              >
                {wallets.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={[
                      styles.walletChip,
                      {
                        backgroundColor: theme.cardBg,
                        borderColor: theme.border,
                      },
                      selectedWallet?.id === w.id && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setSelectedWallet(w)}
                  >
                    <Text
                      style={[
                        styles.walletChipText,
                        { color: theme.textMain },
                        selectedWallet?.id === w.id && { color: "#fff" },
                      ]}
                    >
                      {w.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: theme.textMain }]}
          >
            <Text style={[styles.saveBtnText, { color: theme.bg }]}>
              İşlemi Kaydet
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: { fontSize: 13 },
  statusText: { fontSize: 18, fontWeight: "900" },
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
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    elevation: 2,
    marginBottom: 15,
  },
  balanceLabel: { fontSize: 13, marginBottom: 8 },
  balanceAmount: { fontSize: 32, fontWeight: "900" },
  summaryRow: {
    flexDirection: "row",
    marginTop: 15,
    borderTopWidth: 1,
    paddingTop: 15,
    width: "100%",
    justifyContent: "center",
  },
  summaryItem: { flexDirection: "row", alignItems: "center" },
  summaryText: { fontSize: 12, fontWeight: "600", marginLeft: 4 },
  healthCard: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 15,
    marginBottom: 25,
    elevation: 2,
    borderLeftWidth: 6,
    alignItems: "center",
  },
  healthScoreBox: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  healthScoreText: { fontSize: 22, fontWeight: "900" },
  healthScoreSub: { fontSize: 10, fontWeight: "700", marginTop: -2 },
  healthInfo: { flex: 1 },
  healthTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  healthMessage: { fontSize: 12, lineHeight: 18 },
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
  actionLabel: { fontSize: 11, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 15 },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  txDesc: { fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: "900" },
  guideContainer: { flex: 1 },
  guideContent: { flex: 1, padding: 30, alignItems: "center", paddingTop: 80 },
  closeGuide: { position: "absolute", top: 50, right: 25, zIndex: 10 },
  guideMainTitle: { fontSize: 28, fontWeight: "900", textAlign: "center" },
  guideSubTitle: { fontSize: 16, marginTop: 10, textAlign: "center" },
  guideCard: {
    flexDirection: "row",
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
  guideStepTitle: { fontSize: 18, fontWeight: "bold" },
  guideStepDesc: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  guideDoneBtn: {
    width: "100%",
    marginTop: 20,
    borderRadius: 18,
    overflow: "hidden",
  },
  guideDoneGradient: { paddingVertical: 18, alignItems: "center" },
  guideDoneText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalContent: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { fontWeight: "bold", fontSize: 16 },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSub: { fontSize: 11, color: "#10b981", fontWeight: "600" },
  aiBubble: {
    padding: 15,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    marginBottom: 15,
    maxWidth: "85%",
    elevation: 1,
  },
  aiText: { fontSize: 14, lineHeight: 20 },
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
  chatInputArea: { padding: 20, borderTopWidth: 1 },
  chatInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 8,
    paddingLeft: 15,
  },
  chatInput: { flex: 1, fontSize: 15, paddingVertical: 5 },
  sendBtn: {
    backgroundColor: "#4f46e5",
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  typeSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  typeBtnActiveExpense: { backgroundColor: "#ef4444" },
  typeBtnActiveIncome: { backgroundColor: "#10b981" },
  typeText: { fontSize: 15, fontWeight: "600" },
  walletSection: { marginBottom: 25, marginTop: 5 },
  walletSectionTitle: { fontSize: 14, fontWeight: "700" },
  walletChip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  walletChipText: { fontWeight: "600" },
});
