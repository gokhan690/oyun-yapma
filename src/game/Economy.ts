import { tRaw } from '../i18n'

export type ProducerCategory = 'sport' | 'politics' | 'dark' | 'luxury' | 'finance' | 'science'

export interface ProducerDef {
  id: string
  name: string
  emoji: string
  description: string
  tier: number
  unlockAt: number
  baseCost: number
  /** Birim başına baz gelir (/gün) — ekonomi ölçeği uygulanmış */
  baseIncome: number
  costMultiplier: number
  category?: ProducerCategory
  /** Yüksek gelir, baskın riski */
  illegal?: boolean
  riskChance?: number
  riskFinePct?: number
}

export interface UpgradeDef {
  id: string
  name: string
  description: string
  cost: number
  effect: 'click_mult' | 'global_mult' | 'producer_mult'
  value: number
  producerId?: string
  requiresTotalEarned?: number
  requiresProducer?: string
  requiresUpgrade?: string
}

export const PRODUCERS: ProducerDef[] = [
  // BitLife maaş eğrisi: baseIncome ≈ günlük $ (12 sn = 1 oyun günü)
  { id: 'stajyer', name: 'Limonata Tezgahı', emoji: '🍋', description: 'Küçük ama cesur bir girişim.', tier: 1, unlockAt: 0, baseCost: 3, baseIncome: 8, costMultiplier: 1.18 },
  { id: 'robot', name: 'E-ticaret Sitesi', emoji: '🛒', description: 'Online satışlar başladı.', tier: 2, unlockAt: 5_000, baseCost: 580, baseIncome: 10, costMultiplier: 1.22 },
  { id: 'kafe', name: 'Kahve Zinciri', emoji: '☕', description: 'Her köşede bir şube.', tier: 2, unlockAt: 25_000, baseCost: 580, baseIncome: 10, costMultiplier: 1.22 },
  { id: 'ofis', name: 'Restoran Zinciri', emoji: '🍽️', description: 'Lezzetli büyüme.', tier: 3, unlockAt: 110_000, baseCost: 1_105, baseIncome: 17, costMultiplier: 1.22 },
  { id: 'fabrika', name: 'Lojistik Merkezi', emoji: '🚚', description: 'Tedarik zinciri güçleniyor.', tier: 4, unlockAt: 480_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'mobil_app', name: 'Mobil Uygulama', emoji: '📱', description: 'Abonelik geliri akıyor.', tier: 4, unlockAt: 480_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'holding', name: 'Yazılım Şirketi', emoji: '💻', description: 'Teknoloji imparatorluğu.', tier: 5, unlockAt: 8_000_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.22 },
  { id: 'uzay', name: 'Gayrimenkul Portföyü', emoji: '🏙️', description: 'Arsa ve bina yatırımları.', tier: 6, unlockAt: 8_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.22 },
  { id: 'enerji', name: 'Güneş Enerjisi Santrali', emoji: '☀️', description: 'Temiz enerji, temiz kâr.', tier: 6, unlockAt: 8_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.22 },
  { id: 'ai', name: 'Holding Birleşmesi', emoji: '🤝', description: 'Rakiplerle stratejik birleşme.', tier: 7, unlockAt: 40_000_000, baseCost: 14_694, baseIncome: 158, costMultiplier: 1.22 },
  { id: 'tuzaq', name: 'Borsa IPO', emoji: '📈', description: 'Halka arz — zirve noktası.', tier: 8, unlockAt: 180_000_000, baseCost: 27_600, baseIncome: 276, costMultiplier: 1.22 },
  { id: 'uydu', name: 'Uydu İnternet Ağı', emoji: '🛰️', description: 'Küresel bağlantı imparatorluğu.', tier: 9, unlockAt: 800_000_000, baseCost: 51_788, baseIncome: 484, costMultiplier: 1.22 },
  { id: 'merkezbankasi', name: 'Küresel Merkez Bankası', emoji: '🏦', description: 'Para basan makine.', tier: 10, unlockAt: 3_600_000_000, baseCost: 96_558, baseIncome: 847, costMultiplier: 1.22 },
  { id: 'galaksiyum', name: 'Galaktik Tekno-İmparatorluk', emoji: '🌌', description: 'Evreni avucunun içine aldın.', tier: 11, unlockAt: 16_000_000_000, baseCost: 179_322, baseIncome: 1_482, costMultiplier: 1.22 },
  { id: 'kripto', name: 'Kripto Borsası', emoji: '₿', description: 'Volatil ama kârlı dijital pazar.', tier: 5, unlockAt: 8_000_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.19 },
  { id: 'nano', name: 'Nano Teknoloji Lab', emoji: '🔬', description: 'Atom ölçeğinde devrim.', tier: 10, unlockAt: 3_600_000_000, baseCost: 96_558, baseIncome: 847, costMultiplier: 1.22 },
  { id: 'bahis', name: 'Gizli Bahis Ağı', emoji: '🎲', description: 'Yüksek gelir, yüksek risk.', tier: 3, unlockAt: 110_000, baseCost: 1_365, baseIncome: 21, costMultiplier: 1.25, illegal: true, riskChance: 0.06, riskFinePct: 0.18 },
  { id: 'piramit', name: 'Piramit Şema', emoji: '🔺', description: 'Kısa vadede patlar, uzun vadede yakalanırsın.', tier: 5, unlockAt: 8_000_000, baseCost: 4_977, baseIncome: 63, costMultiplier: 1.25, illegal: true, riskChance: 0.05, riskFinePct: 0.22 },
  { id: 'offshore', name: 'Offshore Hesap', emoji: '🏝️', description: 'Vergiden kaç, radar altında kal.', tier: 7, unlockAt: 40_000_000, baseCost: 17_949, baseIncome: 193, costMultiplier: 1.25, illegal: true, riskChance: 0.04, riskFinePct: 0.15 },
  { id: 'data_center', name: 'Veri Merkezi', emoji: '🖥️', description: 'Bulut altyapısı kiraları.', tier: 4, unlockAt: 480_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'drone', name: 'Drone Teslimat Filosu', emoji: '🚁', description: 'Havadan hızlı lojistik.', tier: 6, unlockAt: 8_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.22 },
  { id: 'otel', name: 'Otel Zinciri', emoji: '🏨', description: 'Turizm ve konaklama geliri.', tier: 3, unlockAt: 110_000, baseCost: 1_105, baseIncome: 17, costMultiplier: 1.22 },
  { id: 'medya', name: 'Medya Holding', emoji: '📺', description: 'Haber, reklam ve içerik imparatorluğu.', tier: 4, unlockAt: 480_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'streaming', name: 'Streaming Platformu', emoji: '🎬', description: 'Abonelik ve reklam geliri.', tier: 4, unlockAt: 480_000, baseCost: 2_088, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'ilac', name: 'İlaç Laboratuvarı', emoji: '💊', description: 'Ar-Ge ve patent gelirleri.', tier: 5, unlockAt: 8_000_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.22 },
  { id: 'sigorta', name: 'Sigorta Şirketi', emoji: '🛡️', description: 'Prim ve yatırım getirisi.', tier: 5, unlockAt: 8_000_000, baseCost: 4_108, baseIncome: 52, costMultiplier: 1.22 },
  { id: 'ev_araba', name: 'Elektrikli Araç Fabrikası', emoji: '⚡', description: 'Geleceğin otomobil devi.', tier: 6, unlockAt: 8_000_000, baseCost: 7_740, baseIncome: 90, costMultiplier: 1.22 },
  { id: 'futbol_amateur', name: 'Amatör Futbol Kulübü', emoji: '⚽', description: '3. Lig\'de küçük ama tutkulu bir kulüp.', tier: 3, unlockAt: 110_000, baseCost: 1_170, baseIncome: 18, costMultiplier: 1.22, category: 'sport' },
  { id: 'futbol_superlig', name: 'Süper Lig Kulübü', emoji: '🏟️', description: 'Stadyum, sponsorluk ve transfer geliri.', tier: 6, unlockAt: 8_000_000, baseCost: 8_342, baseIncome: 97, costMultiplier: 1.19, category: 'sport' },
  { id: 'futbol_avrupa', name: 'Avrupa Kupası Kulübü', emoji: '🏆', description: 'Kıtasal şampiyonluk yarışı.', tier: 8, unlockAt: 180_000_000, baseCost: 29_800, baseIncome: 298, costMultiplier: 1.20, category: 'sport' },
  { id: 'siyaset_belediye', name: 'Belediye Meclisi', emoji: '🏛️', description: 'Yerel siyasette ilk adım.', tier: 4, unlockAt: 480_000, baseCost: 2_160, baseIncome: 30, costMultiplier: 1.22, category: 'politics' },
  { id: 'siyaset_milletvekili', name: 'Milletvekili Ofisi', emoji: '🗳️', description: 'Mecliste lobi gücü.', tier: 6, unlockAt: 8_000_000, baseCost: 8_170, baseIncome: 95, costMultiplier: 1.19, category: 'politics' },
  { id: 'siyaset_bakan', name: 'Bakanlık Bütçesi', emoji: '👔', description: 'Bakanlık kaynakları ve düzenleme.', tier: 8, unlockAt: 180_000_000, baseCost: 29_000, baseIncome: 290, costMultiplier: 1.20, category: 'politics' },
  { id: 'siyaset_cumhurbaskanligi', name: 'Cumhurbaşkanlığı Kampanyası', emoji: '🎖️', description: 'Ülkenin zirvesine oyna.', tier: 10, unlockAt: 3_600_000_000, baseCost: 101_346, baseIncome: 889, costMultiplier: 1.21, category: 'politics' },
  { id: 'kacak_imalat', name: 'Kaçak İmalat Hattı', emoji: '🔧', description: 'Vergisiz üretim, yüksek risk.', tier: 4, unlockAt: 480_000, baseCost: 2_952, baseIncome: 41, costMultiplier: 1.25, illegal: true, category: 'dark', riskChance: 0.07, riskFinePct: 0.16 },
  { id: 'siyah_fabrika', name: 'Siyah Fabrika', emoji: '🏭', description: 'Radar altında yasadışı üretim.', tier: 5, unlockAt: 8_000_000, baseCost: 5_846, baseIncome: 74, costMultiplier: 1.25, illegal: true, category: 'dark', riskChance: 0.06, riskFinePct: 0.20 },
  { id: 'silah_ticareti', name: 'Silah Kaçakçılığı', emoji: '🔫', description: 'Tehlikeli ama çok kârlı ağ.', tier: 7, unlockAt: 40_000_000, baseCost: 21_204, baseIncome: 228, costMultiplier: 1.21, illegal: true, category: 'dark', riskChance: 0.05, riskFinePct: 0.25 },

  // —— Erken / orta oyun: daha fazla kariyer yolu ——
  { id: 'berber', name: 'Berber & Kuaför', emoji: '💈', description: 'Mahallede güvenilir gelir.', tier: 1, unlockAt: 0, baseCost: 220, baseIncome: 6, costMultiplier: 1.16 },
  { id: 'firin', name: 'Fırın & Pastane', emoji: '🥐', description: 'Taze ekmek, sıcak kâr.', tier: 1, unlockAt: 0, baseCost: 280, baseIncome: 7.5, costMultiplier: 1.16 },
  { id: 'cicekci', name: 'Çiçekçi', emoji: '💐', description: 'Çiçek satar, mutluluk taşır.', tier: 1, unlockAt: 0, baseCost: 340, baseIncome: 8.5, costMultiplier: 1.16 },
  { id: 'giyim', name: 'Giyim Mağazası', emoji: '👔', description: 'Moda perakende zinciri.', tier: 2, unlockAt: 0, baseCost: 460, baseIncome: 10, costMultiplier: 1.16 },
  { id: 'gym', name: 'Spor Salonu Zinciri', emoji: '🏋️', description: 'Abonelik bazlı fitness.', tier: 2, unlockAt: 8_000, baseCost: 620, baseIncome: 11, costMultiplier: 1.17 },
  { id: 'kargo', name: 'Kargo & Kurye', emoji: '📦', description: 'Şehir içi hızlı teslimat.', tier: 3, unlockAt: 500, baseCost: 1_020, baseIncome: 16, costMultiplier: 1.22 },
  { id: 'reklam_ajansi', name: 'Reklam Ajansı', emoji: '📣', description: 'Markalar için kampanya yönetimi.', tier: 3, unlockAt: 22_000, baseCost: 1_150, baseIncome: 18, costMultiplier: 1.22 },
  { id: 'insaat', name: 'İnşaat Firması', emoji: '🏗️', description: 'Konut ve ticari projeler.', tier: 4, unlockAt: 360_000, baseCost: 1_950, baseIncome: 38, costMultiplier: 1.22 },
  { id: 'hukuk', name: 'Hukuk Bürosu', emoji: '⚖️', description: 'Kurumsal dava ve danışmanlık.', tier: 4, unlockAt: 400_000, baseCost: 2_100, baseIncome: 40, costMultiplier: 1.22 },
  { id: 'cikolata', name: 'Çikolata Fabrikası', emoji: '🍫', description: 'Tatlı bir imparatorluk.', tier: 3, unlockAt: 35_000, baseCost: 1_280, baseIncome: 19, costMultiplier: 1.22 },
  { id: 'pet_shop', name: 'Pet Shop Zinciri', emoji: '🐾', description: 'Evcil hayvan pazarı.', tier: 2, unlockAt: 10_000, baseCost: 680, baseIncome: 12, costMultiplier: 1.17 },
  { id: 'oyun_studio', name: 'Oyun Stüdyosu', emoji: '🎮', description: 'Indie oyunlar, büyük hitler.', tier: 4, unlockAt: 150_000, baseCost: 2_400, baseIncome: 32, costMultiplier: 1.22 },
  { id: 'temizlik', name: 'Temizlik & Facility', emoji: '🧹', description: 'AVM ve ofis sözleşmeleri.', tier: 3, unlockAt: 40_000, baseCost: 1_320, baseIncome: 20, costMultiplier: 1.22 },
  { id: 'emlak_ofis', name: 'Emlak Ofisi', emoji: '🏠', description: 'Komisyon ve kiralama geliri.', tier: 4, unlockAt: 180_000, baseCost: 2_200, baseIncome: 40, costMultiplier: 1.22 },
  { id: 'hastane', name: 'Özel Hastane', emoji: '🏥', description: 'Sağlık turizmi ve sigorta.', tier: 5, unlockAt: 450_000, baseCost: 4_800, baseIncome: 55, costMultiplier: 1.19 },
  { id: 'universite', name: 'Özel Üniversite', emoji: '🎓', description: 'Kampüs, araştırma, öğrenim.', tier: 5, unlockAt: 650_000, baseCost: 5_400, baseIncome: 60, costMultiplier: 1.19 },
  { id: 'havayolu', name: 'Havayolu Şirketi', emoji: '✈️', description: 'Yolcu ve kargo hatları.', tier: 6, unlockAt: 1_800_000, baseCost: 8_900, baseIncome: 95, costMultiplier: 1.19 },
  { id: 'liman', name: 'Liman İşletmesi', emoji: '⚓', description: 'Konteyner ve gemi trafiği.', tier: 6, unlockAt: 2_500_000, baseCost: 9_600, baseIncome: 102, costMultiplier: 1.19 },
  { id: 'ruzgar', name: 'Rüzgar Enerji Parkı', emoji: '🌬️', description: 'Offshore türbinler.', tier: 6, unlockAt: 2_200_000, baseCost: 9_100, baseIncome: 98, costMultiplier: 1.19 },
  { id: 'maden', name: 'Maden Ocağı', emoji: '⛏️', description: 'Ham madde ihracatı.', tier: 5, unlockAt: 800_000, baseCost: 6_200, baseIncome: 68, costMultiplier: 1.19 },
  { id: 'nukleer', name: 'Nükleer Santral', emoji: '☢️', description: 'Dev yatırım, dev güç.', tier: 7, unlockAt: 8_000_000, baseCost: 16_800, baseIncome: 145, costMultiplier: 1.20 },
  { id: 'tarim_tek', name: 'Tarım Teknoloji Kooperatifi', emoji: '🌾', description: 'Dikey tarım ve tohum patenti.', tier: 5, unlockAt: 550_000, baseCost: 5_100, baseIncome: 58, costMultiplier: 1.19 },

  // —— Lüks (milyoner+) — pahalı kalır ——
  { id: 'yacht_filo', name: 'Süper Yat Filosu', emoji: '🛥️', description: 'Charter ve özel seyir.', tier: 8, unlockAt: 40_000_000, baseCost: 32_000, baseIncome: 240, costMultiplier: 1.21, category: 'luxury' },
  { id: 'formula1', name: 'Formula 1 Takımı', emoji: '🏎️', description: 'Podyum, sponsor, marka değeri.', tier: 9, unlockAt: 180_000_000, baseCost: 62_000, baseIncome: 420, costMultiplier: 1.22, category: 'luxury' },
  { id: 'casino_legal', name: 'Casino İmparatorluğu', emoji: '🎰', description: 'Las Vegas tarzı zincir.', tier: 8, unlockAt: 55_000_000, baseCost: 38_500, baseIncome: 285, costMultiplier: 1.21, category: 'luxury' },
  { id: 'adalar', name: 'Özel Ada Zinciri', emoji: '🏝️', description: 'Ultra lüks resort portföyü.', tier: 9, unlockAt: 250_000_000, baseCost: 78_000, baseIncome: 460, costMultiplier: 1.22, category: 'luxury' },
  { id: 'saat_marka', name: 'Lüks Saat Markası', emoji: '⌚', description: 'Swiss craftsmanship imajı.', tier: 7, unlockAt: 15_000_000, baseCost: 19_500, baseIncome: 175, costMultiplier: 1.20, category: 'luxury' },
  { id: 'jet_filo', name: 'Özel Jet Filosu', emoji: '🛩️', description: 'Business aviation kiralama.', tier: 8, unlockAt: 70_000_000, baseCost: 42_000, baseIncome: 310, costMultiplier: 1.21, category: 'luxury' },
  { id: 'sanat_galeri', name: 'Sanat Galerisi & Müzayede', emoji: '🖼️', description: 'Picasso’dan NFT’ye.', tier: 7, unlockAt: 12_000_000, baseCost: 17_200, baseIncome: 168, costMultiplier: 1.20, category: 'luxury' },
  { id: 'moda_evi', name: 'Haute Couture Moda Evi', emoji: '👗', description: 'Podyum ve parfüm imparatorluğu.', tier: 8, unlockAt: 48_000_000, baseCost: 35_000, baseIncome: 265, costMultiplier: 1.21, category: 'luxury' },

  // —— Finans (sermaye oyunu) ——
  { id: 'banka_ozel', name: 'Özel Yatırım Bankası', emoji: '🏛️', description: 'HNWI müşteri portföyü.', tier: 7, unlockAt: 11_000_000, baseCost: 18_000, baseIncome: 162, costMultiplier: 1.20, category: 'finance' },
  { id: 'hedge_fund', name: 'Hedge Fon', emoji: '📊', description: 'Agresif getiri stratejileri.', tier: 8, unlockAt: 38_000_000, baseCost: 30_500, baseIncome: 255, costMultiplier: 1.21, category: 'finance' },
  { id: 'private_equity', name: 'Private Equity Fonu', emoji: '💼', description: 'Şirket al, birleştir, sat.', tier: 8, unlockAt: 60_000_000, baseCost: 40_000, baseIncome: 295, costMultiplier: 1.22, category: 'finance' },
  { id: 'venture_capital', name: 'Venture Capital', emoji: '🚀', description: 'Unicorn avcısı.', tier: 7, unlockAt: 18_000_000, baseCost: 21_000, baseIncome: 188, costMultiplier: 1.20, category: 'finance' },
  { id: 'family_office', name: 'Family Office', emoji: '👨‍👩‍👧‍👦', description: 'Hanedan servet yönetimi.', tier: 9, unlockAt: 300_000_000, baseCost: 85_000, baseIncome: 500, costMultiplier: 1.22, category: 'finance' },
  { id: 'reasurans', name: 'Reasürans Şirketi', emoji: '📋', description: 'Sigortacıların sigortacısı.', tier: 6, unlockAt: 3_500_000, baseCost: 11_200, baseIncome: 108, costMultiplier: 1.19, category: 'finance' },
  { id: 'borsa_araci', name: 'Aracı Kurum', emoji: '📉', description: 'Komisyon ve margin geliri.', tier: 6, unlockAt: 4_000_000, baseCost: 12_000, baseIncome: 115, costMultiplier: 1.19, category: 'finance' },

  // —— Bilim & uzay ——
  { id: 'biyotek', name: 'Biyoteknoloji Lab', emoji: '🧬', description: 'Gen düzenleme ve ilaç.', tier: 7, unlockAt: 14_000_000, baseCost: 20_500, baseIncome: 182, costMultiplier: 1.20, category: 'science' },
  { id: 'uzay_istasyonu', name: 'Uzay İstasyonu Modülü', emoji: '🛸', description: 'Düşük yörünge laboratuvarı.', tier: 9, unlockAt: 220_000_000, baseCost: 72_000, baseIncome: 440, costMultiplier: 1.22, category: 'science' },
  { id: 'uydu_fab', name: 'Uydu Üretim Tesisi', emoji: '🏭', description: 'Yörüngeye seri üretim.', tier: 8, unlockAt: 85_000_000, baseCost: 48_000, baseIncome: 330, costMultiplier: 1.21, category: 'science' },
  { id: 'havacilik', name: 'Havacılık Ar-Ge Merkezi', emoji: '🔭', description: 'Hipersonik ve savunma.', tier: 8, unlockAt: 95_000_000, baseCost: 52_000, baseIncome: 345, costMultiplier: 1.21, category: 'science' },
  { id: 'gen_terapi', name: 'Gen Terapisi Kliniği', emoji: '💉', description: 'Yaşam süresi uzatma pazarı.', tier: 7, unlockAt: 20_000_000, baseCost: 23_500, baseIncome: 198, costMultiplier: 1.20, category: 'science' },
  { id: 'superbilgisayar', name: 'Süper Bilgisayar Merkezi', emoji: '💻', description: 'AI eğitim kapasitesi kirala.', tier: 8, unlockAt: 65_000_000, baseCost: 44_500, baseIncome: 320, costMultiplier: 1.21, category: 'science' },

  // —— Spor / siyaset / yeraltı genişlemesi ——
  { id: 'futbol_dunya', name: 'Dünya Kupası Organizasyonu', emoji: '🌍', description: 'Global futbol ekonomisi.', tier: 10, unlockAt: 1_200_000_000, baseCost: 110_000, baseIncome: 920, costMultiplier: 1.23, category: 'sport' },
  { id: 'basketbol', name: 'Profesyonel Basketbol Ligi', emoji: '🏀', description: 'Franchise ve yayın hakları.', tier: 7, unlockAt: 16_000_000, baseCost: 22_000, baseIncome: 185, costMultiplier: 1.20, category: 'sport' },
  { id: 'espor', name: 'eSpor Organizasyonu', emoji: '🎯', description: 'Turnuva, sponsor, skin.', tier: 5, unlockAt: 700_000, baseCost: 5_800, baseIncome: 62, costMultiplier: 1.19, category: 'sport' },
  { id: 'siyaset_dunya', name: 'BM Daimi Temsilciliği', emoji: '🌐', description: 'Küresel lobi ve diplomasi.', tier: 11, unlockAt: 3_500_000_000, baseCost: 165_000, baseIncome: 1_350, costMultiplier: 1.23, category: 'politics' },
  { id: 'siyaset_lobi', name: 'Uluslararası Lobi Ağı', emoji: '🤝', description: 'Devletler arası nüfuz.', tier: 9, unlockAt: 350_000_000, baseCost: 88_000, baseIncome: 510, costMultiplier: 1.22, category: 'politics' },
  { id: 'cyber_kara', name: 'Siber Suç Şebekesi', emoji: '💻', description: 'Veri ve fidye geliri.', tier: 6, unlockAt: 20_000_000, baseCost: 13_500, baseIncome: 125, costMultiplier: 1.22, illegal: true, category: 'dark', riskChance: 0.06, riskFinePct: 0.22 },
  { id: 'kripto_aklama', name: 'Kripto Aklama Hattı', emoji: '🪙', description: 'Mixer ve offshore zincir.', tier: 7, unlockAt: 100_000_000, baseCost: 26_000, baseIncome: 210, costMultiplier: 1.23, illegal: true, category: 'dark', riskChance: 0.05, riskFinePct: 0.20 },
  { id: 'veri_broker', name: 'Veri Brokerlığı', emoji: '📡', description: 'Gölge pazar istihbaratı.', tier: 8, unlockAt: 300_000_000, baseCost: 45_000, baseIncome: 315, costMultiplier: 1.22, illegal: true, category: 'dark', riskChance: 0.04, riskFinePct: 0.18 },
  { id: 'kacak_sigara', name: 'Kaçak Sigara Kaçakçılığı', emoji: '🚬', description: 'Gümrük kaçakçılığı, kolay para ama riskli.', tier: 2, unlockAt: 25_000, baseCost: 720, baseIncome: 13, costMultiplier: 1.19, illegal: true, riskChance: 0.05, riskFinePct: 0.12 },
  { id: 'sahte_evrak', name: 'Sahte Evrak Basımevi', emoji: '📄', description: 'Kimlik, pasaport, diploma — gizli baskı.', tier: 3, unlockAt: 150_000, baseCost: 1_350, baseIncome: 23, costMultiplier: 1.19, illegal: true, riskChance: 0.07, riskFinePct: 0.16 },
  { id: 'gizli_kumarhane', name: 'Yeraltı Kumarhane Ağı', emoji: '🎰', description: 'VIP salonlar, yüksek bahis, yüksek risk.', tier: 4, unlockAt: 580_000, baseCost: 2_480, baseIncome: 37, costMultiplier: 1.25, illegal: true, riskChance: 0.08, riskFinePct: 0.18 },
  { id: 'banka_dolandirici', name: 'Fintech Dolandırıcılığı', emoji: '🕵️', description: 'Sahte yatırım platformları, phishing.', tier: 4, unlockAt: 700_000, baseCost: 2_780, baseIncome: 40, costMultiplier: 1.25, illegal: true, category: 'dark', riskChance: 0.07, riskFinePct: 0.20 },
  { id: 'organize_suc', name: 'Organize Suç Sendikası', emoji: '🦅', description: 'Haraç, koruma, kara ekonomi koordinasyonu.', tier: 5, unlockAt: 3_400_000, baseCost: 6_800, baseIncome: 86, costMultiplier: 1.25, illegal: true, category: 'dark', riskChance: 0.06, riskFinePct: 0.25 },
  { id: 'paralel_banka', name: 'Gölge Bankacılık', emoji: '🏦', description: 'Kayıt dışı kredi ve sermaye.', tier: 6, unlockAt: 18_000_000, baseCost: 11_500, baseIncome: 118, costMultiplier: 1.21, illegal: true, category: 'dark', riskChance: 0.05, riskFinePct: 0.22 },

  // —— MEGA PROJELER (tier 12–20) — milyarder bile düşünür ——
  { id: 'uzay_turizmi', name: 'Uzay Turizmi Şirketi', emoji: '🌠', description: 'Suborbital ve lunar excursion.', tier: 12, unlockAt: 15_000_000_000, baseCost: 420_000, baseIncome: 2_120, costMultiplier: 1.22 },
  { id: 'kuantum', name: 'Kuantum Bilgisayar Kampüsü', emoji: '⚛️', description: 'Qubit kapasitesi sat.', tier: 13, unlockAt: 35_000_000_000, baseCost: 620_000, baseIncome: 3_030, costMultiplier: 1.23 },
  { id: 'fuzyon', name: 'Füzyon Reaktörü', emoji: '🔥', description: 'Sonsuz enerji, trilyonluk yatırım.', tier: 14, unlockAt: 80_000_000_000, baseCost: 950_000, baseIncome: 4_330, costMultiplier: 1.23 },
  { id: 'mars', name: 'Mars Kolonisi', emoji: '🔴', description: 'Kırmızı gezegende şehir kur.', tier: 15, unlockAt: 180_000_000_000, baseCost: 1_450_000, baseIncome: 6_200, costMultiplier: 1.24 },
  { id: 'asteroid', name: 'Asteroit Madenciliği', emoji: '☄️', description: 'Platin ve nadir element.', tier: 16, unlockAt: 400_000_000_000, baseCost: 2_200_000, baseIncome: 8_860, costMultiplier: 1.24 },
  { id: 'sovereign_fund', name: 'Ulusal Varlık Fonu', emoji: '💰', description: 'Ülke bütçesinden pay al.', tier: 17, unlockAt: 900_000_000_000, baseCost: 3_400_000, baseIncome: 12_670, costMultiplier: 1.25, category: 'finance' },
  { id: 'su_monopol', name: 'Küresel Su Hakları', emoji: '💧', description: 'Nehir ve aquifer lisansları.', tier: 18, unlockAt: 2_000_000_000_000, baseCost: 5_200_000, baseIncome: 18_120, costMultiplier: 1.25 },
  { id: 'dunya_duzeni', name: 'Dünya Ekonomik Konseyi', emoji: '🌐', description: 'Küresel ticaret kurallarını yaz.', tier: 19, unlockAt: 4_500_000_000_000, baseCost: 8_100_000, baseIncome: 25_920, costMultiplier: 1.26, category: 'politics' },
  { id: 'multiverse', name: 'Çoklu Evren Ticaret Ağı', emoji: '♾️', description: 'Son sınır — başka boyutlardan vergi.', tier: 20, unlockAt: 10_000_000_000_000, baseCost: 12_500_000, baseIncome: 37_060, costMultiplier: 1.26 },

  // —— Ek kariyer yolları (dengeli tier aralığı) ——
  { id: 'market_zincir', name: 'Market Zinciri', emoji: '🛍️', description: 'Mahalle marketlerinden zincire.', tier: 2, unlockAt: 4_000, baseCost: 520, baseIncome: 9, costMultiplier: 1.17 },
  { id: 'otopark', name: 'Otopark İşletmesi', emoji: '🅿️', description: 'Şehir merkezinde park geliri.', tier: 2, unlockAt: 8_000, baseCost: 650, baseIncome: 11, costMultiplier: 1.17 },
  { id: 'bahce_merkez', name: 'Bahçe & Peyzaj', emoji: '🌿', description: 'Villa ve site projeleri.', tier: 2, unlockAt: 10_000, baseCost: 700, baseIncome: 12, costMultiplier: 1.17 },
  { id: 'optik', name: 'Optik Zinciri', emoji: '👓', description: 'Gözlük ve lens satışı.', tier: 3, unlockAt: 25_000, baseCost: 1_080, baseIncome: 16, costMultiplier: 1.22 },
  { id: 'sinema', name: 'Sinema Zinciri', emoji: '🎬', description: 'Salon, patlamış mısır, IMAX.', tier: 3, unlockAt: 32_000, baseCost: 1_220, baseIncome: 18, costMultiplier: 1.22 },
  { id: 'veteriner', name: 'Veteriner Kliniği', emoji: '🐕', description: 'Evcil hayvan sağlığı.', tier: 3, unlockAt: 45_000, baseCost: 1_350, baseIncome: 20, costMultiplier: 1.22 },
  { id: 'catering', name: 'Catering Şirketi', emoji: '🍱', description: 'Kurumsal etkinlik yemekleri.', tier: 3, unlockAt: 50_000, baseCost: 1_400, baseIncome: 21, costMultiplier: 1.22 },
  { id: 'guvenlik', name: 'Güvenlik Şirketi', emoji: '🛡️', description: 'Özel koruma ve alarm.', tier: 3, unlockAt: 60_000, baseCost: 1_480, baseIncome: 22, costMultiplier: 1.22 },
  { id: 'egitim_app', name: 'Eğitim Uygulaması', emoji: '📚', description: 'Online kurs ve abonelik.', tier: 3, unlockAt: 75_000, baseCost: 1_620, baseIncome: 24, costMultiplier: 1.22 },
  { id: 'geri_donusum', name: 'Geri Dönüşüm Tesisi', emoji: '♻️', description: 'Atıktan hammadde.', tier: 4, unlockAt: 440_000, baseCost: 2_000, baseIncome: 39, costMultiplier: 1.22 },
  { id: 'coworking', name: 'Coworking Ağı', emoji: '🏢', description: 'Esnek ofis kiralama.', tier: 4, unlockAt: 140_000, baseCost: 2_300, baseIncome: 42, costMultiplier: 1.22 },
  { id: 'mobilya', name: 'Mobilya Fabrikası', emoji: '🪑', description: 'Perakende ve toptan üretim.', tier: 4, unlockAt: 170_000, baseCost: 2_500, baseIncome: 33, costMultiplier: 1.22 },
  { id: 'radyo', name: 'Radyo & Podcast Ağı', emoji: '🎙️', description: 'Yayın hakları ve reklam.', tier: 4, unlockAt: 200_000, baseCost: 2_650, baseIncome: 35, costMultiplier: 1.22 },
  { id: 'mikrokredi', name: 'Mikrokredi Kurumu', emoji: '💳', description: 'Küçük işletmelere kredi.', tier: 4, unlockAt: 250_000, baseCost: 2_850, baseIncome: 38, costMultiplier: 1.19, category: 'finance' },
  { id: 'su_aritma', name: 'Su Arıtma Tesisi', emoji: '💧', description: 'Endüstriyel ve belediye sözleşmeleri.', tier: 5, unlockAt: 480_000, baseCost: 4_600, baseIncome: 54, costMultiplier: 1.19 },
  { id: 'yazilim_outsource', name: 'Yazılım Outsource', emoji: '👨‍💻', description: 'Global yazılım projeleri.', tier: 5, unlockAt: 580_000, baseCost: 5_000, baseIncome: 57, costMultiplier: 1.19 },
  { id: 'kuyumcu', name: 'Kuyumcu Zinciri', emoji: '💍', description: 'Altın ve mücevher.', tier: 5, unlockAt: 750_000, baseCost: 5_600, baseIncome: 64, costMultiplier: 1.19, category: 'luxury' },
  { id: 'telekom', name: 'Telekom Operatörü', emoji: '📡', description: 'Mobil ve fiber altyapı.', tier: 6, unlockAt: 1_600_000, baseCost: 8_500, baseIncome: 92, costMultiplier: 1.19 },
  { id: 'nft_borsa', name: 'Dijital Varlık Borsası', emoji: '🖼️', description: 'NFT ve token ticareti.', tier: 6, unlockAt: 6_000_000, baseCost: 14_000, baseIncome: 128, costMultiplier: 1.20, category: 'finance' },
  { id: 'golf_kulup', name: 'Uluslararası Golf Kulübü', emoji: '⛳', description: 'Üyelik ve turnuva geliri.', tier: 7, unlockAt: 13_000_000, baseCost: 18_500, baseIncome: 170, costMultiplier: 1.20, category: 'luxury' },
  { id: 'arastirma_enst', name: 'Araştırma Enstitüsü', emoji: '🔭', description: 'Patent ve lisans gelirleri.', tier: 8, unlockAt: 100_000_000, baseCost: 55_000, baseIncome: 335, costMultiplier: 1.21, category: 'science' },
  { id: 'roket_fab', name: 'Roket Üretim Tesisi', emoji: '🚀', description: 'Ticari fırlatma ve uydu taşıma.', tier: 11, unlockAt: 5_000_000_000, baseCost: 200_000, baseIncome: 1_620, costMultiplier: 1.23, category: 'science' },
  { id: 'dunya_hava', name: 'Küresel Hava Trafik Ağı', emoji: '🌐', description: 'Hava sahası ve rota lisansları.', tier: 10, unlockAt: 1_500_000_000, baseCost: 105_000, baseIncome: 900, costMultiplier: 1.22 },
  { id: 'yapay_organ', name: 'Yapay Organ Fabrikası', emoji: '🫀', description: 'Biyobaskı ve transplant pazarı.', tier: 12, unlockAt: 12_000_000_000, baseCost: 380_000, baseIncome: 1_950, costMultiplier: 1.22, category: 'science' },
  { id: 'zaman_bank', name: 'Zaman Bankası', emoji: '⏳', description: 'Gelecek gelirini bugüne sat.', tier: 13, unlockAt: 28_000_000_000, baseCost: 580_000, baseIncome: 2_850, costMultiplier: 1.23, category: 'finance' },

  // —— YENİ: Tier 3 boşluk doldurucu ——
  { id: 'guzellik', name: 'Güzellik Merkezi', emoji: '💅', description: 'Kuaför, nail art, spa zinciri.', tier: 3, unlockAt: 320_000, baseCost: 1_150, baseIncome: 17, costMultiplier: 1.22 },
  { id: 'spor_okulu', name: 'Spor Okulu', emoji: '🏅', description: 'Kurs ve turnuva gelirleri.', tier: 3, unlockAt: 120_000, baseCost: 1_250, baseIncome: 18, costMultiplier: 1.22, category: 'sport' },
  { id: 'akaryakit', name: 'Akaryakıt İstasyonu', emoji: '⛽', description: 'Benzin, market, oto yıkama.', tier: 3, unlockAt: 60_000, baseCost: 1_080, baseIncome: 16, costMultiplier: 1.22 },
  { id: 'fotograf_stud', name: 'Fotoğraf Stüdyosu', emoji: '📷', description: 'Düğün, ticari ve reklam çekimi.', tier: 3, unlockAt: 72_000, baseCost: 1_100, baseIncome: 16, costMultiplier: 1.22 },

  // —— YENİ: Tier 4 boşluk doldurucu ——
  { id: 'ic_mimar', name: 'İç Mimar Ağı', emoji: '🛋️', description: 'Villa ve otel tasarım projeleri.', tier: 4, unlockAt: 320_000, baseCost: 1_900, baseIncome: 38, costMultiplier: 1.22 },
  { id: 'tatil_koyu', name: 'Tatil Köyü', emoji: '🏖️', description: 'All-inclusive resort zinciri.', tier: 4, unlockAt: 360_000, baseCost: 2_050, baseIncome: 40, costMultiplier: 1.22, category: 'luxury' },
  { id: 'fitness_app', name: 'Fitness Uygulaması', emoji: '🏃', description: 'Antrenman aboneliği ve PT.', tier: 4, unlockAt: 400_000, baseCost: 2_100, baseIncome: 29, costMultiplier: 1.22 },
  { id: 'fulfillment', name: 'Fulfillment Merkezi', emoji: '📦', description: 'E-ticaret depo ve lojistik.', tier: 4, unlockAt: 440_000, baseCost: 2_150, baseIncome: 30, costMultiplier: 1.22 },

  // —— YENİ: Tier 5 içerik ——
  { id: 'online_egitim', name: 'Online Eğitim Platformu', emoji: '🎓', description: 'Kurs, sertifika ve bootcamp.', tier: 5, unlockAt: 1_600_000, baseCost: 4_000, baseIncome: 50, costMultiplier: 1.19 },
  { id: 'biyoteknoloji', name: 'Biyoteknoloji Firması', emoji: '🧬', description: 'CRISPR, ilaç geliştirme.', tier: 5, unlockAt: 2_400_000, baseCost: 5_200, baseIncome: 59, costMultiplier: 1.19, category: 'science' },
]

