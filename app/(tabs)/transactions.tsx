import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext"; // TEMA MOTORU EKLENDİ

export default function TransactionsScreen() {
  const { isDark, colors: theme } = useTheme(); // TEMAYI ÇEKİYORUZ
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tema uyumlu Kategori Fonksiyonu
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
        }));
        setTransactions(formattedData as never[]);
      }
    } catch (error) {
      console.error("Hata:", error);
      Alert.alert("Hata", "İşlem geçmişi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      const channel = supabase
        .channel("transactions-list-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "islemler" },
          () => {
            fetchTransactions();
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, []),
  );

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
          {item.desc && (
            <Text style={[styles.dateText, { color: theme.textSub }]}>
              {formattedDate}
            </Text>
          )}
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
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  transactionCount: { fontSize: 14, fontFamily: "Inter_500Medium" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  emptyListContent: { flex: 1, justifyContent: "center" },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 3,
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
  categoryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  descText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  amountContainer: { alignItems: "flex-end" },
  amountText: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  incomeText: { color: "#10b981" },
  expenseText: { color: "#ef4444" },
  dateText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyAnimation: { width: 200, height: 200 },
  emptyText: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16 },
  emptySubText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
});
