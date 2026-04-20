import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// KENDİ BİLGİLERİNİ BURAYA YAPIŞTIR
const supabaseUrl = "https://zxczbwwujicossaujlmw.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4Y3pid3d1amljb3NzYXVqbG13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzEzNzksImV4cCI6MjA4NzcwNzM3OX0.IFZynSplFxux8yT32U6PgIHaBjHEo71WMJ76Bde2yW0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // İŞTE KRİTİK NOKTA BURASI!
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
