// Zero imports — pure logic layer. No GameState, Economy, Career, or UI dependencies.

export type DailyTaskId =
  | 'pick_job'
  | 'career_action'
  | 'buy_firm'
  | 'upgrade_firm'
  | 'visit_career'
  | 'visit_firms'
  | 'visit_market'
  | 'visit_empire'
  | 'visit_life'
  | 'unlock_city'
  | 'upgrade_department'
  | 'wellbeing'
  | 'life_item'
  | 'market_action'
  | 'hire_manager'

export type DailyEvent =
  | 'job_chosen'
  | 'career_action_completed'
  | 'firm_bought'
  | 'firm_level_upgraded'
  | 'career_viewed'
  | 'firms_viewed'
  | 'market_viewed'
  | 'empire_viewed'
  | 'life_viewed'
  | 'city_unlocked'
  | 'department_upgraded'
  | 'wellbeing_completed'
  | 'life_item_bought'
  | 'market_action_completed'
  | 'manager_hired'

export interface DailyTaskDef {
  id: DailyTaskId
  label: string
  desc: string
  icon: string
  target: number
  event: DailyEvent
  reward: number
}

export interface DailyPlanState {
  version: 1
  dayKey: string
  taskIds: DailyTaskId[]
  progress: Partial<Record<DailyTaskId, number>>
  claimed: DailyTaskId[]
  completionBonusClaimed: boolean
}

export interface EligibilitySnapshot {
  hasJob: boolean
  isEntrepreneur: boolean
  firmCount: number
  canAffordAnyFirm: boolean
  hasUpgradeableFirm: boolean
  canAffordAnyUpgrade: boolean
  canUnlockAnyCity: boolean
  hasDeptToUpgrade: boolean
  affordableWellbeing: boolean
  affordableLifeItem: boolean
  canDoMarketAction: boolean
  canHireManager: boolean
  // Tab accessibility — all currently always true (no page-level lock exists).
  // Kept explicit so a future access guard only needs to update GameState, not the algorithm.
  canVisitCareer: boolean
  canVisitFirms: boolean
  canVisitMarket: boolean
  canVisitEmpire: boolean
  canVisitLife: boolean
}

export const AFFORDABILITY_BUFFER = 1.2
// Separate buffer for daily task eligibility — requires player can still afford basic needs after purchase.
export const DAILY_TASK_SPEND_BUFFER = 2.0
export const DAILY_BONUS_AMOUNT = 500
export const DAILY_BONUS_AMOUNT_VISITS_ONLY = 200
export const DAILY_BONUS_REPUTATION = 1

// Single source of truth for completion bonus — all-visit plans give a reduced reward.
export function dailyCompletionBonusAmount(taskIds: DailyTaskId[]): number {
  const allVisits = taskIds.every(id => id.startsWith('visit_'))
  return allVisits ? DAILY_BONUS_AMOUNT_VISITS_ONLY : DAILY_BONUS_AMOUNT
}

