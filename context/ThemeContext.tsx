import React, { createContext, useContext, useState } from "react";

// Context'i oluşturuyoruz
const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDark, setIsDark] = useState(true); // İstersen false (gündüz) ile başlatabilirsin

  const toggleTheme = () => setIsDark(!isDark);

  // Uygulamanın her yerinde kullanılacak renk paleti
  const theme = {
    isDark,
    toggleTheme,
    colors: {
      bg: isDark ? "#0f172a" : "#f8fafc",
      cardBg: isDark ? "#1e293b" : "#fff",
      textMain: isDark ? "#f8fafc" : "#1e293b",
      textSub: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      iconBg: isDark ? "#334155" : "#f1f5f9",
      primary: "#6366f1",

      // Alt Navigasyon (Tab Bar) Renkleri
      tabBarBg: isDark ? "#0f172a" : "#ffffff",
      tabBarBorder: isDark ? "#1e293b" : "#e2e8f0",
      tabBarActive: isDark ? "#6366f1" : "#4f46e5",
      tabBarInactive: isDark ? "#64748b" : "#94a3b8",
    },
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};

// İstediğimiz sayfadan çağırmak için özel Hook
export const useTheme = () => useContext(ThemeContext);
