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
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_100', name: 'İlk Adım', description: '100₺ kazan', emoji: '🌱', reward: 50, check: (c) => c.totalEarned >= 100 },
  { id: 'first_1k', name: 'Girişimci', description: '1.000₺ kazan', emoji: '💼', reward: 200, check: (c) => c.totalEarned >= 1000 },
  { id: 'first_100k', name: 'Yükselen Yıldız', description: '100K kazan', emoji: '⭐', reward: 5000, check: (c) => c.totalEarned >= 100_000 },
  { id: 'millionaire', name: 'İlk Milyoner', description: '1M toplam kazanç', emoji: '🤑', reward: 50_000, check: (c) => c.totalEarned >= 1_000_000 },
  { id: 'click_100', name: 'Tıklayıcı', description: '100 tıklama', emoji: '👆', reward: 100, check: (c) => c.totalClicks >= 100 },
  { id: 'click_1k', name: 'Tıklama Tutkunu', description: '1.000 tıklama', emoji: '👊', reward: 1000, check: (c) => c.totalClicks >= 1000 },
  { id: 'click_10k', name: 'Tıklama Canavarı', description: '10.000 tıklama', emoji: '🦾', reward: 10_000, check: (c) => c.totalClicks >= 10_000 },
  { id: 'combo_10', name: 'Hızlı Eller', description: '10 combo', emoji: '⚡', reward: 300, check: (c) => c.comboBest >= 10 },
  { id: 'combo_30', name: 'Tek Elin Gücü', description: '30 combo', emoji: '🔥', reward: 2000, check: (c) => c.comboBest >= 30 },
  { id: 'combo_50', name: 'Combo Kralı', description: '50 combo', emoji: '👑', reward: 10_000, check: (c) => c.comboBest >= 50 },
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
]

export function checkNewAchievements(ctx: AchievementContext): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !ctx.achievements.has(a.id) && a.check(ctx))
}
