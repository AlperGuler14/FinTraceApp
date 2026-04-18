import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../constants/Supabase";

const { width, height } = Dimensions.get("window");

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  useEffect(() => {
    // 1. ADIM: Oturum durumunu dinle (Gerçek zamanlı çözüm burası)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/(tabs)");
      } else if (event === "SIGNED_OUT") {
        setCheckingSession(false); // Çıkış yapıldığında yükleme ekranını kapat ve formu göster
      }
    });

    const checkAppStart = async () => {
      const hasOnboarded = await AsyncStorage.getItem("@onboarding_completed");
      if (hasOnboarded !== "true") {
        router.replace("/onboarding");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/(tabs)");
      } else {
        setCheckingSession(false);
      }
    };

    checkAppStart();

    // Temizlik: Bileşen kapanınca dinleyiciyi durdur
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Eksik Bilgi", "Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Yönlendirme onAuthStateChange tarafından otomatik yapılacak
      } else {
        if (!name) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert("Eksik Bilgi", "Lütfen adınızı girin.");
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });

        if (error) throw error;

        if (!data.session) {
          Alert.alert("Başarılı 🎉", "Lütfen e-postanı doğrulayıp giriş yap.");
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erişim Hatası", error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = (mode: boolean) => {
    if (isLogin !== mode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsLogin(mode);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <LinearGradient
          colors={["#1e1b4b", "#4f46e5"]}
          style={styles.headerArea}
        >
          <View style={styles.iconBox}>
            <LinearGradient
              colors={["#8b5cf6", "#4f46e5"]}
              style={styles.iconGradient}
            >
              <Feather name="pie-chart" size={42} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>FinTrace</Text>
          <Text style={styles.subtitle}>Geleceğini Bugün Tasarla</Text>
        </LinearGradient>

        <View style={styles.formArea}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, isLogin && styles.activeTabBtn]}
              onPress={() => toggleAuthMode(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, !isLogin && styles.activeTabBtn]}
              onPress={() => toggleAuthMode(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputsContainer}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adınız Soyadınız</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === "name" && styles.inputFocused,
                  ]}
                >
                  <Feather
                    name="user"
                    size={20}
                    color={focusedInput === "name" ? "#4f46e5" : "#94a3b8"}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Alper Yılmaz"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta Adresi</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" && styles.inputFocused,
                ]}
              >
                <Feather
                  name="mail"
                  size={20}
                  color={focusedInput === "email" ? "#4f46e5" : "#94a3b8"}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ornek@mail.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "password" && styles.inputFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={focusedInput === "password" ? "#4f46e5" : "#94a3b8"}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtnContainer}
              onPress={handleAuth}
              disabled={loading}
            >
              <LinearGradient
                colors={["#4f46e5", "#3730a3"]}
                style={styles.actionBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {isLogin ? "Sisteme Giriş Yap" : "Hesabımı Oluştur"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  headerArea: {
    height: height * 0.4,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  iconBox: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 1.5,
  },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  formArea: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -40,
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    padding: 6,
    marginBottom: 25,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
  },
  activeTabBtn: { backgroundColor: "#ffffff", elevation: 2 },
  tabText: { fontSize: 15, fontWeight: "700", color: "#94a3b8" },
  activeTabText: { color: "#1e293b" },
  inputsContainer: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  inputFocused: { borderColor: "#4f46e5", backgroundColor: "#fff" },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1e293b",
    marginLeft: 12,
  },
  actionBtnContainer: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 10,
    elevation: 5,
  },
  actionBtnGradient: { paddingVertical: 18, alignItems: "center" },
  actionBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
});
