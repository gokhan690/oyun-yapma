export type FameCareerType = 'muzisyen' | 'oyuncu' | 'sosyal_medya'

export interface FameCareerDef {
  id: FameCareerType
  name: string
  emoji: string
  /** Base daily income (₺) at fame=0 */
  baseDailyIncome: number
}

export const FAME_CAREERS: FameCareerDef[] = [
  { id: 'muzisyen',     name: 'Müzisyen',        emoji: '🎤', baseDailyIncome: 500   },
  { id: 'oyuncu',       name: 'Oyuncu',           emoji: '🎬', baseDailyIncome: 650   },
  { id: 'sosyal_medya', name: 'Sosyal Medya',     emoji: '📱', baseDailyIncome: 350   },
]

export interface FameState {
  fame: number          // 0–100
  activeCareer: FameCareerType | null
  lastActionDay: number
  lastDecayDay: number
  totalFameIncome: number
}

export function createFameState(): FameState {
  return { fame: 0, activeCareer: null, lastActionDay: 0, lastDecayDay: 0, totalFameIncome: 0 }
}

export function fameDef(id: FameCareerType): FameCareerDef {
  return FAME_CAREERS.find((c) => c.id === id)!
}

/** Daily income from fame career: base + fame² × 12 */
export function fameDailyIncome(fs: FameState): number {
  if (!fs.activeCareer) return 0
  const def = fameDef(fs.activeCareer)
  return def.baseDailyIncome + fs.fame * fs.fame * 12
}

/** Label for current fame level */
export function fameLevelLabel(fame: number): string {
  if (fame >= 80) return 'Süper Yıldız'
  if (fame >= 60) return 'Ünlü'
  if (fame >= 40) return 'Tanınan'
  if (fame >= 20) return 'Yükselen'
  if (fame > 0)  return 'Yeni'
  return 'Bilinmiyor'
}

/** Apply a daily fame action. Returns money earned and fame delta. */
export function applyFameAction(
  fs: FameState,
  currentDay: number,
  reputation: number,
): { moneyEarned: number; fameDelta: number; success: boolean } {
  if (!fs.activeCareer || fs.lastActionDay >= currentDay) {
    return { moneyEarned: 0, fameDelta: 0, success: false }
  }
  fs.lastActionDay = currentDay
  const successChance = 0.45 + reputation / 220 + fs.fame / 500
  const success = Math.random() < successChance
  if (success) {
    const fameDelta = 7 + Math.floor(Math.random() * 10)
    const bonus = Math.floor(Math.random() * fameDailyIncome(fs) * 0.8)
    fs.fame = Math.min(100, fs.fame + fameDelta)
    fs.totalFameIncome += bonus
    return { moneyEarned: bonus, fameDelta, success: true }
  }
  return { moneyEarned: 0, fameDelta: 0, success: false }
}

/** Daily decay: -0.05/day active, -0.4/day inactive */
export function tickFameDecay(fs: FameState, currentDay: number): void {
  if (fs.fame <= 0 || fs.lastDecayDay >= currentDay) return
  fs.lastDecayDay = currentDay
  const decay = fs.activeCareer ? 0.05 : 0.4
  fs.fame = Math.max(0, fs.fame - decay)
}
