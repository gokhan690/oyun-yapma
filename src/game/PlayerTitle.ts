export interface TitleContext {
  reputation: number
  illegalHeat: number
  illegalTypesOwned: number
  politicsLevel: string
  bankruptcyCount: number
  totalRaidsCaught: number
  lifetimeTotalEarned: number
}

export interface PlayerTitleDef {
  id: string
  label: string
  emoji: string
}

const TITLES: { id: string; label: string; emoji: string; match: (c: TitleContext) => number }[] = [
  {
    id: 'shadow',
    label: 'Gölge Baron',
    emoji: '🕶️',
    match: (c) => (c.illegalTypesOwned >= 3 && c.illegalHeat > 40 ? 90 : c.illegalTypesOwned >= 2 ? 50 : 0),
  },
  {
    id: 'power',
    label: 'Güç Düşkünü',
    emoji: '🎖️',
    match: (c) => (c.politicsLevel === 'cumhurbaskan' ? 100 : c.politicsLevel === 'bakan' ? 70 : c.politicsLevel !== 'none' ? 40 : 0),
  },
  {
    id: 'clean',
    label: 'Tertemiz İşadamı',
    emoji: '✨',
    match: (c) => (c.reputation >= 75 && c.illegalTypesOwned === 0 && c.totalRaidsCaught === 0 ? 95 : c.reputation >= 60 ? 40 : 0),
  },
  {
    id: 'mad',
    label: 'Deli Cesur',
    emoji: '🎲',
    match: (c) => (c.bankruptcyCount >= 1 && c.lifetimeTotalEarned > 500_000 ? 80 : 0),
  },
  {
    id: 'tycoon',
    label: 'Baron',
    emoji: '👔',
    match: (c) => (c.lifetimeTotalEarned >= 10_000_000 ? 60 : c.lifetimeTotalEarned >= 1_000_000 ? 30 : 10),
  },
]

export function computePlayerTitle(ctx: TitleContext): PlayerTitleDef {
  let best = TITLES[TITLES.length - 1]!
  let bestScore = 0
  for (const t of TITLES) {
    const s = t.match(ctx)
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }
  return { id: best.id, label: best.label, emoji: best.emoji }
}
