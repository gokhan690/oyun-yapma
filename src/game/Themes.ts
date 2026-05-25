export type ThemeId = 'default' | 'gold' | 'neon' | 'galactic'

export interface ThemeDef {
  id: ThemeId
  name: string
  unlockTier: number
  cssClass: string
}

export const THEMES: ThemeDef[] = [
  { id: 'default', name: 'Klasik', unlockTier: 0, cssClass: '' },
  { id: 'gold', name: 'Altın', unlockTier: 10, cssClass: 'theme-gold' },
  { id: 'neon', name: 'Neon', unlockTier: 20, cssClass: 'theme-neon' },
  { id: 'galactic', name: 'Galaktik', unlockTier: 30, cssClass: 'theme-galactic' },
]

export function themeForTier(tier: number): ThemeId | null {
  if (tier === 30) return 'galactic'
  if (tier === 20) return 'neon'
  if (tier === 10) return 'gold'
  return null
}

export function themeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!
}