export const UPGRADES: UpgradeDef[] = [
  { id: 'click_x2', name: 'Pazarlama Kampanyası', description: 'Tıklama geliri x2', cost: 900, effect: 'click_mult', value: 2 },
  { id: 'click_x5', name: 'Viral Reklam', description: 'Tıklama geliri x5', cost: 11_000, effect: 'click_mult', value: 5 },
  { id: 'global_x2', name: 'Kurumsal Büyüme', description: 'Tüm gelir x2', cost: 9_000, effect: 'global_mult', value: 2 },
  { id: 'stajyer_x2', name: 'Franchise Sistemi', description: 'Limonata geliri x2', cost: 450, effect: 'producer_mult', value: 2, producerId: 'stajyer' },
  { id: 'robot_x2', name: 'SEO Optimizasyonu', description: 'E-ticaret geliri x2', cost: 3_750, effect: 'producer_mult', value: 2, producerId: 'robot' },
  { id: 'fabrika_x2', name: 'Depo Otomasyonu', description: 'Lojistik geliri x2', cost: 42_500, effect: 'producer_mult', value: 2, producerId: 'fabrika' },
  { id: 'holding_x2', name: 'Bulut Altyapısı', description: 'Yazılım geliri x2', cost: 175_000, effect: 'producer_mult', value: 2, producerId: 'holding' },
  { id: 'ofis_x2', name: 'Franchise Genişlemesi', description: 'Restoran geliri x2', cost: 21_000, effect: 'producer_mult', value: 2, producerId: 'ofis' },
  { id: 'uzay_x2', name: 'Portföy Yönetimi', description: 'Gayrimenkul geliri x2', cost: 600_000, effect: 'producer_mult', value: 2, producerId: 'uzay' },
  { id: 'ai_x2', name: 'Birleşme Sinergisi', description: 'Holding geliri x2', cost: 2_750_000, effect: 'producer_mult', value: 2, producerId: 'ai' },
  { id: 'tuzaq_x2', name: 'Halka Arz Boost', description: 'IPO geliri x2', cost: 12_500_000, effect: 'producer_mult', value: 2, producerId: 'tuzaq' },
  { id: 'global_x3', name: 'Global Expansion', description: 'Tüm gelir x1.5', cost: 225_000, effect: 'global_mult', value: 1.5 },
  { id: 'uydu_x2', name: 'Orbital Verimlilik', description: 'Uydu ağı geliri x2', cost: 9_000_000, effect: 'producer_mult', value: 2, producerId: 'uydu' },
  { id: 'merkezbankasi_x2', name: 'Para Politikası', description: 'Merkez bankası geliri x2', cost: 42_500_000, effect: 'producer_mult', value: 2, producerId: 'merkezbankasi' },
  { id: 'global_mega', name: 'Süper Büyüme', description: 'Tüm gelir x2', cost: 22_500_000, effect: 'global_mult', value: 2 },
  { id: 'kafe_x2', name: 'Franchise Kahve', description: 'Kahve zinciri geliri x2', cost: 11_000, effect: 'producer_mult', value: 2, producerId: 'kafe' },
  { id: 'mobil_app_x2', name: 'Premium Abonelik', description: 'Mobil uygulama geliri x2', cost: 90_000, effect: 'producer_mult', value: 2, producerId: 'mobil_app' },
  { id: 'enerji_x2', name: 'Panel Verimliliği', description: 'Güneş santrali geliri x2', cost: 900_000, effect: 'producer_mult', value: 2, producerId: 'enerji' },
  { id: 'click_x10', name: 'Influencer Kampanyası', description: 'Tıklama geliri x10', cost: 175_000, effect: 'click_mult', value: 10 },
  { id: 'offshore_laundry', name: 'Offshore Aklama', description: 'Illegal gelir −10%, heat −20%', cost: 4_250_000, effect: 'producer_mult', value: 0.9, producerId: 'offshore' },
  { id: 'otel_x2', name: 'Otel Franchise', description: 'Otel zinciri geliri x2', cost: 17_500, effect: 'producer_mult', value: 2, producerId: 'otel' },
  { id: 'medya_x2', name: 'Medya İmparatorluğu', description: 'Medya holding geliri x2', cost: 110_000, effect: 'producer_mult', value: 2, producerId: 'medya' },
  { id: 'futbol_x2', name: 'Transfer Sezonu', description: 'Futbol kulüpleri geliri x2', cost: 475_000, effect: 'producer_mult', value: 2, producerId: 'futbol_superlig' },
  { id: 'siyaset_x2', name: 'Lobi Gücü', description: 'Siyaset gelirleri x1.5', cost: 900_000, effect: 'global_mult', value: 1.5 },
  { id: 'siyah_fabrika_x2', name: 'Gizli Üretim', description: 'Siyah fabrika geliri x2', cost: 210_000, effect: 'producer_mult', value: 2, producerId: 'siyah_fabrika' },
  // — Tier 1–3 erken oyun —
  { id: 'berber_x2', name: 'Randevu Sistemi', description: 'Berber geliri x2', cost: 475, effect: 'producer_mult', value: 2, producerId: 'berber' },
  { id: 'giyim_x2', name: 'Sezon Koleksiyonu', description: 'Giyim mağazası geliri x2', cost: 3_400, effect: 'producer_mult', value: 2, producerId: 'giyim' },
  { id: 'gym_x2', name: 'Premium Üyelik', description: 'Spor salonu geliri x2', cost: 4_100, effect: 'producer_mult', value: 2, producerId: 'gym' },
  { id: 'kargo_x2', name: 'Ekspres Teslimat', description: 'Kargo geliri x2', cost: 14_000, effect: 'producer_mult', value: 2, producerId: 'kargo' },
  { id: 'reklam_ajansi_x2', name: 'Medya Planlama', description: 'Reklam ajansı geliri x2', cost: 16_000, effect: 'producer_mult', value: 2, producerId: 'reklam_ajansi' },
  { id: 'cikolata_x2', name: 'Export Hattı', description: 'Çikolata fabrikası geliri x2', cost: 19_000, effect: 'producer_mult', value: 2, producerId: 'cikolata' },
  { id: 'click_x3', name: 'Sosyal Medya', description: 'Tıklama geliri x3', cost: 11_000, effect: 'click_mult', value: 3, requiresTotalEarned: 2_000 },
  { id: 'early_global_15', name: 'Erken Büyüme', description: 'Tüm gelir x1.5', cost: 42_500, effect: 'global_mult', value: 1.5, requiresTotalEarned: 15_000 },
  // — Tier 4–6 kategori —
  { id: 'insaat_x2', name: 'Mega Proje', description: 'İnşaat geliri x2', cost: 60_000, effect: 'producer_mult', value: 2, producerId: 'insaat', requiresTotalEarned: 80_000 },
  { id: 'hukuk_x2', name: 'Uluslararası Dava', description: 'Hukuk bürosu geliri x2', cost: 70_000, effect: 'producer_mult', value: 2, producerId: 'hukuk', requiresTotalEarned: 90_000 },
  { id: 'oyun_studio_x2', name: 'AAA Stüdyo', description: 'Oyun stüdyosu geliri x2', cost: 80_000, effect: 'producer_mult', value: 2, producerId: 'oyun_studio', requiresTotalEarned: 100_000 },
  { id: 'streaming_x2', name: 'Global Yayın', description: 'Streaming geliri x2', cost: 100_000, effect: 'producer_mult', value: 2, producerId: 'streaming', requiresTotalEarned: 110_000 },
  { id: 'ilac_x2', name: 'Patent Portföyü', description: 'İlaç lab geliri x2', cost: 140_000, effect: 'producer_mult', value: 2, producerId: 'ilac', requiresTotalEarned: 200_000 },
  { id: 'sigorta_x2', name: 'Reasürans Anlaşması', description: 'Sigorta geliri x2', cost: 160_000, effect: 'producer_mult', value: 2, producerId: 'sigorta', requiresTotalEarned: 250_000 },
  { id: 'havayolu_x2', name: 'Yeni Rotalar', description: 'Havayolu geliri x2', cost: 275_000, effect: 'producer_mult', value: 2, producerId: 'havayolu', requiresTotalEarned: 800_000 },
  { id: 'legal_bundle', name: 'Yasal Portföy', description: 'Yasal işletmeler geliri x1.25', cost: 225_000, effect: 'global_mult', value: 1.25, requiresTotalEarned: 150_000 },
  { id: 'finance_bundle', name: 'Finans Sinergisi', description: 'Finans kategorisi geliri x2 (banka, fon, VC)', cost: 1_100_000, effect: 'producer_mult', value: 2, producerId: 'banka_ozel', requiresTotalEarned: 5_000_000 },
  { id: 'hedge_fund_x2', name: 'Alpha Strateji', description: 'Hedge fon geliri x2', cost: 1_900_000, effect: 'producer_mult', value: 2, producerId: 'hedge_fund', requiresTotalEarned: 12_000_000 },
  { id: 'venture_capital_x2', name: 'Unicorn Avı', description: 'VC geliri x2', cost: 825_000, effect: 'producer_mult', value: 2, producerId: 'venture_capital', requiresTotalEarned: 8_000_000 },
  { id: 'luxury_bundle', name: 'Lüks İmparatorluk', description: 'Lüks kategorisi geliri x1.5', cost: 2_600_000, effect: 'global_mult', value: 1.5, requiresTotalEarned: 20_000_000, requiresProducer: 'yacht_filo' },
  { id: 'formula1_x2', name: 'Podyum Bonusu', description: 'F1 takımı geliri x2', cost: 6_000_000, effect: 'producer_mult', value: 2, producerId: 'formula1', requiresTotalEarned: 80_000_000 },
  { id: 'casino_legal_x2', name: 'VIP Salon', description: 'Casino geliri x2', cost: 3_400_000, effect: 'producer_mult', value: 2, producerId: 'casino_legal', requiresTotalEarned: 30_000_000 },
  { id: 'sport_bundle', name: 'Spor Holding', description: 'Futbol kulüpleri geliri x1.5', cost: 625_000, effect: 'global_mult', value: 1.5, requiresProducer: 'futbol_amateur' },
  { id: 'futbol_amateur_x2', name: 'Altyapı Akademisi', description: 'Amatör kulüp geliri x2', cost: 90_000, effect: 'producer_mult', value: 2, producerId: 'futbol_amateur', requiresProducer: 'futbol_amateur' },
  { id: 'futbol_avrupa_x2', name: 'Şampiyonlar Ligi', description: 'Avrupa kulübü geliri x2', cost: 14_000_000, effect: 'producer_mult', value: 2, producerId: 'futbol_avrupa', requiresProducer: 'futbol_avrupa' },
  { id: 'politics_bundle', name: 'Devlet Desteği', description: 'Siyaset gelirleri x1.35', cost: 475_000, effect: 'global_mult', value: 1.35, requiresProducer: 'siyaset_belediye' },
  { id: 'siyaset_bakan_x2', name: 'Bakanlık Reformu', description: 'Bakanlık geliri x2', cost: 2_100_000, effect: 'producer_mult', value: 2, producerId: 'siyaset_bakan', requiresProducer: 'siyaset_bakan' },
  // — Tier 7+ global & illegal —
  { id: 'global_x4', name: 'Mega Holding', description: 'Tüm gelir x1.5', cost: 11_000_000, effect: 'global_mult', value: 1.5, requiresTotalEarned: 15_000_000, requiresUpgrade: 'global_mega' },
  { id: 'global_x5', name: 'Galaktik Expansion', description: 'Tüm gelir x2', cost: 60_000_000, effect: 'global_mult', value: 2, requiresTotalEarned: 200_000_000, requiresUpgrade: 'global_x4' },
  { id: 'kripto_x2', name: 'Listing Boost', description: 'Kripto borsası geliri x2', cost: 190_000, effect: 'producer_mult', value: 2, producerId: 'kripto', requiresTotalEarned: 400_000 },
  { id: 'bahis_x2', name: 'Underground Ağ', description: 'Bahis ağı geliri x2', cost: 27_500, effect: 'producer_mult', value: 2, producerId: 'bahis', requiresProducer: 'bahis' },
  { id: 'piramit_x2', name: 'Ponzi Optimizasyonu', description: 'Piramit geliri x2', cost: 240_000, effect: 'producer_mult', value: 2, producerId: 'piramit', requiresProducer: 'piramit' },
  { id: 'kacak_imalat_x2', name: 'Gizli Hat', description: 'Kaçak imalat geliri x2', cost: 75_000, effect: 'producer_mult', value: 2, producerId: 'kacak_imalat', requiresProducer: 'kacak_imalat' },
  { id: 'silah_x2', name: 'Karaborsa Ağı', description: 'Silah ticareti geliri x2', cost: 1_400_000, effect: 'producer_mult', value: 2, producerId: 'silah_ticareti', requiresProducer: 'silah_ticareti' },
  { id: 'illegal_risk_down', name: 'Avukat Ağı', description: 'Illegal baskın riski −15%', cost: 600_000, effect: 'producer_mult', value: 0.85, producerId: 'offshore', requiresTotalEarned: 500_000 },
  { id: 'nano_x2', name: 'Nano Patent', description: 'Nano lab geliri x2', cost: 17_500_000, effect: 'producer_mult', value: 2, producerId: 'nano', requiresTotalEarned: 400_000_000 },
  { id: 'nukleer_x2', name: 'Reaktör Upgrade', description: 'Nükleer santral geliri x2', cost: 4_450_000, effect: 'producer_mult', value: 2, producerId: 'nukleer', requiresTotalEarned: 25_000_000 },
  { id: 'data_center_x2', name: 'Cloud Scale', description: 'Veri merkezi geliri x2', cost: 95_000, effect: 'producer_mult', value: 2, producerId: 'data_center', requiresTotalEarned: 100_000 },
  { id: 'private_equity_x2', name: 'Buyout Modu', description: 'PE fonu geliri x2', cost: 2_250_000, effect: 'producer_mult', value: 2, producerId: 'private_equity', requiresTotalEarned: 18_000_000 },
  { id: 'family_office_x2', name: 'Dynasty Trust', description: 'Family office geliri x2', cost: 21_000_000, effect: 'producer_mult', value: 2, producerId: 'family_office', requiresTotalEarned: 150_000_000 },
  { id: 'click_ultimate', name: 'Elon Modu', description: 'Tıklama geliri x25', cost: 42_500_000, effect: 'click_mult', value: 25, requiresTotalEarned: 50_000_000, requiresUpgrade: 'click_x10' },
  // —— YENİ işletme upgradeleri ——
  { id: 'guzellik_x2', name: 'Premium Bakım', description: 'Güzellik merkezi geliri x2', cost: 19_000, effect: 'producer_mult', value: 2, producerId: 'guzellik', requiresProducer: 'guzellik' },
  { id: 'spor_okulu_x2', name: 'Şampiyonluk Ligi', description: 'Spor okulu geliri x2', cost: 22_500, effect: 'producer_mult', value: 2, producerId: 'spor_okulu', requiresProducer: 'spor_okulu' },
  { id: 'akaryakit_x2', name: 'Market Zinciri', description: 'Akaryakıt istasyonu geliri x2', cost: 16_000, effect: 'producer_mult', value: 2, producerId: 'akaryakit', requiresProducer: 'akaryakit' },
  { id: 'fotograf_x2', name: 'Kurumsal Sözleşmeler', description: 'Fotoğraf stüdyosu geliri x2', cost: 17_500, effect: 'producer_mult', value: 2, producerId: 'fotograf_stud', requiresProducer: 'fotograf_stud' },
  { id: 'ic_mimar_x2', name: 'Mimari Ödüller', description: 'İç mimar ağı geliri x2', cost: 60_000, effect: 'producer_mult', value: 2, producerId: 'ic_mimar', requiresProducer: 'ic_mimar' },
  { id: 'tatil_koyu_x2', name: 'All-Inclusive Paketi', description: 'Tatil köyü geliri x2', cost: 70_000, effect: 'producer_mult', value: 2, producerId: 'tatil_koyu', requiresProducer: 'tatil_koyu' },
  { id: 'fitness_app_x2', name: 'AI Antrenör', description: 'Fitness uygulaması geliri x2', cost: 75_000, effect: 'producer_mult', value: 2, producerId: 'fitness_app', requiresProducer: 'fitness_app' },
  { id: 'fulfillment_x2', name: 'Drone Teslimat', description: 'Fulfillment merkezi geliri x2', cost: 80_000, effect: 'producer_mult', value: 2, producerId: 'fulfillment', requiresProducer: 'fulfillment' },
  { id: 'online_egitim_x2', name: 'Sertifika Programı', description: 'Online eğitim geliri x2', cost: 140_000, effect: 'producer_mult', value: 2, producerId: 'online_egitim', requiresProducer: 'online_egitim' },
  { id: 'biyoteknoloji_x2', name: 'Gen Patent', description: 'Biyoteknoloji geliri x2', cost: 200_000, effect: 'producer_mult', value: 2, producerId: 'biyoteknoloji', requiresProducer: 'biyoteknoloji' },
  { id: 'kacak_sigara_up', name: 'Özel Ağ', description: '×2 kaçakçılık geliri', cost: 60_000, effect: 'producer_mult', value: 2, producerId: 'kacak_sigara', requiresTotalEarned: 6_000 },
  { id: 'sahte_evrak_up', name: 'İleri Baskı Teknolojisi', description: '×2 evrak geliri', cost: 225_000, effect: 'producer_mult', value: 2, producerId: 'sahte_evrak', requiresTotalEarned: 38_000 },
  { id: 'gizli_kumarhane_up', name: 'VIP Salon Açılışı', description: '×2 kumarhane geliri', cost: 900_000, effect: 'producer_mult', value: 2, producerId: 'gizli_kumarhane', requiresTotalEarned: 145_000 },
  { id: 'banka_dolandirici_up', name: 'Gelişmiş Phishing Kit', description: '×2 dolandırıcılık geliri', cost: 1_100_000, effect: 'producer_mult', value: 2, producerId: 'banka_dolandirici', requiresTotalEarned: 175_000 },
  { id: 'organize_suc_up', name: 'Kıta Genişlemesi', description: '×2 sendika geliri', cost: 6_000_000, effect: 'producer_mult', value: 2, producerId: 'organize_suc', requiresTotalEarned: 850_000 },
  { id: 'paralel_banka_up', name: 'Offshore İştirak', description: '×2 gölge banka geliri', cost: 32_500_000, effect: 'producer_mult', value: 2, producerId: 'paralel_banka', requiresTotalEarned: 4_500_000 },
]

