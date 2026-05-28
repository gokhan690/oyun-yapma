export type ThemeId = 'default' | 'light' | 'dark' | 'gold' | 'neon' | 'galactic' | 'night' | 'beach' | 'red'

export interface ThemeDef {
  id: ThemeId
  name: string
  unlockTier: number
  ipoRequired?: number
  cssClass: string
  emoji: string
  hint: string
}

export const THEMES: ThemeDef[] = [
  { id: 'default', name: 'Açık Beyaz', unlockTier: 0, cssClass: 'theme-light', emoji: '☀️', hint: 'Varsayılan açık tema' },
  { id: 'light', name: 'Açık Beyaz', unlockTier: 0, cssClass: 'theme-light', emoji: '☀️', hint: 'Açık tema' },
  { id: 'dark', name: 'Koyu Klasik', unlockTier: 0, cssClass: 'theme-dark', emoji: '🌑', hint: 'Koyu tema' },
  { id: 'gold', name: 'Altın Çağ', unlockTier: 10, cssClass: 'theme-gold', emoji: '✨', hint: 'Sezon 10\'da açılır' },
  { id: 'night', name: 'Gece Efendisi', unlockTier: 15, cssClass: 'theme-night', emoji: '🌙', hint: 'Sezon 15\'de açılır' },
  { id: 'neon', name: 'Neon Kent', unlockTier: 20, cssClass: 'theme-neon', emoji: '💜', hint: 'Sezon 20\'de açılır' },
  { id: 'beach', name: 'Tatil Cenneti', unlockTier: 0, ipoRequired: 3, cssClass: 'theme-beach', emoji: '🏖️', hint: '3 IPO yapınca açılır' },
  { id: 'red', name: 'Kırmızı Baron', unlockTier: 0, ipoRequired: 5, cssClass: 'theme-red', emoji: '🔴', hint: '5 IPO yapınca açılır' },
  { id: 'galactic', name: 'Galaktik', unlockTier: 30, cssClass: 'theme-galactic', emoji: '🌌', hint: 'Sezon 30\'da açılır' },
]

export function themeForTier(tier: number): ThemeId | null {
  if (tier === 30) return 'galactic'
  if (tier === 20) return 'neon'
  if (tier === 15) return 'night'
  if (tier === 10) return 'gold'
  return null
}

export function themeForIpoCount(ipoCount: number): ThemeId | null {
  if (ipoCount >= 5) return 'red'
  if (ipoCount >= 3) return 'beach'
  return null
}

export function themeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
