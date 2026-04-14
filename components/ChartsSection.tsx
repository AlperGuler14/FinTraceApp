import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";

// Telefonun ekran genişliğini alıyoruz ki grafikler ekrana tam otursun
const screenWidth = Dimensions.get("window").width;

const COLORS = [
  "#3b82f6", // Mavi
  "#f59e0b", // Turuncu
  "#10b981", // Yeşil
  "#8b5cf6", // Mor
  "#d946ef", // Pembe
  "#ef4444", // Kırmızı
];

export default function ChartsSection({ expenses = [] }) {
  // 1. Pasta Grafik İçin Kategori Verisi (Mantık Web ile Birebir Aynı)
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  // react-native-chart-kit için pieData formatı
  const pieData = Object.keys(categoryTotals)
    .map((key, index) => ({
      name: key,
      population: categoryTotals[key], // recharts'daki 'value' yerine 'population' kullanır
      color: COLORS[index % COLORS.length],
      legendFontColor: "#64748b",
      legendFontSize: 12,
    }))
    .sort((a, b) => b.population - a.population);

  // 2. Çizgi Grafik İçin Dinamik Tarih Verisi (Mantık Web ile Birebir Aynı)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const trendMap = sortedExpenses.reduce((acc, curr) => {
    // Mobilde toLocaleDateString bazen farklı davranabilir, manuel formatlıyoruz
    const dateObj = new Date(curr.date);
    const dateKey = `${dateObj.getDate()} ${dateObj.toLocaleString("tr-TR", { month: "short" })}`;
    acc[dateKey] = (acc[dateKey] || 0) + curr.amount;
    return acc;
  }, {});

  const lineLabels = Object.keys(trendMap);
  const lineValues = Object.values(trendMap);

  // Grafiklerin ortak konfigürasyon ayarları
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Çizgi rengi (Mavi)
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`, // Yazı rengi
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <View style={styles.container}>
      {/* Pasta Grafik Kartı */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gider Dağılımı (Kategoriler)</Text>

        {pieData.length > 0 ? (
          <PieChart
            data={pieData}
            width={screenWidth - 70} // Ekran genişliğinden paddingleri çıkarıyoruz
            height={220}
            chartConfig={chartConfig}
            accessor={"population"}
            backgroundColor={"transparent"}
            paddingLeft={"15"}
            center={[10, 0]}
            absolute // Yüzde yerine net tutarı gösterir
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz veri yok.</Text>
          </View>
        )}
      </View>

      {/* Çizgi Grafik Kartı */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gider Trendi (Zaman Çizelgesi)</Text>

        {lineLabels.length > 0 ? (
          <LineChart
            data={{
              labels:
                lineLabels.length > 4
                  ? lineLabels.filter((_, i) => i % 2 === 0)
                  : lineLabels, // Çok veri varsa etiketleri atlayarak yaz
              datasets: [{ data: lineValues }],
            }}
            width={screenWidth - 70}
            height={220}
            chartConfig={chartConfig}
            bezier // Çizgiyi yumuşak kavisli yapar
            style={styles.lineChartStyle}
            yAxisLabel="₺"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Harcama eklendiğinde burada görünecek.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  lineChartStyle: {
    borderRadius: 16,
    marginLeft: -15, // Sol taraftaki sayıların taşmasını engeller
  },
});