export const TASK_DEFS: DailyTaskDef[] = [
  { id: 'pick_job',           label: 'İş Seç',             desc: 'Bir meslek dalı seç',               icon: '💼', target: 1, event: 'job_chosen',             reward: 100 },
  { id: 'career_action',      label: 'Mesai Yap',           desc: 'Bir kariyer aksiyonu gerçekleştir', icon: '🔨', target: 1, event: 'career_action_completed', reward: 100 },
  { id: 'buy_firm',           label: 'Firma Satın Al',      desc: 'Yeni bir işletme satın al',         icon: '🏪', target: 1, event: 'firm_bought',             reward: 150 },
  { id: 'upgrade_firm',       label: 'Firma Geliştir',      desc: 'Bir firmayı seviye yükselt',        icon: '⬆️', target: 1, event: 'firm_level_upgraded',     reward: 150 },
  { id: 'visit_career',        label: 'Kariyerini İncele',   desc: 'Kariyer ekranını ziyaret et',       icon: '💼', target: 1, event: 'career_viewed',           reward: 50  },
  { id: 'visit_firms',        label: 'Firmaları İncele',    desc: 'Firmalar ekranını ziyaret et',      icon: '🏢', target: 1, event: 'firms_viewed',            reward: 50  },
  { id: 'visit_market',       label: 'Piyasayı Gör',        desc: 'Piyasa ekranını ziyaret et',        icon: '📈', target: 1, event: 'market_viewed',           reward: 50  },
  { id: 'visit_empire',       label: 'İmparatorluğu Gör',   desc: 'İmparatorluk ekranını ziyaret et', icon: '🏙️', target: 1, event: 'empire_viewed',           reward: 50  },
  { id: 'visit_life',         label: 'Yaşamını İncele',     desc: 'Yaşam ekranını ziyaret et',         icon: '🛋️', target: 1, event: 'life_viewed',             reward: 50  },
  { id: 'unlock_city',        label: 'Şehir Aç',            desc: 'Yeni bir şehrin kilidini kaldır',   icon: '🗺️', target: 1, event: 'city_unlocked',          reward: 150 },
  { id: 'upgrade_department', label: 'Departman Geliştir',  desc: 'Bir departmanı geliştir',           icon: '🏗️', target: 1, event: 'department_upgraded',    reward: 150 },
  { id: 'wellbeing',          label: 'İyi Hissettir',       desc: 'Bir wellbeing aktivitesi satın al', icon: '🧘', target: 1, event: 'wellbeing_completed',     reward: 150 },
  { id: 'life_item',          label: 'Yaşam Alışverişi',    desc: 'Konut, araç veya evcil hayvan al',  icon: '🏠', target: 1, event: 'life_item_bought',        reward: 150 },
  { id: 'market_action',      label: 'Piyasada İşlem Yap',  desc: 'Borsada bir alım veya satım işlemi gerçekleştir', icon: '📊', target: 1, event: 'market_action_completed', reward: 100 },
  { id: 'hire_manager',       label: 'Manager Ata',          desc: 'Bir firmaya manager atayarak otomasyonu güçlendir', icon: '🧑‍💼', target: 1, event: 'manager_hired', reward: 150 },
]

export const TASK_SEQUENTIAL_DEPS: Partial<Record<DailyTaskId, DailyTaskId>> = {
  career_action: 'pick_job',
}

// Action-only slot candidates — visit tasks intentionally absent (Phase 4 fallback only)
export const SLOT_ACTION_CANDIDATES = {
  career_business: ['pick_job', 'career_action', 'buy_firm', 'upgrade_firm'              ] as DailyTaskId[],
  business_growth: ['buy_firm', 'upgrade_firm',  'upgrade_department', 'hire_manager'    ] as DailyTaskId[],
  strategy:        ['unlock_city', 'upgrade_department'                                   ] as DailyTaskId[],
  life:            ['life_item',  'wellbeing'                                             ] as DailyTaskId[],
  market:          ['market_action'                                                        ] as DailyTaskId[],
} as const

function hashDayKey(dayKey: string): number {
  let h = 0
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0
  return h
}

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const result = [...arr]
  let s = seed >>> 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function isValidDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function buildVisitFallback(snap: EligibilitySnapshot): DailyTaskId[] {
  const result: DailyTaskId[] = []
  if (snap.canVisitCareer) result.push('visit_career')
  if (snap.canVisitFirms)  result.push('visit_firms')
  if (snap.canVisitMarket) result.push('visit_market')
  if (snap.canVisitEmpire) result.push('visit_empire')
  if (snap.canVisitLife)   result.push('visit_life')
  return result
}

function isSequentiallyAvailable(
  taskId: DailyTaskId,
  snap: EligibilitySnapshot,
  selectedIds: Set<DailyTaskId>,
): boolean {
  const prereqId = TASK_SEQUENTIAL_DEPS[taskId]
  if (!prereqId) return false
  if (!selectedIds.has(prereqId)) return false
  if (taskId === 'career_action') return !snap.isEntrepreneur
  return true
}

