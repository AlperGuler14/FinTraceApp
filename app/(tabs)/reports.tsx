import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
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
        const currentDay = now.getDate();
        const daysInMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
        ).getDate();
        const dailyBurn = currentDay > 0 ? exp / currentDay : 0;
        const projected = exp + dailyBurn * (daysInMonth - currentDay);

        setMetrics({
          income: inc,
          expense: exp,
          savingsRate: Math.max(0, savingsRate),
          dailyBurn,
          projectedExpense: projected,
        });

        const trendArray = Object.values(monthlyData)
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-5);
        const maxVal =
          Math.max(...trendArray.flatMap((d) => [d.inc, d.exp])) || 1;
        setTrendData(
          trendArray.map((d) => ({
            month: d.monthLabel,
            incH: (d.inc / maxVal) * 100,
            expH: (d.exp / maxVal) * 100,
          })),
        );

        // AI İÇGÖRÜLERİ - FULL VERSİYON
        let generatedInsights = [];
        if (sortedCats.length > 0 && sortedCats[0].percent > 35) {
          generatedInsights.push({
            title: "Kategori Riski",
            icon: "pie-chart",
            color: "#f59e0b",
            bg: isDark ? "rgba(245,158,11,0.15)" : "#fffbeb",
            text: `Harcamalarının %${sortedCats[0].percent.toFixed(0)}'si sadece ${sortedCats[0].name} kategorisine gidiyor. %10'luk bir kesinti seni çok rahatlatır.`,
          });
        }
        if (projected > inc && inc > 0) {
          generatedInsights.push({
            title: "Bütçe Alarmı",
            icon: "trending-down",
            color: "#ef4444",
            bg: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
            text: `Bu hızla gidersen ay sonu faturan ₺${projected.toFixed(0)} olacak ve gelirini aşacak. Frene basma zamanı!`,
          });
        } else if (inc > 0) {
          generatedInsights.push({
            title: "Mükemmel Gidişat",
            icon: "trending-up",
            color: "#10b981",
            bg: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
            text: `Harcama hızın harika. Ay sonunu net bir şekilde artıda kapatıp birikim yapabileceksin.`,
          });
        }
        if (savingsRate < 10 && inc > 0) {
          generatedInsights.push({
            title: "Tasarruf Fırsatı",
            icon: "shield",
            color: "#8b5cf6",
            bg: isDark ? "rgba(139,92,246,0.15)" : "#f5f3ff",
            text: `Şu an gelirinin sadece %${savingsRate.toFixed(1)}'ini tasarruf ediyorsun. Bunu %15'e çıkaralım mı?`,
          });
        }
        if (generatedInsights.length === 0) {
          generatedInsights.push({
            title: "Sistem Stabil",
            icon: "check-circle",
            color: "#10b981",
            bg: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
            text: "Tüm finansal göstergelerin sağlıklı seviyede.",
          });
        }
        setInsights(generatedInsights);
      }
    } catch (e) {
      console.log("Hata:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAndAnalyzeData();
  }, []);

  const openDetail = (kpi: "income" | "expense" | "savings" | "burn") => {
    setActiveKpi(kpi);
    setDetailModalVisible(true);
  };

  const renderKpiDetailContent = () => {
    if (!activeKpi) return null;
    let config = {
      title: "",
      icon: "",
      colors: ["#fff", "#fff"],
      value: "",
      details: [] as any[],
    };
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const remainingDays = daysInMonth - now.getDate();

    switch (activeKpi) {
      case "income":
        config = {
          title: "Gelir Analizi",
          icon: "plus-circle",
          colors: ["#10b981", "#059669"],
          value: `₺${metrics.income.toLocaleString()}`,
          details: [
            {
              title: "Nakit Akışı",
              text:
                metrics.income > 0
                  ? "Gelir akışın aktif durumda."
                  : "Henüz bir gelir kaydın yok.",
              icon: "activity",
            },
            {
              title: "Kapasite",
              text: `Günlük ortalama ${Math.round(metrics.income / daysInMonth)} ₺ kazanım hızındasın.`,
              icon: "battery-charging",
            },
          ],
        };
        break;
      case "expense":
        const topCat = categories[0];
        config = {
          title: "Gider Analizi",
          icon: "minus-circle",
          colors: ["#f43f5e", "#e11d48"],
          value: `₺${metrics.expense.toLocaleString()}`,
          details: [
            {
              title: "En Büyük Sızıntı",
              text: topCat
                ? `Bütçenin en büyük kısmı %${topCat.percent.toFixed(1)} ile ${topCat.name} kategorisine gidiyor.`
                : "Harcama verisi yok.",
              icon: "alert-triangle",
            },
            {
              title: "Kısma Potansiyeli",
              text: topCat
                ? `Sadece bu kategoride %15 azaltsan, ayda ${Math.round(topCat.amount * 0.15)} ₺ tasarruf edersin.`
                : "Veri bekleniyor.",
              icon: "scissors",
            },
            {
              title: "Ay Sonu Tahmini",
              text: `Mevcut hızla ay sonunda toplam giderinin ₺${metrics.projectedExpense.toFixed(0)} olması bekleniyor.`,
              icon: "fast-forward",
            },
          ],
        };
        break;
      case "savings":
        config = {
          title: "Tasarruf & Birikim",
          icon: "pie-chart",
          colors: ["#6366f1", "#4f46e5"],
          value: `%${metrics.savingsRate.toFixed(1)}`,
          details: [
            {
              title: "Mevcut Durum",
              text: `Şu anki tasarruf oranın %${metrics.savingsRate.toFixed(1)}. İdeal hedefin %20 olmalı.`,
              icon: "target",
            },
            {
              title: "Yıl Sonu Vizyonu",
              text: `Bu tasarruf oranıyla yıl sonunda ₺${Math.round((metrics.income - metrics.expense) * 12).toLocaleString()} biriktirmiş olacaksın.`,
              icon: "trending-up",
            },
          ],
        };
        break;
      case "burn":
        config = {
          title: "Günlük Yanma Hızı",
          icon: "activity",
          colors: ["#f59e0b", "#d97706"],
          value: `₺${metrics.dailyBurn.toFixed(0)} / gün`,
          details: [
            {
              title: "Hız Sınırı",
              text: `Ay sonuna ${remainingDays} gün var. Bakiyeni korumak için günlük limitin ₺${((metrics.income - metrics.expense) / remainingDays).toFixed(0)} olmalı.`,
              icon: "zap",
            },
            {
              title: "Kalan Günler",
              text: `Ayın bitmesine çok az kaldı. Disiplini elden bırakma!`,
              icon: "calendar",
            },
          ],
        };
        break;
    }

    return (
      <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
        <LinearGradient
          colors={config.colors as any}
          style={styles.modalHeaderBg}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setDetailModalVisible(false)}
          >
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Feather
            name={config.icon as any}
            size={48}
            color="rgba(255,255,255,0.8)"
            style={{ marginBottom: 15 }}
          />
          <Text style={styles.modalKpiTitle}>{config.title}</Text>
          <Text style={styles.modalKpiValue}>{config.value}</Text>
        </LinearGradient>
        <ScrollView style={styles.modalBody}>
          <Text style={[styles.modalSectionTitle, { color: theme.textMain }]}>
            AI Asistan Analizi
          </Text>
          {config.details.map((detail, idx) => (
            <View
              key={idx}
              style={[
                styles.detailCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              <View
                style={[
                  styles.detailIconBox,
                  { backgroundColor: config.colors[0] + "15" },
                ]}
              >
                <Feather
                  name={detail.icon as any}
                  size={20}
                  color={config.colors[0]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.textMain }]}>
                  {detail.title}
                </Text>
                <Text style={[styles.detailText, { color: theme.textSub }]}>
                  {detail.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
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
            {/* KPI GRID */}
            <View style={styles.kpiGrid}>
              {[
                {
                  k: "income",
                  l: "Toplam Gelir",
                  v: `₺${metrics.income.toLocaleString()}`,
                  c: ["#10b981", "#059669"],
                  i: "plus-circle",
                },
                {
                  k: "expense",
                  l: "Toplam Gider",
                  v: `₺${metrics.expense.toLocaleString()}`,
                  c: ["#f43f5e", "#e11d48"],
                  i: "minus-circle",
                },
                {
                  k: "savings",
                  l: "Tasarruf Oranı",
                  v: `%${metrics.savingsRate.toFixed(1)}`,
                  c: ["#6366f1", "#4f46e5"],
                  i: "pie-chart",
                },
                {
                  k: "burn",
                  l: "Günlük Yanma",
                  v: `₺${metrics.dailyBurn.toFixed(0)}`,
                  c: ["#f59e0b", "#d97706"],
                  i: "activity",
                },
              ].map((item: any, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.kpiWrapper}
                  activeOpacity={0.8}
                  onPress={() => openDetail(item.k)}
                >
                  <LinearGradient colors={item.c} style={styles.kpiBoxGradient}>
                    <View style={styles.kpiHeader}>
                      <Feather name={item.i} size={16} color="#fff" />
                      <Text style={styles.kpiLabelLight}>{item.l}</Text>
                    </View>
                    <Text style={styles.kpiValueLight}>{item.v}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* AKSİYON PLANLARI */}
            <Text style={[styles.sectionHeader, { color: theme.textMain }]}>
              Aksiyon Planı & Teşhisler
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
                      backgroundColor: isDark ? theme.cardBg : insight.bg,
                      borderColor: insight.color + "40",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.insightCardHeader}>
                    <View
                      style={[
                        styles.insightIconBox,
                        { backgroundColor: insight.color + "20" },
                      ]}
                    >
                      <Feather
                        name={insight.icon}
                        size={18}
                        color={insight.color}
                      />
                    </View>
                    <Text
                      style={[styles.insightTitle, { color: insight.color }]}
                    >
                      {insight.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.insightText,
                      { color: isDark ? theme.textMain : "#334155" },
                    ]}
                  >
                    {insight.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* TREND GRAFİĞİ */}
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

            {/* KATEGORİ DAĞILIMI (STACKED BAR VE LİSTE) */}
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
                Dağılım Haritası
              </Text>
              <View style={styles.stackedBarContainer}>
                {categories.map((cat, idx) => (
                  <View
                    key={idx}
                    style={{ flex: cat.percent, backgroundColor: cat.color }}
                  />
                ))}
              </View>
              {categories.length > 0 ? (
                <View style={styles.categoryList}>
                  {categories.map((cat, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.categoryItem,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.catIconArea,
                          { backgroundColor: cat.color + "20" },
                        ]}
                      >
                        <Feather name="hash" size={16} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.catName, { color: theme.textMain }]}
                        >
                          {cat.name}
                        </Text>
                        <Text
                          style={[styles.catPercent, { color: theme.textSub }]}
                        >
                          Bütçenin %{cat.percent.toFixed(1)}'i
                        </Text>
                      </View>
                      <Text
                        style={[styles.catAmount, { color: theme.textMain }]}
                      >
                        ₺{cat.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: theme.textSub }]}>
                  Veri bulunamadı.
                </Text>
              )}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {renderKpiDetailContent()}
      </Modal>
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
  kpiHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  kpiLabelLight: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginLeft: 6,
  },
  kpiValueLight: { fontSize: 22, fontWeight: "900", color: "#ffffff" },
  sectionHeader: { fontSize: 18, fontWeight: "900", marginBottom: 15 },
  insightCard: {
    width: width * 0.75,
    padding: 20,
    borderRadius: 24,
    marginRight: 15,
  },
  insightCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  insightIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  insightTitle: { fontSize: 15, fontWeight: "900" },
  insightText: { fontSize: 13, fontWeight: "500", lineHeight: 20 },
  card: { borderRadius: 28, padding: 25, marginBottom: 25, elevation: 2 },
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
  stackedBarContainer: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 25,
  },
  categoryList: { marginTop: 5 },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  catIconArea: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  catName: { fontSize: 15, fontWeight: "bold", marginBottom: 2 },
  catPercent: { fontSize: 12, fontWeight: "500" },
  catAmount: { fontSize: 16, fontWeight: "900" },
  emptyText: { textAlign: "center", fontWeight: "500", marginTop: 10 },
  modalContainer: { flex: 1 },
  modalHeaderBg: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 30,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  modalKpiTitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 5,
  },
  modalKpiValue: { fontSize: 42, color: "#fff", fontWeight: "900" },
  modalBody: { padding: 25, paddingTop: 30 },
  modalSectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 20 },
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
});
