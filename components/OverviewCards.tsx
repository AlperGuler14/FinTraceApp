import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function OverviewCards({ totalIncome, totalExpense }) {
  const balance = totalIncome - totalExpense;

  const expensePct =
    totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0;
  const balancePct =
    totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

  return (
    <View style={styles.cardsGrid}>
      {/* Gelir Kartı */}
      <View style={[styles.card, styles.incomeCard]}>
        <Text style={styles.statTitle}>Toplam Gelir (Maaş)</Text>
        <Text style={styles.statAmount}>₺{totalIncome.toLocaleString()}</Text>
        <Text style={[styles.statSubtitle, { color: "#059669" }]}>
          %100 (Ana Bütçe)
        </Text>
      </View>

      {/* Gider Kartı */}
      <View style={[styles.card, styles.expenseCard]}>
        <Text style={styles.statTitle}>Toplam Gider</Text>
        <Text style={styles.statAmount}>₺{totalExpense.toLocaleString()}</Text>
        <Text style={[styles.statSubtitle, { color: "#dc2626" }]}>
          Maaşın %{expensePct}'i Harcandı
        </Text>
      </View>

      {/* Bakiye Kartı */}
      <View style={[styles.card, styles.balanceCard]}>
        <Text style={styles.statTitle}>Kalan Bakiye</Text>
        <Text style={styles.statAmount}>₺{balance.toLocaleString()}</Text>
        <Text style={[styles.statSubtitle, { color: "#64748b" }]}>
          Maaşın %{balancePct}'i Kaldı
        </Text>
      </View>
    </View>
  );
}

// React Native'de CSS yerine StyleSheet kullanıyoruz
const styles = StyleSheet.create({
  cardsGrid: {
    flexDirection: "column", // Kartları alt alta dizer (mobil için en sağlıklısı)
    gap: 12, // Kartlar arası boşluk
    marginBottom: 20,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    // iOS için gölge ayarları
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Android için gölge ayarı
    elevation: 2,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#10b981", // Yeşil vurgu
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444", // Kırmızı vurgu
  },
  balanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6", // Mavi vurgu
  },
  statTitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  statAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statSubtitle: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});
