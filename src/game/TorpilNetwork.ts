import { requiredDomainText } from '../i18n'

export type TorpilId = 'amca_rifat' | 'sinan_bank' | 'siyaset_tanidik' | 'medya_partner'

export interface TorpilContactDef {
  id: TorpilId
  name: string
  role: string
  emoji: string
  description: string
  hireCost: number
  giftCost: number
  giftIntervalDays: number
}

export interface TorpilContactState {
  id: TorpilId
  active: boolean
  lastGiftGameDay: number
  giftDue: boolean
}

export const TORPIL_CONTACTS: TorpilContactDef[] = [
  {
    id: 'amca_rifat',
    name: 'Amca Rıfat',
    role: 'Belediye bağlantısı',
    emoji: '🤝',
    description: 'Yeni işletme açarken %20 indirim — ama her 30 günde hediye ister',
    hireCost: 15_000,
    giftCost: 5_000,
    giftIntervalDays: 30,
  },
  {
    id: 'sinan_bank',
    name: 'Eski Okul Arkadaşı Sinan',
    role: 'Banka müdürü',
    emoji: '🏦',
    description: 'Kredi skoru düşük olsa bile kredi — itibar riski',
    hireCost: 40_000,
    giftCost: 8_000,
    giftIntervalDays: 45,
  },
  {
    id: 'siyaset_tanidik',
    name: 'Siyasetçi Tanışıklık',
    role: 'Koruma ağı',
    emoji: '🎖️',
    description: 'Polis baskınlarında önceden haber — heat düşer',
    hireCost: 60_000,
    giftCost: 12_000,
    giftIntervalDays: 40,
  },
  {
    id: 'medya_partner',
    name: 'Medya Ortağı Ceylan',
    role: 'Medya & PR',
    emoji: '📰',
    description: 'İtibar darbelerini azaltır, rakip olaylarını önceden haber verir — her 35 günde görevli ister',
    hireCost: 85_000,
    giftCost: 15_000,
    giftIntervalDays: 35,
  },
]

export function createTorpilState(): TorpilContactState[] {
  return TORPIL_CONTACTS.map((c) => ({
    id: c.id,
    active: false,
    lastGiftGameDay: 0,
    giftDue: false,
  }))
}

export function torpilDef(id: TorpilId): TorpilContactDef {
  return TORPIL_CONTACTS.find((c) => c.id === id) ?? TORPIL_CONTACTS[0]!
}

export function torpilName(def: TorpilContactDef): string {
  return requiredDomainText(`torpil_${def.id}_name`)
}
export function torpilRole(def: TorpilContactDef): string {
  return requiredDomainText(`torpil_${def.id}_role`)
}
export function torpilDesc(def: TorpilContactDef): string {
  return requiredDomainText(`torpil_${def.id}_desc`)
}

export function torpilBusinessDiscount(active: TorpilContactState[]): number {
  return active.find((t) => t.id === 'amca_rifat' && t.active && !t.giftDue) ? 0.2 : 0
}

export function torpilBypassCreditScore(active: TorpilContactState[]): boolean {
  return active.some((t) => t.id === 'sinan_bank' && t.active && !t.giftDue)
}

export function torpilRaidWarning(active: TorpilContactState[]): boolean {
  return active.some((t) => t.id === 'siyaset_tanidik' && t.active && !t.giftDue)
}

export function torpilMediaProtect(active: TorpilContactState[]): boolean {
  return active.some((t) => t.id === 'medya_partner' && t.active && !t.giftDue)
}

export function torpilRelationScore(st: TorpilContactState, def: TorpilContactDef, currentGameDay: number): number {
  if (!st.active) return 0
  if (st.giftDue) return 15
  const elapsed = Math.max(0, currentGameDay - st.lastGiftGameDay)
  return Math.max(10, Math.round(100 - (elapsed / def.giftIntervalDays) * 90))
}
