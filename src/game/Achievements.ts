import { PRODUCERS } from './Economy'

export interface AchievementDef {
  id: string
  name: string
  description: string
  emoji: string
  reward: number
  check: (ctx: AchievementContext) => boolean
}

export interface AchievementContext {
  totalEarned: number
  totalClicks: number
  comboBest: number
  prestigePoints: number
  producers: Record<string, number>
  achievements: Set<string>
  lifetimePrestige: number
  lifetimeTotalEarned: number
  ipoCount: number
  managers: Record<string, boolean>
  stockShares: number
  weeklyClaimed: boolean
  seasonTier: number
  prestigeTreeCount: number
  stockTickerCount: number
  nightEarnings: number
  managerAutoBuyCount: number
  dailyStreak: number
  comebackClaimed: boolean
  heatSurvived: boolean
  unlockedThemes: string[]
  undergroundLawyerUsed: boolean
  dynastyMarried: boolean
  advisorBuys: number
  /** Kariyer/iş başarıları için (Karar 23) */
  hasJob?: boolean
  careerLevel?: number
  isEntrepreneur?: boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_100', name: 'İlk Adım', description: '100₺ kazan', emoji: '🌱', reward: 50, check: (c) => c.totalEarned >= 100 },
  { id: 'first_1k', name: 'Girişimci', description: '1.000₺ kazan', emoji: '💼', reward: 200, check: (c) => c.totalEarned >= 1000 },
  { id: 'first_100k', name: 'Yükselen Yıldız', description: '100K kazan', emoji: '⭐', reward: 5000, check: (c) => c.totalEarned >= 100_000 },
  { id: 'millionaire', name: 'İlk Milyoner', description: '1M toplam kazanç', emoji: '🤑', reward: 50_000, check: (c) => c.totalEarned >= 1_000_000 },
  // Karar 23: Tıklama/combo başarıları kaldırıldı — yerine iş/kariyer kilometre taşları
  { id: 'first_job', name: 'İşe Giriş', description: 'İlk işine gir', emoji: '💼', reward: 100, check: (c) => c.hasJob === true },
  { id: 'career_lv5', name: 'Yükselen Çalışan', description: 'Kariyer seviyesi 5', emoji: '📈', reward: 2000, check: (c) => (c.careerLevel ?? 0) >= 5 },
  { id: 'entrepreneur', name: 'Girişimci', description: 'Tam zamanlı girişimci ol', emoji: '🚀', reward: 5000, check: (c) => c.isEntrepreneur === true },
  { id: 'first_business', name: 'İlk İşletme', description: '1 işletme satın al', emoji: '🏪', reward: 100, check: (c) => Object.values(c.producers).some((n) => n >= 1) },
  { id: 'five_businesses', name: 'Çeşitlendirme', description: '5 farklı işletme', emoji: '🏢', reward: 5000, check: (c) => Object.values(c.producers).filter((n) => n >= 1).length >= 5 },
  { id: 'boss', name: 'Patron', description: 'Her işletmeden en az 1', emoji: '🎩', reward: 100_000, check: (c) => Object.values(c.producers).every((n) => n >= 1) },
  { id: 'prestige_1', name: 'İlk IPO', description: '1 kez birleşme yap', emoji: '📈', reward: 10_000, check: (c) => c.lifetimePrestige >= 1 },
  { id: 'prestige_5', name: 'Borsa Gurusu', description: '5 kez birleşme', emoji: '🏦', reward: 100_000, check: (c) => c.lifetimePrestige >= 5 },
  { id: 'stajyer_10', name: 'Limonata Kralı', description: '10 limonata tezgahı', emoji: '🍋', reward: 500, check: (c) => (c.producers.stajyer ?? 0) >= 10 },
  { id: 'robot_5', name: 'E-ticaret Dehası', description: '5 e-ticaret sitesi', emoji: '🛒', reward: 2000, check: (c) => (c.producers.robot ?? 0) >= 5 },
  { id: 'fabrika_3', name: 'Lojistik Baronu', description: '3 lojistik merkezi', emoji: '🚚', reward: 15_000, check: (c) => (c.producers.fabrika ?? 0) >= 3 },
  { id: 'earn_10m', name: 'On Milyon Kulübü', description: '10M toplam kazanç', emoji: '💎', reward: 500_000, check: (c) => c.totalEarned >= 10_000_000 },
  { id: 'stock_10', name: '10 Hisse Puanı', description: '10 prestij hisse puanı', emoji: '📊', reward: 25_000, check: (c) => c.prestigePoints >= 10 },
  { id: 'manager_1', name: 'İlk CEO', description: '1 yönetici işe al', emoji: '👔', reward: 5000, check: (c) => Object.values(c.managers).some(Boolean) },
  { id: 'stock_trader', name: 'Borsa Oyuncusu', description: '10 hisse al', emoji: '📉', reward: 8000, check: (c) => c.stockShares >= 10 },
  { id: 'weekly_1', name: 'Haftalık Kahraman', description: 'Haftalık etkinlik tamamla', emoji: '🗓️', reward: 3000, check: (c) => c.weeklyClaimed },
  { id: 'lifetime_1m', name: 'Yaşam Boyu Milyoner', description: '1M yaşam boyu kazanç', emoji: '🏆', reward: 25_000, check: (c) => c.lifetimeTotalEarned >= 1_000_000 },
  { id: 'ipo_3', name: 'Seri Girişimci', description: '3 IPO yap', emoji: '🚀', reward: 50_000, check: (c) => c.ipoCount >= 3 },
  { id: 'season_15', name: 'Sezon Ustası', description: 'Sezon yolu tier 15', emoji: '🎯', reward: 30_000, check: (c) => c.seasonTier >= 15 },
  { id: 'tree_6', name: 'Yatırımcı Zihniyeti', description: 'Prestij ağacında 6 node', emoji: '🌳', reward: 40_000, check: (c) => c.prestigeTreeCount >= 6 },
  { id: 'stock_3', name: 'Çeşitli Portföy', description: '3 farklı hisse senedi', emoji: '📈', reward: 20_000, check: (c) => c.stockTickerCount >= 3 },
  { id: 'night_1m', name: 'Gece Vardiyası', description: 'Gece modunda 1M kazan', emoji: '🌙', reward: 35_000, check: (c) => c.nightEarnings >= 1_000_000 },
  { id: 'uydu_1', name: 'Uydu Baronu', description: 'Uydu ağı kur', emoji: '🛰️', reward: 100_000, check: (c) => (c.producers.uydu ?? 0) >= 1 },
  { id: 'merkez_1', name: 'Merkez Bankacı', description: 'Merkez bankası aç', emoji: '🏦', reward: 500_000, check: (c) => (c.producers.merkezbankasi ?? 0) >= 1 },
  { id: 'autobuy_3', name: 'Otomasyon Ustası', description: '3 işletmede auto-buy', emoji: '🤖', reward: 15_000, check: (c) => c.managerAutoBuyCount >= 3 },
  { id: 'season_30', name: 'İmparator', description: 'Sezon yolu tamamla', emoji: '👑', reward: 200_000, check: (c) => c.seasonTier >= 30 },
  { id: 'night_5k', name: 'Gece Kuşu', description: 'Gece modunda 500K kazan', emoji: '🦉', reward: 2_000, check: (c) => c.nightEarnings >= 500_000 },
  { id: 'mega_biz', name: 'Mega Fabrikatör', description: 'Tek bir işletmeden 50+ adet', emoji: '🏭', reward: 8_000, check: (c) => Object.values(c.producers).some((n) => n >= 50) },
  { id: 'tree_5', name: 'Prestij Ustası', description: 'Prestij ağacında 5 node', emoji: '🌲', reward: 20_000, check: (c) => c.prestigeTreeCount >= 5 },
  { id: 'billion_earned', name: 'Milyarder', description: '1 milyar toplam kazan', emoji: '💰', reward: 1_000_000, check: (c) => c.totalEarned >= 1_000_000_000 },
  { id: 'all_businesses', name: 'İmparatorluk Kurucusu', description: 'Tüm yasal işletmelere sahip ol', emoji: '🌍', reward: 500_000, check: (c) => PRODUCERS.filter((p) => !p.illegal).every((p) => (c.producers[p.id] ?? 0) >= 1) },
  { id: 'galaksiyum_1', name: 'Galaktik Baron', description: 'Galaktik imparatorluğu kur', emoji: '🌌', reward: 2_000_000, check: (c) => (c.producers.galaksiyum ?? 0) >= 1 },
  { id: 'kafe_5', name: 'Barista Patronu', description: '5 kahve zinciri', emoji: '☕', reward: 3_000, check: (c) => (c.producers.kafe ?? 0) >= 5 },
  { id: 'illegal_1', name: 'Karanlık Taraf', description: 'İlk illegal işletmeyi aç', emoji: '🕶️', reward: 8_000, check: (c) => (c.producers.bahis ?? 0) >= 1 || (c.producers.piramit ?? 0) >= 1 || (c.producers.offshore ?? 0) >= 1 },
  { id: 'illegal_all', name: 'Underground Kralı', description: 'Tüm klasik illegal işletmelere sahip ol', emoji: '🎭', reward: 250_000, check: (c) => (c.producers.bahis ?? 0) >= 1 && (c.producers.piramit ?? 0) >= 1 && (c.producers.offshore ?? 0) >= 1 },
  { id: 'earn_100m', name: 'Yüz Milyon Kulübü', description: '100M toplam kazanç', emoji: '💵', reward: 100_000, check: (c) => c.totalEarned >= 100_000_000 },
  { id: 'streak_14', name: 'Demir İrade', description: '14 günlük giriş serisi', emoji: '💪', reward: 25_000, check: (c) => c.dailyStreak >= 14 },
  { id: 'streak_30', name: 'Efsane Seri', description: '30 günlük giriş serisi', emoji: '👑', reward: 100_000, check: (c) => c.dailyStreak >= 30 },
  { id: 'comeback_1', name: 'Geri Dönüş', description: 'Comeback bonusu topla', emoji: '🎉', reward: 15_000, check: (c) => c.comebackClaimed },
  { id: 'heat_max_survive', name: 'Radar Kaçkını', description: 'Kritik heatten (%80+) kurtul', emoji: '🕶️', reward: 20_000, check: (c) => c.heatSurvived },
  { id: 'codex_legal', name: 'Yasal Usta', description: 'Tüm yasal işletmeleri aç', emoji: '📗', reward: 50_000, check: (c) => PRODUCERS.filter((p) => !p.illegal && !p.category).every((p) => (c.producers[p.id] ?? 0) >= 1) },
  { id: 'codex_all', name: 'Tam Koleksiyon', description: 'Tüm işletmelere sahip ol', emoji: '📕', reward: 200_000, check: (c) => PRODUCERS.every((p) => (c.producers[p.id] ?? 0) >= 1) },
  { id: 'football_1', name: 'Futbol Patronu', description: 'İlk futbol kulübünü satın al', emoji: '⚽', reward: 12_000, check: (c) => (c.producers.futbol_amateur ?? 0) >= 1 || (c.producers.futbol_superlig ?? 0) >= 1 },
  { id: 'politics_1', name: 'Siyasete Giriş', description: 'Belediye meclisine gir', emoji: '🏛️', reward: 15_000, check: (c) => (c.producers.siyaset_belediye ?? 0) >= 1 },
  { id: 'siyah_fabrika_1', name: 'Siyah Baron', description: 'Siyah fabrika kur', emoji: '🏭', reward: 35_000, check: (c) => (c.producers.siyah_fabrika ?? 0) >= 1 },
  { id: 'superlig_club', name: 'Süper Lig Patronu', description: 'Süper Lig kulübü edin', emoji: '🏟️', reward: 80_000, check: (c) => (c.producers.futbol_superlig ?? 0) >= 1 },
  { id: 'bakan', name: 'Bakan', description: 'Bakanlık bütçesine sahip ol', emoji: '👔', reward: 250_000, check: (c) => (c.producers.siyaset_bakan ?? 0) >= 1 },
  { id: 'theme_3', name: 'Tema Koleksiyoncusu', description: '3 sezon temasını aç', emoji: '🎨', reward: 75_000, check: (c) => c.unlockedThemes.length >= 3 },
  { id: 'underground_lawyer', name: 'Avukatlık', description: 'Avukat tut aksiyonunu kullan', emoji: '⚖️', reward: 10_000, check: (c) => c.undergroundLawyerUsed },
  { id: 'data_center_1', name: 'Bulut Baronu', description: 'Veri merkezi kur', emoji: '🖥️', reward: 12_000, check: (c) => (c.producers.data_center ?? 0) >= 1 },
  { id: 'drone_10', name: 'Gökyüzü Lojistiği', description: '10 drone filosu', emoji: '🚁', reward: 45_000, check: (c) => (c.producers.drone ?? 0) >= 10 },
  { id: 'dynasty_marry', name: 'Hanedan Kurucusu', description: 'Evlilik yap', emoji: '💍', reward: 30_000, check: (c) => c.dynastyMarried },
  { id: 'shop_advisor', name: 'Stratejist', description: 'Mağaza danışmanından 10 alım yap', emoji: '🎯', reward: 15_000, check: (c) => c.advisorBuys >= 10 },
  { id: 'luxury_1', name: 'Lüks Yaşam', description: 'İlk lüks işletmeyi aç', emoji: '💎', reward: 50_000, check: (c) => (c.producers.yacht_filo ?? 0) >= 1 || (c.producers.formula1 ?? 0) >= 1 || (c.producers.casino_legal ?? 0) >= 1 },
  { id: 'hedge_1', name: 'Wall Street', description: 'Hedge fon kur', emoji: '📊', reward: 120_000, check: (c) => (c.producers.hedge_fund ?? 0) >= 1 },
  { id: 'mars_1', name: 'Mars Valisi', description: 'Mars kolonisi kur', emoji: '🔴', reward: 5_000_000, check: (c) => (c.producers.mars ?? 0) >= 1 },
  { id: 'multiverse_1', name: 'Evrenler Arası Baron', description: 'Çoklu evren ticaret ağını aç', emoji: '♾️', reward: 25_000_000, check: (c) => (c.producers.multiverse ?? 0) >= 1 },
  { id: 'biz_50', name: 'Çeşitlilik Ustası', description: '50 farklı işletme türüne sahip ol', emoji: '🗂️', reward: 500_000, check: (c) => Object.values(c.producers).filter((n) => n >= 1).length >= 50 },
]

export function checkNewAchievements(ctx: AchievementContext): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !ctx.achievements.has(a.id) && a.check(ctx))
}
