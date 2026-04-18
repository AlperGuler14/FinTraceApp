import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function ColorfulAnalyticsScreen() {
  const { isDark, colors: theme } = useTheme();
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    income: 0,
    expense: 0,
    savingsRate: 0,
    dailyBurn: 0,
    projectedExpense: 0,
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [activeKpi, setActiveKpi] = useState<
    "income" | "expense" | "savings" | "burn" | null
  >(null);

  // FİŞ MODALI STATE'İ
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);

  const [healthData, setHealthData] = useState({
    score: 0,
    message: "",
    color: "",
    bgColor: "",
  });

  const chartColors = [
    "#6366f1",
    "#f43f5e",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
  ];
  const monthNames = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];

  const fetchAndAnalyzeData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("islemler")
        .select("*")
        .order("tarih", { ascending: false });
      if (!error && data) {
        let inc = 0,
          exp = 0;
        let catMap: any = {};
        const monthlyData: Record<
          string,
          { inc: number; exp: number; monthLabel: string; timestamp: number }
        > = {};

        data.forEach((item) => {
          const val = Number(item.tutar) || 0;
          if (val > 0) inc += val;
          else {
            const absAmount = Math.abs(val);
            exp += absAmount;
            catMap[item.kategori_adi] =
              (catMap[item.kategori_adi] || 0) + absAmount;
          }

          if (item.tarih) {
            const date = new Date(item.tarih);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyData[key]) {
              monthlyData[key] = {
                inc: 0,
                exp: 0,
                monthLabel: monthNames[date.getMonth()],
                timestamp: new Date(
                  date.getFullYear(),
                  date.getMonth(),
                  1,
                ).getTime(),
              };
            }
            if (val > 0) monthlyData[key].inc += val;
            else monthlyData[key].exp += Math.abs(val);
          }
        });

        const sortedCats = Object.keys(catMap)
          .map((key, i) => ({
            name: key,
            amount: catMap[key],
            percent: exp > 0 ? (catMap[key] / exp) * 100 : 0,
            color: chartColors[i % chartColors.length],
          }))
          .sort((a, b) => b.amount - a.amount);
        setCategories(sortedCats);

        const savingsRate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
        const now = new Date();
        const currentDay = now.getDate() || 1; // 0'a bölünme hatasını engellemek için
        const dailyBurn = exp / currentDay;
        const remainingDays =
          new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
          currentDay;

        setMetrics({
          income: inc,
          expense: exp,
          savingsRate: Math.max(0, savingsRate),
          dailyBurn,
          projectedExpense: exp + dailyBurn * remainingDays,
        });

        const trendArray = Object.values(monthlyData)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-5);
        const maxVal =
          Math.max(...trendArray.flatMap((d) => [d.inc, d.exp])) || 1;

        if (trendArray.length === 0) {
          setTrendData([
            { month: monthNames[now.getMonth()], incH: 0, expH: 0 },
          ]);
        } else {
          setTrendData(
            trendArray.map((d) => ({
              month: d.monthLabel,
              incH: (d.inc / maxVal) * 100,
              expH: (d.exp / maxVal) * 100,
            })),
          );
        }

        // Basit Sağlık Skoru Hesabı
        let calculatedScore = 85;
        if (exp > inc && inc > 0) calculatedScore = 30;
        else if (savingsRate < 10 && inc > 0) calculatedScore = 65;
        else if (inc === 0 && exp === 0) calculatedScore = 0;

        setHealthData({
          score: calculatedScore,
          message:
            calculatedScore > 70 ? "Süper Gidiyorsun" : "Dikkatli Olmalısın",
          color: calculatedScore > 70 ? "#10b981" : "#ef4444",
          bgColor:
            calculatedScore > 70
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.15)",
        });

        let generatedInsights = [];
        if (sortedCats.length > 0 && sortedCats[0].percent > 35)
          generatedInsights.push({
            title: "Kategori Riski",
            icon: "pie-chart",
            color: "#f59e0b",
            bg: isDark ? "rgba(245,158,11,0.15)" : "#fffbeb",
            text: `Harcamalarının %${sortedCats[0].percent.toFixed(0)}'si ${sortedCats[0].name} kategorisine gidiyor.`,
          });
        if (inc > 0 && savingsRate < 10)
          generatedInsights.push({
            title: "Tasarruf Fırsatı",
            icon: "shield",
            color: "#8b5cf6",
            bg: isDark ? "rgba(139,92,246,0.15)" : "#f5f3ff",
            text: `Sadece %${savingsRate.toFixed(1)} tasarruf ediyorsun. Bunu artırabiliriz.`,
          });
        if (generatedInsights.length === 0 && (inc > 0 || exp > 0))
          generatedInsights.push({
            title: "Sistem Stabil",
            icon: "check-circle",
            color: "#10b981",
            bg: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
            text: "Tüm göstergelerin sağlıklı.",
          });
        else if (inc === 0 && exp === 0)
          generatedInsights.push({
            title: "Veri Bekleniyor",
            icon: "info",
            color: "#64748b",
            bg: isDark ? "rgba(100,116,139,0.15)" : "#f1f5f9",
            text: "Analiz yapabilmem için işlem eklemelisin.",
          });
        setInsights(generatedInsights);
      }
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const openDetail = (kpi: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveKpi(kpi);
    setDetailModalVisible(true);
  };

  const getKpiValue = (kpi: string) => {
    switch (kpi) {
      case "income":
        return `₺${metrics.income.toLocaleString()}`;
      case "expense":
        return `₺${metrics.expense.toLocaleString()}`;
      case "savings":
        return `%${metrics.savingsRate.toFixed(1)}`;
      case "burn":
        return `₺${metrics.dailyBurn.toFixed(0)}`;
      default:
        return "";
    }
  };

  const renderKpiDetailContent = () => {
    if (!activeKpi) return null;
    const colors =
      activeKpi === "income"
        ? ["#10b981", "#059669"]
        : activeKpi === "expense"
          ? ["#f43f5e", "#e11d48"]
          : activeKpi === "savings"
            ? ["#6366f1", "#4f46e5"]
            : ["#f59e0b", "#d97706"];
    const titles = {
      income: "GELİR ANALİZİ",
      expense: "GİDER ANALİZİ",
      savings: "TASARRUF ORANI",
      burn: "GÜNLÜK YANMA",
    };

    return (
      <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
        <LinearGradient colors={colors as any} style={styles.modalHeaderBg}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setDetailModalVisible(false)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalKpiTitle}>{titles[activeKpi]}</Text>
          <Text style={styles.modalKpiValue}>{getKpiValue(activeKpi)}</Text>
        </LinearGradient>
        <View style={styles.modalBody}>
          <Text style={[styles.modalSectionTitle, { color: theme.textMain }]}>
            AI Asistan Analizi
          </Text>
          <View
            style={[
              styles.detailCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <View
              style={[
                styles.detailIconBox,
                { backgroundColor: colors[0] + "15" },
              ]}
            >
              <Feather name="cpu" size={20} color={colors[0]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailTitle, { color: theme.textMain }]}>
                Özet Durum
              </Text>
              <Text style={[styles.detailText, { color: theme.textSub }]}>
                Bu veri noktanız şu anda yapay zeka asistanı tarafından
                işleniyor. Genel gidişatınız tutarlı.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // --- MOBİL UYUMLU HAREKETLİ FİŞ MODALI BİLEŞENİ ---
  const NativeReceiptModal = () => {
    const translateY = useRef(
      new Animated.Value(Dimensions.get("window").height),
    ).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [isArchiving, setIsArchiving] = useState(false);

    useEffect(() => {
      if (isReceiptVisible) {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        translateY.setValue(Dimensions.get("window").height);
      }
    }, [isReceiptVisible]);

    const handleArchive = async () => {
      setIsArchiving(true);
      const currentMonth = new Date().toLocaleString("tr-TR", {
        month: "long",
        year: "numeric",
      });

      try {
        const { error } = await supabase.from("reports_archive").insert([
          {
            month_name: currentMonth,
            total_income: metrics.income,
            total_expense: metrics.expense,
            health_score: healthData.score,
            savings_rate: metrics.savingsRate,
          },
        ]);

        if (error) throw error;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Başarılı 🎉", "Fişiniz profil sayfasına arşivlendi!");
        setIsReceiptVisible(false);
      } catch (error: any) {
        Alert.alert("Hata", "Arşivlenirken bir sorun oluştu: " + error.message);
      } finally {
        setIsArchiving(false);
      }
    };

    const netDurum = metrics.income - metrics.expense;
    const enflasyonKaybi = netDurum > 0 ? netDurum * 0.02 : 0;
    const enCokHarcanan =
      categories.length > 0 ? categories[0].name.toUpperCase() : "VERİ YOK";
    const currentMonthLabel = new Date()
      .toLocaleString("tr-TR", { month: "long" })
      .toUpperCase();

    if (!isReceiptVisible) return null;

    return (
      <Modal visible={isReceiptVisible} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <Animated.View
            style={[
              styles.receiptCard,
              { transform: [{ translateY }], opacity },
            ]}
          >
            {/* Fiş Başlığı */}
            <Text style={styles.receiptLogo}>FINTRACE</Text>
            <Text style={styles.receiptSubtitle}>
              ALPER - {currentMonthLabel} ÖZETİ
            </Text>
            <View style={styles.receiptDashedLine} />

            {/* Fiş Detayları */}
            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>Önceki Bakiye</Text>
              <Text style={styles.receiptText}>₺0.00</Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>(+) Gelirler</Text>
              <Text style={[styles.receiptText, { color: "#10b981" }]}>
                ₺
                {metrics.income.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>(-) Giderler</Text>
              <Text style={[styles.receiptText, { color: "#ef4444" }]}>
                ₺
                {metrics.expense.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* En Çok Harcanan */}
            <View
              style={{
                marginTop: 15,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "#e5e7eb",
                borderStyle: "dotted",
              }}
            >
              <Text style={{ fontSize: 10, color: "#6b7280" }}>
                En Çok Harcanan
              </Text>
              <Text
                style={{ fontWeight: "bold", color: "#1f2937", marginTop: 2 }}
              >
                {enCokHarcanan}
              </Text>
            </View>

            <View style={styles.receiptDashedLine} />

            {/* Gerçeklik Tokadı (Enflasyon) */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                backgroundColor: "#fff7ed",
                padding: 8,
                borderRadius: 6,
                marginBottom: 15,
              }}
            >
              <Text
                style={{ fontWeight: "bold", color: "#ea580c", fontSize: 13 }}
              >
                Enflasyon Kaybı
              </Text>
              <Text
                style={{ fontWeight: "bold", color: "#ea580c", fontSize: 13 }}
              >
                -₺
                {enflasyonKaybi.toLocaleString("tr-TR", {
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>

            {/* Net Sonuç */}
            <View style={styles.receiptRow}>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, color: "#1f2937" }}
              >
                NET DURUM
              </Text>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color: netDurum >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                ₺
                {netDurum.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Aksiyon Butonları */}
            <TouchableOpacity
              style={styles.archiveBtn}
              onPress={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.archiveBtnText}>ARŞİVLE VE KAPAT</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15, alignItems: "center" }}
              onPress={() => setIsReceiptVisible(false)}
            >
              <Text
                style={{ color: "#64748b", fontWeight: "bold", fontSize: 12 }}
              >
                İPTAL
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textMain }]}>
              Analitik Merkezi
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSub }]}>
              Verilerin Renkli Dünyası 🎨
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="share" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={{ marginTop: 50 }}
          />
        ) : (
          <>
            <View style={styles.kpiGrid}>
              {[
                {
                  k: "income",
                  l: "Toplam Gelir",
                  c1: "#10b981",
                  c2: "#059669",
                  v: `₺${metrics.income.toLocaleString()}`,
                },
                {
                  k: "expense",
                  l: "Toplam Gider",
                  c1: "#f43f5e",
                  c2: "#e11d48",
                  v: `₺${metrics.expense.toLocaleString()}`,
                },
                {
                  k: "savings",
                  l: "Tasarruf",
                  c1: "#6366f1",
                  c2: "#4f46e5",
                  v: `%${metrics.savingsRate.toFixed(1)}`,
                },
                {
                  k: "burn",
                  l: "Günlük",
                  c1: "#f59e0b",
                  c2: "#d97706",
                  v: `₺${metrics.dailyBurn.toFixed(0)}`,
                },
              ].map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.kpiWrapper}
                  activeOpacity={0.8}
                  onPress={() => openDetail(item.k)}
                >
                  <LinearGradient
                    colors={[item.c1, item.c2]}
                    style={styles.kpiBoxGradient}
                  >
                    <Text style={styles.kpiLabelLight}>{item.l}</Text>
                    <Text style={styles.kpiValueLight}>{item.v}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionHeader, { color: theme.textMain }]}>
              Aksiyon Planı
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 25, paddingRight: 20 }}
            >
              {insights.map((insight, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.insightCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text style={[styles.insightTitle, { color: insight.color }]}>
                    {insight.title}
                  </Text>
                  <Text style={[styles.insightText, { color: theme.textMain }]}>
                    {insight.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

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
              <Text style={[styles.cardTitle, { color: theme.textMain }]}>
                Aylık Trend Analizi
              </Text>
              <View
                style={[
                  styles.trendChartArea,
                  { borderBottomColor: theme.border },
                ]}
              >
                {trendData.map((data, idx) => (
                  <View key={idx} style={styles.trendColumn}>
                    <View style={styles.barsWrapper}>
                      <View style={styles.barTrack}>
                        <LinearGradient
                          colors={["#34d399", "#10b981"]}
                          style={[styles.barFill, { height: `${data.incH}%` }]}
                        />
                      </View>
                      <View style={styles.barTrack}>
                        <LinearGradient
                          colors={["#fb7185", "#f43f5e"]}
                          style={[styles.barFill, { height: `${data.expH}%` }]}
                        />
                      </View>
                    </View>
                    <Text style={[styles.trendLabel, { color: theme.textSub }]}>
                      {data.month}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* --- FİŞ KESME BUTONU --- */}
            <TouchableOpacity
              style={[styles.printBtn, { backgroundColor: theme.textMain }]}
              onPress={() => setIsReceiptVisible(true)}
            >
              <Feather name="printer" size={20} color={theme.bg} />
              <Text style={[styles.printBtnText, { color: theme.bg }]}>
                Ay Sonu Fişini Kes
              </Text>
            </TouchableOpacity>

            {/* ALT TAB BAR İÇİN NEFES ALMA BOŞLUĞU */}
            <View style={{ height: 120 }} />
          </>
        )}
      </ScrollView>
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {renderKpiDetailContent()}
      </Modal>

      {/* NATIVE FİŞ MODALINI ÇAĞIR */}
      <NativeReceiptModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
    marginTop: 60,
  },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: "500", marginTop: 4 },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  kpiWrapper: { width: "48%", marginBottom: 15 },
  kpiBoxGradient: { padding: 18, borderRadius: 24, elevation: 4 },
  kpiLabelLight: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 5,
  },
  kpiValueLight: { fontSize: 22, fontWeight: "900", color: "#ffffff" },
  sectionHeader: { fontSize: 18, fontWeight: "900", marginBottom: 15 },
  insightCard: {
    width: width * 0.75,
    padding: 20,
    borderRadius: 24,
    marginRight: 15,
  },
  insightTitle: { fontSize: 15, fontWeight: "900", marginBottom: 8 },
  insightText: { fontSize: 13, fontWeight: "500", lineHeight: 20 },
  card: { borderRadius: 28, padding: 25, marginBottom: 25 },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 25 },
  trendChartArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 180,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  trendColumn: { alignItems: "center", width: 50 },
  barsWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 150,
    gap: 4,
  },
  barTrack: { width: 14, height: "100%", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 6 },
  trendLabel: { fontSize: 12, fontWeight: "600", marginTop: 10 },
  modalContainer: { flex: 1 },
  modalHeaderBg: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  closeBtn: { position: "absolute", top: 20, right: 20 },
  modalKpiTitle: { fontSize: 18, color: "#fff", fontWeight: "600" },
  modalKpiValue: { fontSize: 42, color: "#fff", fontWeight: "900" },
  modalBody: { padding: 25, paddingTop: 30 },
  modalSectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 15 },
  detailCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    elevation: 2,
  },
  detailIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  detailTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  detailText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },

  // FİŞ BUTONU VE MODAL STİLLERİ
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 20,
    marginTop: 10,
  },
  printBtnText: { fontSize: 16, fontWeight: "900", marginLeft: 10 },
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptCard: {
    width: width * 0.85,
    backgroundColor: "#fdfbf7",
    padding: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  receiptLogo: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    color: "#1f2937",
  },
  receiptSubtitle: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    letterSpacing: 1,
  },
  receiptDashedLine: {
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    marginVertical: 20,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  receiptText: {
    fontSize: 15,
    color: "#374151",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  archiveBtn: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },
  archiveBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
});
