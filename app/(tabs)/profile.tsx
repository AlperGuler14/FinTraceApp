import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView, // Switch eklendi
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext"; // Tema Motoru eklendi

const { width } = Dimensions.get("window");

// Dinamik tema alan MenuItem
const PremiumMenuItem = ({
  icon,
  title,
  isDanger = false,
  onPress,
  theme,
  rightElement = null,
}: any) => (
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
        { backgroundColor: isDanger ? "rgba(239,68,68,0.15)" : theme.iconBg },
      ]}
    >
      <Feather
        name={icon}
        size={20}
        color={isDanger ? "#ef4444" : theme.textMain}
      />
    </View>
    <Text
      style={[
        styles.menuTitle,
        { color: isDanger ? "#ef4444" : theme.textMain },
      ]}
    >
      {title}
    </Text>
    {/* Eğer sağda özel bir element (Örn: Switch) varsa onu göster, yoksa standart ok ikonunu göster */}
    {rightElement ? (
      rightElement
    ) : (
      <Feather name="chevron-right" size={20} color={theme.textSub} />
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors: theme } = useTheme(); // Temayı çekiyoruz

  const [userName, setUserName] = useState("Alper");
  const [userInitial, setUserInitial] = useState("A");
  const [monthlyTxCount, setMonthlyTxCount] = useState(0);
  const [activeWalletCount, setActiveWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const name =
          user.user_metadata?.name || user.email?.split("@")[0] || "Alper";
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
        setUserInitial(name.charAt(0).toUpperCase());
      }

      const now = new Date();
      const firstDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();

      const { count: txCount } = await supabase
        .from("islemler")
        .select("*", { count: "exact", head: true })
        .gte("tarih", firstDayOfMonth);
      if (txCount !== null) setMonthlyTxCount(txCount);

      const { count: walletCount } = await supabase
        .from("wallets")
        .select("*", { count: "exact", head: true }); // 'butceler' yerine 'wallets' tablosu kullanıldığı varsayıldı
      if (walletCount !== null) setActiveWalletCount(walletCount);
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
            if (error)
              Alert.alert("Hata", "Çıkış yapılamadı: " + error.message);
            else router.replace("/");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />{" "}
      {/* Header gradient mavi olduğu için statüs barı beyaz */}
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Üst Renk Geçişi - Burası hep canlı mavi kalacak */}
        <LinearGradient
          colors={["#3730a3", "#4f46e5"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileInfoContainer}>
            <View style={styles.avatarBorder}>
              <View
                style={[styles.avatarInner, { backgroundColor: theme.cardBg }]}
              >
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

        <View style={[styles.contentContainer, { backgroundColor: theme.bg }]}>
          {/* İstatistikler */}
          <View
            style={[
              styles.statsRow,
              {
                backgroundColor: theme.cardBg,
                shadowColor: isDark ? "#000" : "#cbd5e1",
              },
            ]}
          >
            <View style={styles.statBox}>
              {loading ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <Text style={[styles.statValue, { color: theme.textMain }]}>
                  {monthlyTxCount}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: theme.textSub }]}>
                Bu Ayki İşlem
              </Text>
            </View>
            <View
              style={[styles.statDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.statBox}>
              {loading ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <Text style={[styles.statValue, { color: theme.textMain }]}>
                  {activeWalletCount}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: theme.textSub }]}>
                Aktif Zarf
              </Text>
            </View>
          </View>

          {/* HESAP AYARLARI */}
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>
            HESAP AYARLARI
          </Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <PremiumMenuItem
              theme={theme}
              icon="user"
              title="Kişisel Bilgiler"
              onPress={() =>
                Alert.alert(
                  "Yakında",
                  "Kişisel bilgi düzenleme ekranı eklenecek.",
                )
              }
            />
            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="shield"
              title="Güvenlik ve Şifre"
              onPress={() =>
                Alert.alert("Yakında", "Şifre değiştirme ekranı eklenecek.")
              }
            />
            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="bell"
              title="Bildirim Tercihleri"
              onPress={() =>
                Alert.alert("Yakında", "Bildirim ayarları ekranı eklenecek.")
              }
            />
          </View>

          {/* UYGULAMA AYARLARI */}
          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>
            UYGULAMA
          </Text>
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            {/* KARANLIK MOD ANAHTARI BURADA */}
            <PremiumMenuItem
              theme={theme}
              icon={isDark ? "moon" : "sun"}
              title="Karanlık Mod"
              onPress={toggleTheme} // Satıra tıklanınca da değişir
              rightElement={
                <Switch
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={"#f4f3f4"}
                  onValueChange={toggleTheme}
                  value={isDark}
                />
              }
            />

            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="help-circle"
              title="Yardım Merkezi"
              onPress={() =>
                Alert.alert(
                  "Yardım",
                  "Destek için fintrace@app.com adresine yazabilirsin.",
                )
              }
            />
            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="log-out"
              title="Güvenli Çıkış"
              isDanger={true}
              onPress={handleLogout}
            />
          </View>

          <Text style={[styles.versionText, { color: theme.textSub }]}>
            FinTrace v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
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
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 30,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_900Black", marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1 },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 10,
  },
  menuCard: {
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
  menuTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold" },
  menuDivider: { height: 1, marginHorizontal: 16 },
  versionText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 10,
  },
});
