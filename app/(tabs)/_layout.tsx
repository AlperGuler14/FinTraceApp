import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        // Klavye açıldığında tab bar'ın yukarı kaymasını engeller (Android için iyi bir UX)
        tabBarHideOnKeyboard: true,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {/* 1. ASİSTAN (Dashboard) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Asistan",
          tabBarIcon: ({ color }) => (
            <Feather name="zap" size={24} color={color} />
          ),
        }}
      />

      {/* 2. İŞLEMLER */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "İşlemler",
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={24} color={color} />
          ),
        }}
      />

      {/* 3. ANALİZ */}
      <Tabs.Screen
        name="reports"
        options={{
          title: "Analiz",
          tabBarIcon: ({ color }) => (
            <Feather name="pie-chart" size={24} color={color} />
          ),
        }}
      />

      {/* 4. RADAR */}
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Radar",
          tabBarIcon: ({ color }) => (
            <Feather name="rss" size={24} color={color} />
          ),
        }}
      />

      {/* 5. ZARFLAR (Küçük harfle yazıldı) */}
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Zarflar",
          tabBarIcon: ({ color }) => (
            <Feather name="briefcase" size={24} color={color} />
          ),
        }}
      />

      {/* 6. PROFİL */}
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
    backgroundColor: Platform.OS === "ios" ? "transparent" : "#ffffff",
    paddingBottom: Platform.OS === "ios" ? 30 : 10,
    paddingTop: Platform.OS === "android" ? 5 : 0,
  },
  tabBarLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10, // 6 ikon sığdığı için metin boyutu bir tık küçültüldü
  },
});
