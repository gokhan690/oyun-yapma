import { MS_PER_GAME_DAY, LIFE_TIME_SCALE } from './GameClock'

export type TimeSkipOption = '1m' | '6m' | '1y' | '5y' | 'retirement' | 'heir18'

export interface TimeSkipDef {
  id: TimeSkipOption
  label: string
  emoji: string
  lifeMonths: number
  /** Brüt gelirden verilen net para oranı */
  incomeRatio: number
  /** Gider işleme oranı */
  expenseRatio: number
  description: string
}

export const TIME_SKIP_OPTIONS: TimeSkipDef[] = [
  {
    id: '1m',
    label: '1 Ay Bekle',
    emoji: '📅',
    lifeMonths: 1,
    incomeRatio: 0.35,
    expenseRatio: 0.5,
    description: 'Küçük ilerleme. Eğitim/çocuk biraz büyür.',
  },
  {
    id: '6m',
    label: '6 Ay Bekle',
    emoji: '📆',
    lifeMonths: 6,
    incomeRatio: 0.20,
    expenseRatio: 0.75,
    description: 'Eğitim/çocuk/proje ilerlemesi için ideal.',
  },
  {
    id: '1y',
    label: '1 Yıl Bekle',
    emoji: '🗓️',
    lifeMonths: 12,
    incomeRatio: 0.12,
    expenseRatio: 1.0,
    description: 'Yaş ve varis sistemi için kullan.',
  },
  {
    id: '5y',
    label: '5 Yıl Bekle',
    emoji: '⏳',
    lifeMonths: 60,
    incomeRatio: 0.05,
    expenseRatio: 1.0,
    description: 'Geç oyun hanedan hızlandırma. Risk yüksek!',
  },
  {
    id: 'retirement',
    label: 'Emekliliğe Kadar',
    emoji: '🌅',
    lifeMonths: -1,
    incomeRatio: 0.04,
    expenseRatio: 1.0,
    description: '55+ yaşa kadar bekle. Devir hazırlığı için.',
  },
  {
    id: 'heir18',
    label: 'Varis 18 Olana Kadar',
    emoji: '👶',
    lifeMonths: -2,
    incomeRatio: 0.08,
    expenseRatio: 1.0,
    description: 'Çocuk 18 yaşına gelene kadar bekle.',
  },
]

export interface TimeSkipRisk {
  id: string
  message: string
  emoji: string
  probability: number
}

export interface TimeSkipContext {
  heat: number
  loan: number
  totalIncome: number
  playerAge: number
  stress: number
  hasHeir: boolean
  hasWill: boolean
  stockPortfolioValue: number
  reputation: number
}

export interface TimeSkipResult {
  lifeMonthsAdvanced: number
  /** Gerçek zamanda ne kadar oyun ms'i atlandı */
  econTimeMsAdvanced: number
  moneyGained: number
  expensesPaid: number
  risks: TimeSkipRisk[]
  warnings: string[]
  blocked: boolean
  blockedReason: string
}

/** Time skip'te toplam oyun ms hesabı (hayat günleri × ekon günü oranı) */
export function timeSkipEconMs(lifeMonths: number): number {
  const lifeDays = lifeMonths * 30
  const econDays = lifeDays / LIFE_TIME_SCALE
  return econDays * MS_PER_GAME_DAY
}

/** Skip öncesi uyarılar */
export function getTimeSkipWarnings(skipId: TimeSkipOption, ctx: TimeSkipContext): string[] {
  const warnings: string[] = []
  const def = TIME_SKIP_OPTIONS.find((s) => s.id === skipId)
  if (!def) return warnings

  const isLong = def.lifeMonths > 12 || def.lifeMonths < 0

  if (ctx.heat >= 80) warnings.push(`☢️ Heat çok yüksek (${Math.round(ctx.heat)}) — büyük baskın riski`)
  else if (ctx.heat >= 50) warnings.push(`⚠️ Heat yüksek (${Math.round(ctx.heat)}) — baskın olabilir`)

  if (ctx.loan > ctx.totalIncome * 365 * 2) warnings.push(`💸 Borçların gelirinin 2 yılından fazla — finansal çöküş olabilir`)

  if (!ctx.hasHeir && isLong) warnings.push(`👨‍👧 Varis seçilmemiş — miras kavgası çıkabilir`)

  if (ctx.stress >= 90) warnings.push(`😰 Stres çok yüksek (${Math.round(ctx.stress)}) — sağlık riski yüksek`)
  else if (ctx.stress >= 70 && isLong) warnings.push(`😓 Stres yüksek — sağlık riski var`)

  if (ctx.playerAge >= 65) warnings.push(`👴 Yaş ${ctx.playerAge} — ölüm riski arttı`)

  if (ctx.stockPortfolioValue > ctx.totalIncome * 365 * 3) {
    warnings.push(`📉 Büyük borsa portföyü — piyasa çöküşü yaşanabilir`)
  }

  if (ctx.reputation < 20 && isLong) {
    warnings.push(`📰 İtibar düşük (${Math.round(ctx.reputation)}) — medya skandalı çıkabilir`)
  }

  return warnings
}

/** Skip sonrası risk roll */
export function rollTimeSkipRisks(skipId: TimeSkipOption, ctx: TimeSkipContext): TimeSkipRisk[] {
  const risks: TimeSkipRisk[] = []
  const def = TIME_SKIP_OPTIONS.find((s) => s.id === skipId)
  if (!def) return risks

  const months = def.lifeMonths > 0 ? def.lifeMonths : 24
  const riskScale = Math.min(3, months / 12)

  if (ctx.heat >= 50 && Math.random() < 0.3 * riskScale) {
    risks.push({
      id: 'raid',
      message: 'Baskın gerçekleşti! Nakit kaybı yaşandı.',
      emoji: '🚔',
      probability: 0.3,
    })
  }

  if (ctx.playerAge >= 65 && Math.random() < 0.1 * riskScale) {
    risks.push({
      id: 'health',
      message: 'Sağlık sorunu yaşandı. Gelir düştü.',
      emoji: '🏥',
      probability: 0.1,
    })
  }

  if (!ctx.hasHeir && months >= 12 && Math.random() < 0.2 * riskScale) {
    risks.push({
      id: 'family_dispute',
      message: 'Aile anlaşmazlığı çıktı. İtibar azaldı.',
      emoji: '👨‍👩‍👦',
      probability: 0.2,
    })
  }

  if (ctx.loan > ctx.totalIncome * 365 && Math.random() < 0.25 * riskScale) {
    risks.push({
      id: 'debt_crisis',
      message: 'Borç krizi! Nakit sıkıntısı yaşandı.',
      emoji: '💳',
      probability: 0.25,
    })
  }

  if (ctx.stockPortfolioValue > ctx.totalIncome * 365 * 2 && Math.random() < 0.2 * riskScale) {
    risks.push({
      id: 'market_crash',
      message: 'Piyasa çöküşü yaşandı! Portföy değer kaybetti.',
      emoji: '📉',
      probability: 0.2,
    })
  }

  return risks
}

/** Reklam time skip'te yalnızca küçük bonus verir */
export function adTimeSkipBonus(skipId: TimeSkipOption): number {
  const def = TIME_SKIP_OPTIONS.find((s) => s.id === skipId)
  if (!def) return 0
  if (def.lifeMonths <= 1) return 0.20
  if (def.lifeMonths <= 12) return 0.10
  return 0
}