/** BitLife uyumlu ekonomi — baseIncome = günlük gelir ($), 12 sn = 1 oyun günü */
/** Tüm işletme maliyetlerine uygulanan global çarpan */
export const ECONOMY_COST_SCALE = 4.5
/** baseCost katmanı */
export const ECONOMY_BASE_COST_MULT = 2.5
export const ECONOMY_UNLOCK_SCALE = 1.0
export const ECONOMY_COST_GROWTH_BONUS = 0.028
export const ECONOMY_TIER_COST_BONUS = 0.075
/** Gelir maliyetle aynı ölçekte — ROI korunur */
export const ECONOMY_INCOME_SCALE = ECONOMY_COST_SCALE
export const ECONOMY_BASE_INCOME_MULT = ECONOMY_BASE_COST_MULT * 1.35
/** Gelir/maliyet oranı — geri ödeme süresini kısaltmak için yükseltildi */
export const ECONOMY_INCOME_RATIO = 0.13
export const ECONOMY_UPGRADE_COST_SCALE = 1.45
export const EARLY_UNLOCK_COST_SCALE = 1.65

function tierEconomyBand(tier: number): number {
  if (tier >= 16) return 180
  if (tier >= 12) return 95
  if (tier >= 9) return 18
  if (tier >= 6) return 5
  return 1
}