// Tasks that require significant spending — at most 1 per plan to avoid impossible daily lists.
const COSTLY_TASK_IDS = new Set<DailyTaskId>([
  'buy_firm', 'upgrade_firm', 'unlock_city', 'upgrade_department', 'wellbeing', 'life_item',
  'hire_manager',
])

export function selectDailyTasks(snap: EligibilitySnapshot, dayKey: string): DailyTaskId[] {
  const selected: DailyTaskId[] = []
  const ids = new Set<DailyTaskId>()
  const events = new Set<DailyEvent>()
  const seed = hashDayKey(dayKey)
  const visitFallback = buildVisitFallback(snap)
  let costlyCount = 0

  function tryAdd(taskId: DailyTaskId): boolean {
    if (selected.length >= 4) return false
    if (ids.has(taskId)) return false
    const def = TASK_DEFS.find(d => d.id === taskId)!
    if (events.has(def.event)) return false
    if (COSTLY_TASK_IDS.has(taskId) && costlyCount >= 1) return false
    selected.push(taskId); ids.add(taskId); events.add(def.event)
    if (COSTLY_TASK_IDS.has(taskId)) costlyCount++
    return true
  }

  function isAvailableNow(taskId: DailyTaskId): boolean {
    if (taskId === 'pick_job')           return !snap.hasJob && !snap.isEntrepreneur
    if (taskId === 'career_action')      return snap.hasJob && !snap.isEntrepreneur
    if (taskId === 'buy_firm')           return snap.canAffordAnyFirm
    if (taskId === 'upgrade_firm')       return snap.hasUpgradeableFirm && snap.canAffordAnyUpgrade
    if (taskId === 'unlock_city')        return snap.canUnlockAnyCity
    if (taskId === 'upgrade_department') return snap.hasDeptToUpgrade
    if (taskId === 'wellbeing')          return snap.affordableWellbeing
    if (taskId === 'life_item')          return snap.affordableLifeItem
    if (taskId === 'market_action')      return snap.canDoMarketAction
    if (taskId === 'hire_manager')       return snap.canHireManager
    return false  // visit tasks are Phase 4 only
  }

  // Phase 1: Core slots always run; only 2 of 3 rotating categories are active each day.
  // Rotating by seed → each of market/strategy/life is active ~2 days, idle ~1 day in a
  // 3-day cycle. The idle category is excluded from BOTH Phase 1 and Phase 3 so it cannot
  // sneak back via backfill; remaining slots fall through to the safe visit fallback.
  const coreSlots = [
    seededShuffle(SLOT_ACTION_CANDIDATES.career_business, seed),
    seededShuffle(SLOT_ACTION_CANDIDATES.business_growth, seed + 1),
  ]
  const rotatingSlotDefs = [
    { candidates: SLOT_ACTION_CANDIDATES.market,   salt: seed + 2 },
    { candidates: SLOT_ACTION_CANDIDATES.strategy, salt: seed + 3 },
    { candidates: SLOT_ACTION_CANDIDATES.life,     salt: seed + 4 },
  ]
  const rotation =
    ((seed % rotatingSlotDefs.length) + rotatingSlotDefs.length) % rotatingSlotDefs.length
  const rotatedSlotDefs = [
    ...rotatingSlotDefs.slice(rotation),
    ...rotatingSlotDefs.slice(0, rotation),
  ]
  // Only the first 2 rotating categories are active today; the 3rd is idle this day.
  const activeRotatingSlotDefs = rotatedSlotDefs.slice(0, 2)
  const rotatingSlots = activeRotatingSlotDefs.map(({ candidates, salt }) =>
    seededShuffle(candidates, salt)
  )
  const slots = [...coreSlots, ...rotatingSlots]
  for (const slot of slots) {
    for (const taskId of slot) {
      if (isAvailableNow(taskId) && tryAdd(taskId)) break
    }
    if (selected.length >= 4) break
  }

  // Phase 2: Sequential tasks (career_action requires pick_job selected in Phase 1)
  if (selected.length < 4) {
    for (const taskId of Object.keys(TASK_SEQUENTIAL_DEPS) as DailyTaskId[]) {
      if (selected.length >= 4) break
      if (isSequentiallyAvailable(taskId, snap, ids)) tryAdd(taskId)
    }
  }

  // Phase 3: Backfill — limited to today's active pool (core + active rotating only).
  // The idle rotating category is intentionally excluded so it cannot return via backfill.
  if (selected.length < 4) {
    const backfillPool = [...new Set([
      ...SLOT_ACTION_CANDIDATES.career_business,
      ...SLOT_ACTION_CANDIDATES.business_growth,
      ...activeRotatingSlotDefs.flatMap(s => s.candidates),
    ])] as DailyTaskId[]
    for (const taskId of seededShuffle(backfillPool, seed + 5)) {
      if (selected.length >= 4) break
      if (isAvailableNow(taskId)) tryAdd(taskId)
    }
  }

  // Phase 4: Visit fallback — fills remaining slots with accessible tab visits
  for (const visitId of seededShuffle(visitFallback, seed + 4)) {
    if (selected.length >= 4) break
    tryAdd(visitId)
  }

  return selected
}

