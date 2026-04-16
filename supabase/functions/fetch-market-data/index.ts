import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Çevresel değişkenlerden Supabase bağlantı bilgilerini alıyoruz
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    // 1. Dış API'lerden verileri çekiyoruz (Dolar kuru örneği)
    const usdResponse = await fetch("https://open.er-api.com/v6/latest/USD");
    const usdData = await usdResponse.json();
    const usdToTry = usdData.rates.TRY;

    // Şimdilik enflasyon, altın ve Big Mac verilerini simüle ediyoruz
    const mockInflation = 68.5;
    const mockGold = 2450.0;
    const mockBigMac = 180.0;
    const mockSneaker = 4500.0;

    // 2. Supabase İstemcisini Başlat
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Veritabanına Yazma İşlemi
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.from("market_verileri").upsert(
      [
        {
          donem_tarihi: today,
          enflasyon_orani: mockInflation,
          dolar_kuru: usdToTry,
          altin_gram_fiyati: mockGold,
          big_mac_fiyati: mockBigMac,
          sneaker_endeks_fiyati: mockSneaker,
        },
      ],
      { onConflict: "donem_tarihi" },
    );

    if (error) throw error;

    // 4. Başarılı Yanıt Dön
    return new Response(
      JSON.stringify({
        message: "Piyasa verileri başarıyla güncellendi!",
        usdToTry,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
