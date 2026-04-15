import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext"; // TEMA KANCASINI IMPORT ETTİK

export default function TabLayout() {
  const { isDark, colors } = useTheme(); // Temayı çekiyoruz

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive, // Dinamik Renk
        tabBarInactiveTintColor: colors.tabBarInactive, // Dinamik Renk
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor:
              Platform.OS === "android" ? colors.tabBarBg : "transparent",
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"} // iOS Blur'u da temaya uyuyor!
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Asistan",
          tabBarIcon: ({ color }) => (
            <Feather name="zap" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "İşlemler",
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Analiz",
          tabBarIcon: ({ color }) => (
            <Feather name="pie-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Radar",
          tabBarIcon: ({ color }) => (
            <Feather name="rss" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Zarflar",
          tabBarIcon: ({ color }) => (
            <Feather name="briefcase" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === "ios" ? 88 : 65,
    paddingBottom: Platform.OS === "ios" ? 30 : 10,
    paddingTop: Platform.OS === "android" ? 5 : 0,
  },
  tabBarLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
});