function tierLateExponent(tier: number): number {
  if (tier <= 5) return 1
  return Math.pow(1.22, tier - 5)
}

/** Maliyet ve gelir için ortak tier / mega / kilit eğrisi */
export function producerEconomyMult(def: ProducerDef): number {
  const tierMult = 1 + Math.max(0, def.tier - 1) * ECONOMY_TIER_COST_BONUS
  const megaMult = def.tier >= 12 ? 1.35 : def.tier >= 8 ? 1.12 : 1
  const unlockSpread = def.unlockAt > 0 ? 1 + Math.log10(Math.max(10, def.unlockAt)) * 0.012 : 1
  const lateExp = tierLateExponent(def.tier)
  const band = tierEconomyBand(def.tier)
  return ECONOMY_COST_SCALE * ECONOMY_BASE_COST_MULT * tierMult * megaMult * unlockSpread * lateExp * band
}

export function scaledUnlockAt(def: ProducerDef): number {
  if (def.unlockAt <= 0) return 0
  let scale = ECONOMY_UNLOCK_SCALE
  if (def.tier >= 16) scale *= 2.8
  else if (def.tier >= 12) scale *= 1.65
  else if (def.tier >= 9) scale *= 1.35
  else if (def.tier >= 6) scale *= 1.12
  return Math.floor(def.unlockAt * scale)
}

