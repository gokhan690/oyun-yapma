export type CrisisId = 'economic' | 'scandal' | 'rival_attack'

export interface CrisisChoice {
  id: string
  label: string
  description: string
}

export interface CrisisDef {
  id: CrisisId
  title: string
  emoji: string
  description: string
  durationMs: number
  choices: CrisisChoice[]
}

export interface ActiveCrisis {
  crisisId: CrisisId
  startedAt: number
  expiresAt: number
  resolved: boolean
}

export const CRISIS_DEFS: CrisisDef[] = [
  {
    id: 'economic',
    title: 'Ekonomik Kriz',
    emoji: '📉',
    description: 'Piyasalar çöktü — tüm gelirler geçici olarak baskı altında.',
    durationMs: 120_000,
    choices: [
      { id: 'sell', label: 'A) Hızlı sat, zararı kes', description: 'Gelir -%20 ama krizden erken çıkarsın' },
      { id: 'hold', label: 'B) Tut ve bekle', description: 'Risk — kriz bitince +%40 bonus şansı' },
      { id: 'buy', label: 'C) Ucuza al', description: 'Nakit/kredi gerekir — büyük fırsat penceresi' },
    ],
  },
  {
    id: 'scandal',
    title: 'Siyasi Skandal',
    emoji: '📰',
    description: 'Birisi seni ihbar etti — 24 saat içinde harekete geç.',
    durationMs: 90_000,
    choices: [
      { id: 'lobby', label: 'A) Lobi yap', description: 'Para harca, itibar korunur' },
      { id: 'pay', label: 'B) Para cezası öde', description: 'Hızlı çözüm, itibar -5' },
      { id: 'deny', label: 'C) Reddet ve savaş', description: 'Ücretsiz ama itibar -15, medya saldırır' },
    ],
  },
  {
    id: 'rival_attack',
    title: 'Rakip Saldırısı',
    emoji: '⚔️',
    description: 'Rakip aile senin sektörüne agresif girdi.',
    durationMs: 100_000,
    choices: [
      { id: 'pricewar', label: 'A) Fiyat savaşı', description: 'Gelir -%25 geçici, rakip geriler' },
      { id: 'retreat', label: 'B) Sektörden çekil', description: 'O sektör geliri 3 gün düşük' },
      { id: 'merge_talk', label: 'C) Birleşme masası', description: 'Büyük ödeme — rakiple ittifak' },
    ],
  },
]

export function crisisDef(id: CrisisId): CrisisDef {
  return CRISIS_DEFS.find((c) => c.id === id) ?? CRISIS_DEFS[0]!
}

export function pickRandomCrisis(): CrisisId {
  const ids: CrisisId[] = ['economic', 'scandal', 'rival_attack']
  return ids[Math.floor(Math.random() * ids.length)]!
}
