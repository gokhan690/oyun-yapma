export type BaronSection = 'profile' | 'dynasty' | 'world' | 'events'

export const BARON_TABS: { id: BaronSection; label: string }[] = [
  { id: 'profile', label: '📊 Profil' },
  { id: 'dynasty', label: '👑 Hanedan' },
  { id: 'world', label: '🌍 Dünya' },
  { id: 'events', label: '🎪 Etkinlik' },
]

export const BARON_SECTION_TITLES: Record<Exclude<BaronSection, 'events'>, string> = {
  profile: 'Baron Profili',
  dynasty: 'Hanedan',
  world: 'Dünya & Torpil',
}