export function createDailyPlanState(dayKey: string, taskIds: DailyTaskId[]): DailyPlanState {
  return { version: 1, dayKey, taskIds, progress: {}, claimed: [], completionBonusClaimed: false }
}

export function sanitizeDailyPlanState(data: unknown): DailyPlanState | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.version !== 1) return null
  if (typeof d.dayKey !== 'string' || !isValidDayKey(d.dayKey)) return null

  // taskIds: exactly 4, valid, unique IDs, unique events
  if (!Array.isArray(d.taskIds) || d.taskIds.length !== 4) return null
  const validIds = new Set(TASK_DEFS.map(t => t.id))
  const seenIds = new Set<string>()
  const seenEvents = new Set<string>()
  const taskIds: DailyTaskId[] = []
  for (const id of d.taskIds) {
    if (typeof id !== 'string' || !validIds.has(id as DailyTaskId)) return null
    if (seenIds.has(id)) return null
    const def = TASK_DEFS.find(t => t.id === id)!
    if (seenEvents.has(def.event)) return null
    seenIds.add(id); seenEvents.add(def.event); taskIds.push(id as DailyTaskId)
  }

  // claimed: array, subset of taskIds, unique
  if (!Array.isArray(d.claimed)) return null
  const seenClaimed = new Set<string>()
  const claimed: DailyTaskId[] = []
  for (const id of d.claimed) {
    if (typeof id !== 'string' || !seenIds.has(id)) return null
    if (seenClaimed.has(id)) return null
    seenClaimed.add(id); claimed.push(id as DailyTaskId)
  }

  // progress: only known taskIds, finite >= 0, clamped to target
  const progress: Partial<Record<DailyTaskId, number>> = {}
  if (d.progress && typeof d.progress === 'object') {
    for (const [id, val] of Object.entries(d.progress as Record<string, unknown>)) {
      if (!seenIds.has(id)) continue
      if (typeof val !== 'number' || !isFinite(val) || val < 0) continue
      const def = TASK_DEFS.find(t => t.id === id)!
      progress[id as DailyTaskId] = Math.min(Math.floor(val), def.target)
    }
  }

  // Normalize: claimed tasks must have progress = target
  for (const claimedId of claimed) {
    const def = TASK_DEFS.find(t => t.id === claimedId)
    if (def) progress[claimedId] = def.target
  }

  // completionBonusClaimed only valid when all four tasks are claimed
  const allClaimed = taskIds.every(id => claimed.includes(id))
  const completionBonusClaimed = d.completionBonusClaimed === true && allClaimed

  return { version: 1, dayKey: d.dayKey as string, taskIds, progress, claimed, completionBonusClaimed }
}
