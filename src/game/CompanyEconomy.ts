import { PRODUCERS, producerName, isProducerUnlocked, type ProducerDef } from './Economy'
import { gameDay } from './GameClock'
import { namedManagerDef, type NamedManagerId } from './NamedManagers'
import type { GameState } from './GameState'

/**
 * TUR15-B — Merkezi şirket ekonomisi snapshot'ı (TEK KAYNAK).
 *
 * Bütün türetilmiş ekonomik değerler (brüt gelir, gider, net kâr, geri dönüş,
 * değerleme, nakit metrikleri, yatırım etiketleri) buradan üretilir. UI hiçbir
 * ekonomik formülü kendisi hesaplamaz; settlement ile snapshot aynı domain
 * helper'larını (`producerIncome`, `assignedManagerDailySalary`,
 * `dailySettlementBreakdown`) kullanır. Snapshot state DEĞİŞTİRMEZ ve hiçbir
 * alanı save EDİLMEZ.
 */

/** producerIncome çarpım hattındaki faktör aileleri (sıra pipeline sırasıdır). */
export type IncomeFactorId =
  | 'upgrades'
  | 'synergy'
  | 'manager'
  | 'weekly'
  | 'illegal_bonus'
  | 'market_news'
  | 'spouse'
  | 'underground'
  | 'empire_dark'
  | 'empire_sport'
  | 'obsolescence'
  | 'hobby'
  | 'city'
  | 'firm_level'
  | 'firm_upgrades'
  | 'departments'

export interface IncomeFactor {
  id: IncomeFactorId
  mult: number
}

/**
 * `producerIncome` = base × owned × Π(factors.mult) × passiveMult.
 * Faktörler pipeline'daki çarpım sırasını AYNEN korur (bit-for-bit eşitlik).
 */
export interface ProducerIncomeFactors {
  base: number
  owned: number
  factors: IncomeFactor[]
  passiveMult: number
}

export type InvestmentLabel =
  | 'fastest_payback'
  | 'best_net'
  | 'affordable'
  | 'long_term'
  | 'low_reserve'
  | 'inefficient'
  | 'risk_manager'

export interface FirmEconomyBreakdown {
  producerId: string
  firmName: string
  tier: number
  owned: number
  unlocked: boolean
  /** Bir SONRAKİ birimin gerçek satın alma fiyatı (tüm indirimler dahil). */
  purchasePrice: number
  /** Ölçeklenmiş taban gelir × adet (çarpansız). */
  baseIncome: number
  /** Faktör etkileri marjinaldir: effect = gross − gross / aileninÇarpanı. */
  levelEffect: number
  /** Eskime kaybı — modernize edilmemişse ≤ 0. */
  modernizationEffect: number
  upgradeEffect: number
  managerGrossEffect: number
  /** === `producerIncome(def)` */
  grossIncome: number
  /** === `managerDailySalaryFor(producerId)` */
  managerSalary: number
  /** TUR15-B'de 0 — TUR15-C işletme giderleri için rezerv. */
  otherOperatingExpenses: number
  totalExpenses: number
  netProfit: number
  /** purchasePrice / satınAlmaGelirDeltası; delta ≤ 0 ise null (geri dönüş yok). */
  paybackDays: number | null
  estimatedFirmValue: number
  affordability: boolean
  cashAfterPurchase: number
  /** max(0, kalan nakit) / alım sonrası günlük giderler; gider yoksa null (∞). */
  expenseCoverageDaysAfterPurchase: number | null
  labels: InvestmentLabel[]
}

export interface ExpenseBreakdownLine {
  source: 'manager_salary' | 'other'
  labelKey: string
  amount: number
}

export interface CompanyEconomySnapshot {
  generatedAtDay: number
  cash: number
  /** Yalnız firmaların günlük brüt geliri (hanedan/karakter/kariyer HARİÇ). */
  grossDailyIncome: number
  /** === `assignedManagerDailySalary()` */
  totalDailyExpenses: number
  /** ŞİRKET faaliyet neti: grossDailyIncome − totalDailyExpenses. */
  netDailyProfit: number
  /** Kişisel gelir satırları — şirket netine DAHİL DEĞİL. */
  careerWageDaily: number
  dynastyDailyIncome: number
  characterDailyBonus: number
  /** === `dailySettlementBreakdown().total` (köprü kimliği testle kilitlenir). */
  settlementTotalDaily: number
  /** Kasa / günlük giderler. Gider yoksa null (∞); kasa ≤ 0 ise 0. */
  expenseCoverageDays: number | null
  /** Kasa / |günlük zarar|. Zarar yoksa null; kasa ≤ 0 ise 0. AYRI kavram. */
  lossRunwayDays: number | null
  totalFirmValue: number
  /** cash + Σ firma değeri — `financeNetWorth()` (kişisel servet) ile karıştırılmaz. */
  companyValuation: number
  firmBreakdowns: FirmEconomyBreakdown[]
  expenseBreakdowns: ExpenseBreakdownLine[]
}

