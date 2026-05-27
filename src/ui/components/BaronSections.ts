import { t } from '../../i18n'

export type BaronSection = 'profile' | 'dynasty' | 'world' | 'events' | 'lifestyle'

export function getBaronTabs(): { id: BaronSection; label: string }[] {
  return [
    { id: 'profile', label: t('tab_profile') },
    { id: 'dynasty', label: t('tab_dynasty') },
    { id: 'world', label: t('tab_world') },
    { id: 'lifestyle', label: t('tab_lifestyle') },
    { id: 'events', label: t('tab_events') },
  ]
}

export const BARON_TABS: { id: BaronSection; label: string }[] = [
  { id: 'profile', label: '📊 Profil' },
  { id: 'dynasty', label: '👑 Hanedan' },
  { id: 'world', label: '🌍 Dünya' },
  { id: 'lifestyle', label: '🏠 Yaşam' },
  { id: 'events', label: '🎪 Etkinlik' },
]

export function getBaronSectionTitle(section: Exclude<BaronSection, 'events'>): string {
  const map: Record<Exclude<BaronSection, 'events'>, string> = {
    profile: t('baron_section_profile'),
    dynasty: t('baron_section_dynasty'),
    world: t('baron_section_world'),
    lifestyle: t('baron_section_lifestyle'),
  }
  return map[section]
}

export const BARON_SECTION_TITLES: Record<Exclude<BaronSection, 'events'>, string> = {
  profile: 'Baron Profili',
  dynasty: 'Hanedan',
  world: 'Dünya & Torpil',
  lifestyle: 'Yaşam Tarzı',
}
