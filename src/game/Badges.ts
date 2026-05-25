export interface BadgeDef {
  id: string
  name: string
  emoji: string
  description: string
}

export const BADGES: BadgeDef[] = [
  { id: 'streak_7', name: 'Sadık Baron', emoji: '🔥', description: '7 günlük giriş serisi' },
  { id: 'streak_14', name: 'Demir İrade', emoji: '💪', description: '14 günlük giriş serisi' },
  { id: 'streak_30', name: 'Efsane Seri', emoji: '👑', description: '30 günlük giriş serisi' },
  { id: 'comeback', name: 'Geri Dönüş', emoji: '🎉', description: '24 saat+ away comeback bonusu' },
  { id: 'season_10', name: 'Sezon Kahramanı', emoji: '🏅', description: 'Sezon tier 10' },
  { id: 'season_20', name: 'Sezon Ustası', emoji: '🥇', description: 'Sezon tier 20' },
  { id: 'season_30', name: 'Sezon Efsanesi', emoji: '🏆', description: 'Sezon tier 30' },
  { id: 'theme_gold', name: 'Altın Baron', emoji: '✨', description: 'Altın tema açıldı' },
  { id: 'theme_neon', name: 'Neon Gece', emoji: '🌃', description: 'Neon tema açıldı' },
  { id: 'theme_galactic', name: 'Galaktik', emoji: '🌌', description: 'Galaktik tema açıldı' },
  { id: 'codex_legal', name: 'Yasal Usta', emoji: '📗', description: 'Tüm yasal işletmeler' },
  { id: 'codex_all', name: 'Tam Koleksiyon', emoji: '📕', description: '17 işletmenin hepsi' },
  { id: 'underground_lawyer', name: 'Avukatlık', emoji: '⚖️', description: 'İlk avukat kullanımı' },
  { id: 'heat_survive', name: 'Radar Kaçkını', emoji: '🕶️', description: 'Kritik heatten kurtul' },
  { id: 'investor', name: 'Yatırımcı Şansı', emoji: '💎', description: 'Sürpriz yatırımcı yakaladın' },
]

export function badgeDef(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id)
}