/** Pozitif günlük net kârın firma değerine katkı çarpanı (gün cinsinden). */
export const PROFIT_MULTIPLE_DAYS = 90
/** Alım sonrası gider karşılama bu günün altına inerse `low_reserve` uyarısı. */
export const LOW_COVERAGE_WARN_DAYS = 10
/** Bu günden uzun geri dönüş `long_term` etiketi alır. */
export const LONG_TERM_PAYBACK_DAYS = 90
/** Kart başına en fazla bu kadar etiket basılır. */
export const MAX_LABELS_PER_FIRM = 2

/** Yalnız risk/heat faydası sağlayan menajerler — ekonomik ROI hesaplanmaz. */
export function isUtilityManager(managerId: NamedManagerId): boolean {
  return namedManagerDef(managerId)?.role === 'utility'
}

function factorFamilyMult(factors: IncomeFactor[], id: IncomeFactorId): number {
  let mult = 1
  for (const f of factors) if (f.id === id) mult *= f.mult
  return mult
}

/** Marjinal faktör etkisi: aile çarpanı kaldırılsaydı gelir ne kadar değişirdi. */
function factorEffect(gross: number, familyMult: number): number {
  if (familyMult === 1 || familyMult <= 0 || gross === 0) return 0
  return gross - gross / familyMult
}

function buildFirmBreakdown(
  s: GameState,
  def: ProducerDef,
  cash: number,
): FirmEconomyBreakdown {
  const owned = s.producers[def.id] ?? 0
  const factors = s.producerIncomeFactors(def)
  const grossIncome = s.producerIncome(def)
  const managerSalary = s.managerDailySalaryFor(def.id)
  const otherOperatingExpenses = 0
  const totalExpenses = managerSalary + otherOperatingExpenses
  const netProfit = grossIncome - totalExpenses

  const purchasePrice = s.producerCostFor(def, owned, 1)
  const buyDelta = s.producerIncomeBuyDelta(def, 1)
  const paybackDays = buyDelta > 0 ? purchasePrice / buyDelta : null

  const unlocked = isProducerUnlocked(def, s.totalEarned, s.forcedUnlocks, s.ipoCount)
  const affordability = unlocked && cash >= purchasePrice
  const cashAfterPurchase = cash - purchasePrice
  // TUR15-B B2-B — Dinamik maaş modelinde +1 birim alım, satın alınan firmanın
  // menajerinin marjinal katkısını (ve dolayısıyla maaşını) büyütebilir; global
  // synergy/passive çarpanlar üzerinden BAŞKA firmalara atanmış menajerlerin
  // maaşını da etkileyebilir. Bu yüzden toplam gider tek kaynaktan
  // (`projectedAssignedManagerDailySalary`) yeniden hesaplanır — formül burada
  // KOPYALANMAZ.
  const projectedExpensesAfter = s.projectedAssignedManagerDailySalary(def.id, 1)
  const expenseCoverageDaysAfterPurchase = projectedExpensesAfter <= 0
    ? null
    : Math.max(0, cashAfterPurchase) / projectedExpensesAfter

  const resaleValue = owned > 0 ? Math.floor(0.55 * s.producerCostFor(def, 0, owned)) : 0
  const profitComponent = owned > 0 ? Math.max(0, netProfit) * PROFIT_MULTIPLE_DAYS : 0
  const estimatedFirmValue = resaleValue + profitComponent

  return {
    producerId: def.id,
    firmName: producerName(def),
    tier: def.tier,
    owned,
    unlocked,
    purchasePrice,
    baseIncome: factors.base * factors.owned,
    levelEffect: factorEffect(grossIncome, factorFamilyMult(factors.factors, 'firm_level')),
    modernizationEffect: factorEffect(grossIncome, factorFamilyMult(factors.factors, 'obsolescence')),
    upgradeEffect: factorEffect(grossIncome, factorFamilyMult(factors.factors, 'firm_upgrades')),
    managerGrossEffect: factorEffect(grossIncome, factorFamilyMult(factors.factors, 'manager')),
    grossIncome,
    managerSalary,
    otherOperatingExpenses,
    totalExpenses,
    netProfit,
    paybackDays,
    estimatedFirmValue,
    affordability,
    cashAfterPurchase,
    expenseCoverageDaysAfterPurchase,
    labels: [],
  }
}

