import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Kendi Supabase yoluna göre kontrol et
import { supabase } from "../../constants/Supabase";

const { width } = Dimensions.get("window");

const PremiumMenuItem = ({ icon, title, isDanger = false, onPress }) => (
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.7}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onPress) onPress();
    }}
  >
    <View
      style={[
        styles.menuIconBox,
        isDanger
          ? { backgroundColor: "#fef2f2" }
          : { backgroundColor: "#f8fafc" },
      ]}
    >
      <Feather name={icon} size={20} color={isDanger ? "#ef4444" : "#1e293b"} />
    </View>
    <Text style={[styles.menuTitle, isDanger && { color: "#ef4444" }]}>
      {title}
    </Text>
    <Feather name="chevron-right" size={20} color="#cbd5e1" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const [userName, setUserName] = useState("Alper");
  const [userInitial, setUserInitial] = useState("A");
  const [monthlyTxCount, setMonthlyTxCount] = useState(0);
  const [activeWalletCount, setActiveWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Veritabanından Kullanıcı ve İstatistik Verilerini Çek
  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Kullanıcı Bilgisi Çekimi
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        // Eğer Auth tarafında metadata(isim) kaydettiysen onu al, yoksa e-posta başını al
        const name =
          user.user_metadata?.name || user.email?.split("@")[0] || "Alper";
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
        setUserInitial(name.charAt(0).toUpperCase());
      }

      // 2. Bu Ayki İşlem Sayısını Hesapla (Ayın ilk gününü buluyoruz)
      const now = new Date();
      const firstDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { count: txCount, error: txError } = await supabase
        .from("islemler")
        .select("*", { count: "exact", head: true })
        .gte("tarih", firstDayOfMonth); // Sadece bu ayın işlemlerini say

      if (!txError) setMonthlyTxCount(txCount || 0);

      // 3. Aktif Cüzdan (Zarf) Sayısını Çek
      const { count: walletCount, error: walletError } = await supabase
        .from("butceler")
        .select("*", { count: "exact", head: true });

      if (!walletError) setActiveWalletCount(walletCount || 0);
    } catch (error) {
      console.error("Profil verisi çekilirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, []),
  );

  // Güvenli Çıkış İşlemi
  const handleLogout = async () => {
    Alert.alert(
      "Güvenli Çıkış",
      "Hesabından çıkış yapmak istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Hata", "Çıkış yapılamadı: " + error.message);
            } else {
              // Çıkış başarılıysa Onboarding/Login (index) ekranına yönlendir
              router.replace("/");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Devasa Üst Renk Geçişi */}
        <LinearGradient
          colors={["#3730a3", "#4f46e5"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfoContainer}>
            <View style={styles.avatarBorder}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            </View>
            <Text style={styles.nameText}>{userName}</Text>
            <View style={styles.badgeContainer}>
              <Feather name="star" size={12} color="#f59e0b" />
              <Text style={styles.badgeText}>Premium Üye</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Alt Menülerin Bulunduğu Kısım */}
        <View style={styles.contentContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              {loading ? (
                <ActivityIndicator color="#4f46e5" size="small" />
              ) : (
                <Text style={styles.statValue}>{monthlyTxCount}</Text>
              )}
              <Text style={styles.statLabel}>Bu Ayki İşlem</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              {loading ? (
                <ActivityIndicator color="#4f46e5" size="small" />
              ) : (
                <Text style={styles.statValue}>{activeWalletCount}</Text>
              )}
              <Text style={styles.statLabel}>Aktif Cüzdan</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>HESAP AYARLARI</Text>
          <View style={styles.menuCard}>
            <PremiumMenuItem
              icon="user"
              title="Kişisel Bilgiler"
              onPress={() =>
                Alert.alert(
                  "Yakında",
                  "Kişisel bilgi düzenleme ekranı eklenecek.",
                )
              }
            />
            <View style={styles.menuDivider} />
            <PremiumMenuItem
              icon="shield"
              title="Güvenlik ve Şifre"
              onPress={() =>
                Alert.alert("Yakında", "Şifre değiştirme ekranı eklenecek.")
              }
            />
            <View style={styles.menuDivider} />
            <PremiumMenuItem
              icon="bell"
              title="Bildirim Tercihleri"
              onPress={() =>
                Alert.alert("Yakında", "Bildirim ayarları ekranı eklenecek.")
              }
            />
          </View>

          <Text style={styles.sectionTitle}>UYGULAMA</Text>
          <View style={styles.menuCard}>
            <PremiumMenuItem
              icon="moon"
              title="Görünüm (Karanlık Mod)"
              onPress={() => Alert.alert("Yakında", "Tema seçici eklenecek.")}
            />
            <View style={styles.menuDivider} />
            <PremiumMenuItem
              icon="help-circle"
              title="Yardım Merkezi"
              onPress={() =>
                Alert.alert(
                  "Yardım",
                  "Destek için fintrace@app.com adresine yazabilirsin.",
                )
              }
            />
            <View style={styles.menuDivider} />
            <PremiumMenuItem
              icon="log-out"
              title="Güvenli Çıkış"
              isDanger={true}
              onPress={handleLogout}
            />
          </View>

          <Text style={styles.versionText}>FinTrace v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ... Stiller orijinal halindekiyle birebir aynı bırakıldı
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  headerGradient: {
    height: 320,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  profileInfoContainer: { alignItems: "center" },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatarInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
  avatarText: { fontSize: 36, fontFamily: "Inter_900Black", color: "#4f46e5" },
  nameText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginLeft: 6,
  },

  contentContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_900Black",
    color: "#1e293b",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#64748b" },
  statDivider: { width: 1, backgroundColor: "#e2e8f0" },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#94a3b8",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 10,
  },
  menuCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 8,
    marginBottom: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#1e293b",
  },
  menuDivider: { height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 16 },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#cbd5e1",
    marginTop: 10,
  },
});
