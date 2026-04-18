import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../constants/Supabase";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");

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
    {rightElement ? (
      rightElement
    ) : (
      <Feather name="chevron-right" size={20} color={theme.textSub} />
    )}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { isDark, toggleTheme, colors: theme } = useTheme();

  const [userName, setUserName] = useState("Alper");
  const [userInitial, setUserInitial] = useState("A");
  const [monthlyTxCount, setMonthlyTxCount] = useState(0);
  const [activeWalletCount, setActiveWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [archives, setArchives] = useState<any[]>([]);

  // MODAL STATE'LERİ
  const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  const [isPersonalInfoVisible, setPersonalInfoVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const [isSecurityVisible, setSecurityVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isNotificationVisible, setNotificationVisible] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    budget: true,
    monthly: true,
    campaigns: false,
  });

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (user) {
        const name =
          user.user_metadata?.name || user.email?.split("@")[0] || "Kullanıcı";
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
        .select("*", { count: "exact", head: true });
      if (walletCount !== null) setActiveWalletCount(walletCount);

      const { data: archiveData } = await supabase
        .from("reports_archive")
        .select("*")
        .order("created_at", { ascending: false });
      if (archiveData) setArchives(archiveData);
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

  // --- KESİN VE SORUNSUZ ÇIKIŞ FONKSİYONLARI ---
  const executeLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === "web") {
        window.location.replace("/");
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      Alert.alert(
        "Hata",
        "Çıkış yapılırken bir sorun oluştu: " + error.message,
      );
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Hesabından çıkış yapmak istediğine emin misin?",
      );
      if (confirmed) executeLogout();
    } else {
      Alert.alert(
        "Güvenli Çıkış",
        "Hesabından çıkış yapmak istediğine emin misin?",
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Çıkış Yap", style: "destructive", onPress: executeLogout },
        ],
      );
    }
  };

  // --- GÜNCELLEME FONKSİYONLARI ---
  const handleUpdateName = async () => {
    if (!editName.trim()) return Alert.alert("Hata", "İsim boş olamaz.");
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: editName.trim() },
      });
      if (error) throw error;
      setUserName(editName.charAt(0).toUpperCase() + editName.slice(1));
      setUserInitial(editName.charAt(0).toUpperCase());
      setPersonalInfoVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6)
      return Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
    if (newPassword !== confirmPassword)
      return Alert.alert("Hata", "Girdiğiniz şifreler eşleşmiyor.");
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setSecurityVisible(false);
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Başarılı", "Şifreniz güvenli bir şekilde güncellendi.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Hata", error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const openReceipt = (archiveData: any) => {
    setSelectedArchive(archiveData);
    setReceiptModalVisible(true);
  };

  const HistoricalReceiptModal = () => {
    if (!selectedArchive) return null;
    const netDurum =
      selectedArchive.total_income - selectedArchive.total_expense;

    return (
      <Modal visible={isReceiptModalVisible} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptCard}>
            <Text style={styles.receiptLogo}>FINTRACE</Text>
            <Text style={styles.receiptSubtitle}>
              {selectedArchive.month_name.toUpperCase()} ÖZET FİŞİ
            </Text>
            <View style={styles.receiptDashedLine} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>(+) Gelirler</Text>
              <Text style={[styles.receiptText, { color: "#10b981" }]}>
                ₺
                {Number(selectedArchive.total_income).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>(-) Giderler</Text>
              <Text style={[styles.receiptText, { color: "#ef4444" }]}>
                ₺
                {Number(selectedArchive.total_expense).toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptText}>Sağlık Skoru</Text>
              <Text style={[styles.receiptText, { fontWeight: "bold" }]}>
                %{selectedArchive.health_score}
              </Text>
            </View>
            <View style={styles.receiptDashedLine} />
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
            <TouchableOpacity
              style={[styles.archiveBtn, { backgroundColor: theme.primary }]}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Text style={styles.archiveBtnText}>FİŞİ KAPAT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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
          <View
            style={[
              styles.statsRow,
              {
                backgroundColor: theme.cardBg,
                shadowColor: isDark ? "#000" : "#cbd5e1",
                borderWidth: isDark ? 1 : 0,
                borderColor: theme.border,
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

          <Text style={[styles.sectionTitle, { color: theme.textSub }]}>
            FİNANSAL ARŞİVİM
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 30 }}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {archives.length > 0 ? (
              archives.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.archiveCard,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={["#4f46e5", "#3730a3"]}
                    style={styles.archiveHeader}
                  >
                    <Text style={styles.archiveMonth}>{item.month_name}</Text>
                  </LinearGradient>
                  <View style={styles.archiveBody}>
                    <View style={styles.archiveRow}>
                      <Text
                        style={{
                          color: theme.textSub,
                          fontSize: 12,
                          fontFamily: "Inter_500Medium",
                        }}
                      >
                        Sağlık Skoru
                      </Text>
                      <Text
                        style={{
                          color: item.health_score > 70 ? "#10b981" : "#ef4444",
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        %{item.health_score}
                      </Text>
                    </View>
                    <View style={styles.archiveRow}>
                      <Text
                        style={{
                          color: theme.textSub,
                          fontSize: 12,
                          fontFamily: "Inter_500Medium",
                        }}
                      >
                        Gider
                      </Text>
                      <Text
                        style={{
                          color: theme.textMain,
                          fontFamily: "Inter_700Bold",
                        }}
                      >
                        ₺{Number(item.total_expense).toLocaleString("tr-TR")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.viewOldBtn,
                        { backgroundColor: theme.iconBg },
                      ]}
                      onPress={() => openReceipt(item)}
                    >
                      <Text
                        style={[styles.viewOldText, { color: theme.textMain }]}
                      >
                        Detaylı Fiş
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.emptyArchiveCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                ]}
              >
                <Feather
                  name="file-text"
                  size={24}
                  color={theme.textSub}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={{
                    color: theme.textSub,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  Henüz arşivlenmiş fişin yok.
                </Text>
              </View>
            )}
          </ScrollView>

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
              onPress={() => {
                setEditName(userName);
                setPersonalInfoVisible(true);
              }}
            />
            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="shield"
              title="Güvenlik ve Şifre"
              onPress={() => setSecurityVisible(true)}
            />
            <View
              style={[styles.menuDivider, { backgroundColor: theme.border }]}
            />
            <PremiumMenuItem
              theme={theme}
              icon="bell"
              title="Bildirim Tercihleri"
              onPress={() => setNotificationVisible(true)}
            />
          </View>

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
            <PremiumMenuItem
              theme={theme}
              icon={isDark ? "moon" : "sun"}
              title="Karanlık Mod"
              onPress={toggleTheme}
              rightElement={
                <Switch
                  trackColor={{ false: "#767577", true: theme.primary }}
                  thumbColor={"#ffffff"}
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
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <Modal
        visible={isPersonalInfoVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.bg }}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Kişisel Bilgiler
            </Text>
            <TouchableOpacity onPress={() => setPersonalInfoVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text
              style={{
                color: theme.textSub,
                marginBottom: 8,
                fontWeight: "600",
                marginLeft: 4,
              }}
            >
              Görünen Adın
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.textMain,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Adını gir..."
              placeholderTextColor={theme.textSub}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.textMain }]}
              onPress={handleUpdateName}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color={theme.bg} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.bg }]}>
                  Bilgileri Kaydet
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isSecurityVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.bg }}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Güvenlik ve Şifre
            </Text>
            <TouchableOpacity onPress={() => setSecurityVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text
              style={{
                color: theme.textSub,
                marginBottom: 8,
                fontWeight: "600",
                marginLeft: 4,
              }}
            >
              Yeni Şifre
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.textMain,
                },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="En az 6 karakter..."
              placeholderTextColor={theme.textSub}
              secureTextEntry
            />
            <Text
              style={{
                color: theme.textSub,
                marginBottom: 8,
                fontWeight: "600",
                marginLeft: 4,
              }}
            >
              Şifreyi Doğrula
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.textMain,
                },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Şifreyi tekrar gir..."
              placeholderTextColor={theme.textSub}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.textMain }]}
              onPress={handleUpdatePassword}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color={theme.bg} />
              ) : (
                <Text style={[styles.saveBtnText, { color: theme.bg }]}>
                  Şifreyi Güncelle
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isNotificationVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>
              Bildirim Tercihleri
            </Text>
            <TouchableOpacity onPress={() => setNotificationVisible(false)}>
              <Feather name="x" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <View
              style={[
                styles.notifRow,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.textMain,
                  }}
                >
                  Aylık Özet Raporları
                </Text>
                <Text
                  style={{ fontSize: 12, color: theme.textSub, marginTop: 4 }}
                >
                  Ay sonunda finansal sağlığını bildirir.
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: theme.primary }}
                value={notifSettings.monthly}
                onValueChange={(val) =>
                  setNotifSettings({ ...notifSettings, monthly: val })
                }
              />
            </View>
            <View
              style={[
                styles.notifRow,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.textMain,
                  }}
                >
                  Zarf (Bütçe) Aşımı
                </Text>
                <Text
                  style={{ fontSize: 12, color: theme.textSub, marginTop: 4 }}
                >
                  Bir zarf limitini geçtiğinde uyarır.
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: "#ef4444" }}
                value={notifSettings.budget}
                onValueChange={(val) =>
                  setNotifSettings({ ...notifSettings, budget: val })
                }
              />
            </View>
            <View
              style={[
                styles.notifRow,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: theme.textMain,
                  }}
                >
                  Uygulama Yenilikleri
                </Text>
                <Text
                  style={{ fontSize: 12, color: theme.textSub, marginTop: 4 }}
                >
                  Yeni özellikler geldiğinde haber verir.
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: theme.primary }}
                value={notifSettings.campaigns}
                onValueChange={(val) =>
                  setNotifSettings({ ...notifSettings, campaigns: val })
                }
              />
            </View>
          </View>
        </View>
      </Modal>

      <HistoricalReceiptModal />
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
  archiveCard: {
    width: 160,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  archiveHeader: { padding: 12, alignItems: "center" },
  archiveMonth: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  archiveBody: { padding: 12 },
  archiveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  viewOldBtn: {
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 5,
  },
  viewOldText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  emptyArchiveCard: {
    width: width - 40,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    borderStyle: "dashed",
  },

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
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
  },
  archiveBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },

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
    marginBottom: 20,
    fontSize: 16,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { fontWeight: "bold", fontSize: 16 },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
  },
});