/**
 * Etiketler öncelik sırasıyla atanır, kart başına en fazla MAX_LABELS_PER_FIRM.
 * `fastest_payback` ve `best_net` tekildir (snapshot başına bir firma).
 */
function assignLabels(s: GameState, breakdowns: FirmEconomyBreakdown[]): void {
  let fastestId: string | null = null
  let fastestDays = Infinity
  let bestNetId: string | null = null
  let bestNet = 0
  for (const b of breakdowns) {
    if (b.unlocked && b.affordability && b.paybackDays !== null && b.paybackDays < fastestDays) {
      fastestDays = b.paybackDays
      fastestId = b.producerId
    }
    if (b.owned > 0 && b.netProfit > bestNet) {
      bestNet = b.netProfit
      bestNetId = b.producerId
    }
  }
  for (const b of breakdowns) {
    const labels: InvestmentLabel[] = []
    const push = (l: InvestmentLabel) => {
      if (labels.length < MAX_LABELS_PER_FIRM) labels.push(l)
    }
    const assignedMgr = s.firmManagerAssignments[b.producerId]
    if ((b.owned > 0 && b.netProfit <= 0) || b.paybackDays === null) push('inefficient')
    if (assignedMgr && isUtilityManager(assignedMgr)) push('risk_manager')
    if (b.affordability && b.expenseCoverageDaysAfterPurchase !== null && b.expenseCoverageDaysAfterPurchase < LOW_COVERAGE_WARN_DAYS) push('low_reserve')
    if (b.producerId === fastestId) push('fastest_payback')
    if (b.producerId === bestNetId) push('best_net')
    if (b.owned === 0 && b.affordability) push('affordable')
    if (b.paybackDays !== null && b.paybackDays > LONG_TERM_PAYBACK_DAYS) push('long_term')
    b.labels = labels
  }
}

export function buildCompanyEconomySnapshot(s: GameState): CompanyEconomySnapshot {
  // Gelir pipeline'ındaki lazy normalizasyonlar (ensureWeekly → weekly regen /
  // rewardCash doldurma; activeMarketNewsDef → süresi dolan haberi null'lama)
  // snapshot'tan dışarı sızmamalı: snapshot gözlemlenebilir HİÇBİR state
  // değişikliği bırakmaz. Normalizasyon, gerçek tick/settlement çağrılarına aittir.
  const prevWeeklyRef = s.weekly
  const prevWeeklyFields: Record<string, unknown> = { ...s.weekly }
  const prevNews = s.activeMarketNews
  try {
    return buildSnapshotInner(s)
  } finally {
    s.weekly = prevWeeklyRef
    const weeklyRec = prevWeeklyRef as unknown as Record<string, unknown>
    for (const key of Object.keys(weeklyRec)) {
      if (!(key in prevWeeklyFields)) delete weeklyRec[key]
    }
    Object.assign(weeklyRec, prevWeeklyFields)
    s.activeMarketNews = prevNews
  }
}

function buildSnapshotInner(s: GameState): CompanyEconomySnapshot {
  const cash = s.money
  const settlement = s.dailySettlementBreakdown()
  const totalDailyExpenses = settlement.managerSalary

  const firmBreakdowns: FirmEconomyBreakdown[] = []
  let grossDailyIncome = 0
  let totalFirmValue = 0
  for (const def of PRODUCERS) {
    const b = buildFirmBreakdown(s, def, cash)
    grossDailyIncome += b.grossIncome
    totalFirmValue += b.estimatedFirmValue
    firmBreakdowns.push(b)
  }
  assignLabels(s, firmBreakdowns)

  const netDailyProfit = grossDailyIncome - totalDailyExpenses

  const expenseCoverageDays = totalDailyExpenses <= 0
    ? null
    : cash <= 0 ? 0 : cash / totalDailyExpenses
  const lossRunwayDays = netDailyProfit >= 0
    ? null
    : cash <= 0 ? 0 : cash / Math.abs(netDailyProfit)

  const expenseBreakdowns: ExpenseBreakdownLine[] = []
  if (totalDailyExpenses > 0) {
    expenseBreakdowns.push({ source: 'manager_salary', labelKey: 'settle_manager_salary', amount: totalDailyExpenses })
  }

  return {
    generatedAtDay: gameDay(s.gameTimeMs),
    cash,
    grossDailyIncome,
    totalDailyExpenses,
    netDailyProfit,
    careerWageDaily: settlement.careerWage,
    dynastyDailyIncome: s.dynastyPassiveIncome,
    characterDailyBonus: s.characterIncomeDailyBonus,
    settlementTotalDaily: settlement.total,
    expenseCoverageDays,
    lossRunwayDays,
    totalFirmValue,
    companyValuation: cash + totalFirmValue,
    firmBreakdowns,
    expenseBreakdowns,
  }
}
