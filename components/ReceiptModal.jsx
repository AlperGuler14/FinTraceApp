import { motion } from "framer-motion"; // Not: Eğer bu bir Web projesiyse kalsın, Mobile ise silinecek
import { useState } from "react";
import { supabase } from "../../constants/Supabase"; // Supabase'i import et

const ReceiptModal = ({
  ay = "MART",
  gelir = 45000,
  gider = 25000,
  healthScore = 85, // Yeni ekledik
  savingsRate = 20, // Yeni ekledik
  onClose,
}) => {
  const [isFinished, setIsFinished] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false); // Kayıt sırasında butonu kilitlemek için

  // --- 2. ADIM: ARŞİVLEME FONKSİYONU ---
  const handleArchiveAndClose = async () => {
    setIsArchiving(true);
    const currentYear = new Date().getFullYear();
    const archiveName = `${ay} ${currentYear}`; // Örn: MART 2024

    try {
      const { error } = await supabase
        .from('reports_archive')
        .insert([{
          month_name: archiveName,
          total_income: gelir,
          total_expense: gider,
          health_score: healthScore,
          savings_rate: savingsRate
        }]);

      if (error) throw error;

      // Başarılıysa kullanıcıya haber ver ve modalı kapat
      console.log("Rapor Arşivlendi!");
      onClose(); 

    } catch (error: any) {
      console.error("Arşivleme hatası:", error.message);
      alert("Rapor arşivlenirken bir hata oluştu.");
    } finally {
      setIsArchiving(false);
    }
  };

  // ... (Senin animasyon kodların (receiptVariants vb.) aynen kalıyor) ...

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <motion.div
        // ... (Senin stil kodların) ...
      >
        <div className="p-8 font-mono text-gray-800 text-sm">
          {/* Fiş İçeriği (Önceki Bakiye, Gelir, Gider kısımları aynen kalıyor) */}
          
          {/* ... */}

          {/* AKSİYON BUTONU: "Zaman Makinesine Geç" yerine "Arşivle ve Kapat" yapıyoruz */}
          {isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center pb-2"
            >
              <button
                onClick={handleArchiveAndClose} // YENİ FONKSİYONU BAĞLADIK
                disabled={isArchiving}
                className="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                {isArchiving ? "KAYDEDİLİYOR..." : "FİŞİ ARŞİVLE VE KAPAT"}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptModal;