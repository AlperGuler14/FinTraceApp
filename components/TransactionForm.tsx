import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function TransactionForm({ onAddTransaction }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Keyboard.dismiss();

    const isSuccess = await onAddTransaction({
      id: Date.now(),
      type,
      amount: Number(amount),
      category: type === "expense" ? "Genel" : "Maaş",
      desc,
      date: new Date().toISOString().split("T")[0],
    });

    if (isSuccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAmount("");
      setDesc("");
    }
  };

  return (
    <View style={styles.formCardContainer}>
      <Text style={styles.formSectionTitle}>Hızlı İşlem</Text>

      <View style={styles.premiumFormCard}>
        {/* Gider / Gelir Seçici (Pill Tasarımı) */}
        <View style={styles.pillContainer}>
          <TouchableOpacity
            style={[
              styles.pillBtn,
              type === "expense" && styles.pillActiveExpense,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setType("expense");
            }}
          >
            <Text
              style={[
                styles.pillText,
                type === "expense" && styles.pillTextActiveWhite,
              ]}
            >
              Gider
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pillBtn,
              type === "income" && styles.pillActiveIncome,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setType("income");
            }}
          >
            <Text
              style={[
                styles.pillText,
                type === "income" && styles.pillTextActiveWhite,
              ]}
            >
              Gelir
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lüks Input Alanları */}
        <View style={styles.inputWrapper}>
          <View style={styles.iconCircle}>
            <Feather name="dollar-sign" size={20} color="#64748b" />
          </View>
          <TextInput
            style={styles.premiumInput}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Text style={styles.currencyBadge}>TRY</Text>
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.iconCircle}>
            <Feather name="edit-3" size={20} color="#64748b" />
          </View>
          <TextInput
            style={styles.premiumInput}
            placeholder="Açıklama (Örn: Kahve)"
            placeholderTextColor="#94a3b8"
            value={desc}
            onChangeText={setDesc}
          />
        </View>

        {/* Kaydet Butonu (Linear Gradient) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          style={styles.submitWrapper}
        >
          <LinearGradient
            colors={
              type === "expense"
                ? ["#ef4444", "#dc2626"]
                : ["#10b981", "#059669"]
            }
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.submitText}>
              {type === "expense" ? "Gideri Kaydet" : "Geliri Kaydet"}
            </Text>
            <Feather name="check" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formCardContainer: { marginBottom: 40 },
  formSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  premiumFormCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  pillActiveExpense: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  pillActiveIncome: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  pillText: { fontFamily: "Inter_600SemiBold", color: "#64748b", fontSize: 14 },
  pillTextActiveWhite: { color: "#ffffff" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 1,
  },
  premiumInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#1e293b",
  },
  currencyBadge: {
    fontFamily: "Inter_700Bold",
    color: "#4f46e5",
    fontSize: 14,
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  submitWrapper: {
    marginTop: 10,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 18,
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginRight: 8,
  },
});
