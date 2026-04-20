import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { isDark, colors: theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          height: 65, // 7 sekmeyi sığdırmak için biraz daha yüksek
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: theme.textSub,
        tabBarLabelStyle: {
          fontSize: 10, // Yazıları ekrana sığması için biraz küçülttük
          fontWeight: "600",
        },
        tabBarItemStyle: {
          padding: 2, // Sekmeler arası boşluğu daralttık
        },
      }}
    >
      {/* 1. ASİSTAN (Ana Sayfa) */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Asistan",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />

      {/* 2. TRANSACTIONS (Geçmiş İşlemler) */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color }) => (
            <Feather name="list" size={22} color={color} />
          ),
        }}
      />

      {/* 3. ANALİZ */}
      <Tabs.Screen
        name="reports"
        options={{
          title: "Analiz",
          tabBarIcon: ({ color }) => (
            <Feather name="pie-chart" size={22} color={color} />
          ),
        }}
      />

      {/* 4. RADAR (Abonelikler) */}
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Radar",
          tabBarIcon: ({ color }) => (
            <Feather name="radio" size={22} color={color} />
          ),
        }}
      />

      {/* 5. ZARFLAR */}
      <Tabs.Screen
        name="wallets"
        options={{
          title: "Zarflar",
          tabBarIcon: ({ color }) => (
            <Feather name="pocket" size={22} color={color} />
          ),
        }}
      />

      {/* 6. KUMBARALAR (Hedefler) */}
      <Tabs.Screen
        name="moneybox"
        options={{
          title: "Hedefler",
          tabBarIcon: ({ color }) => (
            <Feather name="target" size={22} color={color} />
          ),
        }}
      />

      {/* 7. PROFİL */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