export function scaledBaseIncome(baseIncome: number, def?: ProducerDef): number {
  const mult = def
    ? producerEconomyMult(def) * ECONOMY_INCOME_RATIO
    : ECONOMY_INCOME_SCALE * ECONOMY_BASE_INCOME_MULT * ECONOMY_INCOME_RATIO
  return Math.max(1, Math.floor(baseIncome * mult))
}

export function producerCost(def: ProducerDef, owned: number, count = 1): number {
  const growth = def.costMultiplier + ECONOMY_COST_GROWTH_BONUS
  let total = 0
  for (let i = 0; i < count; i++) {
    total += Math.floor(def.baseCost * Math.pow(growth, owned + i))
  }
  return Math.ceil(total * producerEconomyMult(def))
}

export function maxAffordable(def: ProducerDef, owned: number, money: number, costMultiplier = 1): number {
  let count = 0
  let spent = 0
  while (count < 1000) {
    const next = Math.floor(producerCost(def, owned + count, 1) * costMultiplier)
    if (spent + next > money) break
    spent += next
    count++
  }
  return count
}

export function isProducerUnlocked(
  def: ProducerDef,
  totalEarned: number,
  forcedUnlocks?: ReadonlySet<string>,
): boolean {
  return totalEarned >= scaledUnlockAt(def) || forcedUnlocks?.has(def.id) === true
}

