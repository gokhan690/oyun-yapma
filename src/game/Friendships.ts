/** Arkadaş sistemi — 5 arkadaş tipi, ilişki puanı (0-100), bonuslar */

import { requiredDomainText } from '../i18n'

export type FriendTypeId = 'work_colleague' | 'school_friend' | 'neighborhood_friend' | 'rival_turned_friend' | 'mentor_friend'

export interface FriendDef {
  id: FriendTypeId
  name: string
  emoji: string
  description: string
  /** Günlük doğal düşüş */
  dailyDecay: number
  /** Yüksek ilişkide (80+) verilen bonus etiketi */
  highBonusLabel: string
  /** Kazanılma koşulu (minimum totalEarned) */
  unlockAt: number
}

export const FRIEND_TYPES: FriendDef[] = [
  {
    id: 'work_colleague',
    name: 'İş Arkadaşı',
    emoji: '💼',
    description: 'Sektörden tanışık bir iş insanı',
    dailyDecay: 0.05,
    highBonusLabel: 'İş fırsatı bildirimi · Maliyet −3%',
    unlockAt: 5_000,
  },
  {
    id: 'school_friend',
    name: 'Okul Arkadaşı',
    emoji: '🎓',
    description: 'Eski bir okul arkadaşı, şimdi farklı sektörde',
    dailyDecay: 0.04,
    highBonusLabel: 'Araştırma hızı +%5 · Stres −5/gün',
    unlockAt: 1_000,
  },
  {
    id: 'neighborhood_friend',
    name: 'Mahalle Arkadaşı',
    emoji: '🏘️',
    description: 'Uzun yıllardır tanışık bir komşu',
    dailyDecay: 0.03,
    highBonusLabel: 'İtibar +10/ay · Moral desteği',
    unlockAt: 500,
  },
  {
    id: 'rival_turned_friend',
    name: 'Rakip Dost',
    emoji: '🤝',
    description: 'Bir zamanlar rakipken dosta dönüşen biri',
    dailyDecay: 0.06,
    highBonusLabel: 'Rakip saldırılarına karşı uyarı · Gelir +%5',
    unlockAt: 50_000,
  },
  {
    id: 'mentor_friend',
    name: 'Mentor',
    emoji: '🧓',
    description: 'Deneyimli bir iş insanı, rehberlik eder',
    dailyDecay: 0.02,
    highBonusLabel: 'Prestij çarpanı +%10 · Özel tavsiye',
    unlockAt: 20_000,
  },
]

export interface FriendState {
  typeId: FriendTypeId
  name: string
  relationship: number
  lastInteractDay: number
  /** Kaç kez vakit geçirildi */
  interactCount: number
}

export interface FriendshipsState {
  friends: FriendState[]
  lastFriendshipTickDay: number
}

export function createFriendshipsState(): FriendshipsState {
  return { friends: [], lastFriendshipTickDay: 0 }
}

export function friendTypeDef(id: FriendTypeId): FriendDef {
  return FRIEND_TYPES.find((f) => f.id === id)!
}

export function friendName(f: FriendDef): string {
  return requiredDomainText(`friend_${f.id}_name`)
}
export function friendDesc(f: FriendDef): string {
  return requiredDomainText(`friend_${f.id}_desc`)
}
export function friendBonus(f: FriendDef): string {
  return requiredDomainText(`friend_${f.id}_bonus`)
}

/** Günlük decay uygulaması */
export function tickFriendships(state: FriendshipsState, currentDay: number): void {
  if (currentDay <= state.lastFriendshipTickDay) return
  const days = currentDay - state.lastFriendshipTickDay
  state.lastFriendshipTickDay = currentDay
  for (const f of state.friends) {
    const def = friendTypeDef(f.typeId)
    f.relationship = Math.max(0, f.relationship - def.dailyDecay * days)
  }
}

