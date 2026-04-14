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
// Supabase bağlantı yolunu kendi projene göre kontrol et
import { supabase } from "../../constants/Supabase";

// --- Kategoriye göre Feather ikonu ve renk getiren yardımcı fonksiyon ---
const getCategoryDetails = (category, type) => {
  if (type === "income")
    return {
      icon: <Feather name="plus-circle" size={24} color="#10b981" />,
      bg: "#d1fae5",
    };

  switch (category) {
    case "Market":
      return {
        icon: <Feather name="shopping-cart" size={24} color="#6366f1" />,
        bg: "#e0e7ff",
      };
    case "Yemek":
      return {
        icon: <Feather name="coffee" size={24} color="#f59e0b" />,
        bg: "#fef3c7",
      };
    case "Ulaşım":
      return {
        icon: <Feather name="navigation" size={24} color="#3b82f6" />,
        bg: "#dbeafe",
      };
    case "Kira":
      return {
        icon: <Feather name="home" size={24} color="#8b5cf6" />,
        bg: "#ede9fe",
      };
    case "Fatura":
      return {
        icon: <Feather name="zap" size={24} color="#eab308" />,
        bg: "#fef08a",
      };
    case "Eğlence":
      return {
        icon: <Feather name="film" size={24} color="#ec4899" />,
        bg: "#fce7f3",
      };
    case "Sağlık":
      return {
        icon: <Feather name="heart" size={24} color="#ef4444" />,
        bg: "#fee2e2",
      };
    case "Giyim":
      return {
        icon: <Feather name="shopping-bag" size={24} color="#14b8a6" />,
        bg: "#ccfbf1",
      };
    case "Eğitim":
      return {
        icon: <Feather name="book" size={24} color="#8b5cf6" />,
        bg: "#ede9fe",
      };
    case "Abonelik":
      return {
        icon: <Feather name="refresh-cw" size={24} color="#64748b" />,
        bg: "#f1f5f9",
      };
    default:
      return {
        icon: <Feather name="help-circle" size={24} color="#94a3b8" />,
        bg: "#f1f5f9",
      };
  }
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Veritabanından verileri çekme fonksiyonu
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("islemler")
        .select("*")
        .order("tarih", { ascending: false }); // En yeni işlemler en üstte

      if (error) throw error;

      if (data) {
        // Gelen veriyi bileşenin beklediği formata (prop'a) çeviriyoruz
        const formattedData = data.map((item) => ({
          id: item.id,
          amount: Math.abs(item.tutar), // Negatif olsa bile UI için mutlak değer al
          type: item.tutar < 0 ? "expense" : "income",
          category: item.kategori_adi,
          desc: item.aciklama,
          date: item.tarih,
        }));
        setTransactions(formattedData);
      }
    } catch (error) {
      console.error("İşlemler çekilirken hata:", error);
      Alert.alert("Hata", "İşlem geçmişi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  // Sayfaya her odaklanıldığında veriyi çek ve canlı dinlemeyi başlat
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();

      const channel = supabase
        .channel("transactions-list-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "islemler" },
          () => {
            fetchTransactions(); // Veritabanında değişim olursa listeyi yenile
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, []),
  );

  // Lottie Animasyonlu Boş Durum (Empty State)
  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <LottieView
        source={require("../../assets/animations/empty.json")} // Kendi yoluna göre kontrol et
        autoPlay
        loop
        style={styles.emptyAnimation}
      />
      <Text style={styles.emptyText}>Henüz hiç işlem bulunmuyor.</Text>
      <Text style={styles.emptySubText}>
        İlk gelir veya giderini ekleyerek başla!
      </Text>
    </View>
  );

  // Tek bir işlem satırını (Item) çizen bileşen
  const renderItem = ({ item }) => {
    const isIncome = item.type === "income";
    const { icon, bg } = getCategoryDetails(item.category, item.type);

    // Tarihi güzel formata çevirme (Örn: 11 Mar)
    const dateObj = new Date(item.date);
    const formattedDate = `${dateObj.getDate()} ${dateObj.toLocaleString("tr-TR", { month: "short" })}`;

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // İleride buraya tıklandığında işlemi düzenleme/silme modalı eklenebilir
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: bg }]}>
          {icon}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.categoryText}>{item.category}</Text>
          {item.desc ? (
            <Text style={styles.descText} numberOfLines={1}>
              {item.desc}
            </Text>
          ) : (
            <Text style={styles.descText}>{formattedDate}</Text>
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
          {item.desc && <Text style={styles.dateText}>{formattedDate}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
        <Text style={styles.transactionCount}>{transactions.length} İşlem</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4f46e5"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
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
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 60, // Telefonun üst barı (çentik) ile çakışmaması için eklendi
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1e293b",
  },
  transactionCount: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Alt menü (Tab bar) işlemlerin üstünü kapatmasın diye boşluk eklendi
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
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
  detailsContainer: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1e293b",
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  incomeText: {
    color: "#10b981",
  },
  expenseText: {
    color: "#ef4444",
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyAnimation: {
    width: 200,
    height: 200,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#475569",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    marginTop: 8,
  },
});
