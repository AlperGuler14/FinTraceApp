import { motion } from "framer-motion";
import { useState } from "react";

const ReceiptModal = ({
  ay = "MART",
  oncekiBakiye = 100000,
  gelir = 45000,
  gider = 25000,
  enCokHarcanan = "Dışarıda Yemek",
  enflasyonKaybi = 1200,
  netSonuc = 120000,
  onClose,
}) => {
  const [isFinished, setIsFinished] = useState(false);

  // Kapsayıcı fiş animasyonu (Yukarıdan aşağı süzülme)
  const receiptVariants = {
    hidden: { y: "-100%", opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 70,
        damping: 15,
        when: "beforeChildren",
        staggerChildren: 0.6, // Satırların yarım saniye arayla gelmesi
      },
    },
  };

  // İçerik satırları animasyonu (Belirme)
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <motion.div
        className="w-80 bg-[#fdfbf7] shadow-2xl relative"
        style={{
          // Yazar kasa fişi tırtıklı alt kenar efekti
          clipPath:
            "polygon(0% 0%, 100% 0%, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0% 100%)",
        }}
        variants={receiptVariants}
        initial="hidden"
        animate="visible"
        onAnimationComplete={() => setIsFinished(true)}
      >
        <div className="p-8 font-mono text-gray-800 text-sm">
          {/* Fiş Başlığı */}
          <motion.div variants={itemVariants} className="text-center mb-6">
            <h2 className="text-xl font-bold tracking-widest">FINTRACE</h2>
            <p className="text-xs uppercase mt-1">Alper - {ay} Özeti</p>
            <div className="border-b-2 border-dashed border-gray-400 mt-4"></div>
          </motion.div>

          {/* Fiş Detayları */}
          <div className="space-y-3 mb-6">
            <motion.div
              variants={itemVariants}
              className="flex justify-between"
            >
              <span>Önceki Bakiye</span>
              <span>{oncekiBakiye.toLocaleString("tr-TR")} ₺</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex justify-between text-green-700"
            >
              <span>(+) Gelirler</span>
              <span>{gelir.toLocaleString("tr-TR")} ₺</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex justify-between text-red-700"
            >
              <span>(-) Giderler</span>
              <span>{gider.toLocaleString("tr-TR")} ₺</span>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col mt-2 pt-2 border-t border-dotted border-gray-300"
            >
              <span className="text-xs text-gray-500">En Çok Harcanan</span>
              <span className="font-semibold uppercase truncate">
                {enCokHarcanan}
              </span>
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="border-b-2 border-dashed border-gray-400 mb-4"
          ></motion.div>

          {/* Gerçeklik Tokadı */}
          <motion.div
            variants={itemVariants}
            className="flex justify-between items-center mb-4 text-orange-600 bg-orange-50 p-2 rounded"
          >
            <span className="font-bold">Enflasyon Kaybı</span>
            <span className="font-bold">
              -{enflasyonKaybi.toLocaleString("tr-TR")} ₺
            </span>
          </motion.div>

          {/* Net Sonuç */}
          <motion.div
            variants={itemVariants}
            className="flex justify-between items-end text-lg font-bold"
          >
            <span>NET DURUM</span>
            <span
              className={
                netSonuc >= oncekiBakiye ? "text-green-600" : "text-red-600"
              }
            >
              {netSonuc.toLocaleString("tr-TR")} ₺
            </span>
          </motion.div>

          {/* Aksiyon Butonu (Animasyon bitince görünür) */}
          {isFinished && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 text-center pb-2"
            >
              <button
                onClick={onClose}
                className="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                Zaman Makinesine Geç
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ReceiptModal;