/** Yeni arkadaş ekle (zaten varsa hiçbir şey yapmaz) */
export function addFriend(state: FriendshipsState, typeId: FriendTypeId, name: string, currentDay: number): void {
  if (state.friends.some((f) => f.typeId === typeId)) return
  state.friends.push({
    typeId,
    name,
    relationship: 30,
    lastInteractDay: currentDay,
    interactCount: 0,
  })
}

/** Vakit geçir — mevduat 5-15 puan artış */
export function spendTimeWithFriend(state: FriendshipsState, typeId: FriendTypeId, currentDay: number): number {
  const f = state.friends.find((f) => f.typeId === typeId)
  if (!f) return 0
  const gain = 8 + Math.floor(Math.random() * 8)
  f.relationship = Math.min(100, f.relationship + gain)
  f.lastInteractDay = currentDay
  f.interactCount++
  return gain
}

/** Para gönder (10K) — ilişki +15 */
export function sendMoneyToFriend(state: FriendshipsState, typeId: FriendTypeId, currentDay: number): number {
  const f = state.friends.find((f) => f.typeId === typeId)
  if (!f) return 0
  const gain = 15
  f.relationship = Math.min(100, f.relationship + gain)
  f.lastInteractDay = currentDay
  return gain
}

/** Olay birlikte atlatıldı — +20 */
export function friendSharedEvent(state: FriendshipsState, typeId: FriendTypeId, currentDay: number): void {
  const f = state.friends.find((f) => f.typeId === typeId)
  if (!f) return
  f.relationship = Math.min(100, f.relationship + 20)
  f.lastInteractDay = currentDay
}

/** Yüksek ilişki (80+) aktif bonus çarpanları */
export function friendshipIncomeMult(state: FriendshipsState): number {
  let mult = 1
  const rival = state.friends.find((f) => f.typeId === 'rival_turned_friend')
  if (rival && rival.relationship >= 80) mult *= 1.05
  return mult
}

export function friendshipCostMult(state: FriendshipsState): number {
  let mult = 1
  const work = state.friends.find((f) => f.typeId === 'work_colleague')
  if (work && work.relationship >= 80) mult *= 0.97
  return mult
}

export function friendshipPrestigeMult(state: FriendshipsState): number {
  let mult = 1
  const mentor = state.friends.find((f) => f.typeId === 'mentor_friend')
  if (mentor && mentor.relationship >= 80) mult *= 1.10
  return mult
}

export function friendshipStressDaily(state: FriendshipsState): number {
  const school = state.friends.find((f) => f.typeId === 'school_friend')
  if (school && school.relationship >= 80) return -5
  return 0
}

export function friendshipReputationMonthly(state: FriendshipsState): number {
  const neighbor = state.friends.find((f) => f.typeId === 'neighborhood_friend')
  if (neighbor && neighbor.relationship >= 80) return 10
  return 0
}

/** Kilit açılmış (totalEarned >= unlockAt) ama henüz eklenmemiş arkadaş tipleri */
export function availableToUnlockFriends(state: FriendshipsState, totalEarned: number): FriendDef[] {
  return FRIEND_TYPES.filter(
    (def) => totalEarned >= def.unlockAt && !state.friends.some((f) => f.typeId === def.id),
  )
}

export const FRIEND_SEND_MONEY_COST = 10_000

const FRIEND_NAMES: Record<FriendTypeId, string[]> = {
  work_colleague: ['Mert', 'Canan', 'Barış', 'Hande'],
  school_friend: ['Okan', 'Pınar', 'Serkan', 'Buse'],
  neighborhood_friend: ['Hasan', 'Fatma', 'Yılmaz', 'Güler'],
  rival_turned_friend: ['Tarık', 'Sena', 'Volkan', 'Dilara'],
  mentor_friend: ['Nuri Bey', 'Hüsnü Bey', 'Türkan Hanım'],
}

export function randomFriendName(typeId: FriendTypeId): string {
  const pool = FRIEND_NAMES[typeId]
  return pool[Math.floor(Math.random() * pool.length)]
}