export function earlyUnlockCost(def: ProducerDef): number {
  const unlock = scaledUnlockAt(def)
  const firstUnit = producerCost(def, 0, 1)
  const raw = Math.max(firstUnit * 0.35, Math.floor(unlock * 0.2), def.baseCost * 8)
  return Math.ceil(raw * EARLY_UNLOCK_COST_SCALE * 0.85)
}

export function producerIconPath(id: string): string {
  const base = import.meta.env.BASE_URL
  return `${base}icons/businesses/${id}.svg`
}

export function producerCategory(def: ProducerDef): 'legal' | 'illegal' | ProducerCategory {
  if (def.category) return def.category
  if (def.illegal) return 'illegal'
  return 'legal'
}

export function producersByCategory(category: 'legal' | 'illegal' | ProducerCategory | 'all'): ProducerDef[] {
  if (category === 'all') return PRODUCERS
  return PRODUCERS.filter((p) => producerCategory(p) === category)
}

export function formatMoney(value: number): string {
  const v = Math.max(0, value)
  if (v < 1000) {
    if (v < 10) return v.toFixed(1)
    return Math.floor(v).toLocaleString('tr-TR')
  }
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0)}K`
  if (v < 1_000_000_000) return `${(v / 1_000_000).toFixed(v < 10_000_000 ? 1 : 0)}M`
  if (v < 1_000_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  return `${(v / 1_000_000_000_000).toFixed(1)}T`
}

/** HUD ana para — büyük, kısa format */
export function formatMoneyHero(value: number): string {
  const v = Math.max(0, value)
  if (v < 10_000) return `${Math.floor(v).toLocaleString('tr-TR')}₺`
  if (v < 1_000_000) return `${(v / 1000).toFixed(2)}K₺`
  if (v < 1_000_000_000) return `${(v / 1_000_000).toFixed(2)}M₺`
  return `${(v / 1_000_000_000).toFixed(2)}B₺`
}

export function moneyHeroTier(value: number): 'green' | 'gold' | 'platinum' {
  if (value >= 100_000_000) return 'platinum'
  if (value >= 1_000_000) return 'gold'
  return 'green'
}

/** Pasif gelir hızı — oyun günü bazlı (12 gerçek sn = 1 gün) */
export function formatIncomeRate(value: number): string {
  const v = Math.max(0, value)
  if (v <= 0) return '0/gün'
  return `${formatMoney(v)}/gün`
}

/** Açıklamalı gelir satırı (finans paneli) */
export function formatIncomeRateHint(value: number): string {
  if (value <= 0) return 'Pasif gelir yok'
  return `${formatIncomeRate(value)} pasif · 12 sn = 1 oyun günü (tıklama ayrı)`
}

export function producerName(p: ProducerDef): string {
  return tRaw('biz_' + p.id) ?? p.name
}

export function producerDesc(p: ProducerDef): string {
  return tRaw('biz_' + p.id + '_desc') ?? p.description
}

export function upgradeName(u: UpgradeDef): string {
  return tRaw('upg_' + u.id) ?? u.name
}

export function upgradeDesc(u: UpgradeDef): string {
  return tRaw('upg_' + u.id + '_desc') ?? u.description
}
