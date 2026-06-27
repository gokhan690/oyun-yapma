import {
  type DailyPlanState, type DailyTaskId, type DailyEvent, type EligibilitySnapshot,
  TASK_DEFS, DAILY_TASK_SPEND_BUFFER, DAILY_BONUS_REPUTATION, dailyCompletionBonusAmount,
  selectDailyTasks, createDailyPlanState, sanitizeDailyPlanState,
} from './DailyPlan'
import { PRODUCERS, UPGRADES, producerCost, maxAffordable, isProducerUnlocked, earlyUnlockCost, formatMoney, formatIncomeRate, scaledBaseIncome, ECONOMY_UPGRADE_COST_SCALE, producerName, type ProducerDef, type UpgradeDef } from './Economy'
import { requiredDomainText, fmt } from '../i18n'
import { PRESTIGE_SHOP_ITEMS } from './PrestigeShop'
import { PRESTIGE_THRESHOLD, calcPrestigePoints, canPrestige, ipoThreshold, prestigeMultiplier } from './Prestige'
import { getActiveSynergies, globalSynergyBonus, producerSynergyBonus } from './Synergies'
import {
  RESEARCH_NODES,
  researchCost,
  researchClickBonus,
  researchPassiveBonus,
  researchOfflineBonusMs,
  researchSynergyMultiplier,
  researchEfficiencyBonus,
  researchFootballBonus,
  researchHeatGainReduction,
} from './Research'
import { pickRandomEvent, type GameEventDef } from './Events'
import { computeGoldenEventDelay, EVENT_PREVIEW_LEAD_MS, NEAR_MISS_COOLDOWN_MS } from './EventDirector'
import { checkNewAchievements, type AchievementDef } from './Achievements'
import { generateDailyMissions, type MissionProgress } from './Missions'
import { managerCost, managerMultiplier, hasManager } from './Managers'
import {
  createStockState,
  tickStockPrice,
  tickMacro,
  buyShares,
  sellShares,
  startMarketEvent,
  liquidatePortfolio,
  portfolioValue,
  totalShares,
  ownedTickerCount,
  migrateLegacyStock,
  migrateStockState,
  STOCK_TICK_MS,
  type StockState,
} from './StockMarket'
import {
  createBankState,
  tickBankInterest,
  calcIpoStartingCash,
  maxLoan,
  netWorth,
  type BankState,
  type IpoPreviewData,
} from './FinanceBank'
import {
  BANKRUPTCY_CASH_GRACE_MS,
  BANKRUPTCY_COOLDOWN_MS,
  BANKRUPTCY_RECOVERY_BASE_RATE,
  restoreSeizedBusinesses,
  seizeBusinesses,
  type SeizedBusiness,
} from './Bankruptcy'
import {
  createSeasonState,
  currentTier,
  rewardForTier,
  hasClaimableSeasonReward,
  seasonWeekKey,
  tierProgress,
  SEASON_MAX_TIER,
  xpForTier,
  isLegacyGameSeasonKey,
  type SeasonState,
  type SeasonTrack,
} from './SeasonPass'
import { rollChestLoot, shouldResetPity, type ChestLootResult } from './ChestLoot'
import {
  createCampaignState,
  currentCampaignStep,
  campaignStepSnapshot,
  hasClaimableCampaignStep,
  chapterById,
  isChapterUnlocked,
  type CampaignState,
} from './Campaign'
import {
  PRESTIGE_TREE_NODES,
  canBuyNode,
  passiveBonus,
  clickBonus,
  offlineBonusMs,
  producerCostDiscount,
  upgradeCostDiscount,
  managerCostDiscount,
  seasonXpBonus,
  freeStockHint,
  nightBonusExtra,
  dayBonusExtra,
  autoBuyCooldownMs,
  prestigeMultBonus,
  ownedNodeCount,
  heatDecayBonus,
  hasRaidInsurance,
  hasNode,
} from './PrestigeTree'
import { localDayKey, yesterdayLocalKey, calendarWeekKey } from './dateUtils'
import { gameDay, gameYear, isGameNight, isGameWeekend, MS_PER_GAME_DAY, realSecondsToGameMs, gameCalendarDate } from './GameClock'
import { createCareerState, applyCareerAction, applyDailyWage, FIRST_GOAL_TARGET, backgroundDef, careerStressPenalty, dailyCareerWage, type CareerState, type CareerActionId, type CareerJobId, type CharacterBackgroundId } from './Career'
import { firmLevelIncomeMult, firmLevelUpCost, FIRM_MAX_LEVEL } from './FirmLevels'
import { firmUpgradeDef, firmUpgradeIncomeBonus, firmUpgradeCost } from './FirmUpgrades'
import { createDepartmentState, departmentUpgradeCost, departmentDef, isDepartmentTaskComplete, DEPARTMENTS, DEPARTMENT_MAX_LEVEL, operasyonLegalBonus, finansProducerBonus, pazarlamaGlobalBonus, hukukRaidReduction, argeBonus, aileOfisiInheritanceBonus, lojistikCostReduction, guvenlikRivalReduction, type DepartmentId } from './EmpireDepartments'
import {
  createEmpireState,
  syncEmpireFromProducers,
  tickEmpireDaily,
  empireFootballIncomeMult,
  empirePoliticsCostDiscount,
  empirePoliticsHeatReduction,
  empireDarkProductionMult,
  boostDarkProduction,
  reduceDarkHeat,
  stadiumUpgradeCost,
  leagueUpgradeCost,
  lobbyCost,
  donateCampaign,
  canUpgradeLeague,
  leagueName,
  type EmpireState,
} from './Empire'
import {
  createDynastyState,
  activeDynastyTrait,
  pickChildName,
  randomChildTrait,
  spouseOption,
  spouseProducerBonus,
  traitClickMult,
  traitCostMult,
  traitIllegalMult,
  traitPassiveMult,
  educationXpPerGameDay,
  playerGameAge,
  SUCCESSION_START_AGE,
  PLAYER_START_AGE,
  CHILD_EDUCATION_MAX,
  CHILD_EDUCATION_PATHS,
  heirRoleDef,
  calculateInheritance,
  dynastyGenerationBonus,
  type DynastyState,
  type PlayerGender,
  type ParentingStyle,
  type ChildCareer,
  type ChildEducationPath,
  type HeirRoleId,
  childCareerDef,
  spouseSatisfactionMult,
  heirCareerPassiveBonus,
  pickChildRiskProfile,
  migrateChildRecord,
} from './Dynasty'
import {
  rollDailyMortality,
  totalDailyMortalityRisk,
  estimatedYearsRemaining,
  mortalityRiskDisplay,
  type MortalityContext,
  type MortalityRiskDisplay,
  type DeathCauseId,
} from './Mortality'
import { FOOTBALL_CLUB_IDS } from './Empire'
import {
  createUndergroundTreeState,
  treeNodeDef,
  treeNodeCost,
  illegalIncomeBonus,
  raidFineReduction,
  raidChanceReduction,
  heatDecayBonus as ugHeatDecayBonus,
  heatGainReduction,
} from './UndergroundTree'
import {
  type ActiveMarketNews,
  newsDef,
  newsDurationMs,
  pickMarketNews,
  type MarketNewsDef,
} from './MarketNews'
import {
  createWeeklyState,
  getWeeklyDef,
  isLegacyGameWeekKey,
  weeklyRewardCash,
  WEEKLY_EARN_MIN,
  type WeeklyEventState,
} from './WeeklyEvent'
import { dailyGoalDayKey, scaledDailyGoalTarget, calcDailyLoginReward, streakMilestoneBonus, DAILY_GOAL_MIN } from './DailyGoal'
import {
  LAWYER_PROTECTION_MS,
  LAUNDER_DURATION_MS,
  HEAT_SHIELD_DURATION_MS,
  type UndergroundActionId,
} from './Underground'
import { themeForTier, themeForIpoCount, type ThemeId } from './Themes'
import { storyBeat } from './StoryBeats'
import { loadOwnerFlags, type OwnerFlags } from '../owner/FeatureFlags'
import { createPendingBoost, type PendingBoostItem } from './BoostInventory'
import {
  clampReputation,
  REPUTATION_START,
  reputationCostMult,
  reputationFromIllegalBusiness,
  reputationFromLegalBusiness,
  reputationFromLobby,
  reputationFromRaid,
  reputationFromScandal,
  reputationLoanBlocked,
  reputationPoliticsBlocked,
  carryReputationAfterIpo,
} from './Reputation'
import { currentWorldStage, type WorldStageId } from './WorldStage'
import {
  createRivalsState,
  tickRivals,
  rivalById,
  lobbyAgainstRival,
  cooperateWithRival,
  mergeRival,
  mergeRivalCost,
  acceptRivalAlliance,
  rivalDef,
  isRivalUnlocked,
  type RivalFamilyState,
} from './Rivals'
import {
  checkNewVictories,
  type VictoryId,
  type VictoryContext,
  victoryDef,
} from './VictoryConditions'
import {
  appendChronicle,
  createChronicleEntry,
  createMonument,
  type ChronicleEntry,
  type LegacyMonument,
} from './Chronicle'
import { gameSeasonKey } from './GameClock'
import {
  pushGazette,
  headlinePurchase,
  headlineLoanDenied,
  headlineCrisis,
  headlineMonthlyIncome,
  headlineMarketRandom,
  headlinePoliticsRandom,
  type GazetteEntry,
  type GazetteCategory,
} from './BaronGazette'
import {
  type ActiveCrisis,
  type CrisisId,
  crisisDef,
  pickRandomCrisis,
} from './CrisisEvents'
import { computePlayerTitle, type PlayerTitleDef } from './PlayerTitle'
import {
  activeCalendarEvents,
  calendarPassiveMult,
  calendarClickMult,
} from './CalendarEvents'
import {
  mechanicForVictory,
  hasMechanic,
  type VictoryMechanic,
} from './VictoryUnlocks'
import {
  createInsuranceState,
  insuranceDailyCost,
  raidFineMult,
  type InsuranceState,
} from './Insurance'
import {
  createCommodityMarket,
  tickCommodityPrices,
  type CommodityId,
  type CommodityMarketState,
} from './Commodities'
import {
  createInvestmentOffer,
  type InvestmentOffer,
  type PendingInvestment,
} from './InvestmentOffers'
import {
  FRANCHISE_COST,
  FRANCHISE_UNLOCK_COUNT,
  FRANCHISE_REPUTATION_MIN,
  FRANCHISE_CITIES,
  franchiseIncomeBonus,
  type FranchiseBranch,
  type FranchiseCity,
} from './Franchise'
import {
  namedManagerDef,
  type HiredNamedManager,
  type NamedManagerId,
} from './NamedManagers'
import {
  undergroundActionDef,
  type UndergroundMarketAction,
} from './UndergroundMarket'
import { rollAdvisorTip, ADVISOR_FEE, type AdvisorTip } from './AdvisorNPC'
import type { RivalAllianceOffer, RivalEvent } from './Rivals'
import { generateRivalEvent } from './Rivals'
import {
  type ActiveDisease,
  type DiseaseId,
  diseasesDailyDamage,
  eligibleDiseases,
  dailyDiagnosisChance,
  pickRandomDisease,
  diseaseDef,
} from './Diseases'
import {
  type Sibling,
  generateSiblings,
  tickSiblingYear,
  visitSibling as doVisitSibling,
  siblingInheritance,
  VISIT_SIBLING_COST,
} from './Siblings'
import {
  type FameState,
  type FameCareerType,
  createFameState,
  fameDailyIncome,
  applyFameAction,
  tickFameDecay,
} from './Fame'
import type { CharacterProfile } from './CharacterProfile'
import {
  createLifestyleState,
  lifestyleMonthlyExpense,
  lifestyleRentalIncome,
  lifestyleVehicleIncomeMult,
  stressIncomePenalty,
  dailyStressDelta,
  residenceSellValue,
  vehicleSellValue,
  defaultRentalIncome,
  defaultVehicleRentalIncome,
  homeRoomResearchBonus,
  homeRoomDailyStressReduction,
  hasHomeRoom,
  HOME_ROOMS,
  RESIDENCES,
  VEHICLES,
  PETS,
  WELLBEING_ACTIVITIES,
  randomPetName,
  petLifespanDays,
  expirePets,
  type OwnedPetEntry,
  type LifestyleState,
  type ResidenceId,
  type VehicleId,
  type PetId,
  type WellbeingActivityId,
  type HomeRoomId,
} from './Lifestyle'
import {
  LIFE_EVENTS,
  shouldTriggerLifeEvent,
  resolveConsequence,
  type ActiveLifeEvent,
  type PendingConsequence,
  type LifeEventId,
  type LifeEventDef,
  type EventChoiceRecord,
  type ChoiceRiskOutcome,
} from './LifeEvents'
import {
  createHealthState,
  dailyHealthDelta,
  healthIncomePenalty,
  type HealthState,
} from './Health'
import {
  personalityIncomeMult,
  personalityCostMult,
  personalityReputationMult,
  personalityIllegalMult,
  type PersonalityId,
} from './PlayerPersonality'
import {
  createPlayerSkillsState,
  newlyUnlockedSkills,
  skillCostMult,
  skillClickMult,
  skillPrestigeMult,
  skillPassiveMult,
  skillEventStressMult,
  type PlayerSkillsState,
  type PlayerSkillDef,
} from './PlayerSkills'
import { buildBaronRecord, dynastyHistorySummary, type BaronRecord, type BaronLifeSnapshot } from './BaronLegacy'
import {
  createFriendshipsState,
  tickFriendships,
  addFriend,
  spendTimeWithFriend,
  sendMoneyToFriend,
  availableToUnlockFriends,
  friendshipIncomeMult,
  friendshipCostMult,
  friendshipPrestigeMult,
  friendshipStressDaily,
  friendshipReputationMonthly,
  randomFriendName,
  FRIEND_SEND_MONEY_COST,
  type FriendshipsState,
  type FriendTypeId,
} from './Friendships'
import {
  createMentorEnemyState,
  assignRandomMentor,
  assignRandomEnemy,
  checkMentorQuests,
  completeMentorQuest,
  enemyIncomePenalty,
  mentorIncomeMult,
  mentorCostMult,
  mentorClickMult,
  mentorPrestigeMult,
  type MentorEnemyState,
} from './MentorEnemy'
import {
  toggleLegacyItem,
  legacyWealthBonus,
  legacyReputationBonus,
  legacyHasFamilyBusiness,
  calculateLegacyScore,
  publicMemoryTitle,
  type DynastyLegacyItemId,
} from './Dynasty'
import {
  EDUCATIONS,
  educationIncomeMult,
  educationResearchBonus,
  type EducationId,
} from './Education'
import {
  createHobbyState,
  hobbyProducerBonus,
  hobbyResearchBonus,
  hobbyMonthlyCost,
  tickHobbyMonth,
  type HobbyId,
  type HobbyState,
} from './Hobby'
import {
  createTravelState,
  travelDestinationDef,
  travelResearchBonus,
  travelIncomeBonus,
  travelPrestigeBonus,
  type TravelState,
  type TravelDestinationId,
} from './Travel'
import {
  createCityState,
  canUnlockCity,
  cityDef,
  cityProducerBonus,
  EXPANSION_CITIES,
  type CityState,
  type CityId,
} from './ExpansionMap'
import type { CountryId } from './Countries'
import {
  createTorpilState,
  torpilDef,
  torpilBusinessDiscount,
  torpilBypassCreditScore,
  torpilRaidWarning,
  torpilMediaProtect,
  type TorpilContactState,
  type TorpilId,
} from './TorpilNetwork'
import { obsolescenceMult, modernizeCost } from './TechObsolescence'
import { pickDisaster, disasterDamage } from './NaturalDisasters'
import { progressPathSnapshot, type ProgressPathSnapshot } from './ProgressPath'

export interface PendingUndo {
  id: string
  kind: 'manager_hire' | 'named_manager' | 'sell_producer'
  label: string
  cost: number
  expiresAt: number
  producerId?: string
  namedManagerId?: NamedManagerId
  soldCount?: number
  soldCost?: number
}

export interface SerializableState {
  money: number
  totalEarned: number
  totalClicks: number
  producers: Record<string, number>
  purchasedUpgrades: string[]
  prestigePoints: number
  lifetimePrestige: number
  lastSaveTime: number
  dailyLastClaim: string | null
  dailyStreak: number
  adIncomeBoostUntil: number
  rewardedAdsToday: number
  rewardedAdsDay: string
  luckyChestReady: boolean
  research: Record<string, number>
  achievements: string[]
  missions: MissionProgress[]
  missionsDay: string
  comboBest: number
  eventsSeen: number
  sessionEarned: number
  businessesBoughtSession: number
  upgradesBoughtSession: number
  eventBoostUntil: number
  playTimeMs: number
  firstBusinessPlayTimeMs?: number | null
  gameTimeMs: number
  gamePaused?: boolean
  tutorialDone: boolean
  onboardingComplete?: boolean
  country?: CountryId
  ipoCount: number
  lifetimeTotalEarned: number
  managers: Record<string, boolean>
  stock: StockState
  bank: BankState
  weekly: WeeklyEventState
  milestonesReached: number[]
  managerDiscountActive: boolean
  dailyGoalEarned: number
  dailyGoalDay: string
  dailyGoalClaimed: boolean
  dailyGoalTargetSnapshot: number
  dailyGoalRewardSnapshot: number
  season: SeasonState
  prestigeTree: Record<string, boolean>
  managerAutoBuy: Record<string, boolean>
  nightEarningsSession: number
  hapticsEnabled: boolean
  reducedMotion: boolean
  difficulty?: 'easy' | 'normal' | 'hard'
  difficultyChosen?: boolean
  playerName: string
  birthYear: number
  playerGender: PlayerGender
  forcedUnlocks: string[]
  illegalHeat: number
  unlockedThemes: string[]
  activeTheme: ThemeId
  codexUnlockDates: Record<string, string>
  undergroundCooldowns: Record<string, number>
  heatShieldUntil: number
  heatProtectionUntil: number
  launderingUntil: number
  lastActiveAt: number
  comebackClaimedDay: string | null
  comebackPending: number
  notificationPrefs: { dailyReward: boolean; passiveIncome: boolean; goalNear: boolean; webPush: boolean }
  surpriseInvestorUntil: number
  surpriseInvestorDay: string
  seenStoryBeats: string[]
  earnedBadges: string[]
  raidsToday: number
  raidsDay: string
  heatWasCritical: boolean
  heatSurvived: boolean
  undergroundLawyerUsed: boolean
  comebackClaimed: boolean
  streakMilestonesClaimed: number[]
  dynasty: DynastyState
  activeMarketNews: ActiveMarketNews | null
  shopBoostUntil: number
  upgradeDiscountActive: boolean
  undergroundTree: Record<string, number>
  advisorBuys: number
  empire: EmpireState
  gameStartYear: number
  pendingBoosts: PendingBoostItem[]
  chestPityCounter: number
  chestTickets: number
  campaign: CampaignState
  bankruptcyRecoveryPool?: number
  bankruptcyRecoveryClaimed?: boolean
  bankruptcySeizedSnapshot?: SeizedBusiness[]
  lastBankruptcyAt?: number
  bankruptcyCashGraceSince?: number
  reputation?: number
  rivals?: RivalFamilyState[]
  chronicle?: ChronicleEntry[]
  legacyMonuments?: LegacyMonument[]
  victoriesUnlocked?: VictoryId[]
  totalRaidsCaught?: number
  presidentSeasons?: number
  presidentSinceSeasonKey?: string | null
  lastWorldStageId?: WorldStageId
  childCrises?: { childId: string; type: 'gambler' | 'illegal' | 'scandal' }[]
  gazetteEntries?: GazetteEntry[]
  activeCrisis?: ActiveCrisis | null
  crisisIncomeMult?: number
  crisisHoldBonusUntil?: number
  victoryMechanics?: VictoryMechanic[]
  bankruptcyCount?: number
  insurance?: InsuranceState
  commodities?: CommodityMarketState
  investmentOffer?: InvestmentOffer | null
  pendingInvestments?: PendingInvestment[]
  franchises?: FranchiseBranch[]
  namedManagers?: HiredNamedManager[]
  pendingRivalOffer?: RivalAllianceOffer | null
  undergroundMarketActive?: UndergroundMarketAction[]
  advisorTip?: AdvisorTip | null
  advisorTipDay?: number
  calendarPurchaseDay?: string
  lastCrisisGameDay?: number
  lastInvestmentOfferDay?: number
  playerTitleId?: string
  baronHistory?: BaronRecord[]
  baronCounter?: number
  currentBaronStartedGameDay?: number
  baronLifePeakNetWorth?: number
  baronLifeEarnedStart?: number
  baronLifeRaidsUninsured?: number
  baronLifeChildCrises?: number
  cities?: CityState
  torpil?: TorpilContactState[]
  producerModernized?: Record<string, boolean>
  pendingUndo?: PendingUndo | null
  lastDisasterGameDay?: number
  lifestyle?: LifestyleState
  lifeEvents?: ActiveLifeEvent[]
  pendingConsequences?: PendingConsequence[]
  removeAdsOwned?: boolean
  vipPassActive?: boolean
  dynastyPassiveIncome?: number
  peakIncomePerDay?: number
  prestigeShopPurchased?: string[]
  eventChoiceHistory?: EventChoiceRecord[]
  characterAlignment?: { temiz: number; acımasız: number; gölge: number }
  abilityCooldowns?: Record<string, number>
  activeRivalEvents?: RivalEvent[]
  health?: HealthState
  lastAnnualSummaryYear?: number
  personality?: PersonalityId | null
  playerSkills?: PlayerSkillsState
  dailyRoutineDay?: number
  dailyRoutineUsed?: string[]
  friendships?: FriendshipsState
  mentorEnemy?: MentorEnemyState
  legacyScore?: number
  education?: EducationId | null
  hobby?: HobbyState
  ageMilestonesShown?: number[]
  travel?: TravelState
  diseases?: ActiveDisease[]
  siblings?: Sibling[]
  fameState?: FameState
  karma?: number
  characterProfile?: CharacterProfile | null
  characterIncomeDailyBonus?: number
  career?: CareerState
  producerLevels?: Record<string, number>
  producerUpgrades?: Record<string, string[]>
  departments?: Record<string, number>
  dailyPlan?: DailyPlanState | null
  characterBackground?: CharacterBackgroundId | null
  departmentTasksClaimed?: DepartmentId[]
  netWorthHistory?: number[]
  pendingDecisions?: Array<
    | { type: 'marriage_crisis'; spouseId: string }
    | { type: 'annual_summary'; year: number; playerAge: number; totalEarned: number; businessCount: number; incomePerDay: number }
    | { type: 'age_milestone'; age: number; question: string }
  >
}

export interface ProducerBreakdown {
  name: string
  owned: number
  basePerUnit: number
  lines: { label: string; value: string }[]
  totalPerDay: number
}

export type GameEvent =
  | { type: 'money_changed' }
  | { type: 'passive_income' }
  | { type: 'stock_tick' }
  | { type: 'click'; amount: number; critical: boolean; x: number; y: number; combo: number }
  | { type: 'purchase' }
  | { type: 'prestige'; points: number; startingCash?: number }
  | { type: 'offline_earnings'; amount: number }
  | { type: 'daily_reward'; amount: number; streak: number }
  | { type: 'ad_boost'; until: number }
  | { type: 'chest_opened'; amount?: number; loot?: ChestLootResult }
  | { type: 'combo_changed'; combo: number; multiplier: number }
  | { type: 'golden_event'; event: GameEventDef; expiresAt: number }
  | { type: 'golden_event_preview'; hint: string; arrivesInMs: number }
  | { type: 'event_claimed'; event: GameEventDef; reward: number }
  | { type: 'event_missed'; event: GameEventDef }
  | { type: 'achievement'; def: AchievementDef }
  | { type: 'mission_complete'; mission: MissionProgress }
  | { type: 'research_purchased'; nodeId: string; level: number }
  | { type: 'milestone_reached'; amount: number }
  | { type: 'manager_hired'; producerId: string }
  | { type: 'stock_trade'; action: 'buy' | 'sell'; amount: number }
  | { type: 'weekly_updated'; progress: number; target: number }
  | { type: 'daily_goal_updated'; earned: number; target: number }
  | { type: 'day_night'; isNight: boolean }
  | { type: 'game_time' }
  | { type: 'game_pause'; paused: boolean }
  | { type: 'season_updated'; xp: number; tier: number }
  | { type: 'season_claimed'; tier: number; reward: string; track?: SeasonTrack }
  | { type: 'campaign_step'; chapterId: number; stepId: string; reward: string }
  | { type: 'premium_season_unlocked' }
  | { type: 'prestige_tree'; nodeId: string }
  | { type: 'market_event'; crash: boolean }
  | { type: 'macro_event'; headline: string; crash?: boolean }
  | { type: 'finance_tick'; headline?: string; snapshot?: import('./FinanceBank').BankInterestSnapshot }
  | { type: 'bankruptcy'; loss: number; reason: string; recoveryPool: number; seizedBusinesses: string[] }
  | { type: 'auto_buy'; producerId: string }
  | { type: 'nav_changed'; view: string }
  | { type: 'illegal_raid'; fine: number; producerId: string }
  | { type: 'producer_unlocked'; producerId: string }
  | { type: 'illegal_heat'; heat: number }
  | { type: 'underground_action'; actionId: string }
  | { type: 'story_beat'; beatId: string; text: string }
  | { type: 'comeback_ready'; amount: number }
  | { type: 'surprise_investor'; until: number }
  | { type: 'pending_boost_added'; label: string }
  | { type: 'boost_activated'; label: string }
  | { type: 'near_miss'; kind: string; message: string }
  | { type: 'match_result'; clubId: string; clubName: string; won: boolean; score: string; fanGain: number; bonus: number }
  | { type: 'theme_unlocked'; themeId: ThemeId }
  | { type: 'badge_earned'; badgeId: string }
  | { type: 'market_news'; headline: string; active: boolean }
  | { type: 'dynasty_update'; kind: string; name?: string }
  | { type: 'player_death'; age: number; causeId: DeathCauseId; emoji: string; label: string; message: string; hasHeir: boolean }
  | { type: 'baron_eulogy'; record: BaronRecord; hasHeir: boolean }
  | { type: 'disaster_hit'; title: string; emoji: string; city: string; damage: number; insured: boolean }
  | { type: 'undo_available'; label: string; cost: number; undoId: string }
  | { type: 'reputation_changed'; reputation: number; delta: number }
  | { type: 'world_stage'; stageId: WorldStageId; name: string }
  | { type: 'rival_action'; rivalId: string; headline: string }
  | { type: 'rival_surpassed'; rivalName: string; rivalWorth: number }
  | { type: 'victory_unlocked'; victoryId: VictoryId; name: string; emoji: string }
  | { type: 'victory_achieved'; victoryId: string; playerName: string; totalEarned: number; ipoCount: number; generation: number; alignment: string }
  | { type: 'rival_event'; event: import('./Rivals').RivalEvent }
  | { type: 'child_crisis'; childName: string; crisisType: string; message: string }
  | { type: 'gazette_headline'; headline: string; category: GazetteCategory }
  | { type: 'crisis_started'; crisisId: CrisisId; title: string }
  | { type: 'crisis_resolved'; crisisId: CrisisId; choiceId: string; summary: string }
  | { type: 'loan_denied'; reason: string }
  | { type: 'victory_mechanic_unlocked'; victoryId: VictoryId; title: string; description: string; emoji: string }
  | { type: 'rival_alliance_offer'; offer: RivalAllianceOffer }
  | { type: 'investment_offer'; offer: InvestmentOffer }
  | { type: 'player_title'; title: PlayerTitleDef }
  | { type: 'calendar_event'; headline: string; emoji: string }
  | { type: 'skyline_building_click'; producerId: string; income: number; name: string }
  | { type: 'life_event_triggered'; eventDef: LifeEventDef }
  | { type: 'life_event_consequence'; headline: string; moneyDelta: number }
  | { type: 'health_changed'; health: number }
  | { type: 'annual_summary'; year: number; playerAge: number; totalEarned: number; businessCount: number; incomePerDay: number }
  | { type: 'skill_unlocked'; skill: PlayerSkillDef }
  | { type: 'marriage_crisis' }
  | { type: 'mentor_quest_completed'; questLabel: string; rewardLabel: string }
  | { type: 'enemy_appeared'; enemyName: string; title: string }
  | { type: 'friend_unlocked'; friendName: string; typeLabel: string }
  | { type: 'legacy_selected'; items: DynastyLegacyItemId[] }
  | { type: 'baron_legacy_card'; peakNetWorth: number; generation: number; ipoCount: number; reputation: number; legacyScore: number; publicTitle: string; publicEmoji: string }
  | { type: 'age_milestone'; age: number; question: string }
  | { type: 'social_status_changed'; score: number; title: string }
  | { type: 'disease_diagnosed'; diseaseId: DiseaseId; name: string; emoji: string }
  | { type: 'disease_treated'; diseaseId: DiseaseId; name: string }
  | { type: 'pet_died'; petId: PetId; petName: string; petEmoji: string }
  | { type: 'sibling_died'; siblingName: string; inheritance: number }
  | { type: 'fame_action'; careerName: string; fameDelta: number; newLevel: number }
  | { type: 'fame_changed'; fameLevel: number; label: string }
  | { type: 'life_event_risk_outcome'; headline: string; won: boolean }
  | { type: 'career_action'; actionId: CareerActionId; money: number; levelUp: boolean }
  | { type: 'career_wage'; amount: number }
  | { type: 'career_phase_changed'; isEntrepreneur: boolean }
  | { type: 'daily_plan_updated' }

const MILESTONE_THRESHOLDS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]
const CRIT_CHANCE = 0.1
const CRIT_MULT = 5
const BASE_CLICK = 6
const BASE_OFFLINE_CAP_GAME_DAYS = 365
const BASE_OFFLINE_CAP_MS = BASE_OFFLINE_CAP_GAME_DAYS * MS_PER_GAME_DAY
const AD_BOOST_DURATION_MS = 5 * 60 * 1000
const COMEBACK_MIN_AWAY_MS = 24 * 60 * 60 * 1000
const STREAK_MILESTONES = [7, 14, 30]
const COMBO_WINDOW_MS = 1500
const META_SYSTEMS_MIN_PLAY_MS = 180_000
const META_SYSTEMS_AFTER_FIRST_BUSINESS_MS = 120_000
const DAILY_REWARD_MIN_PLAY_MS = 90_000

export class GameState {
  money = 0
  totalEarned = 0
  totalClicks = 0
  producers: Record<string, number> = {}
  purchasedUpgrades = new Set<string>()
  prestigePoints = 0
  lifetimePrestige = 0
  lastSaveTime = Date.now()
  dailyLastClaim: string | null = null
  dailyStreak = 0
  adIncomeBoostUntil = 0
  adBoostLabel = ''
  adBoostEmoji = '📺'
  eventBoostLabel = ''
  eventBoostEmoji = '✨'
  shopBoostLabel = ''
  shopBoostEmoji = '🛒'
  rewardedAdsToday = 0
  rewardedAdsDay = todayKey()
  luckyChestReady = false
  research: Record<string, number> = {}
  achievements = new Set<string>()
  missions: MissionProgress[] = []
  missionsDay = ''
  comboBest = 0
  eventsSeen = 0
  sessionEarned = 0
  businessesBoughtSession = 0
  upgradesBoughtSession = 0
  eventBoostUntil = 0
  playTimeMs = 0
  firstBusinessPlayTimeMs: number | null = null
  gameTimeMs = 0
  gamePaused = false
  tutorialDone = false
  onboardingComplete = false
  country: CountryId = 'tr'
  ipoCount = 0
  lifetimeTotalEarned = 0
  managers: Record<string, boolean> = {}
  stock = createStockState()
  bank = createBankState()
  weekly = createWeeklyState()
  milestonesReached: number[] = []
  managerDiscountActive = false
  dailyGoalEarned = 0
  dailyGoalDay = dailyGoalDayKey()
  dailyGoalClaimed = false
  dailyGoalTargetSnapshot = DAILY_GOAL_MIN
  dailyGoalRewardSnapshot = 200
  season = createSeasonState()
  prestigeTree: Record<string, boolean> = {}
  managerAutoBuy: Record<string, boolean> = {}
  nightEarningsSession = 0
  hapticsEnabled = true
  reducedMotion = false
  removeAdsOwned = false
  vipPassActive = false
  lifestyle = createLifestyleState()
  lifeEvents: ActiveLifeEvent[] = []
  pendingConsequences: PendingConsequence[] = []
  eventChoiceHistory: EventChoiceRecord[] = []
  pendingDecisions: Array<
    | { type: 'marriage_crisis'; spouseId: string }
    | { type: 'annual_summary'; year: number; playerAge: number; totalEarned: number; businessCount: number; incomePerDay: number }
    | { type: 'age_milestone'; age: number; question: string }
  > = []
  characterAlignment: { temiz: number; acımasız: number; gölge: number } = { temiz: 0, acımasız: 0, gölge: 0 }
  abilityCooldowns: Record<string, number> = {}
  activeRivalEvents: RivalEvent[] = []
  private lastRivalEventDay = -1
  health = createHealthState()
  friendships = createFriendshipsState()
  mentorEnemy = createMentorEnemyState()
  legacyScore = 0
  education: EducationId | null = null
  hobby = createHobbyState()
  ageMilestonesShown: number[] = []
  travel = createTravelState()
  lastAnnualSummaryYear = -1
  personality: PersonalityId | null = null
  playerSkills = createPlayerSkillsState()
  diseases: ActiveDisease[] = []
  siblings: Sibling[] = generateSiblings()
  fameState: FameState = createFameState()
  karma = 0
  characterProfile: CharacterProfile | null = null
  characterIncomeDailyBonus = 0
  career: CareerState = createCareerState()
  producerLevels: Record<string, number> = {}
  producerUpgrades: Record<string, string[]> = {}
  departments: Record<DepartmentId, number> = createDepartmentState()
  dailyPlan: DailyPlanState | null = null
  characterBackground: CharacterBackgroundId | null = null
  departmentTasksClaimed: DepartmentId[] = []
  netWorthHistory: number[] = []
  private lastNetWorthSample = 0
  private lastDiseaseTickDay = 0
  private lastSiblingTickYear = 0
  dailyRoutineDay = 0
  dailyRoutineUsed: string[] = []
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
  difficultyChosen = false
  isNight = isGameNight(0)
  playerName = 'Baron'
  birthYear = 0
  playerGender: PlayerGender = 'male'
  forcedUnlocks = new Set<string>()
  illegalHeat = 0
  unlockedThemes = new Set<string>(['default', 'light', 'dark'])
  activeTheme: ThemeId = 'light'
  codexUnlockDates: Record<string, string> = {}
  undergroundCooldowns: Record<string, number> = {}
  heatShieldUntil = 0
  heatProtectionUntil = 0
  launderingUntil = 0
  lastActiveAt = Date.now()
  comebackClaimedDay: string | null = null
  comebackPending = 0
  notificationPrefs = { dailyReward: true, passiveIncome: true, goalNear: true, webPush: false }
  chestPityCounter = 0
  chestTickets = 0
  campaign = createCampaignState()
  surpriseInvestorUntil = 0
  surpriseInvestorDay = ''
  seenStoryBeats = new Set<string>()
  earnedBadges = new Set<string>()
  raidsToday = 0
  raidsDay = todayKey()
  heatWasCritical = false
  heatSurvived = false
  undergroundLawyerUsed = false
  advisorBuys = 0
  comebackClaimed = false
  streakMilestonesClaimed: number[] = []
  dynasty = createDynastyState()
  activeMarketNews: ActiveMarketNews | null = null
  shopBoostUntil = 0
  upgradeDiscountActive = false
  undergroundTree = createUndergroundTreeState()
  empire = createEmpireState()
  gameStartYear = 2026
  reputation = REPUTATION_START
  rivals = createRivalsState()
  chronicle: ChronicleEntry[] = []
  legacyMonuments: LegacyMonument[] = []
  victoriesUnlocked: VictoryId[] = []
  totalRaidsCaught = 0
  presidentSeasons = 0
  presidentSinceSeasonKey: string | null = null
  lastWorldStageId: WorldStageId = 'local'
  childCrises: { childId: string; type: 'gambler' | 'illegal' | 'scandal' }[] = []
  gazetteEntries: GazetteEntry[] = []
  activeCrisis: ActiveCrisis | null = null
  crisisIncomeMult = 1
  crisisHoldBonusUntil = 0
  victoryMechanics: VictoryMechanic[] = []
  bankruptcyCount = 0
  insurance = createInsuranceState()
  commodities = createCommodityMarket()
  investmentOffer: InvestmentOffer | null = null
  pendingInvestments: PendingInvestment[] = []
  franchises: FranchiseBranch[] = []
  namedManagers: HiredNamedManager[] = []
  pendingRivalOffer: RivalAllianceOffer | null = null
  undergroundMarketActive: UndergroundMarketAction[] = []
  advisorTip: AdvisorTip | null = null
  advisorTipDay = 0
  calendarPurchaseDay = ''
  lastCrisisGameDay = 0
  lastInvestmentOfferDay = 0
  playerTitleId = 'tycoon'
  baronHistory: BaronRecord[] = []
  baronCounter = 1
  currentBaronStartedGameDay = 1
  baronLifePeakNetWorth = 0
  baronLifeEarnedStart = 0
  baronLifeRaidsUninsured = 0
  baronLifeChildCrises = 0
  baronLifeFactoryRaidDamage = 0
  cities = createCityState()
  torpil = createTorpilState()
  producerModernized: Record<string, boolean> = {}
  pendingUndo: PendingUndo | null = null
  lastDisasterGameDay = 0
  dynastyPassiveIncome = 0
  peakIncomePerDay = 0
  prestigeShopPurchased: string[] = []
  private lastCalendarEmitDay = ''
  private lastCommodityTick = Date.now()
  private lastInsuranceChargeDay = 0
  pendingBoosts: PendingBoostItem[] = []
  private lastRivalTickDay = 0
  private rivalWasAhead = new Set<string>()
  private lastIllegalRiskCheck = 0
  private lastHeatTick = 0
  private nudgeFlags = new Set<string>()
  /** Yokken biriken — sadece reklamla toplanır */
  pendingOfflineEarnings = 0
  bankruptcyRecoveryPool = 0
  bankruptcyRecoveryClaimed = false
  bankruptcySeizedSnapshot: SeizedBusiness[] = []
  lastBankruptcyAt = 0
  bankruptcyCashGraceSince = 0

  comboCount = 0
  comboMultiplier = 1
  private lastClickTime = 0
  private activeEvent: GameEventDef | null = null
  private activeEventExpires = 0
  private missedEvent: GameEventDef | null = null
  private eventTimer: number | null = null
  private eventExpireTimer: number | null = null
  private nextEventAt = 0
  private eventExpireAt = 0
  private eventScheduleRemainingMs = 0
  private eventExpireRemainingMs = 0
  private eventPreviewTimer: number | null = null
  private _checkingAchievements = false
  private _ensuringWeekly = false
  private lastNearMissToastAt = 0
  private lastStockTick = Date.now()
  private lastAutoBuyTick = 0
  private lastDayNightCheck = 0
  private lastMarketEventCheck = 0
  private passiveRecent: { at: number; amount: number }[] = []
  private lastGameClockEmit = 0
  private lastDynastyGameDay = 0
  private lastMarketNewsGameDay = 0

  private listeners = new Set<(event: GameEvent) => void>()
  private tickHandle: number | null = null
  private ownerFlags: OwnerFlags = {}

  constructor() {
    for (const p of PRODUCERS) this.producers[p.id] = 0
    for (const r of RESEARCH_NODES) this.research[r.id] = 0
    for (const p of PRODUCERS) this.managers[p.id] = false
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.ensureMissions()
    this.applyOwnerFlags(loadOwnerFlags())
  }

  applyOwnerFlags(flags: OwnerFlags): void {
    this.ownerFlags = { ...flags }
    if (this.ownerFlags.free_boost) {
      this.adIncomeBoostUntil = Date.now() + 365 * 24 * 60 * 60_000
    }
  }

  private ownerFlag(id: string): boolean {
    return this.ownerFlags[id] === true
  }

  ensureSeason(): void {
    const key = seasonWeekKey()
    if (isLegacyGameSeasonKey(this.season.weekKey)) {
      this.season.weekKey = key
      return
    }
    if (this.season.weekKey !== key) {
      this.season = createSeasonState()
    }
  }

  ensureWeekly(): void {
    // Re-entrancy guard: createWeeklyState(this.incomePerDay()) below calls
    // incomePerDay() → weeklySynergyMult() → ensureWeekly() again. With a stale
    // weekKey and an owned producer, that re-entry recursed forever (stack
    // overflow). The guard makes any re-entrant call a no-op (it reads the
    // current weekly def for the in-flight income calc) so regeneration runs
    // exactly once. Income formula and weekly multiplier are unchanged.
    if (this._ensuringWeekly) return
    this._ensuringWeekly = true
    try {
      const key = calendarWeekKey()
      if (this.weekly.weekKey !== key || isLegacyGameWeekKey(this.weekly.weekKey)) {
        this.weekly = createWeeklyState(this.incomePerDay())
        return
      }
      if (this.weekly.rewardCash === undefined || this.weekly.rewardCash <= 0) {
        this.weekly.rewardCash = weeklyRewardCash(this.incomePerDay())
      }
    } finally {
      this._ensuringWeekly = false
    }
  }

  subscribe(listener: (event: GameEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  private introFlowReady(): boolean {
    return this.onboardingComplete || this.tutorialDone
  }

  isIntroFlowReady(): boolean {
    return this.introFlowReady()
  }

  private hasAnyBusiness(): boolean {
    return Object.values(this.producers).some((count) => count > 0)
  }

  private ensureFirstBusinessTimestamp(): void {
    if (!this.hasAnyBusiness()) {
      this.firstBusinessPlayTimeMs = null
      return
    }
    if (this.firstBusinessPlayTimeMs == null) {
      this.firstBusinessPlayTimeMs = Math.max(0, this.playTimeMs - META_SYSTEMS_AFTER_FIRST_BUSINESS_MS)
    }
  }

  isMetaSystemsReady(): boolean {
    if (!this.introFlowReady()) return false
    if (!this.hasAnyBusiness()) return false
    this.ensureFirstBusinessTimestamp()
    const firstBusinessAt = this.firstBusinessPlayTimeMs ?? this.playTimeMs
    const firstBusinessReady = this.playTimeMs - firstBusinessAt >= META_SYSTEMS_AFTER_FIRST_BUSINESS_MS
    const playTimeReady = this.playTimeMs >= META_SYSTEMS_MIN_PLAY_MS
    return firstBusinessReady || playTimeReady
  }

  isEarlyGameProtected(): boolean {
    return !this.isMetaSystemsReady()
  }

  canShowDailyRewardPrompt(): boolean {
    return this.isMetaSystemsReady()
      && this.hasAnyBusiness()
      && this.playTimeMs >= DAILY_REWARD_MIN_PLAY_MS
  }

  startTick(): void {
    if (this.tickHandle !== null) return
    let last = performance.now()
    let lastPassiveGameDay = gameDay(this.gameTimeMs)
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const flowReady = this.introFlowReady()
      if (flowReady && !this.gamePaused) {
        this.playTimeMs += dt * 1000
      }
      const gameDt = flowReady && !this.gamePaused && dt > 0 && dt < 2 ? dt : 0
      if (gameDt > 0) {
        const gameMsDelta = realSecondsToGameMs(gameDt)
        this.gameTimeMs += gameMsDelta
        this.tickChildEducation(gameMsDelta)
        const currentPassiveGameDay = gameDay(this.gameTimeMs)
        if (currentPassiveGameDay < lastPassiveGameDay) lastPassiveGameDay = currentPassiveGameDay
        const passiveDays = currentPassiveGameDay - lastPassiveGameDay
        if (passiveDays > 0) {
          lastPassiveGameDay = currentPassiveGameDay
          const currentIpd = PRODUCERS.reduce((sum, p) => sum + this.producerIncome(p), 0)
          if (currentIpd > this.peakIncomePerDay) this.peakIncomePerDay = currentIpd
          const income = this.incomePerDay() * passiveDays
          if (income > 0) this.addMoney(income, true)
          const wage = applyDailyWage(this.career, currentPassiveGameDay)
          if (wage > 0) {
            this.addMoney(wage, false)
            this.emit({ type: 'career_wage', amount: wage })
          }
        }
      }
      this.updateComboDecay(now)
      if (flowReady && !this.gamePaused) {
        this.tickStock(now)
        this.tickDayNight(now)
        this.tickAutoBuy(now)
        this.tickIllegalRisk(now)
        this.tickIllegalHeat(now)
        this.tickNearMiss(now)
      }
      if (flowReady && !this.gamePaused && now - this.lastGameClockEmit > 1000) {
        this.lastGameClockEmit = now
        const metaReady = this.isMetaSystemsReady()
        if (metaReady) {
          if (this.eventTimer === null && this.eventPreviewTimer === null && !this.activeEvent) {
            this.scheduleNextEvent()
          }
          this.tickMarketNews()
          this.tickDynasty()
          this.tickMetaSystems()
        } else {
          this.tickCommodities()
          this.tickUndoExpiry()
        }
        this.emit({ type: 'game_time' })
      }
      this.tickHandle = requestAnimationFrame(loop)
    }
    this.tickHandle = requestAnimationFrame(loop)
    this.scheduleNextEvent()
  }

  stopTick(): void {
    if (this.tickHandle !== null) {
      cancelAnimationFrame(this.tickHandle)
      this.tickHandle = null
    }
    this.freezeEventTimers()
  }

  isTicking(): boolean {
    return this.tickHandle !== null
  }

  isPaused(): boolean {
    return this.gamePaused
  }

  togglePause(): boolean {
    this.gamePaused = !this.gamePaused
    if (this.gamePaused) {
      this.freezeEventTimers()
    } else {
      this.resumeEventTimers()
    }
    this.emit({ type: 'game_pause', paused: this.gamePaused })
    if (!this.gamePaused) this.emit({ type: 'game_time' })
    return this.gamePaused
  }

  private freezeEventTimers(): void {
    const now = Date.now()
    if (this.eventPreviewTimer !== null) {
      clearTimeout(this.eventPreviewTimer)
      this.eventPreviewTimer = null
    }
    if (this.eventTimer !== null) {
      clearTimeout(this.eventTimer)
      this.eventTimer = null
      this.eventScheduleRemainingMs = Math.max(0, this.nextEventAt - now)
    }
    if (this.eventExpireTimer !== null) {
      clearTimeout(this.eventExpireTimer)
      this.eventExpireTimer = null
      this.eventExpireRemainingMs = Math.max(0, this.eventExpireAt - now)
    }
  }

  private resumeEventTimers(): void {
    if (!this.isMetaSystemsReady()) {
      this.eventScheduleRemainingMs = computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
      this.nextEventAt = Date.now() + this.eventScheduleRemainingMs
      return
    }
    if (this.activeEvent && this.eventExpireRemainingMs > 0) {
      this.eventExpireAt = Date.now() + this.eventExpireRemainingMs
      this.activeEventExpires = this.eventExpireAt
      this.eventExpireTimer = window.setTimeout(() => {
        const event = this.activeEvent
        if (event) {
          this.missedEvent = event
          this.activeEvent = null
          this.emit({ type: 'event_missed', event })
        }
        this.scheduleNextEvent()
      }, this.eventExpireRemainingMs)
      this.eventExpireRemainingMs = 0
    } else if (!this.activeEvent) {
      const delay = this.eventScheduleRemainingMs > 0
        ? this.eventScheduleRemainingMs
        : computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
      this.eventScheduleRemainingMs = 0
      this.nextEventAt = Date.now() + delay
      this.eventTimer = window.setTimeout(() => this.spawnGoldenEvent(), delay)
    }
  }

  startEventLoop(): void {
    this.scheduleNextEvent()
  }

  private scheduleNextEvent(): void {
    if (this.eventTimer !== null) clearTimeout(this.eventTimer)
    if (this.eventPreviewTimer !== null) clearTimeout(this.eventPreviewTimer)
    this.eventTimer = null
    this.eventPreviewTimer = null
    if (!this.isMetaSystemsReady()) {
      this.eventScheduleRemainingMs = computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
      this.nextEventAt = Date.now() + this.eventScheduleRemainingMs
      return
    }
    if (this.gamePaused) {
      this.eventScheduleRemainingMs = computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
      this.nextEventAt = Date.now() + this.eventScheduleRemainingMs
      return
    }
    const delay = computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
    this.nextEventAt = Date.now() + delay
    this.eventScheduleRemainingMs = 0
    const previewDelay = Math.max(0, delay - EVENT_PREVIEW_LEAD_MS)
    if (previewDelay > 0) {
      this.eventPreviewTimer = window.setTimeout(() => {
        this.eventPreviewTimer = null
        if (!this.gamePaused && !this.activeEvent) {
          this.emit({
            type: 'golden_event_preview',
            hint: 'Yatırımcı, vergi iadesi veya viral reklam fırsatı geliyor…',
            arrivesInMs: EVENT_PREVIEW_LEAD_MS,
          })
        }
      }, previewDelay)
    }
    this.eventTimer = window.setTimeout(() => this.spawnGoldenEvent(), delay)
  }

  getNextGoldenEventInMs(): number {
    if (this.activeEvent) return 0
    return Math.max(0, this.nextEventAt - Date.now())
  }

  private spawnGoldenEvent(): void {
    if (!this.isMetaSystemsReady()) {
      this.scheduleNextEvent()
      return
    }
    if (this.gamePaused) {
      this.eventScheduleRemainingMs = computeGoldenEventDelay(this.eventsSeen, this.playTimeMs)
      return
    }
    if (this.activeEvent) {
      this.scheduleNextEvent()
      return
    }
    const event = pickRandomEvent()
    this.activeEvent = event
    this.activeEventExpires = Date.now() + event.durationMs
    this.eventExpireAt = this.activeEventExpires
    this.eventsSeen++
    this.emit({ type: 'golden_event', event, expiresAt: this.activeEventExpires })

    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    this.eventExpireRemainingMs = 0
    this.eventExpireTimer = window.setTimeout(() => {
      if (this.activeEvent?.id === event.id) {
        this.missedEvent = event
        this.activeEvent = null
        this.emit({ type: 'event_missed', event })
      }
      this.scheduleNextEvent()
    }, event.durationMs)
  }

  claimGoldenEvent(): boolean {
    if (!this.activeEvent) return false
    const event = this.activeEvent
    this.activeEvent = null
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)

    this.grantPendingBoost(
      event.boostKind,
      event.boostDurationMs,
      event.pendingLabel,
      event.emoji,
    )
    this.emit({ type: 'event_claimed', event, reward: 0 })
    this.emit({ type: 'pending_boost_added', label: event.pendingLabel })
    this.scheduleNextEvent()
    return true
  }

  acceptGoldenEventSmall(): boolean {
    if (!this.activeEvent) return false
    const event = this.activeEvent
    this.activeEvent = null
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    const boostMs = (event as import('./Events').GameEventDef).acceptBoostDurationMs ?? Math.floor(event.boostDurationMs / 2)
    this.grantPendingBoost(
      event.boostKind,
      boostMs,
      event.pendingLabel,
      event.emoji,
    )
    this.emit({ type: 'event_claimed', event, reward: 0 })
    this.emit({ type: 'pending_boost_added', label: event.pendingLabel })
    this.scheduleNextEvent()
    return true
  }

  dismissGoldenEvent(): void {
    this.activeEvent = null
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    this.scheduleNextEvent()
  }

  restoreMissedEvent(): GameEventDef | null {
    const e = this.missedEvent
    this.missedEvent = null
    if (!e) return null
    this.activeEvent = e
    this.activeEventExpires = Date.now() + e.durationMs
    if (this.eventExpireTimer !== null) clearTimeout(this.eventExpireTimer)
    this.eventExpireTimer = window.setTimeout(() => {
      if (this.activeEvent?.id === e.id) {
        this.missedEvent = e
        this.activeEvent = null
        this.emit({ type: 'event_missed', event: e })
      }
      this.scheduleNextEvent()
    }, e.durationMs)
    this.emit({ type: 'golden_event', event: e, expiresAt: this.activeEventExpires })
    return e
  }

  hasMissedEvent(): boolean {
    return this.missedEvent !== null
  }

  getActiveGoldenEvent(): GameEventDef | null {
    return this.activeEvent
  }

  getEventBoostActive(): boolean {
    return Date.now() < this.eventBoostUntil
  }

  private updateComboDecay(now: number): void {
    if (this.comboCount > 0 && now - this.lastClickTime > COMBO_WINDOW_MS) {
      this.comboCount = 0
      this.comboMultiplier = 1
      this.emit({ type: 'combo_changed', combo: 0, multiplier: 1 })
    }
  }

  private lastBankruptcyCheck = 0

  private tickStock(now: number): void {
    if (now - this.lastStockTick >= STOCK_TICK_MS) {
      tickStockPrice(this.stock)
      this.lastStockTick = now
      this.emit({ type: 'stock_tick' })
    }
    const macro = tickMacro(this.stock, now)
    if (macro) {
      this.emit({ type: 'macro_event', headline: macro.headline, crash: macro.crash })
      if (macro.crash) this.emit({ type: 'market_event', crash: true })
    }
    if (now - this.lastMarketEventCheck > 300_000 && Math.random() < 0.05) {
      this.lastMarketEventCheck = now
      const crash = Math.random() < 0.5
      startMarketEvent(this.stock, crash)
      this.emit({ type: 'market_event', crash })
    }
    const interest = tickBankInterest(this.bank, this.stock.centralBankRate, now)
    if (interest) {
      const snap = this.bank.lastInterestSnapshot
      if (snap && Math.abs(snap.net) >= 500_000) {
        this.emit({ type: 'finance_tick', headline: interest.headline, snapshot: snap })
      } else {
        this.emit({ type: 'finance_tick', snapshot: snap })
      }
      if (interest.bankrupt && now > this.bank.bankruptcyCooldownUntil) {
        this.resolveBankruptcy('Kredi faizi ödenemedi — iflas koruması devreye girdi')
      }
    }
    if (
      this.bank.loan > 0
      && netWorth(this.money, portfolioValue(this.stock), this.bank) < this.bank.loan * 0.35
      && now > this.bank.bankruptcyCooldownUntil
      && now - this.lastBankruptcyCheck > 30_000
    ) {
      this.lastBankruptcyCheck = now
      this.resolveBankruptcy('Net değer borcun altına düştü')
    }
    this.checkBankruptcyTriggers(now)
  }

  private checkBankruptcyTriggers(now: number): void {
    if (now <= this.bank.bankruptcyCooldownUntil) return
    if (now - this.lastBankruptcyAt < BANKRUPTCY_COOLDOWN_MS) return

    if (this.financeNetWorth() <= 0 && now - this.lastBankruptcyCheck > 30_000) {
      this.lastBankruptcyCheck = now
      this.resolveBankruptcy('Net değer sıfırın altına düştü — tam iflas')
      return
    }

    if (this.money <= 0 && this.bank.loan > 0) {
      if (this.bankruptcyCashGraceSince === 0) this.bankruptcyCashGraceSince = now
      const graceElapsed = now - this.bankruptcyCashGraceSince
      const passive = this.incomePerDay()
      const canServiceDebt = passive >= this.bank.loan * 0.002
      if (graceElapsed >= BANKRUPTCY_CASH_GRACE_MS && !canServiceDebt) {
        this.resolveBankruptcy('Nakit tükendi — borç ödenemiyor')
      }
    } else {
      this.bankruptcyCashGraceSince = 0
    }
  }

  private maybeBankruptcyAfterFinancialShock(reason: string): void {
    const now = Date.now()
    if (now <= this.bank.bankruptcyCooldownUntil) return
    if (now - this.lastBankruptcyAt < BANKRUPTCY_COOLDOWN_MS) return
    if (this.financeNetWorth() <= 0) {
      this.resolveBankruptcy(reason)
    }
  }

  private tickDayNight(now: number): void {
    if (now - this.lastDayNightCheck < 1000) return
    this.lastDayNightCheck = now
    const weekend = isGameWeekend(this.gameTimeMs)
    if (weekend !== this.isNight) {
      this.isNight = weekend
      this.emit({ type: 'day_night', isNight: weekend })
    }
  }

  private tickIllegalHeat(now: number): void {
    if (this.ownerFlag('no_heat')) return
    if (now - this.lastHeatTick < 15_000) return
    this.lastHeatTick = now
    if (Date.now() < this.heatShieldUntil) return

    const prev = this.illegalHeat
    if (this.illegalHeat >= 80) this.heatWasCritical = true

    if (Date.now() < this.launderingUntil) {
      this.illegalHeat = Math.max(0, this.illegalHeat - 15)
    }

    const target = this.targetIllegalHeat()
    const decayMult = (1 + heatDecayBonus(this.prestigeTree)) * ugHeatDecayBonus(this.undergroundTree)
    if (Math.abs(target - this.illegalHeat) < 0.5) {
      this.illegalHeat = target
    } else if (target > this.illegalHeat) {
      const heatReduce = researchHeatGainReduction(this.research)
      this.illegalHeat += (target - this.illegalHeat) * 0.15 * (1 - heatReduce)
    } else {
      this.illegalHeat += (target - this.illegalHeat) * 0.15 * decayMult
    }
    if (target <= 0) this.illegalHeat = Math.max(0, this.illegalHeat - 2 * decayMult)

    if (this.heatWasCritical && this.illegalHeat < 55) {
      this.heatSurvived = true
      this.heatWasCritical = false
      this.checkAchievements()
    }

    if (this.illegalHeat >= 90 && !this.seenStoryBeats.has('heat_90')) {
      this.triggerStoryBeat('heat_90')
    } else if (this.illegalHeat >= 80 && !this.seenStoryBeats.has('heat_critical')) {
      this.triggerStoryBeat('heat_critical')
    } else if (this.illegalHeat >= 70 && !this.seenStoryBeats.has('heat_70')) {
      this.triggerStoryBeat('heat_70')
    } else if (this.illegalHeat >= 55 && !this.seenStoryBeats.has('heat_high')) {
      this.triggerStoryBeat('heat_high')
    } else if (this.illegalHeat >= 50 && !this.seenStoryBeats.has('heat_50')) {
      this.triggerStoryBeat('heat_50')
    } else if (this.illegalHeat >= 30 && !this.seenStoryBeats.has('heat_30')) {
      this.triggerStoryBeat('heat_30')
    }

    if (Math.round(prev) !== Math.round(this.illegalHeat)) {
      this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    }
    // reach_heat missions
    this.ensureMissions()
    for (const m of this.missions) {
      if (m.claimed || m.type !== 'reach_heat') continue
      if (this.illegalHeat >= m.target) {
        m.progress = m.target
        if (m.progress >= m.target) this.emit({ type: 'mission_complete', mission: m })
      }
    }
  }

  private targetIllegalHeat(): number {
    let owned = 0
    let types = 0
    for (const p of PRODUCERS) {
      if (!p.illegal) continue
      const n = this.producers[p.id] ?? 0
      if (n > 0) {
        types++
        owned += n
      }
    }
    if (types === 0) return 0
    let heat = Math.min(100, types * 12 + owned * 4)
    if (this.purchasedUpgrades.has('offshore_laundry')) heat *= 0.8
    if (this.hasCodexLegalComplete()) heat = Math.min(100, heat * 0.9)
    heat *= heatGainReduction(this.undergroundTree)
    heat *= 1 - empirePoliticsHeatReduction(this.empire.politics)
    heat += this.empire.darkIndustry.heatBonus
    const heirRole = this.activeHeirRole()
    if (heirRole?.heatBonus) heat += heirRole.heatBonus
    return Math.max(0, heat)
  }

  illegalRiskLabel(): string {
    if (this.illegalHeat < 25) return 'Düşük'
    if (this.illegalHeat < 55) return 'Orta'
    if (this.illegalHeat < 80) return 'Yüksek'
    return 'Kritik'
  }

  illegalIncomePerDay(): number {
    return PRODUCERS.filter((p) => p.illegal).reduce((s, p) => s + this.producerIncome(p), 0)
  }

  legalIncomePerDay(): number {
    return this.incomePerDay() - this.illegalIncomePerDay()
  }

  /** @deprecated use incomePerDay — oyun günü bazlı pasif gelir */
  incomePerSecond(): number {
    return this.incomePerDay()
  }

  /** @deprecated use illegalIncomePerDay */
  illegalIncomePerSecond(): number {
    return this.illegalIncomePerDay()
  }

  /** @deprecated use legalIncomePerDay */
  legalIncomePerSecond(): number {
    return this.legalIncomePerDay()
  }

  private tickIllegalRisk(now: number): void {
    if (this.ownerFlag('no_heat')) return
    if (now - this.lastIllegalRiskCheck < 60_000) return
    this.lastIllegalRiskCheck = now
    if (Date.now() < this.heatProtectionUntil) return

    const today = todayKey()
    if (this.raidsDay !== today) {
      this.raidsDay = today
      this.raidsToday = 0
    }

    const heatMult = 1 + this.illegalHeat / 100
    for (const p of PRODUCERS) {
      if (!p.illegal || !p.riskChance) continue
      const owned = this.producers[p.id] ?? 0
      if (owned <= 0) continue
      const chance = Math.min(0.35, p.riskChance * heatMult * (1 - raidChanceReduction(this.undergroundTree)))
      if (torpilRaidWarning(this.torpil) && Math.random() < 0.35) {
        this.addGazette(requiredDomainText('gz_raid_blocked_torpil'), 'player')
        break
      }
      if (Math.random() > chance) continue
      let finePct = (p.riskFinePct ?? 0.15) * (0.8 + this.illegalHeat / 200)
      finePct *= 1 - raidFineReduction(this.undergroundTree)
      const heirRaidReduction = this.activeHeirRole()?.raidPenaltyReduction ?? 0
      if (heirRaidReduction > 0) finePct *= 1 - heirRaidReduction
      const hukukReduction = hukukRaidReduction(this.departments['hukuk'] ?? 0)
      if (hukukReduction > 0) finePct *= 1 - hukukReduction
      if (hasRaidInsurance(this.prestigeTree) && this.raidsToday === 0) finePct *= 0.5
      if (this.insurance.illegal && this.raidsToday === 0) {
        this.raidsToday++
        this.addGazette(fmt('gz_raid_blocked_illegal', { name: this.playerName.trim() || 'Baron' }), 'player')
        break
      }
      finePct *= raidFineMult(this.insurance, this.raidsToday === 0)
      const fine = Math.floor(this.money * finePct)
      if (fine <= 0) continue
      this.money = Math.max(0, this.money - fine)
      this.illegalHeat = Math.min(100, this.illegalHeat + 20)
      this.raidsToday++
      this.totalRaidsCaught++
      if (!this.insurance.business && !this.insurance.illegal) {
        this.baronLifeRaidsUninsured++
        if (p.tier >= 4) this.baronLifeFactoryRaidDamage = (this.baronLifeFactoryRaidDamage ?? 0) + 1
      }
      this.addReputation(reputationFromRaid())
      this.emit({ type: 'illegal_raid', fine, producerId: p.id })
      this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
      this.emit({ type: 'money_changed' })
      this.maybeBankruptcyAfterFinancialShock('Illegal baskın sonrası iflas')
      break
    }
  }

  private tickAutoBuy(now: number): void {
    const cooldown = autoBuyCooldownMs(this.prestigeTree)
    if (now - this.lastAutoBuyTick < cooldown) return
    this.lastAutoBuyTick = now
    for (const p of PRODUCERS) {
      if (!this.managerAutoBuy[p.id] || !hasManager(this.managers, p.id)) continue
      if (!isProducerUnlocked(p, this.totalEarned, this.forcedUnlocks, this.ipoCount)) continue
      if (this.buyProducer(p.id, 1)) {
        this.emit({ type: 'auto_buy', producerId: p.id })
        break
      }
    }
  }

  dayNightClickBonus(): number {
    if (this.isNight) return 0
    return 0.07 + dayBonusExtra(this.prestigeTree)
  }

  dayNightPassiveBonus(): number {
    if (!this.isNight) return 0
    return 0.1 + nightBonusExtra(this.prestigeTree)
  }

  weeklyProducerBonus(producerId: string): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.producerId === producerId && def.bonus) {
      return 1 + def.bonus * (this.weekly.adDoubled ? 2 : 1)
    }
    return 1
  }

  weeklySynergyMult(): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.id === 'synergy_week') return 2 * (this.weekly.adDoubled ? 2 : 1)
    return 1
  }

  weeklyComboCapMult(): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.comboCapMult) return def.comboCapMult * (this.weekly.adDoubled ? 1.5 : 1)
    return 1
  }

  researchCostWithWeekly(baseCost: number): number {
    this.ensureWeekly()
    const def = getWeeklyDef(this.weekly)
    if (def.id === 'research_sale') return Math.floor(baseCost * (1 - 0.3))
    return baseCost
  }

  comboMultFromCount(count: number): number {
    const cap = this.weeklyComboCapMult()
    let mult = 1
    if (count >= 30 * cap) mult = 3
    else if (count >= 15 * cap) mult = 2
    else if (count >= 5 * cap) mult = 1.5
    return mult
  }

  offlineCapMs(): number {
    return BASE_OFFLINE_CAP_MS + researchOfflineBonusMs(this.research) + offlineBonusMs(this.prestigeTree)
  }

  offlineCapGameDays(): number {
    return Math.floor(this.offlineCapMs() / MS_PER_GAME_DAY)
  }

  vipPassIncomeBonus(): number {
    return this.vipPassActive ? 1.25 : 1
  }

  private marketSaturationPenalty(): number {
    const hasTier15 = PRODUCERS.some(p => p.tier >= 15 && (this.producers[p.id] ?? 0) > 0)
    if (!hasTier15) return 1
    const owed = Math.max(0, 3 - this.ipoCount)
    if (owed === 0) return 1
    return Math.pow(0.5, owed)
  }

  globalMultiplier(): number {
    let mult = prestigeMultiplier(this.prestigePoints) * (1 + prestigeMultBonus(this.prestigeTree))
    mult *= Math.pow(1.15, this.ipoCount)
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'global_mult') mult *= u.value
    }
    if (Date.now() < this.adIncomeBoostUntil) mult *= 2
    if (Date.now() < this.shopBoostUntil) mult *= 1.5
    if (this.getEventBoostActive()) mult *= 3
    mult *= 1 + globalSynergyBonus(this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= 1 + passiveBonus(this.prestigeTree)
    if (this.hasCodexLegalComplete()) mult *= 1.05
    if (this.ownerFlag('income_x2')) mult *= 2
    mult *= this.marketNewsGlobalMult()
    const trait = activeDynastyTrait(this.dynasty)
    // Eş memnuniyeti trait bonusunu güçlendirir (yüksek memnuniyette +%50)
    const traitBase = traitPassiveMult(trait)
    const satMult = spouseSatisfactionMult(this.dynasty)
    mult *= 1 + (traitBase - 1) * satMult
    mult *= 1 + heirCareerPassiveBonus(this.dynasty)
    if (hasNode(this.prestigeTree, 'dynasty_1')) {
      const t = activeDynastyTrait(this.dynasty)
      if (t === 'merchant' || t === 'diplomat') mult *= 1.05
    }
    mult *= 1 + this.legacyMonuments.length * 0.004
    mult *= this.crisisIncomeMult
    if (Date.now() < this.crisisHoldBonusUntil) mult *= 1.4
    mult *= calendarPassiveMult()
    mult *= 1 + franchiseIncomeBonus(this.franchises)
    for (const hm of this.namedManagers) {
      const def = namedManagerDef(hm.id)
      if (def?.globalPassiveMult) mult *= 1 + def.globalPassiveMult
    }
    for (const act of this.undergroundMarketActive) {
      const def = undergroundActionDef(act)
      if (def.incomeMult) mult *= 1 + def.incomeMult
    }
    mult *= this.vipPassIncomeBonus()
    mult *= stressIncomePenalty(this.lifestyle.stress, this.lifestyle.burnoutDays)
    mult *= lifestyleVehicleIncomeMult(this.lifestyle)
    mult *= this.marketSaturationPenalty()
    mult *= healthIncomePenalty(this.health.health)
    if (this.annualFocusBonus === 'work' && gameDay(this.gameTimeMs) <= this.annualFocusBonusUntilDay) {
      mult *= 1.1
    }
    mult *= personalityIncomeMult(this.personality)
    mult *= skillPassiveMult(this.playerSkills)
    if (gameDay(this.gameTimeMs) <= this.dailyReadBonusUntilDay) mult *= 1.05
    mult *= friendshipIncomeMult(this.friendships)
    mult *= mentorIncomeMult(this.mentorEnemy)
    mult *= enemyIncomePenalty(this.mentorEnemy)
    mult *= educationIncomeMult(this.education)
    mult *= 1 + travelIncomeBonus(this.travel, gameDay(this.gameTimeMs))
    // Character path bonus
    const { temiz, acımasız, gölge } = this.characterAlignment
    const pathMax = Math.max(temiz, acımasız, gölge)
    if (pathMax >= 6) mult *= 1.05
    if (pathMax >= 12) mult *= 1.05
    mult *= 1 - careerStressPenalty(this.career.stress)
    mult *= 1 + dynastyGenerationBonus(this.dynasty.generation)
    mult *= 1 + pazarlamaGlobalBonus(this.departments['pazarlama'] ?? 0)
    const softCap = Math.max(8, 8 + this.ipoCount * 4)
    if (mult > softCap) mult = softCap + (mult - softCap) * 0.25
    return mult
  }

  passiveMultiplier(): number {
    const eduResearch = educationResearchBonus(this.education)
    const hobResearch = hobbyResearchBonus(this.hobby)
    const travelRes = travelResearchBonus(this.travel, gameDay(this.gameTimeMs))
    const homeRes = homeRoomResearchBonus(this.lifestyle)
    const bgResearch = backgroundDef(this.characterBackground)?.researchBonus ?? 0
    const heirResearch = this.activeHeirRole()?.researchBonus ?? 0
    const argeRes = argeBonus(this.departments['arge'] ?? 0)
    return this.globalMultiplier() * researchPassiveBonus(this.research) * (1 + this.dayNightPassiveBonus()) * (1 + eduResearch + hobResearch + travelRes + homeRes + bgResearch + heirResearch + argeRes)
  }

  clickMultiplier(): number {
    let mult = 1
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'click_mult') mult *= u.value
    }
    if (this.prestigeShopPurchased.includes('click_bonus_50')) mult *= 1.5
    mult *= this.globalMultiplier()
    mult *= researchClickBonus(this.research)
    mult *= this.comboMultiplier
    mult *= 1 + clickBonus(this.prestigeTree)
    mult *= 1 + this.dayNightClickBonus()
    mult *= traitClickMult(activeDynastyTrait(this.dynasty))
    mult *= this.marketNewsClickMult()
    mult *= calendarClickMult()
    mult *= skillClickMult(this.playerSkills)
    mult *= mentorClickMult(this.mentorEnemy)
    return mult
  }

  producerIncome(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    if (owned === 0) return 0
    let mult = 1
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'producer_mult' && u.producerId === def.id) mult *= u.value
    }
    mult *= 1 + producerSynergyBonus(def.id, this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= managerMultiplier(this.managers, def.id)
    mult *= this.weeklyProducerBonus(def.id)
    if (def.illegal) mult *= traitIllegalMult(activeDynastyTrait(this.dynasty))
    if (def.illegal) mult *= personalityIllegalMult(this.personality)
    if (def.illegal) mult *= 1 + this.heirIllegalBonus()
    mult *= this.marketNewsProducerMult(def.id)
    mult *= spouseProducerBonus(this.dynasty, def.id, hasNode(this.prestigeTree, 'dynasty_1'))
    if (def.illegal) mult *= illegalIncomeBonus(this.undergroundTree)
    if (def.category === 'dark') {
      mult *= empireDarkProductionMult(this.empire.darkIndustry, this.gameTimeMs)
    }
    if (def.category === 'sport') {
      const club = this.empire.football.find((c) => c.clubId === def.id)
      if (club) mult *= empireFootballIncomeMult(club)
      mult *= researchFootballBonus(this.research)
    }
    for (const hm of this.namedManagers) {
      const mdef = namedManagerDef(hm.id)
      if (mdef?.producerMult?.[def.id]) mult *= 1 + mdef.producerMult[def.id]!
      if (def.illegal && mdef?.illegalHeatReduce) mult *= 1 + 0.05
    }
    if (!this.producerModernized[def.id]) {
      mult *= obsolescenceMult(def.tier, this.ipoCount)
    }
    const hobbyBonus = hobbyProducerBonus(this.hobby, def.id)
    if (hobbyBonus > 0) mult *= 1 + hobbyBonus
    const cityBonus = this.cities ? (cityProducerBonus(this.cities, def.category) ?? 0) : 0
    if (cityBonus > 0) mult *= (1 + cityBonus)
    const firmLv = this.producerLevels[def.id] ?? 1
    if (firmLv > 1) mult *= firmLevelIncomeMult(firmLv)
    const firmPurchased = this.producerUpgrades[def.id] ?? []
    if (firmPurchased.length > 0) mult *= 1 + firmUpgradeIncomeBonus(def, firmPurchased)
    if (!def.illegal) mult *= 1 + operasyonLegalBonus(this.departments['operasyon'] ?? 0)
    if (def.category === 'finance') mult *= 1 + finansProducerBonus(this.departments['finans'] ?? 0)
    return scaledBaseIncome(def.baseIncome, def) * owned * mult * this.passiveMultiplier()
  }

  /**
   * TEK GELİR KAYNAĞI: Bu üreticinin (mevcut adet + addedQty) adetteyken üreteceği
   * günlük geliri, `producerIncome` ile BİREBİR aynı pipeline'ı (sinerji, firma
   * seviyesi, upgrade, manager, modernize, şehir/hobi bonusları ve tüm global
   * çarpanlar) kullanarak hesaplar. UI kendi gelir formülünü yazmamalı; satın alma
   * ön izlemesi ve gerçekleşen gelir bu fonksiyondan türetilmelidir.
   *
   * Saftır: adet alanını geçici olarak değiştirir ve okuma bittikten sonra geri alır
   * (senkron; aradan başka iş geçmez).
   */
  projectedProducerIncome(def: ProducerDef, addedQty: number): number {
    const owned = this.producers[def.id] ?? 0
    const target = Math.max(0, owned + addedQty)
    if (target === 0) return 0
    const had = Object.prototype.hasOwnProperty.call(this.producers, def.id)
    const prev = this.producers[def.id]
    // Empire (spor/siyaset) gelir bonusları satın almada syncEmpireFromProducers ile
    // güncellenir; ön izleme gerçek satın alma ile eşit olsun diye empire de geçici
    // olarak projeksiyonla eşitlenir. Yalnız sync'in dokunduğu iki alan (politics.level
    // ve football dizisi) snapshot'lanır ve finally'de geri yüklenir → saf kalır.
    const prevPoliticsLevel = this.empire.politics.level
    const prevFootball = this.empire.football
    this.empire.football = prevFootball.map((c) => ({ ...c }))
    this.producers[def.id] = target
    try {
      syncEmpireFromProducers(this.empire, this.producers)
      return this.producerIncome(def)
    } finally {
      if (had) this.producers[def.id] = prev!
      else delete this.producers[def.id]
      this.empire.politics.level = prevPoliticsLevel
      this.empire.football = prevFootball
    }
  }

  /** `qty` adet satın almanın bu firmanın günlük gelirine ekleyeceği gerçek artış. */
  producerIncomeBuyDelta(def: ProducerDef, qty: number): number {
    return this.projectedProducerIncome(def, qty) - this.producerIncome(def)
  }

  /** Bu firmanın tek bir biriminin (tüm çarpanlar dahil) günlük geliri. */
  producerUnitIncome(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    if (owned > 0) return this.producerIncome(def) / owned
    return this.projectedProducerIncome(def, 1)
  }

  /**
   * Firma SATIN ALMA kilidi. Yeni oyuncu önce kariyere girmeli:
   * bir iş seçilmiş VE (≥3 kariyer aksiyonu VEYA kariyer geliri ≥ ₺1.000).
   * Zaten firma sahibi olan / girişimci olan oyuncular (ve eski save'ler) kilitsizdir.
   * Kilit YALNIZ satın almayı engeller; katalog her zaman görülebilir.
   */
  firmsPurchaseUnlocked(): boolean {
    if (this.career.isEntrepreneur) return true
    if (this.anyProducerOwned()) return true
    if (this.career.jobId == null) return false
    return (this.career.actionsTotal ?? 0) >= 3 || this.career.totalWageEarned >= 1000
  }

  /** UI ilerleme ipucu için kilit durumu (eşik: 3 aksiyon / ₺1.000 kariyer geliri). */
  firmsPurchaseLockStatus(): { locked: boolean; jobSelected: boolean; actions: number; income: number; actionsNeeded: number; incomeNeeded: number } {
    return {
      locked: !this.firmsPurchaseUnlocked(),
      jobSelected: this.career.jobId != null || this.career.isEntrepreneur,
      actions: this.career.actionsTotal ?? 0,
      income: Math.round(this.career.totalWageEarned),
      actionsNeeded: 3,
      incomeNeeded: 1000,
    }
  }

  /** Aktif gelir çarpanları — UI'da dalgalanma açıklaması için */
  incomeModifierChips(): { emoji: string; label: string; detail: string }[] {
    const chips: { emoji: string; label: string; detail: string }[] = []
    if (this.isNight) {
      chips.push({ emoji: '📅', label: 'Hafta sonu', detail: `Pasif +${Math.round(this.dayNightPassiveBonus() * 100)}%` })
    } else {
      chips.push({ emoji: '📅', label: 'Hafta içi', detail: `Tıklama +${Math.round(this.dayNightClickBonus() * 100)}%` })
    }
    const news = this.activeMarketNewsDef()
    if (news) {
      chips.push({ emoji: '📰', label: 'Piyasa haberi', detail: news.headline })
    }
    if (Date.now() < this.adIncomeBoostUntil) chips.push({ emoji: '📺', label: 'Reklam boost', detail: 'Gelir x2' })
    if (Date.now() < this.shopBoostUntil) chips.push({ emoji: '🛒', label: 'Mağaza boost', detail: 'Gelir x1.5' })
    if (this.getEventBoostActive()) chips.push({ emoji: '✨', label: 'Altın etkinlik', detail: 'Gelir x3' })
    const weekly = getWeeklyDef(this.weekly)
    if (weekly.bonus) {
      chips.push({ emoji: '🗓️', label: weekly.name, detail: `+${Math.round(weekly.bonus * 100)}% bonus` })
    }
    if (this.prestigePoints > 0) {
      chips.push({ emoji: '📈', label: 'IPO çarpanı', detail: `x${prestigeMultiplier(this.prestigePoints).toFixed(2)}` })
    }
    const torpilDisc = torpilBusinessDiscount(this.torpil)
    if (torpilDisc > 0) {
      chips.push({ emoji: '🤝', label: 'Torpil ağı', detail: `İşletme alımında %${Math.round(torpilDisc * 100)} indirim` })
    }
    if (this.franchises.length > 0) {
      const fb = franchiseIncomeBonus(this.franchises)
      chips.push({ emoji: '🏪', label: 'Franchise', detail: `${this.franchises.length} şube · +%${Math.round(fb * 100)} pasif` })
    }
    for (const ev of activeCalendarEvents()) {
      chips.push({ emoji: ev.emoji, label: ev.name, detail: ev.headline })
    }
    const synActive = getActiveSynergies(this.producers).filter((s) => s.active).length
    if (synActive > 0) {
      chips.push({ emoji: '⚡', label: 'Sinerji', detail: `${synActive} aktif kombinasyon bonusu` })
    }
    if (this.ipoCount > 0) {
      let obsolete = 0
      for (const p of PRODUCERS) {
        if ((this.producers[p.id] ?? 0) <= 0) continue
        if (obsolescenceMult(p.tier, this.ipoCount) < 0.98 && !this.producerModernized[p.id]) obsolete++
      }
      if (obsolete > 0) {
        chips.push({ emoji: '🔧', label: 'Teknoloji eskidi', detail: `${obsolete} işletme modernize bekliyor — İş sekmesi` })
      }
    }
    return chips
  }

  activeMarketNewsDef(): MarketNewsDef | null {
    if (!this.activeMarketNews) return null
    if (this.gameTimeMs >= this.activeMarketNews.expiresGameTimeMs) {
      this.activeMarketNews = null
      return null
    }
    return newsDef(this.activeMarketNews.defId) ?? null
  }

  currentMarketHeadline(): string | null {
    return this.activeMarketNewsDef()?.headline ?? null
  }

  private marketNewsGlobalMult(): number {
    const n = this.activeMarketNewsDef()
    if (!n) return 1
    if (n.effect === 'global_up') return 1 + n.value
    if (n.effect === 'global_down') return 1 - n.value
    if (n.effect === 'synergy_up') return 1 + n.value * 0.5
    return 1
  }

  private marketNewsClickMult(): number {
    const n = this.activeMarketNewsDef()
    if (n?.effect === 'click_up') return 1 + n.value
    return 1
  }

  private marketNewsProducerMult(producerId: string): number {
    const n = this.activeMarketNewsDef()
    if (n?.effect === 'producer_up' && n.producerId === producerId) return 1 + n.value
    return 1
  }

  private tickMarketNews(): void {
    if (!this.isMetaSystemsReady()) return
    if (this.activeMarketNews && this.gameTimeMs >= this.activeMarketNews.expiresGameTimeMs) {
      this.activeMarketNews = null
      this.emit({ type: 'market_news', headline: '', active: false })
    }
    const day = gameDay(this.gameTimeMs)
    if (day === this.lastMarketNewsGameDay || this.activeMarketNews) return
    if (day % 4 !== 0) return
    this.lastMarketNewsGameDay = day
    const def = pickMarketNews(day)
    this.activeMarketNews = {
      defId: def.id,
      expiresGameTimeMs: this.gameTimeMs + newsDurationMs(def),
    }
    this.emit({ type: 'market_news', headline: def.headline, active: true })
  }

  private tickDynasty(): void {
    const day = gameDay(this.gameTimeMs)
    if (day === this.lastDynastyGameDay) return
    this.lastDynastyGameDay = day
    const metaReady = this.isMetaSystemsReady()
    syncEmpireFromProducers(this.empire, this.producers)
    const { matchBonus, election, matches } = tickEmpireDaily(this.empire, this.producers, this.gameTimeMs, gameYear(this.gameTimeMs))
    if (matchBonus > 0) this.addMoney(matchBonus)
    for (const m of matches) {
      this.emit({ type: 'match_result', ...m })
    }
    if (election) this.triggerStoryBeat('election_year')
    this.tickPresidentSeasons()
    if (metaReady) {
      this.tickRivalFamilies(day)
      this.tickChildCrises()
      this.maybeSpawnChildCrisis()
    }
    if (gameYear(this.gameTimeMs) === 2027 && !this.seenStoryBeats.has('year_2027')) {
      this.triggerStoryBeat('year_2027')
    }
    if (metaReady) this.tickMortality()
    if (!this.dynasty.spouseName || this.dynasty.children.length >= 3) return
    const married = this.dynasty.marriedGameDay ?? day
    if (day - married < 5) return
    if (Math.random() > 0.4) return
    const child = {
      id: `c${day}_${this.dynasty.children.length}`,
      name: pickChildName(this.dynasty.children),
      trait: randomChildTrait(),
      bornGameDay: day,
      educationXp: 0,
      ...pickChildRiskProfile(),
    }
    this.dynasty.children.push(child)
    this.addGazette(fmt('gz_child_born', { name: this.playerName.trim() || 'Baron', child: child.name, risk: child.riskLabel }), 'player')
    this.emit({ type: 'dynasty_update', kind: 'child_born', name: child.name })
  }

  private tickChildEducation(gameMsDelta: number): void {
    if (this.dynasty.children.length === 0) return
    const days = gameMsDelta / MS_PER_GAME_DAY
    const academyMult = this.dynastyAcademyActive() ? 2 : 1
    const gain = educationXpPerGameDay() * days * academyMult
    if (gain <= 0) return
    for (const child of this.dynasty.children) {
      if (child.educationXp >= CHILD_EDUCATION_MAX) continue
      child.educationXp = Math.min(CHILD_EDUCATION_MAX, child.educationXp + gain)
    }
  }

  marrySpouse(spouseId: string): boolean {
    if (this.dynasty.spouseName) return false
    const s = spouseOption(spouseId)
    if (!s || !this.canAfford(s.cost)) return false
    const allowed = s.gender === (this.playerGender === 'male' ? 'female' : 'male')
    if (!allowed) return false
    this.money -= s.cost
    this.dynasty.spouseId = s.id
    this.dynasty.spouseName = s.name
    this.dynasty.spouseTrait = s.trait
    this.dynasty.marriedGameDay = gameDay(this.gameTimeMs)
    this.emit({ type: 'dynasty_update', kind: 'married', name: s.name })
    this.emit({ type: 'money_changed' })
    return true
  }

  successionToChild(childId: string): boolean {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return false
    const prevName = this.playerName
    this.playerName = child.name
    this.dynasty.activeHeirId = child.id
    this.dynasty.dynastyBonusId = child.id
    this.dynasty.generation++
    this.dynasty.playerBornGameDay = gameDay(this.gameTimeMs)
    this.dynasty.playerStartAge = SUCCESSION_START_AGE
    this.dynasty.lifespanNotified = false
    this.dynasty.pendingDeath = null
    this.recordChronicle('dynasty', '👑', `${child.name} imparatorluğu devraldı — ${this.dynasty.generation}. nesil`)
    this.triggerStoryBeat('succession')
    this.resetBaronLifeTracking()
    this.emit({ type: 'dynasty_update', kind: 'succession', name: child.name })
    this.emit({ type: 'story_beat', beatId: 'succession', text: `${prevName} emekli oldu. ${child.name} (${SUCCESSION_START_AGE} yaş) imparatorluğu devraldı.` })
    return true
  }

  playerAge(): number {
    return playerGameAge(this.gameTimeMs, this.dynasty)
  }

  hasPendingDeath(): boolean {
    return this.dynasty.pendingDeath !== null
  }

  needsSuccession(): boolean {
    return this.dynasty.pendingDeath !== null && this.dynasty.children.length > 0
  }

  canSuccessionNow(): boolean {
    return this.dynasty.children.length > 0
  }

  mortalityContext(): MortalityContext {
    const ipd = this.incomePerDay()
    const illegalIpd = this.illegalIncomePerDay()
    return {
      age: this.playerAge(),
      playerName: this.playerName,
      illegalHeat: this.illegalHeat,
      politicsLevel: this.empire.politics.level,
      illegalIncomeShare: ipd > 0 ? illegalIpd / ipd : 0,
      ownedBusinessCount: this.ownedBusinessTiers(),
      hasFootballClub: FOOTBALL_CLUB_IDS.some((id) => (this.producers[id] ?? 0) > 0),
      hasLab: (this.producers.ilac ?? 0) > 0 || (this.producers.nano ?? 0) > 0,
      hasLuxury: (this.producers.otel ?? 0) > 0 || (this.producers.uzay ?? 0) > 0,
      trait: activeDynastyTrait(this.dynasty),
      totalEarned: this.totalEarned,
      difficulty: this.difficulty,
    }
  }

  setDifficulty(id: 'easy' | 'normal' | 'hard'): void {
    this.difficulty = id
    this.difficultyChosen = true
    if (id === 'easy' && this.totalEarned === 0 && this.ipoCount === 0) {
      this.money = Math.max(this.money, 2000)
    }
  }

  estimatedYearsRemaining(): number {
    return estimatedYearsRemaining(this.mortalityContext())
  }

  activeMortalityRisks(): MortalityRiskDisplay[] {
    return mortalityRiskDisplay(this.mortalityContext())
  }

  private tickMortality(): void {
    if (this.dynasty.pendingDeath) return

    const ctx = this.mortalityContext()
    const age = ctx.age

    if (age >= 50 && !this.seenStoryBeats.has('mortality_midlife')) {
      this.triggerStoryBeat('mortality_midlife')
    }
    if (age >= 70 && !this.seenStoryBeats.has('mortality_senior')) {
      this.triggerStoryBeat('mortality_senior')
    }
    if (totalDailyMortalityRisk(ctx) >= 0.002 && !this.seenStoryBeats.has('mortality_high_risk')) {
      this.triggerStoryBeat('mortality_high_risk')
    }

    const outcome = rollDailyMortality(ctx)
    if (!outcome) return

    this.dynasty.pendingDeath = {
      causeId: outcome.causeId,
      age: outcome.age,
      message: outcome.message,
    }

    const record = this.finalizeBaronOnDeath(outcome.label, outcome.emoji, outcome.causeId)
    // Miras puanı hesapla ve biriktir
    const newLegacyScore = calculateLegacyScore(
      this.baronLifePeakNetWorth,
      this.dynasty.generation,
      this.ipoCount,
      this.victoriesUnlocked.length,
    )
    this.legacyScore += newLegacyScore
    this.dynasty.accumulatedLegacyScore = (this.dynasty.accumulatedLegacyScore ?? 0) + newLegacyScore
    const { title: publicTitle, emoji: publicEmoji } = publicMemoryTitle(this.reputation)
    this.emit({ type: 'baron_eulogy', record, hasHeir: this.dynasty.children.length > 0 })
    this.emit({
      type: 'baron_legacy_card',
      peakNetWorth: this.baronLifePeakNetWorth,
      generation: this.dynasty.generation,
      ipoCount: this.ipoCount,
      reputation: this.reputation,
      legacyScore: this.legacyScore,
      publicTitle,
      publicEmoji,
    })
    this.emit({
      type: 'player_death',
      age: outcome.age,
      causeId: outcome.causeId,
      emoji: outcome.emoji,
      label: outcome.label,
      message: outcome.message,
      hasHeir: this.dynasty.children.length > 0,
    })
  }

  resolveDeathWithoutHeir(): boolean {
    const death = this.dynasty.pendingDeath
    if (!death) return false
    const penalty = Math.floor(this.money * 0.15)
    this.money = Math.max(0, this.money - penalty)
    this.dynasty.pendingDeath = null
    this.dynasty.playerBornGameDay = gameDay(this.gameTimeMs)
    this.dynasty.playerStartAge = Math.max(PLAYER_START_AGE, death.age - 8)
    this.resetBaronLifeTracking()
    this.emit({
      type: 'story_beat',
      beatId: 'death_no_heir',
      text: `Mirasçı yoktu — aile avukatları imparatorluğu kurtardı.${penalty > 0 ? ` ${formatMoney(penalty)} harcandı.` : ''} ${this.dynasty.playerStartAge} yaşında yeniden yönetime geçtin.`,
    })
    this.emit({ type: 'money_changed' })
    return true
  }

  dynastyCostMult(): number {
    return traitCostMult(activeDynastyTrait(this.dynasty)) * (1 - empirePoliticsCostDiscount(this.empire.politics))
  }

  incomePerDay(): number {
    return PRODUCERS.reduce((sum, p) => sum + this.producerIncome(p), 0) + this.dynastyPassiveIncome + this.characterIncomeDailyBonus
  }

  /** Oyun günü bazlı pasif gelir; gerçek saniyeye çevrim GameClock üzerinden yapılır. */
  passiveIncomePerSecond(): number {
    return this.incomePerDay()
  }

  /** Bir adet daha alınca eklenecek pasif gelir (kart/ROI için) */
  marginalProducerIncome(def: ProducerDef, count = 1): number {
    const owned = this.producers[def.id] ?? 0
    if (owned > 0) {
      return (this.producerIncome(def) / owned) * count
    }
    let mult = 1
    for (const uid of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === uid)
      if (u?.effect === 'producer_mult' && u.producerId === def.id) mult *= u.value
    }
    mult *= 1 + producerSynergyBonus(def.id, this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    mult *= this.weeklyProducerBonus(def.id)
    if (def.illegal) mult *= traitIllegalMult(activeDynastyTrait(this.dynasty))
    if (def.illegal) mult *= personalityIllegalMult(this.personality)
    mult *= this.marketNewsProducerMult(def.id)
    mult *= spouseProducerBonus(this.dynasty, def.id, hasNode(this.prestigeTree, 'dynasty_1'))
    if (def.illegal) mult *= illegalIncomeBonus(this.undergroundTree)
    if (def.category === 'dark') {
      mult *= empireDarkProductionMult(this.empire.darkIndustry, this.gameTimeMs)
    }
    if (def.category === 'sport') {
      const club = this.empire.football.find((c) => c.clubId === def.id)
      if (club) mult *= empireFootballIncomeMult(club)
      mult *= researchFootballBonus(this.research)
    }
    return scaledBaseIncome(def.baseIncome, def) * count * mult * this.passiveMultiplier()
  }

  /** Ortalama tıklama başına kazanç (combo/krit hariç) */
  clickIncomePerTap(): number {
    return BASE_CLICK * this.clickMultiplier()
  }

  /** HUD chip — combo hariç sabit tıklama geliri */
  baseClickIncomePerTap(): number {
    let mult = 1
    for (const id of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === id)
      if (u?.effect === 'click_mult') mult *= u.value
    }
    mult *= this.globalMultiplier()
    mult *= researchClickBonus(this.research)
    mult *= 1 + clickBonus(this.prestigeTree)
    mult *= 1 + this.dayNightClickBonus()
    mult *= traitClickMult(activeDynastyTrait(this.dynasty))
    mult *= this.marketNewsClickMult()
    return BASE_CLICK * mult
  }

  /** HUD için yuvarlanmış pasif hız — format titremesini önler */
  displayPassiveIncomePerSecond(): number {
    const v = this.passiveIncomePerSecond()
    if (v <= 0) return 0
    if (v < 100) return Math.round(v * 10) / 10
    if (v < 10_000) return Math.round(v)
    if (v < 1_000_000) return Math.round(v / 100) * 100
    if (v < 1_000_000_000) return Math.round(v / 10_000) * 10_000
    return Math.round(v / 1_000_000) * 1_000_000
  }

  /** HUD için yuvarlanmış tıklama geliri */
  displayClickIncomePerTap(): number {
    const v = this.baseClickIncomePerTap()
    if (v <= 0) return 0
    if (v < 100) return Math.round(v * 10) / 10
    if (v < 10_000) return Math.round(v)
    return Math.round(v / 100) * 100
  }

  /** Son penceredeki gerçek pasif hız — teorik ile karşılaştırma için */
  measuredPassivePerSecond(): number {
    const now = performance.now()
    const windowMs = 3000
    this.passiveRecent = this.passiveRecent.filter((x) => now - x.at < windowMs)
    if (this.passiveRecent.length === 0) return this.incomePerDay()
    const oldest = this.passiveRecent[0]!.at
    const spanSec = Math.max(0.5, (now - oldest) / 1000)
    const sum = this.passiveRecent.reduce((s, x) => s + x.amount, 0)
    return sum / spanSec
  }

  /** Son 3 sn'de cüzdana giren gerçek hız (pasif + tıklama + ödül) */
  measuredWalletPerSecond(): number {
    return this.measuredPassivePerSecond()
  }

  private recordPassiveEarned(amount: number, at: number): void {
    this.passiveRecent.push({ at, amount })
    if (this.passiveRecent.length > 40) {
      this.passiveRecent.splice(0, this.passiveRecent.length - 40)
    }
  }

  unlockedProducers(): ProducerDef[] {
    return PRODUCERS.filter((p) => isProducerUnlocked(p, this.totalEarned, this.forcedUnlocks, this.ipoCount))
  }

  earlyUnlockProducer(id: string): boolean {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def || isProducerUnlocked(def, this.totalEarned, this.forcedUnlocks, this.ipoCount)) return false
    const cost = earlyUnlockCost(def)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.forcedUnlocks.add(id)
    this.emit({ type: 'producer_unlocked', producerId: id })
    this.emit({ type: 'money_changed' })
    return true
  }

  ownedBusinessTiers(): number {
    return PRODUCERS.filter((p) => (this.producers[p.id] ?? 0) > 0).length
  }

  anyProducerOwned(): boolean {
    return PRODUCERS.some((p) => (this.producers[p.id] ?? 0) > 0)
  }

  addMoney(amount: number, countTotal = true): void {
    if (amount <= 0) return
    const prevLifetime = this.lifetimeTotalEarned
    this.money += amount
    this.recordPassiveEarned(amount, performance.now())
    this.trackDailyGoal(amount)
    if (this.isNight) this.nightEarningsSession += amount
    if (countTotal) {
      this.totalEarned += amount
      this.lifetimeTotalEarned += amount
      this.sessionEarned += amount
      this.updateMissionProgress('earn_money', amount)
      this.updateWeeklyProgress(amount)
      this.addSeasonXp(Math.floor(amount / 4500))
      this.emit({ type: 'money_changed' })
      this.checkMilestones(prevLifetime)
      this.checkAchievements()
      this.syncCampaignProgress()
    } else {
      this.emit({ type: 'passive_income' })
    }
    this.trackBaronPeak()
  }

  private trackBaronPeak(): void {
    const nw = this.financeNetWorth()
    if (nw > this.baronLifePeakNetWorth) this.baronLifePeakNetWorth = nw
  }

  ensureDailyGoal(): void {
    const day = dailyGoalDayKey()
    if (this.dailyGoalDay !== day) {
      this.dailyGoalDay = day
      this.dailyGoalEarned = 0
      this.dailyGoalClaimed = false
      this.refreshDailyGoalSnapshots()
    }
  }

  private refreshDailyGoalSnapshots(): void {
    const ipd = this.incomePerDay()
    this.dailyGoalTargetSnapshot = scaledDailyGoalTarget(ipd)
    this.dailyGoalRewardSnapshot = Math.max(200, Math.floor(ipd * 0.22))
  }

  private trackDailyGoal(amount: number): void {
    this.ensureDailyGoal()
    const target = this.dailyGoalTarget()
    const bucketBefore = Math.floor(this.dailyGoalEarned / Math.max(1, target / 10))
    this.dailyGoalEarned += amount
    const bucketAfter = Math.floor(this.dailyGoalEarned / Math.max(1, target / 10))
    if (bucketBefore !== bucketAfter || this.dailyGoalEarned >= target) {
      this.emit({ type: 'daily_goal_updated', earned: this.dailyGoalEarned, target })
    }
  }

  claimDailyGoalReward(): number {
    this.ensureDailyGoal()
    const target = this.dailyGoalTarget()
    if (this.dailyGoalClaimed || this.dailyGoalEarned < target) return 0
    this.dailyGoalClaimed = true
    const reward = this.dailyGoalRewardPreview()
    this.addMoney(reward)
    this.emit({ type: 'daily_goal_updated', earned: this.dailyGoalEarned, target })
    return reward
  }

  ipoProgress(): { current: number; target: number; pct: number; ready: boolean } {
    const target = ipoThreshold(this.ipoCount)
    const current = this.totalEarned
    return {
      current,
      target,
      pct: Math.min(100, (current / target) * 100),
      ready: canPrestige(current, this.ipoCount),
    }
  }

  getProducerBreakdown(id: string): ProducerBreakdown | null {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return null
    const owned = this.producers[id] ?? 0
    const lines: { label: string; value: string }[] = []
    const unitBase = scaledBaseIncome(def.baseIncome, def)
    const base = unitBase * owned
    lines.push({ label: 'Temel gelir', value: formatIncomeRate(base) })

    let prodMult = 1
    for (const uid of this.purchasedUpgrades) {
      const u = UPGRADES.find((x) => x.id === uid)
      if (u?.effect === 'producer_mult' && u.producerId === id) prodMult *= u.value
    }
    if (prodMult > 1) lines.push({ label: 'Yükseltme', value: `x${prodMult}` })

    const syn = producerSynergyBonus(id, this.producers) * researchSynergyMultiplier(this.research) * this.weeklySynergyMult()
    if (syn > 0) lines.push({ label: 'Sinerji', value: `+${Math.round(syn * 100)}%` })

    if (hasManager(this.managers, id)) lines.push({ label: 'Yönetici', value: '+25%' })

    const weekly = this.weeklyProducerBonus(id)
    if (weekly > 1) lines.push({ label: 'Haftalık etkinlik', value: `x${weekly.toFixed(1)}` })

    const global = this.passiveMultiplier()
    if (global > 1) lines.push({ label: 'Global çarpan', value: `x${global.toFixed(2)}` })

    return {
      name: def.name,
      owned,
      basePerUnit: unitBase,
      lines,
      totalPerDay: this.producerIncome(def),
    }
  }

  private checkMilestones(prevLifetime: number): void {
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (prevLifetime < threshold && this.lifetimeTotalEarned >= threshold) {
        if (!this.milestonesReached.includes(threshold)) {
          this.milestonesReached.push(threshold)
          this.emit({ type: 'milestone_reached', amount: threshold })
        }
      }
    }
  }

  private updateWeeklyProgress(amount: number): void {
    this.ensureWeekly()
    if (this.weekly.claimed) return
    this.weekly.progress = Math.min(this.weekly.target, this.weekly.progress + amount)
    this.emit({ type: 'weekly_updated', progress: this.weekly.progress, target: this.weekly.target })
  }

  click(x: number, y: number): void {
    const now = performance.now()
    if (now - this.lastClickTime < COMBO_WINDOW_MS) {
      this.comboCount++
    } else {
      this.comboCount = 1
    }
    this.lastClickTime = now
    this.comboMultiplier = this.comboMultFromCount(this.comboCount)
    if (this.comboCount > this.comboBest) this.comboBest = this.comboCount

    this.totalClicks++
    this.updateMissionProgress('clicks', 1)

    const critical = Math.random() < CRIT_CHANCE
    const amount = BASE_CLICK * this.clickMultiplier() * (critical ? CRIT_MULT : 1)
    this.addMoney(amount)
    this.emit({ type: 'click', amount, critical, x, y, combo: this.comboCount })
    this.emit({ type: 'combo_changed', combo: this.comboCount, multiplier: this.comboMultiplier })

    if (Math.random() < 0.002) this.luckyChestReady = true
    this.checkAchievements()
  }

  canAfford(cost: number): boolean {
    return this.money >= cost
  }

  spendMoney(cost: number): void {
    this.money = Math.max(0, this.money - cost)
    this.emit({ type: 'money_changed' })
  }

  producerCostFor(def: ProducerDef, owned: number, count = 1): number {
    const raw = producerCost(def, owned, count)
    const efficiencyDiscount = researchEfficiencyBonus(this.research)
    const bgCostDiscount = backgroundDef(this.characterBackground)?.costDiscount ?? 0
    const lojistikDiscount = lojistikCostReduction(this.departments['lojistik'] ?? 0)
    let cost = Math.floor(
      raw
        * (1 - producerCostDiscount(this.prestigeTree))
        * (1 - efficiencyDiscount)
        * (1 - bgCostDiscount)
        * (1 - lojistikDiscount)
        * this.dynastyCostMult()
        * reputationCostMult(this.reputation)
        * personalityCostMult(this.personality)
        * skillCostMult(this.playerSkills)
        * friendshipCostMult(this.friendships)
        * mentorCostMult(this.mentorEnemy),
    )
    const cal = activeCalendarEvents()
    const monday = cal.find((e) => e.id === 'monday_market')
    const dayKey = localDayKey()
    if (monday?.firstPurchaseDiscount && this.calendarPurchaseDay !== dayKey && owned === 0) {
      cost = Math.floor(cost * (1 - monday.firstPurchaseDiscount))
    }
    const torpilDisc = torpilBusinessDiscount(this.torpil)
    if (torpilDisc > 0) cost = Math.floor(cost * (1 - torpilDisc))
    return cost
  }

  countMaxAffordable(id: string): number {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return 0
    return maxAffordable(def, this.producers[id] ?? 0, this.money, 1 - producerCostDiscount(this.prestigeTree))
  }

  buyProducer(id: string, count = 1): boolean {
    this.ensureDailyPlan()
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def || !isProducerUnlocked(def, this.totalEarned, this.forcedUnlocks, this.ipoCount)) return false
    // Erken oyun kariyer kilidi: ilk firmayı satın almadan önce kariyere girilmeli.
    // (Zaten firma sahibi / girişimci / eski save'ler kilitsiz — bu yalnız ilk alımı geciktirir.)
    if (!this.firmsPurchaseUnlocked()) return false
    const owned = this.producers[id] ?? 0
    const hadAnyBusiness = this.hasAnyBusiness()
    if (def.category === 'politics' && owned === 0 && reputationPoliticsBlocked(this.reputation)) {
      this.emit({ type: 'loan_denied', reason: 'Siyasi işletme kapalı — itibarın çok düşük (min 30)' })
      return false
    }
    const cost = this.producerCostFor(def, owned, count)
    if (!this.canAfford(cost)) return false
    const dayKey = localDayKey()
    if (owned === 0 && activeCalendarEvents().some((e) => e.id === 'monday_market')) {
      this.calendarPurchaseDay = dayKey
    }
    this.money -= cost
    this.producers[id] = owned + count
    if (!hadAnyBusiness) this.firstBusinessPlayTimeMs = this.playTimeMs
    this.businessesBoughtSession += count
    this.updateMissionProgress('buy_business', count)
    if (!this.codexUnlockDates[id]) {
      this.codexUnlockDates[id] = todayKey()
    }
    if (def.illegal) {
      this.addReputation(reputationFromIllegalBusiness() * count)
      if (!this.seenStoryBeats.has('illegal_first')) {
        this.triggerStoryBeat('illegal_first')
      }
    } else {
      this.addReputation(reputationFromLegalBusiness() * count)
    }
    if (owned === 0) {
      this.recordChronicle('business', def.emoji, `${def.name} kuruldu`)
    }
    this.addGazette(headlinePurchase(this.playerName, def.name, owned + count), 'player')
    if ((this.producers[id] ?? 0) >= FRANCHISE_UNLOCK_COUNT) {
      this.addGazette(fmt('gz_franchise_ready', { name: this.playerName.trim() || 'Baron', firm: producerName(def), count: String(FRANCHISE_UNLOCK_COUNT) }), 'player')
    }
    if (this.hasCodexLegalComplete()) {
      this.awardBadge('codex_legal')
      this.triggerStoryBeat('codex_legal')
    }
    if (this.hasCodexAllComplete()) {
      this.awardBadge('codex_all')
    }
    syncEmpireFromProducers(this.empire, this.producers)
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    this.syncCampaignProgress()
    this.checkVictoryConditions()
    this.checkWorldStage()
    this.recordDailyEvent('firm_bought')
    return true
  }

  buyMaxProducer(id: string): number {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return 0
    const count = maxAffordable(def, this.producers[id] ?? 0, this.money, 1 - producerCostDiscount(this.prestigeTree))
    if (count <= 0) return 0
    return this.buyProducer(id, count) ? count : 0
  }

  buyUpgrade(id: string): boolean {
    if (this.purchasedUpgrades.has(id)) return false
    const def = UPGRADES.find((u) => u.id === id)
    if (!def) return false
    const cost = this.upgradeCostFor(def)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.purchasedUpgrades.add(id)
    this.upgradeDiscountActive = false
    this.upgradesBoughtSession++
    this.updateMissionProgress('buy_upgrade', 1)
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    this.syncCampaignProgress()
    return true
  }

  upgradeCostFor(def: UpgradeDef): number {
    let cost = Math.floor(def.cost * ECONOMY_UPGRADE_COST_SCALE * (1 - upgradeCostDiscount(this.prestigeTree)))
    if (this.upgradeDiscountActive) cost = Math.floor(cost * 0.7)
    return cost
  }

  managerCostFor(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    let cost = managerCost(def.baseIncome, owned)
    cost = Math.floor(cost * (1 - managerCostDiscount(this.prestigeTree)))
    if (this.prestigeShopPurchased.includes('manager_discount')) cost = Math.floor(cost * 0.85)
    return cost
  }

  buyResearch(nodeId: string): boolean {
    const node = RESEARCH_NODES.find((n) => n.id === nodeId)
    if (!node) return false
    const level = this.research[nodeId] ?? 0
    if (level >= node.maxLevel) return false
    const cost = this.researchCostWithWeekly(researchCost(node, level))
    if (node.currency === 'money') {
      if (!this.canAfford(cost)) return false
      this.money -= cost
    } else {
      if (this.prestigePoints < cost) return false
      this.prestigePoints -= cost
    }
    this.research[nodeId] = level + 1
    this.emit({ type: 'research_purchased', nodeId, level: level + 1 })
    this.emit({ type: 'money_changed' })
    return true
  }

  availableUpgrades(): UpgradeDef[] {
    return UPGRADES.filter((u) => {
      if (this.purchasedUpgrades.has(u.id)) return false
      if (u.requiresTotalEarned != null && this.totalEarned < u.requiresTotalEarned) return false
      if (u.requiresProducer != null && (this.producers[u.requiresProducer] ?? 0) <= 0) return false
      if (u.requiresUpgrade != null && !this.purchasedUpgrades.has(u.requiresUpgrade)) return false
      return true
    })
  }

  buyPrestigeShopItem(itemId: string): boolean {
    const item = PRESTIGE_SHOP_ITEMS.find((i) => i.id === itemId)
    if (!item) return false
    if (!item.repeatable && this.prestigeShopPurchased.includes(itemId)) return false
    if (this.prestigePoints < item.cost) return false
    this.prestigePoints -= item.cost
    this.prestigeShopPurchased.push(itemId)
    this.emit({ type: 'money_changed' })
    return true
  }

  prestigeEligible(): boolean {
    return canPrestige(this.totalEarned, this.ipoCount)
  }

  pendingPrestigePoints(): number {
    return Math.floor(
      calcPrestigePoints(this.totalEarned, this.ipoCount)
        * skillPrestigeMult(this.playerSkills)
        * friendshipPrestigeMult(this.friendships)
        * mentorPrestigeMult(this.mentorEnemy)
        * (1 + travelPrestigeBonus(this.travel, gameDay(this.gameTimeMs))),
    )
  }

  ipoPreview(): IpoPreviewData {
    const pointsToEarn = this.pendingPrestigePoints()
    const portfolio = portfolioValue(this.stock)
    const liquidationNet = portfolio + this.bank.deposit + this.bank.bonds - this.bank.loan
    const newTotal = this.prestigePoints + pointsToEarn
    return {
      pointsToEarn,
      newTotal,
      newMultiplier: prestigeMultiplier(newTotal),
      portfolioValue: portfolio,
      depositValue: this.bank.deposit,
      bondValue: this.bank.bonds,
      loanDebt: this.bank.loan,
      liquidationNet,
      startingCash: calcIpoStartingCash(pointsToEarn, this.prestigePoints, liquidationNet),
      businessesOwned: Object.values(this.producers).reduce((s, n) => s + (n > 0 ? 1 : 0), 0),
      upgradesOwned: this.purchasedUpgrades.size,
      managersOwned: Object.values(this.managers).filter(Boolean).length,
      keepsPrestigeTree: true,
      keepsResearch: true,
    }
  }

  doPrestige(): number {
    const points = this.pendingPrestigePoints()
    if (points <= 0) return 0

    const stockCash = liquidatePortfolio(this.stock, 1)
    const bankCash = this.bank.deposit + this.bank.bonds
    const loanDebt = this.bank.loan
    const liquidationNet = stockCash + bankCash - loanDebt
    const startingCash = calcIpoStartingCash(points, this.prestigePoints, liquidationNet)

    const dynastyBoostRate = this.prestigeShopPurchased.includes('dynasty_income_boost') ? 0.015 : 0.01
    this.dynastyPassiveIncome += Math.floor(this.peakIncomePerDay * dynastyBoostRate)
    this.peakIncomePerDay = 0

    const hasStartCash2x = this.prestigeShopPurchased.includes('start_cash_2x')
    // Miras kalemleri bonusları
    const legacyWealth = legacyWealthBonus(this.dynasty)
    const legacyRep = legacyReputationBonus(this.dynasty)
    const hasFamilyBiz = legacyHasFamilyBusiness(this.dynasty)
    const finalStartingCash = (hasStartCash2x ? startingCash * 2 : startingCash) + legacyWealth

    this.prestigePoints += points
    this.lifetimePrestige += points
    this.ipoCount++
    const ipoThemeId = themeForIpoCount(this.ipoCount)
    if (ipoThemeId) this.unlockTheme(ipoThemeId)
    this.announceIpoUnlocks(this.ipoCount)
    this.money = finalStartingCash
    this.totalEarned = 0
    this.totalClicks = 0
    this.sessionEarned = 0
    this.firstBusinessPlayTimeMs = null
    this.producers = {}
    for (const p of PRODUCERS) this.producers[p.id] = 0
    if (this.prestigeShopPurchased.includes('start_stajyer_10')) {
      this.producers['stajyer'] = 10
    }
    if (this.prestigeShopPurchased.includes('auto_tier4')) {
      const firstTier4 = PRODUCERS.find((p) => p.tier === 4)
      if (firstTier4) this.producers[firstTier4.id] = Math.max(this.producers[firstTier4.id] ?? 0, 1)
    }
    this.purchasedUpgrades.clear()
    this.luckyChestReady = false
    this.comboCount = 0
    this.comboMultiplier = 1
    for (const p of PRODUCERS) this.managers[p.id] = false
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.stock = createStockState()
    this.bank = createBankState()
    this.nightEarningsSession = 0
    const prevRep = this.reputation
    this.reputation = carryReputationAfterIpo(this.reputation)
    // Aile adı mirası: IPO sonrası itibar bonusu
    if (legacyRep > 0) this.reputation = Math.min(200, this.reputation + legacyRep)
    // Aile işletmesi mirası: ilk işletmeyi başlangıçta ver
    if (hasFamilyBiz) {
      const firstProducer = PRODUCERS.find((p) => p.tier === 1)
      if (firstProducer) this.producers[firstProducer.id] = Math.max(this.producers[firstProducer.id] ?? 0, 1)
    }
    this.recordLegacyMonuments()
    this.recordChronicle('ipo', '🚀', `IPO #${this.ipoCount} — run sıfırlandı, prestij +${points}`)
    syncEmpireFromProducers(this.empire, this.producers)

    this.addSeasonXp(points * 50)
    this.emit({ type: 'prestige', points, startingCash })
    this.emit({ type: 'money_changed' })
    if (this.reputation !== prevRep) {
      this.emit({ type: 'reputation_changed', reputation: this.reputation, delta: this.reputation - prevRep })
    }
    this.checkAchievements()
    this.syncCampaignProgress()
    return points
  }

  private announceIpoUnlocks(count: number): void {
    const msgs: Record<number, string> = {
      1: '📈 1. IPO tamamlandı! Borsada gelişmiş analizler açıldı — kurumsal yatırımcılar sizi takip ediyor.',
      2: '✈️ 2. IPO! Dubai piyasaları sizi fark etti — lüks ve finans merkezi sizi bekliyor.',
      3: '🇬🇧 3. IPO! Londra finans çevrelerinde adınız duyuldu — global imparatorluk kapısı açık.',
      4: '🌐 4. IPO! Uluslararası arenaya açıldınız — holding birleşmeleri artık mümkün.',
      5: '👑 5. IPO! Holdinginiz zirveye ulaştı — imparatorluk yönetimi tam güçte.',
    }
    const msg = msgs[count]
    if (msg) this.addGazette(msg, 'player')
  }

  resolveBankruptcy(reason: string): void {
    const now = Date.now()
    if (now <= this.bank.bankruptcyCooldownUntil) return
    if (now - this.lastBankruptcyAt < BANKRUPTCY_COOLDOWN_MS) return

    const portfolio = portfolioValue(this.stock)
    const fireSale = liquidatePortfolio(this.stock, 0.62)
    const portfolioLoss = Math.max(0, portfolio - fireSale)
    const loanPenalty = Math.floor(this.bank.loan * 0.25)
    const depositBefore = this.bank.deposit
    const bondsBefore = this.bank.bonds

    const { seized, updated } = seizeBusinesses(this.producers)
    this.producers = updated
    syncEmpireFromProducers(this.empire, this.producers)

    const businessLoss = seized.reduce((sum, item) => sum + item.value, 0)
    const depositLoss = Math.floor(depositBefore * 0.3)
    const bondLoss = Math.floor(bondsBefore * 0.25)
    const loss = portfolioLoss + loanPenalty + depositLoss + bondLoss + businessLoss

    this.money += fireSale
    this.bank.loan = Math.floor(this.bank.loan * 0.55)
    this.bank.deposit = Math.floor(this.bank.deposit * 0.7)
    this.bank.bonds = Math.floor(this.bank.bonds * 0.75)
    this.bank.creditScore = Math.max(35, this.bank.creditScore - 18)
    this.bank.bankruptcyCooldownUntil = now + BANKRUPTCY_COOLDOWN_MS
    this.lastBankruptcyAt = now
    this.bankruptcyCount++
    this.bankruptcyCashGraceSince = 0
    this.bankruptcyRecoveryPool = Math.max(0, Math.floor(loss * 0.85))
    this.bankruptcyRecoveryClaimed = false
    this.bankruptcySeizedSnapshot = seized.map((item) => ({ ...item }))
    this.stock.marketFear = Math.min(95, this.stock.marketFear + 20)
    this.stock.macroHeadline = `⚠️ İflas: ${reason}`

    this.emit({
      type: 'bankruptcy',
      loss,
      reason,
      recoveryPool: this.bankruptcyRecoveryPool,
      seizedBusinesses: seized.map((item) => item.id),
    })
    this.emit({
      type: 'story_beat',
      beatId: 'bankruptcy',
      text: `İflas ettin. ${formatMoney(loss)} değerinde varlık kaybı. Reklam izleyerek bir kısmını geri alabilirsin.`,
    })
    this.emit({ type: 'money_changed' })
  }

  hasPendingBankruptcyRecovery(): boolean {
    return this.bankruptcyRecoveryPool > 0 && !this.bankruptcyRecoveryClaimed
  }

  bankruptcyRecoveryPreview(multiplier = 1): number {
    return Math.floor(this.bankruptcyRecoveryPool * BANKRUPTCY_RECOVERY_BASE_RATE * multiplier)
  }

  claimBankruptcyRecovery(multiplier = 1): number {
    if (!this.hasPendingBankruptcyRecovery()) return 0
    const cash = this.bankruptcyRecoveryPreview(multiplier)
    this.addMoney(cash)
    if (this.bankruptcySeizedSnapshot.length > 0) {
      this.producers = restoreSeizedBusinesses(
        this.producers,
        this.bankruptcySeizedSnapshot,
        multiplier >= 2 ? 0.5 : 0.35,
      )
      syncEmpireFromProducers(this.empire, this.producers)
    }
    this.bankruptcyRecoveryClaimed = true
    this.bankruptcyRecoveryPool = 0
    this.bankruptcySeizedSnapshot = []
    this.emit({ type: 'money_changed' })
    return cash
  }

  discardBankruptcyRecovery(): void {
    this.bankruptcyRecoveryPool = 0
    this.bankruptcyRecoveryClaimed = true
    this.bankruptcySeizedSnapshot = []
  }

  bankDeposit(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0 || n > this.money) return false
    this.money -= n
    this.bank.deposit += n
    this.emit({ type: 'money_changed' })
    return true
  }

  bankWithdraw(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0 || n > this.bank.deposit) return false
    this.bank.deposit -= n
    this.addMoney(n)
    return true
  }

  bankTakeLoan(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0) return false
    if (reputationLoanBlocked(this.reputation) && !torpilBypassCreditScore(this.torpil)) {
      this.addGazette(headlineLoanDenied(this.playerName), 'market')
      this.emit({ type: 'loan_denied', reason: 'Banka kredi başvurunu reddetti — itibarın çok düşük' })
      return false
    }
    const nw = netWorth(this.money, portfolioValue(this.stock), this.bank)
    const cap = maxLoan(this.totalEarned, nw)
    if (this.bank.loan + n > cap) return false
    this.bank.loan += n
    if (torpilBypassCreditScore(this.torpil) && reputationLoanBlocked(this.reputation)) {
      this.addReputation(reputationFromScandal())
    }
    this.addMoney(n)
    return true
  }

  bankRepayLoan(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0) return false
    const pay = Math.min(n, this.bank.loan, this.money)
    if (pay <= 0) return false
    this.money -= pay
    this.bank.loan -= pay
    if (this.bank.loan === 0) this.bank.creditScore = Math.min(100, this.bank.creditScore + 3)
    this.emit({ type: 'money_changed' })
    return true
  }

  bankBuyBonds(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0 || n > this.money) return false
    this.money -= n
    this.bank.bonds += n
    this.emit({ type: 'money_changed' })
    return true
  }

  bankSellBonds(amount: number): boolean {
    const n = Math.floor(amount)
    if (n <= 0 || n > this.bank.bonds) return false
    this.bank.bonds -= n
    this.addMoney(n)
    return true
  }

  financeNetWorth(): number {
    return netWorth(this.money, portfolioValue(this.stock), this.bank)
  }

  maxAvailableLoan(): number {
    if (reputationLoanBlocked(this.reputation) && !torpilBypassCreditScore(this.torpil)) return 0
    const cap = maxLoan(this.totalEarned, this.financeNetWorth())
    return Math.max(0, cap - this.bank.loan)
  }

  addSeasonXp(amount: number): void {
    if (amount <= 0) return
    this.ensureSeason()
    const mult = 1 + seasonXpBonus(this.prestigeTree) + (this.season.adXpDoubled ? 1 : 0)
    this.season.xp += Math.floor(amount * mult)
    this.updateMissionProgress('season_xp', Math.floor(amount * mult))
    this.emit({ type: 'season_updated', xp: this.season.xp, tier: currentTier(this.season.xp) })
  }

  claimSeasonTier(tier: number, track: SeasonTrack = 'free'): boolean {
    this.ensureSeason()
    if (tier < 1 || tier > currentTier(this.season.xp)) return false
    if (track === 'premium') {
      if (!this.season.premiumUnlocked) return false
      if (this.season.claimedPremiumTiers.includes(tier)) return false
    } else if (this.season.claimedTiers.includes(tier)) {
      return false
    }
    const reward = rewardForTier(tier, track)
    if (track === 'premium') {
      this.season.claimedPremiumTiers.push(tier)
    } else {
      this.season.claimedTiers.push(tier)
    }
    if (reward.type === 'money') {
      this.addMoney(reward.value)
    } else if (reward.type === 'boost') {
      this.grantPendingBoost('income_2x', reward.value * 60_000, 'Sezon bonusu', '🎖️')
    } else if (reward.type === 'theme') {
      const themeId = themeForTier(tier)
      if (themeId) this.unlockTheme(themeId)
    } else if (reward.type === 'chest_ticket') {
      this.chestTickets += reward.value
    }
    if (tier >= 10) this.awardBadge('season_10')
    if (tier >= 20) this.awardBadge('season_20')
    if (tier >= 30) this.awardBadge('season_30')
    this.updateMissionProgress('season_tier', 1)
    this.emit({ type: 'season_claimed', tier, reward: reward.label, track })
    this.checkAchievements()
    return true
  }

  unlockSeasonPremium(): void {
    this.ensureSeason()
    if (this.season.premiumUnlocked) return
    this.season.premiumUnlocked = true
    this.triggerStoryBeat('premium_season')
    this.emit({ type: 'premium_season_unlocked' })
  }

  grantChestTickets(count: number): void {
    this.chestTickets = Math.max(0, this.chestTickets + count)
  }

  private applyChestLootResult(loot: ChestLootResult): number {
    if (loot.money > 0) this.addMoney(loot.money)
    if (loot.boostMinutes > 0) {
      this.grantPendingBoost('income_2x', loot.boostMinutes * 60_000, `${loot.label} sandık`, loot.emoji)
    }
    if (loot.seasonXp > 0) this.addSeasonXp(loot.seasonXp)
    if (loot.chestTickets > 0) this.chestTickets += loot.chestTickets
    this.chestPityCounter = shouldResetPity(loot.rarity) ? 0 : this.chestPityCounter + 1
    if (loot.rarity === 'legendary') this.triggerStoryBeat('chest_legendary')
    this.emit({ type: 'chest_opened', loot, amount: loot.money })
    return loot.money
  }

  openPaidChest(): ChestLootResult | null {
    if (this.chestTickets <= 0) return null
    this.chestTickets--
    const loot = rollChestLoot(this.incomePerDay(), this.chestPityCounter, true)
    this.applyChestLootResult(loot)
    return loot
  }

  hasClaimableSeasonReward(): boolean {
    this.ensureSeason()
    return hasClaimableSeasonReward(this.season)
  }

  syncCampaignProgress(): void {
    const step = currentCampaignStep(this.campaign)
    if (!step) return
    const chapter = chapterById(this.campaign.chapterId)
    if (!chapter || !isChapterUnlocked(chapter, this.lifetimeTotalEarned, this.campaign.completedChapters)) return
    this.campaign.stepProgress = Math.max(this.campaign.stepProgress, campaignStepSnapshot(this, step))
  }

  claimCampaignStep(): { money: number; boostMinutes: number } | null {
    this.syncCampaignProgress()
    if (!hasClaimableCampaignStep(this, this.campaign)) return null
    const step = currentCampaignStep(this.campaign)!
    const chapter = chapterById(this.campaign.chapterId)!
    if (step.rewardMoney > 0) this.addMoney(step.rewardMoney)
    if (step.rewardBoostMinutes > 0) {
      this.grantPendingBoost('income_2x', step.rewardBoostMinutes * 60_000, 'Kampanya ödülü', '📜')
    }
    if (step.storyBeatId) this.triggerStoryBeat(step.storyBeatId)
    this.emit({ type: 'campaign_step', chapterId: chapter.id, stepId: step.id, reward: step.title })

    this.campaign.stepIndex++
    this.campaign.stepProgress = 0
    if (this.campaign.stepIndex >= chapter.steps.length) {
      if (!this.campaign.completedChapters.includes(chapter.id)) {
        this.campaign.completedChapters.push(chapter.id)
      }
      const next = chapterById(chapter.id + 1)
      if (next && isChapterUnlocked(next, this.lifetimeTotalEarned, this.campaign.completedChapters)) {
        this.campaign.chapterId = next.id
        this.campaign.stepIndex = 0
      }
    }
    return { money: step.rewardMoney, boostMinutes: step.rewardBoostMinutes }
  }

  hasClaimableCampaignReward(): boolean {
    this.syncCampaignProgress()
    return hasClaimableCampaignStep(this, this.campaign)
  }

  doubleSeasonXpWithAd(): void {
    this.season.adXpDoubled = true
  }

  buyPrestigeTreeNode(nodeId: string): boolean {
    const node = PRESTIGE_TREE_NODES.find((n) => n.id === nodeId)
    if (!node || !canBuyNode(this.prestigeTree, node, this.prestigePoints)) return false
    this.prestigePoints -= node.cost
    this.prestigeTree[nodeId] = true
    this.emit({ type: 'prestige_tree', nodeId })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  toggleManagerAutoBuy(producerId: string): void {
    if (!hasManager(this.managers, producerId)) return
    this.managerAutoBuy[producerId] = !this.managerAutoBuy[producerId]
    if (this.managerAutoBuy[producerId]) {
      this.updateMissionProgress('autobuy_enable', 1)
    }
  }

  managerAutoBuyCount(): number {
    return Object.values(this.managerAutoBuy).filter(Boolean).length
  }

  setActiveStockTicker(id: string): void {
    if (this.stock.tickers[id]) this.stock.activeTickerId = id
  }

  dailyGoalTarget(): number {
    this.ensureDailyGoal()
    if (this.dailyGoalTargetSnapshot <= 0) this.refreshDailyGoalSnapshots()
    return this.dailyGoalTargetSnapshot
  }

  dailyGoalRewardPreview(): number {
    this.ensureDailyGoal()
    if (this.dailyGoalRewardSnapshot <= 0) this.refreshDailyGoalSnapshots()
    return this.dailyGoalRewardSnapshot
  }

  weeklyRewardPreview(): number {
    this.ensureWeekly()
    return this.weekly.rewardCash ?? weeklyRewardCash(this.incomePerDay())
  }

  hasCodexLegalComplete(): boolean {
    return PRODUCERS.filter((p) => !p.illegal && !p.category).every((p) => (this.producers[p.id] ?? 0) >= 1)
  }

  hasCodexAllComplete(): boolean {
    return PRODUCERS.every((p) => (this.producers[p.id] ?? 0) >= 1)
  }

  codexCompletionBonus(): { legal: boolean; all: boolean } {
    return { legal: this.hasCodexLegalComplete(), all: this.hasCodexAllComplete() }
  }

  unlockTheme(themeId: ThemeId): void {
    if (!this.unlockedThemes.has(themeId)) {
      this.unlockedThemes.add(themeId)
      this.emit({ type: 'theme_unlocked', themeId })
      this.awardBadge(`theme_${themeId}`)
      if (themeId !== 'default') this.triggerStoryBeat(`theme_${themeId}`)
    }
  }

  setActiveTheme(themeId: ThemeId): void {
    if (!this.unlockedThemes.has(themeId)) return
    this.activeTheme = themeId
  }

  triggerStoryBeat(beatId: string): void {
    if (this.seenStoryBeats.has(beatId)) return
    this.seenStoryBeats.add(beatId)
    const beat = storyBeat(beatId)
    if (beat) this.emit({ type: 'story_beat', beatId, text: beat.text })
  }

  awardBadge(badgeId: string): void {
    if (this.earnedBadges.has(badgeId)) return
    this.earnedBadges.add(badgeId)
    this.emit({ type: 'badge_earned', badgeId })
  }

  undergroundCooldownRemaining(actionId: UndergroundActionId): number {
    const until = this.undergroundCooldowns[actionId] ?? 0
    return Math.max(0, until - Date.now())
  }

  canUseUnderground(actionId: UndergroundActionId): { ok: boolean; reason?: string } {
    if (this.undergroundCooldownRemaining(actionId) > 0) {
      return { ok: false, reason: 'Bekleme süresi' }
    }
    const ipd = this.incomePerDay()
    if (actionId === 'lawyer') {
      const cost = ipd * 0.5
      if (!this.canAfford(cost)) return { ok: false, reason: 'Yetersiz para' }
    }
    if (actionId === 'bribe') {
      const cost = Math.floor(this.money * 0.05)
      if (cost <= 0 || !this.canAfford(cost)) return { ok: false, reason: 'Yetersiz para' }
    }
    if (actionId === 'launder') {
      const cost = this.illegalIncomePerDay() * 0.2
      if (this.illegalIncomePerDay() <= 0) return { ok: false, reason: 'Illegal gelir yok' }
      if (!this.canAfford(Math.max(1, cost))) return { ok: false, reason: 'Yetersiz para' }
    }
    return { ok: true }
  }

  useUndergroundAction(actionId: UndergroundActionId): boolean {
    const check = this.canUseUnderground(actionId)
    if (!check.ok) return false
    const ipd = this.incomePerDay()
    const cooldowns: Record<UndergroundActionId, number> = {
      lawyer: 10 * 60_000,
      bribe: 5 * 60_000,
      launder: 15 * 60_000,
    }

    if (actionId === 'lawyer') {
      this.money -= ipd * 0.5
      this.illegalHeat = Math.max(0, this.illegalHeat - 25)
      this.heatProtectionUntil = Date.now() + LAWYER_PROTECTION_MS
      this.undergroundLawyerUsed = true
      this.awardBadge('underground_lawyer')
    } else if (actionId === 'bribe') {
      const cost = Math.floor(this.money * 0.05)
      this.money -= cost
      this.illegalHeat = Math.max(0, this.illegalHeat - 40)
    } else if (actionId === 'launder') {
      const cost = Math.max(1, this.illegalIncomePerDay() * 0.2)
      this.money -= cost
      this.launderingUntil = Date.now() + LAUNDER_DURATION_MS
    }

    this.undergroundCooldowns[actionId] = Date.now() + cooldowns[actionId]
    this.updateMissionProgress('use_underground', 1)
    this.emit({ type: 'underground_action', actionId })
    this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    return true
  }

  upgradeFootballStadium(clubId: string): boolean {
    const club = this.empire.football.find((c) => c.clubId === clubId)
    if (!club) return false
    const cost = stadiumUpgradeCost(club.stadiumLevel)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    club.stadiumLevel++
    this.emit({ type: 'money_changed' })
    return true
  }

  upgradeFootballLeague(clubId: string): boolean {
    const club = this.empire.football.find((c) => c.clubId === clubId)
    if (!club || club.leagueLevel >= 4 || !canUpgradeLeague(club)) return false
    const cost = leagueUpgradeCost(club.leagueLevel)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    club.leagueLevel++
    this.emit({ type: 'money_changed' })
    if (club.leagueLevel === 3) this.triggerStoryBeat('football_superlig')
    if (club.leagueLevel === 4) this.triggerStoryBeat('football_europe')
    return true
  }

  empireLobby(): boolean {
    const cost = lobbyCost(this.empire.politics.influence)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    donateCampaign(cost, this.empire.politics)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireDonate(amount: number): boolean {
    if (amount <= 0 || !this.canAfford(amount)) return false
    this.money -= amount
    donateCampaign(amount, this.empire.politics)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireBoostDarkProduction(): boolean {
    const cost = Math.max(5000, this.incomePerDay() * 0.25)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    boostDarkProduction(this.empire.darkIndustry, this.gameTimeMs)
    this.emit({ type: 'money_changed' })
    return true
  }

  empireReduceDarkHeat(): boolean {
    const cost = Math.max(3000, this.incomePerDay() * 0.15)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    reduceDarkHeat(this.empire.darkIndustry)
    this.illegalHeat = Math.max(0, this.illegalHeat - 15)
    this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    this.emit({ type: 'money_changed' })
    return true
  }

  activateHeatShield(): void {
    this.heatShieldUntil = Date.now() + HEAT_SHIELD_DURATION_MS
  }

  isHeatShieldActive(): boolean {
    return Date.now() < this.heatShieldUntil
  }

  isSurpriseInvestorActive(): boolean {
    return false
  }

  addPendingBoost(item: PendingBoostItem): void {
    this.pendingBoosts.push(item)
    this.emit({ type: 'pending_boost_added', label: item.label })
  }

  grantPendingBoost(
    kind: PendingBoostItem['kind'],
    durationMs: number,
    label: string,
    emoji: string,
  ): void {
    this.addPendingBoost(createPendingBoost(kind, durationMs, label, emoji))
  }

  activatePendingBoost(id: string): boolean {
    const idx = this.pendingBoosts.findIndex((b) => b.id === id)
    if (idx < 0) return false
    const item = this.pendingBoosts[idx]!
    this.pendingBoosts.splice(idx, 1)
    const now = Date.now()
    switch (item.kind) {
      case 'income_2x':
        this.adBoostLabel = item.label
        this.adBoostEmoji = item.emoji
        this.adIncomeBoostUntil = Math.max(this.adIncomeBoostUntil, now) + item.durationMs
        this.emit({ type: 'ad_boost', until: this.adIncomeBoostUntil })
        break
      case 'income_3x':
        this.eventBoostLabel = item.label
        this.eventBoostEmoji = item.emoji
        this.eventBoostUntil = Math.max(this.eventBoostUntil, now) + item.durationMs
        this.emit({ type: 'ad_boost', until: this.eventBoostUntil })
        break
      case 'shop_1_5x':
        this.shopBoostLabel = item.label
        this.shopBoostEmoji = item.emoji
        this.shopBoostUntil = Math.max(this.shopBoostUntil, now) + item.durationMs
        this.emit({ type: 'ad_boost', until: this.shopBoostUntil })
        break
    }
    this.emit({ type: 'boost_activated', label: item.label })
    return true
  }

  hasPendingBoosts(): boolean {
    return this.pendingBoosts.length > 0
  }

  private tickNearMiss(now: number): void {
    if (now - this.lastNearMissToastAt < NEAR_MISS_COOLDOWN_MS) return

    const ipo = this.ipoProgress()
    if (ipo.pct >= 90 && ipo.pct < 100 && !this.nudgeFlags.has('ipo')) {
      this.nudgeFlags.add('ipo')
      this.lastNearMissToastAt = now
      this.emit({ type: 'near_miss', kind: 'ipo', message: 'Birleşmeye az kaldı!' })
      return
    }
    this.ensureSeason()
    const prog = tierProgress(this.season.xp)
    if (prog.pct >= 95 && prog.pct < 100 && !this.nudgeFlags.has('season')) {
      this.nudgeFlags.add('season')
      this.lastNearMissToastAt = now
      this.emit({ type: 'near_miss', kind: 'season', message: 'Sezon tier\'ına az kaldı!' })
      return
    }
    if (this.comboCount >= this.comboBest - 2 && this.comboBest >= 10 && !this.nudgeFlags.has('combo')) {
      this.nudgeFlags.add('combo')
      this.lastNearMissToastAt = now
      this.emit({ type: 'near_miss', kind: 'combo', message: 'Combo rekoruna yakınsın!' })
    }
  }

  peekDailyStreakReset(): boolean {
    if (!this.dailyLastClaim) return false
    const yesterday = yesterdayKey()
    return this.dailyLastClaim !== yesterday && this.dailyLastClaim !== todayKey()
  }

  claimComebackBonus(): number {
    if (this.comebackPending <= 0) return 0
    const amount = this.comebackPending
    this.comebackPending = 0
    this.comebackClaimed = true
    this.comebackClaimedDay = todayKey()
    this.addMoney(amount)
    this.awardBadge('comeback')
    return amount
  }

  /** Geri dönüş bonusu — yalnızca reklam sonrası */
  claimComebackViaAd(multiplier = 1): number {
    if (this.comebackPending <= 0) return 0
    const amount = Math.floor(this.comebackPending * multiplier)
    this.comebackPending = 0
    this.comebackClaimed = true
    this.comebackClaimedDay = todayKey()
    this.addMoney(amount)
    this.awardBadge('comeback')
    this.emit({ type: 'offline_earnings', amount })
    return amount
  }

  hasPendingComeback(): boolean {
    return this.comebackPending > 0
  }

  /** Offline kazancı hesapla — otomatik verilmez */
  applyOfflineEarnings(lastSaveTime: number): number {
    const awayMs = Date.now() - lastSaveTime
    this.lastActiveAt = Date.now()
    this.pendingOfflineEarnings = 0

    if (awayMs >= COMEBACK_MIN_AWAY_MS && this.comebackClaimedDay !== todayKey()) {
      const elapsed = Math.min(awayMs, this.offlineCapMs())
      const gameDaysAway = elapsed / MS_PER_GAME_DAY
      let base = 0
      for (const p of PRODUCERS) {
        base += this.producerIncome(p) * gameDaysAway
      }
      const mult = awayMs >= 72 * 60 * 60 * 1000 ? 3 : awayMs >= 48 * 60 * 60 * 1000 ? 2 : 1.5
      this.comebackPending = Math.floor(base * mult)
      this.triggerStoryBeat('comeback')
      this.emit({ type: 'comeback_ready', amount: this.comebackPending })
    }

    const elapsed = Math.min(awayMs, this.offlineCapMs())
    if (elapsed < MS_PER_GAME_DAY) return 0
    const gameDaysAway = elapsed / MS_PER_GAME_DAY
    let amount = 0
    for (const p of PRODUCERS) {
      amount += this.producerIncome(p) * gameDaysAway
    }
    if (amount <= 0) return 0
    this.pendingOfflineEarnings = Math.floor(amount)
    return this.pendingOfflineEarnings
  }

  discardPendingOffline(): void {
    this.pendingOfflineEarnings = 0
  }

  discardComeback(): void {
    this.comebackPending = 0
    this.comebackClaimedDay = todayKey()
  }

  /** Reklam izlendikten sonra offline kazancı topla */
  claimOfflineViaAd(multiplier = 1): number {
    if (this.pendingOfflineEarnings <= 0) return 0
    const amount = Math.floor(this.pendingOfflineEarnings * multiplier)
    this.pendingOfflineEarnings = 0
    this.addMoney(amount)
    this.emit({ type: 'offline_earnings', amount })
    return amount
  }

  activateAdBoost(): void {
    this.adBoostLabel = 'Reklam boost'
    this.adBoostEmoji = '📺'
    this.adIncomeBoostUntil = Date.now() + AD_BOOST_DURATION_MS
    this.emit({ type: 'ad_boost', until: this.adIncomeBoostUntil })
  }

  isAdBoostActive(): boolean {
    return Date.now() < this.adIncomeBoostUntil
  }

  adBoostRemainingMs(): number {
    return Math.max(0, this.adIncomeBoostUntil - Date.now())
  }

  activateShopBoost(): void {
    this.shopBoostLabel = 'Mağaza boost'
    this.shopBoostEmoji = '🛒'
    this.shopBoostUntil = Date.now() + 15 * 60_000
    this.emit({ type: 'ad_boost', until: this.shopBoostUntil })
  }

  isShopBoostActive(): boolean {
    return Date.now() < this.shopBoostUntil
  }

  shopBoostRemainingMs(): number {
    return Math.max(0, this.shopBoostUntil - Date.now())
  }

  activateUpgradeDiscount(): void {
    this.upgradeDiscountActive = true
  }

  incrementAdvisorBuy(): void {
    this.advisorBuys++
    this.checkAchievements()
  }

  buyUndergroundTreeNode(nodeId: string): boolean {
    const node = treeNodeDef(nodeId)
    if (!node) return false
    const level = this.undergroundTree[nodeId] ?? 0
    if (level >= node.maxLevel) return false
    const cost = treeNodeCost(node, level)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.undergroundTree[nodeId] = level + 1
    this.emit({ type: 'underground_action', actionId: nodeId })
    this.emit({ type: 'money_changed' })
    return true
  }

  marketNewsStockTickerId(): string | null {
    const n = this.activeMarketNewsDef()
    if (!n) return null
    if (n.id === 'bull' || n.id === 'bear' || n.id === 'crypto') return 'tech'
    if (n.id === 'logistics') return 'industrial'
    if (n.id === 'ecom') return 'tech'
    return null
  }

  claimDailyReward(): number {
    const today = todayKey()
    if (this.dailyLastClaim === today) return 0
    const yesterday = yesterdayKey()
    const streakBroken = this.dailyLastClaim !== null && this.dailyLastClaim !== yesterday
    if (this.dailyLastClaim === yesterday) {
      this.dailyStreak = Math.min(this.dailyStreak + 1, 30)
    } else {
      this.dailyStreak = 1
    }
    this.dailyLastClaim = today
    let amount = calcDailyLoginReward(this.dailyStreak, this.incomePerDay())
    for (const ms of STREAK_MILESTONES) {
      if (this.dailyStreak >= ms && !this.streakMilestonesClaimed.includes(ms)) {
        this.streakMilestonesClaimed.push(ms)
        amount += streakMilestoneBonus(ms)
        this.awardBadge(`streak_${ms}`)
        this.triggerStoryBeat(`streak_${ms}`)
      }
    }
    this.addMoney(amount)
    this.updateMissionProgress('claim_daily', 1)
    this.emit({ type: 'daily_reward', amount, streak: this.dailyStreak })
    if (streakBroken && this.dailyStreak === 1) {
      // streak was reset — UI shows warning via peekDailyStreakReset before claim
    }
    this.checkAchievements()
    this.syncCampaignProgress()
    return amount
  }

  canClaimDaily(): boolean {
    return this.dailyLastClaim !== todayKey()
  }

  dailyLoginRewardPreview(forStreak?: number): number {
    const streak = forStreak ?? (this.dailyStreak > 0 ? this.dailyStreak + 1 : 1)
    return calcDailyLoginReward(streak, this.incomePerDay())
  }

  openLuckyChest(): ChestLootResult | null {
    if (!this.luckyChestReady) return null
    this.luckyChestReady = false
    const loot = rollChestLoot(this.incomePerDay(), this.chestPityCounter, false)
    this.applyChestLootResult(loot)
    return loot
  }

  incrementRewardedAdCount(): void {
    const today = todayKey()
    if (this.rewardedAdsDay !== today) {
      this.rewardedAdsDay = today
      this.rewardedAdsToday = 0
    }
    this.rewardedAdsToday++
  }

  ensureMissions(): void {
    const today = todayKey()
    if (this.missionsDay === today && this.missions.length > 0) return
    this.missionsDay = today
    this.missions = generateDailyMissions(today)
    this.sessionEarned = 0
    this.businessesBoughtSession = 0
    this.upgradesBoughtSession = 0
  }

  private updateMissionProgress(type: MissionProgress['type'], amount: number): void {
    this.ensureMissions()
    for (const m of this.missions) {
      if (m.claimed || m.type !== type) continue
      m.progress = Math.min(m.target, m.progress + amount)
      if (this.ownerFlag('instant_missions')) m.progress = m.target
      if (m.progress >= m.target) {
        this.emit({ type: 'mission_complete', mission: m })
      }
    }
  }

  claimMission(missionId: string, doubleWithAd = false): { money: number; boostMinutes: number } {
    const m = this.missions.find((x) => x.id === missionId)
    if (!m || m.claimed || m.progress < m.target) return { money: 0, boostMinutes: 0 }
    m.claimed = true
    let money = 0
    let boostMinutes = 0
    if (m.rewardMoney > 0) {
      money = m.rewardMoney * (doubleWithAd ? 2 : 1)
      this.addMoney(money)
    }
    if (m.rewardBoostMinutes > 0) {
      boostMinutes = m.rewardBoostMinutes * (doubleWithAd ? 2 : 1)
      this.grantPendingBoost('income_2x', boostMinutes * 60_000, 'Görev bonusu', '📋')
    }
    this.addSeasonXp(50)
    return { money, boostMinutes }
  }

  hireManager(producerId: string, withDiscount = false): boolean {
    if (hasManager(this.managers, producerId)) return false
    const def = PRODUCERS.find((p) => p.id === producerId)
    if (!def) return false
    const owned = this.producers[producerId] ?? 0
    if (owned <= 0) return false
    let cost = managerCost(def.baseIncome, owned)
    const treeDisc = managerCostDiscount(this.prestigeTree)
    if (withDiscount || this.managerDiscountActive) cost = Math.floor(cost * 0.5)
    else if (treeDisc > 0) cost = Math.floor(cost * (1 - treeDisc))
    if (this.prestigeShopPurchased.includes('manager_discount')) cost = Math.floor(cost * 0.85)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.managers[producerId] = true
    this.managerDiscountActive = false
    this.pendingUndo = {
      id: `mgr_${producerId}_${Date.now()}`,
      kind: 'manager_hire',
      label: `${def.name} yöneticisini geri al`,
      cost: Math.max(500, Math.floor(cost * 0.25)),
      expiresAt: Date.now() + 60_000,
      producerId,
    }
    this.emit({ type: 'undo_available', label: this.pendingUndo.label, cost: this.pendingUndo.cost, undoId: this.pendingUndo.id })
    this.emit({ type: 'manager_hired', producerId })
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
    this.recordDailyEvent('manager_hired')
    return true
  }

  activateManagerDiscount(): void {
    this.managerDiscountActive = true
  }

  stockBuy(tickerId: string, shares: number): boolean {
    const { cost, bought } = buyShares(this.stock, tickerId, shares, this.money)
    if (bought <= 0) return false
    this.money -= cost
    this.emit({ type: 'stock_trade', action: 'buy', amount: bought })
    this.emit({ type: 'money_changed' })
    this.updateMissionProgress('stock_trade', 1)
    this.checkAchievements()
    this.recordDailyEvent('market_action_completed')
    return true
  }

  stockSell(tickerId: string, shares: number): boolean {
    const { revenue, sold } = sellShares(this.stock, tickerId, shares)
    if (sold <= 0) return false
    this.addMoney(revenue)
    this.emit({ type: 'stock_trade', action: 'sell', amount: sold })
    this.updateMissionProgress('stock_trade', 1)
    this.recordDailyEvent('market_action_completed')
    return true
  }

  activateStockHint(hours = 1): void {
    if (freeStockHint(this.prestigeTree)) {
      this.stock.trendHintUntil = Date.now() + hours * 3600_000
      return
    }
    this.stock.trendHintUntil = Date.now() + hours * 3600_000
  }

  isStockHintFree(): boolean {
    return freeStockHint(this.prestigeTree)
  }

  claimWeeklyReward(doubleWithAd = false): number {
    this.ensureWeekly()
    if (this.weekly.claimed || this.weekly.progress < this.weekly.target) return 0
    this.weekly.claimed = true
    if (doubleWithAd) this.weekly.adDoubled = true
    const reward = this.weeklyRewardPreview() * (doubleWithAd ? 2 : 1)
    this.addMoney(reward)
    return reward
  }

  doubleWeeklyWithAd(): void {
    this.weekly.adDoubled = true
  }

  ownerGrantMoney(amount: number): void {
    this.addMoney(amount)
  }

  ownerClearHeat(): void {
    this.illegalHeat = 0
    this.heatWasCritical = false
    this.emit({ type: 'illegal_heat', heat: 0 })
  }

  ownerUnlockAllBusinesses(): void {
    for (const p of PRODUCERS) {
      if ((this.producers[p.id] ?? 0) < 1) {
        this.producers[p.id] = 1
        if (!this.codexUnlockDates[p.id]) this.codexUnlockDates[p.id] = todayKey()
      }
    }
    this.emit({ type: 'money_changed' })
    this.checkAchievements()
  }

  ownerUnlockAllUpgrades(): void {
    for (const u of UPGRADES) this.purchasedUpgrades.add(u.id)
    this.emit({ type: 'money_changed' })
  }

  ownerMaxSeason(): void {
    this.ensureSeason()
    this.season.xp = xpForTier(SEASON_MAX_TIER)
    this.emit({ type: 'season_updated', xp: this.season.xp, tier: SEASON_MAX_TIER })
  }

  ownerCompleteWeekly(): void {
    this.ensureWeekly()
    this.weekly.progress = this.weekly.target
    this.emit({ type: 'weekly_updated', progress: this.weekly.progress, target: this.weekly.target })
  }

  ownerResetDailyClaim(): void {
    this.dailyLastClaim = null
  }

  ownerTriggerSurpriseInvestor(): void {
    this.grantPendingBoost('income_2x', 30_000, 'Yatırımcı', '💎')
    this.emit({ type: 'surprise_investor', until: 0 })
  }

  getWeeklyEventDef() {
    this.ensureWeekly()
    return getWeeklyDef(this.weekly)
  }

  resetProgress(): void {
    this.money = 0
    this.totalEarned = 0
    this.totalClicks = 0
    this.producers = {}
    for (const p of PRODUCERS) {
      this.producers[p.id] = 0
      this.managers[p.id] = false
    }
    this.purchasedUpgrades.clear()
    this.prestigePoints = 0
    this.lifetimePrestige = 0
    this.ipoCount = 0
    this.lifetimeTotalEarned = 0
    this.research = {}
    for (const r of RESEARCH_NODES) this.research[r.id] = 0
    this.achievements.clear()
    this.missions = []
    this.missionsDay = ''
    this.comboBest = 0
    this.stock = createStockState()
    this.bank = createBankState()
    this.weekly = createWeeklyState()
    this.milestonesReached = []
    this.playTimeMs = 0
    this.firstBusinessPlayTimeMs = null
    this.gameTimeMs = 0
    this.tutorialDone = false
    this.onboardingComplete = false
    this.dailyGoalEarned = 0
    this.dailyGoalDay = dailyGoalDayKey()
    this.dailyGoalClaimed = false
    this.season = createSeasonState()
    this.chestPityCounter = 0
    this.chestTickets = 0
    this.campaign = createCampaignState()
    this.prestigeTree = {}
    this.managerAutoBuy = {}
    for (const p of PRODUCERS) this.managerAutoBuy[p.id] = false
    this.nightEarningsSession = 0
    this.forcedUnlocks.clear()
    this.illegalHeat = 0
    this.unlockedThemes = new Set(['default', 'light', 'dark'])
    this.activeTheme = 'light'
    this.codexUnlockDates = {}
    this.undergroundCooldowns = {}
    this.heatShieldUntil = 0
    this.heatProtectionUntil = 0
    this.launderingUntil = 0
    this.comebackPending = 0
    this.comebackClaimedDay = null
    this.comebackClaimed = false
    this.surpriseInvestorUntil = 0
    this.surpriseInvestorDay = ''
    this.pendingBoosts = []
    this.seenStoryBeats.clear()
    this.earnedBadges.clear()
    this.streakMilestonesClaimed = []
    this.reputation = REPUTATION_START
    this.rivals = createRivalsState()
    this.rivalWasAhead.clear()
    this.lastRivalTickDay = 0
    this.lastDynastyGameDay = 0
    this.lastMarketNewsGameDay = 0
    this.passiveRecent = []
    this.chronicle = []
    this.legacyMonuments = []
    this.victoriesUnlocked = []
    this.totalRaidsCaught = 0
    this.presidentSeasons = 0
    this.presidentSinceSeasonKey = null
    this.lastWorldStageId = 'local'
    this.childCrises = []
    this.diseases = []
    this.siblings = generateSiblings()
    this.fameState = createFameState()
    this.karma = 0
    this.emit({ type: 'money_changed' })
  }

  /** Onboarding'de seçilen karakter profilini uygula (yalnız yeni oyunda bir kez). */
  setCharacterProfile(profile: CharacterProfile): void {
    this.characterProfile = { ...profile }
    this.emit({ type: 'money_changed' })
  }

  /** Aktif varisin rol tanımı (varis bonusları) */
  activeHeirRole() {
    const heir = this.dynasty.dynastyBonusId
      ? this.dynasty.children.find((c) => c.id === this.dynasty.dynastyBonusId)
      : null
    return heirRoleDef(heir?.heirRole)
  }

  private heirIllegalBonus(): number {
    return this.activeHeirRole()?.illegalBonus ?? 0
  }

  heirReputationBonus(): number {
    return this.activeHeirRole()?.reputationBonus ?? 0
  }

  setHeirRole(childId: string, role: HeirRoleId): void {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return
    child.heirRole = role
    const def = heirRoleDef(role)
    this.addGazette(fmt('gz_child_role', { child: child.name, role: def?.name ?? role }), 'player')
    this.emit({ type: 'dynasty_update', kind: 'heir_role', name: child.name })
  }

  inheritancePreview(): { transferPct: number; reason: string[] } {
    const heir = this.dynasty.dynastyBonusId
      ? this.dynasty.children.find((c) => c.id === this.dynasty.dynastyBonusId)
      : null
    const hasLawyerHeir = heir?.heirRole === 'hukukcu'
    const base = calculateInheritance(
      !!this.dynasty.hasWill,
      !!this.dynasty.hasTrust,
      !!this.dynasty.dynastyBonusId,
      this.illegalHeat,
      hasLawyerHeir,
      this.dynasty.children.length,
    )
    const role = heirRoleDef(heir?.heirRole)
    if (role?.inheritanceBonus) {
      base.transferPct = Math.min(0.95, base.transferPct + role.inheritanceBonus)
      base.reason.push(`${role.name}: +%${Math.round(role.inheritanceBonus * 100)}`)
    }
    if (this.dynasty.hasFamilyConstitution && this.dynasty.children.length > 1) {
      base.transferPct = Math.min(0.95, base.transferPct + 0.05)
      base.reason.push('Aile anayasası: +%5')
    }
    const aileOfisi = aileOfisiInheritanceBonus(this.departments['aile_ofisi'] ?? 0)
    if (aileOfisi > 0) {
      base.transferPct = Math.min(0.95, base.transferPct + aileOfisi)
      base.reason.push(`Aile Ofisi: +%${Math.round(aileOfisi * 100)}`)
    }
    return base
  }

  prepareWill(): boolean {
    const cost = 100_000
    if (this.dynasty.hasWill) return false
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.dynasty.hasWill = true
    this.addGazette(requiredDomainText('gz_will_prepared'), 'player')
    this.emit({ type: 'money_changed' })
    this.emit({ type: 'dynasty_update', kind: 'will' })
    return true
  }

  createFamilyTrust(): boolean {
    const cost = 500_000
    if (this.dynasty.hasTrust) return false
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.dynasty.hasTrust = true
    this.addGazette(requiredDomainText('gz_foundation'), 'player')
    this.emit({ type: 'money_changed' })
    this.emit({ type: 'dynasty_update', kind: 'trust' })
    return true
  }

  writeFamilyConstitution(): boolean {
    const cost = 250_000
    if (this.dynasty.hasFamilyConstitution) return false
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.dynasty.hasFamilyConstitution = true
    this.addGazette(requiredDomainText('gz_constitution'), 'player')
    this.emit({ type: 'money_changed' })
    this.emit({ type: 'dynasty_update', kind: 'constitution' })
    return true
  }

  sampleNetWorth(now: number): void {
    if (now - this.lastNetWorthSample < 10_000) return
    this.lastNetWorthSample = now
    this.netWorthHistory.push(Math.round(this.financeNetWorth()))
    if (this.netWorthHistory.length > 60) this.netWorthHistory.shift()
  }

  pushNetWorthSample(): void {
    this.netWorthHistory.push(Math.round(this.financeNetWorth()))
    if (this.netWorthHistory.length > 60) this.netWorthHistory.shift()
  }

  private departmentTaskContext() {
    const leveledFirms = Object.values(this.producerLevels).filter((l) => l >= 2).length
    const ownedBusinesses = Object.values(this.producers).filter((n) => n > 0).length
    const researchNodes = Object.values(this.research).filter((l) => l > 0).length
    const rivalDeals = this.rivals.filter((r) => r.relation === 'allied' || r.relation === 'merged').length
    return {
      leveledFirms,
      netWorth: this.financeNetWorth(),
      ownedBusinesses,
      heat: this.illegalHeat,
      researchNodes,
      rivalDeals,
      hasWill: !!this.dynasty.hasWill,
    }
  }

  departmentTaskReady(id: DepartmentId): boolean {
    if (this.departmentTasksClaimed.includes(id)) return false
    return isDepartmentTaskComplete(id, this.departmentTaskContext())
  }

  claimDepartmentTask(id: DepartmentId): boolean {
    if (!this.departmentTaskReady(id)) return false
    this.departmentTasksClaimed.push(id)
    const level = this.departments[id] ?? 0
    if (level < DEPARTMENT_MAX_LEVEL) this.departments[id] = level + 1
    this.addReputation(5)
    const def = departmentDef(id)
    this.addGazette(fmt('gz_mentor_quest_done', { name: def.name }), 'player')
    this.emit({ type: 'money_changed' })
    return true
  }

  departmentLevel(id: DepartmentId): number {
    return this.departments[id] ?? 0
  }

  isDepartmentUnlocked(id: DepartmentId): boolean {
    return this.totalEarned >= departmentDef(id).unlockAt
  }

  isMarketUnlocked(): boolean {
    if (this.financeNetWorth() >= 50_000) return true
    if (this.characterBackground === 'finansci') return true
    if (this.career.jobId === 'banka_calisani' && this.career.level >= 3) return true
    return false
  }

  marketLockReason(): string | null {
    if (this.isMarketUnlocked()) return null
    return 'Açmak için: 50.000₺ net değer · veya Finansçı geçmiş · veya Banka Çalışanı (Seviye 3)'
  }

  becomeEntrepreneur(): void {
    if (this.financeNetWorth() < FIRST_GOAL_TARGET) return
    this.career.isEntrepreneur = true
    this.career.firstGoalComplete = true
  }

  setChildEducationPath(childId: string, path: ChildEducationPath): void {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return
    child.educationPath = path
    const pathDef = CHILD_EDUCATION_PATHS.find((p) => p.id === path)
    this.addGazette(fmt('gz_child_education', { child: child.name, path: pathDef?.name ?? path }), 'player')
    this.emit({ type: 'dynasty_update', kind: 'child_education', name: child.name })
  }

  incomeBreakdown(): { label: string; value: number; color: 'green' | 'blue' | 'cyan' | 'gold' | 'red' | 'purple' }[] {
    const legalTotal = this.legalIncomePerDay()
    const illegal = this.illegalIncomePerDay()
    const stockYield = portfolioValue(this.stock) * 0.002
    const rentalIncome = lifestyleRentalIncome(this.lifestyle)
    const careerWage = this.career.isEntrepreneur ? 0 : dailyCareerWage(this.career)
    const franchiseShare = franchiseIncomeBonus(this.franchises)
    const franchiseIncome = legalTotal * (franchiseShare / (1 + franchiseShare))
    const legalCore = Math.max(0, legalTotal - franchiseIncome)
    const out: { label: string; value: number; color: 'green' | 'blue' | 'cyan' | 'gold' | 'red' | 'purple' }[] = []
    if (legalCore > 0) out.push({ label: 'Legal İşletmeler', value: legalCore, color: 'green' })
    if (franchiseIncome > 0) out.push({ label: 'Şehir/Franchise', value: franchiseIncome, color: 'purple' })
    if (stockYield > 0) out.push({ label: 'Borsa/Piyasa', value: stockYield, color: 'blue' })
    if (rentalIncome > 0) out.push({ label: 'Kira/Yaşam', value: rentalIncome, color: 'cyan' })
    if (careerWage > 0) out.push({ label: 'Kariyer/Maaş', value: careerWage, color: 'gold' })
    if (illegal > 0) out.push({ label: 'Illegal', value: illegal, color: 'red' })
    return out
  }

  estimatedMonthlyExpense(): number {
    const lifestyleExp = lifestyleMonthlyExpense(this.lifestyle)
    const loanInterest = this.bank.loan * (this.stock.centralBankRate ?? 0.02) / 12
    const insuranceExp = insuranceDailyCost(this.insurance) * 30
    return Math.floor(lifestyleExp + loanInterest + insuranceExp)
  }

  addReputation(delta: number): void {
    if (delta === 0) return
    // Diplomat kişiliği pozitif itibar kazancını güçlendirir
    if (delta > 0) delta = delta * personalityReputationMult(this.personality)
    if (delta > 0) {
      delta *= 1 + this.heirReputationBonus()
      if (backgroundDef(this.characterBackground)?.id === 'sifirdan_gelen') delta *= 1.1
    }
    const prev = this.reputation
    this.reputation = clampReputation(this.reputation + delta)
    if (this.reputation !== prev) {
      this.emit({ type: 'reputation_changed', reputation: this.reputation, delta: this.reputation - prev })
    }
  }

  recordChronicle(category: ChronicleEntry['category'], emoji: string, text: string): void {
    const entry = createChronicleEntry({
      gameDay: gameDay(this.gameTimeMs),
      generation: this.dynasty.generation,
      ipoEra: this.ipoCount,
      text,
      emoji,
      category,
    })
    this.chronicle = appendChronicle(this.chronicle, entry)
  }

  recordLegacyMonuments(): void {
    let best: ProducerDef | null = null
    for (const p of PRODUCERS) {
      if ((this.producers[p.id] ?? 0) <= 0) continue
      if (!best || p.tier > best.tier) best = p
    }
    if (!best || best.tier < 5) return
    const exists = this.legacyMonuments.some((m) => m.producerId === best!.id && m.ipoEra === this.ipoCount)
    if (exists) return
    this.legacyMonuments.push(createMonument(
      best.id,
      best.name,
      best.emoji,
      gameDay(this.gameTimeMs),
      this.dynasty.generation,
      this.ipoCount,
    ))
  }

  victoryContext(): VictoryContext {
    let illegalTypes = 0
    for (const p of PRODUCERS) {
      if (p.illegal && (this.producers[p.id] ?? 0) > 0) illegalTypes++
    }
    return {
      netWorth: this.financeNetWorth(),
      politicsLevel: this.empire.politics.level,
      presidentSeasons: this.presidentSeasons,
      dynastyGeneration: this.dynasty.generation,
      illegalTypesOwned: illegalTypes,
      totalRaidsCaught: this.totalRaidsCaught,
      alreadyUnlocked: [...this.victoriesUnlocked],
    }
  }

  checkVictoryConditions(): void {
    const newOnes = checkNewVictories(this.victoryContext())
    for (const id of newOnes) {
      if (this.victoriesUnlocked.includes(id)) continue
      this.victoriesUnlocked.push(id)
      const def = victoryDef(id)
      const unlock = mechanicForVictory(id)
      if (!this.victoryMechanics.includes(unlock.mechanic)) {
        this.victoryMechanics.push(unlock.mechanic)
      }
      this.recordChronicle('victory', def.emoji, `${def.name} — ${unlock.title} açıldı`)
      this.addGazette(fmt('gz_research_done', { name: this.playerName.trim() || 'Baron', path: def.name, title: unlock.title }), 'player')
      this.emit({ type: 'victory_unlocked', victoryId: id, name: def.name, emoji: def.emoji })
      this.emit({
        type: 'victory_mechanic_unlocked',
        victoryId: id,
        title: unlock.title,
        description: unlock.description,
        emoji: unlock.emoji,
      })
      this.emit({
        type: 'victory_achieved',
        victoryId: id,
        playerName: this.playerName || 'Baron',
        totalEarned: this.lifetimeTotalEarned,
        ipoCount: this.ipoCount,
        generation: this.dynasty.generation ?? 1,
        alignment: this.characterPathLabel(),
      })
    }
    this.refreshPlayerTitle()
  }

  checkWorldStage(): void {
    const stage = currentWorldStage(this.financeNetWorth())
    if (stage.id === this.lastWorldStageId) return
    this.lastWorldStageId = stage.id
    this.recordChronicle('world', stage.emoji, stage.headline)
    this.emit({ type: 'world_stage', stageId: stage.id, name: stage.name })
  }

  private tickPresidentSeasons(): void {
    if (this.empire.politics.level !== 'cumhurbaskan') {
      this.presidentSinceSeasonKey = null
      return
    }
    const key = gameSeasonKey(this.gameTimeMs)
    if (this.presidentSinceSeasonKey === null) {
      this.presidentSinceSeasonKey = key
      return
    }
    if (key !== this.presidentSinceSeasonKey) {
      this.presidentSeasons++
      this.presidentSinceSeasonKey = key
      this.checkVictoryConditions()
    }
  }

  private tickRivalFamilies(day: number): void {
    if (day === this.lastRivalTickDay) return
    this.lastRivalTickDay = day
    const { events, allianceOffer } = tickRivals(
      this.rivals,
      this.financeNetWorth(),
      this.producers,
      this.reputation,
      this.playerName,
      this.totalEarned,
    )
    for (const ev of events) {
      this.addGazette(ev.headline, ev.kind === 'alliance' ? 'rival' : 'rival')
      this.emit({ type: 'rival_action', rivalId: ev.rivalId, headline: ev.headline })
    }
    const playerNW = this.financeNetWorth()
    for (const rival of this.rivals) {
      if (!isRivalUnlocked(rival.id, this.totalEarned)) {
        this.rivalWasAhead.delete(rival.id)
        continue
      }
      if (rival.relation === 'merged' || rival.relation === 'bankrupt') continue
      const isAhead = rival.netWorth > playerNW
      const wasAhead = this.rivalWasAhead.has(rival.id)
      if (isAhead && !wasAhead) {
        this.rivalWasAhead.add(rival.id)
        this.emit({ type: 'rival_surpassed', rivalName: rival.name, rivalWorth: rival.netWorth })
        this.addGazette(fmt('gz_rival_overtook', { rival: rival.name, worth: formatMoney(rival.netWorth) }), 'rival')
      } else if (!isAhead && wasAhead) {
        this.rivalWasAhead.delete(rival.id)
      }
    }
    if (allianceOffer && !this.pendingRivalOffer) {
      this.pendingRivalOffer = allianceOffer
      this.emit({ type: 'rival_alliance_offer', offer: allianceOffer })
    }
    if (this.pendingRivalOffer && Date.now() > this.pendingRivalOffer.expiresAt) {
      this.pendingRivalOffer = null
    }
    this.tickRivalEvents()
    this.checkWorldStage()
    this.checkVictoryConditions()
  }

  private tickRivalEvents(): void {
    const day = gameDay(this.gameTimeMs)
    if (day === this.lastRivalEventDay) return
    this.lastRivalEventDay = day

    // Remove expired events
    this.activeRivalEvents = this.activeRivalEvents.filter((e) => e.expiresAtDay > day)

    // Only generate if no active rival event pending
    if (this.activeRivalEvents.length > 0) return

    const hostile = this.rivals.filter((r) => r.attitude < 0 && r.relation !== 'bankrupt' && r.relation !== 'merged')
    if (hostile.length === 0) return
    const rival = hostile[Math.floor(Math.random() * hostile.length)]!
    const event = generateRivalEvent(rival, this.financeNetWorth(), day)
    if (!event) return

    this.activeRivalEvents.push(event)
    this.addGazette(`⚔️ ${event.headline}`, 'rival')
    this.emit({ type: 'rival_event', event })
  }

  resolveRivalEvent(eventId: string, responseId: string): void {
    const ev = this.activeRivalEvents.find((e) => e.id === eventId)
    if (!ev) return
    const response = ev.responses.find((r) => r.id === responseId)
    if (!response) return

    const guvenlikRed = guvenlikRivalReduction(this.departments['guvenlik'] ?? 0)
    if (ev.reputationDamage > 0) {
      this.reputation = Math.max(0, this.reputation - ev.reputationDamage * (1 - guvenlikRed))
    }
    if (ev.moneyDamage > 0) {
      this.money = Math.max(0, this.money - Math.floor(ev.moneyDamage * (1 - guvenlikRed)))
      this.emit({ type: 'money_changed' })
    }
    if (response.cost > 0 && this.money >= response.cost) {
      this.money -= response.cost
      this.emit({ type: 'money_changed' })
    }
    if (response.reputationDelta !== 0) {
      this.reputation = Math.max(0, Math.min(100, this.reputation + response.reputationDelta))
    }
    const rival = this.rivals.find((r) => r.id === ev.rivalId)
    if (rival) {
      if (responseId === 'buy_out') rival.relation = 'merged'
      else if (responseId === 'price_war' || responseId === 'legal') rival.attitude = Math.min(0, rival.attitude - 20)
      else if (responseId === 'alliance') rival.attitude = Math.min(100, rival.attitude + 30)
    }
    this.activeRivalEvents = this.activeRivalEvents.filter((e) => e.id !== eventId)
    this.addGazette(fmt('gz_rival_resolved', { headline: ev.headline }), 'player')
  }

  /** İflas etmiş rakibi satın alma maliyeti. Infinity → satın alınamaz. */
  bankruptRivalAcquireCost(rivalId: string): number {
    const rv = this.rivals.find((r) => r.id === rivalId)
    if (!rv || rv.relation !== 'bankrupt') return Infinity
    return Math.max(50_000, Math.floor(rv.netWorth * 0.4))
  }

  /** Rakip satın alınabilir mi? (iflas durumunda ve para yeterliyse) */
  canAcquireBankruptRival(rivalId: string): boolean {
    return this.money >= this.bankruptRivalAcquireCost(rivalId)
  }

  /**
   * İflas etmiş rakibin varlıklarını satın al. Eski HUD'daki inline `rival-acquire`
   * mutasyonunun birebir, test edilebilir GameState karşılığı (guard + maliyet +
   * sonuç aynı). UI yalnız bu metodu çağırır; etki burada uygulanır.
   */
  acquireBankruptRival(rivalId: string): boolean {
    const rv = this.rivals.find((r) => r.id === rivalId)
    if (!rv || rv.relation !== 'bankrupt') return false
    const cost = this.bankruptRivalAcquireCost(rivalId)
    if (!this.canAfford(cost)) return false
    this.spendMoney(cost) // money_changed emit eder
    this.reputation = Math.min(100, this.reputation + 10)
    rv.relation = 'merged'
    this.emit({ type: 'reputation_changed', reputation: this.reputation, delta: 10 })
    return true
  }

  private maybeSpawnChildCrisis(): void {
    if (this.dynasty.children.length === 0) return
    if (Math.random() > 0.06) return
    const eligible = this.dynasty.children.filter(
      (c) => c.educationXp >= 35 && !this.childCrises.some((x) => x.childId === c.id),
    )
    if (eligible.length === 0) return
    const child = eligible[Math.floor(Math.random() * eligible.length)]!
    const typeMap: Record<string, 'gambler' | 'illegal' | 'scandal'> = {
      gambler: 'gambler',
      illegal: 'illegal',
      scandal: 'scandal',
      low: 'gambler',
    }
    const type = typeMap[child.riskProfile] ?? 'gambler'
    this.childCrises.push({ childId: child.id, type })
    this.baronLifeChildCrises++
    const messages = {
      gambler: `${child.name} kumar borçları biriktiriyor!`,
      illegal: `${child.name} illegal işlere bulaştı — heat artıyor!`,
      scandal: `${child.name} skandala karıştı — itibar düşüyor!`,
    }
    this.recordChronicle('crisis', '⚠️', messages[type])
    this.emit({ type: 'child_crisis', childName: child.name, crisisType: type, message: messages[type] })
  }

  private tickChildCrises(): void {
    if (this.childCrises.length === 0) return
    for (const crisis of this.childCrises) {
      const child = this.dynasty.children.find((c) => c.id === crisis.childId)
      if (!child) continue
      if (crisis.type === 'gambler' && this.money > 100) {
        const drain = Math.floor(Math.min(this.money * 0.008, this.incomePerDay() * 0.15))
        this.money = Math.max(0, this.money - drain)
        this.emit({ type: 'money_changed' })
      } else if (crisis.type === 'illegal') {
        this.illegalHeat = Math.min(100, this.illegalHeat + 2)
        this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
      } else if (crisis.type === 'scandal') {
        this.addReputation(reputationFromScandal())
      }
      if (Math.random() < 0.12) {
        this.childCrises = this.childCrises.filter((c) => c.childId !== crisis.childId)
        this.recordChronicle('dynasty', '✅', `${child.name} krizden çıktı`)
      }
    }
  }

  rivalLobby(rivalId: string): boolean {
    const rival = rivalById(this.rivals, rivalId)
    if (!rival || rival.relation === 'merged') return false
    const global = hasMechanic(this.victoryMechanics, 'global_lobby')
    const cost = Math.max(5000, this.incomePerDay() * (global ? 0.14 : 0.2))
    if (!this.canAfford(cost)) return false
    this.money -= cost
    lobbyAgainstRival(rival, cost, global)
    this.addReputation(reputationFromLobby())
    this.recordChronicle('rival', '🏛️', `${rival.name}'a karşı lobi yaptın`)
    this.emit({ type: 'money_changed' })
    return true
  }

  rivalCooperate(rivalId: string): boolean {
    const rival = rivalById(this.rivals, rivalId)
    if (!rival || rival.relation === 'merged') return false
    const cost = Math.max(3000, this.incomePerDay() * 0.1)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    cooperateWithRival(rival)
    this.addReputation(reputationFromLobby() * 2)
    this.recordChronicle('rival', '🤝', `${rival.name} ile işbirliği anlaşması`)
    this.emit({ type: 'money_changed' })
    return true
  }

  rivalMerge(rivalId: string): boolean {
    const rival = rivalById(this.rivals, rivalId)
    if (!rival || rival.relation === 'merged') return false
    const cost = mergeRivalCost(rival)
    if (!this.canAfford(cost)) return false
    if (!mergeRival(rival)) return false
    this.money -= cost
    this.addReputation(5)
    this.recordChronicle('rival', '🛒', `${rival.name} satın alındı — merger tamamlandı`)
    this.emit({ type: 'money_changed' })
    return true
  }

  skylineTierCount(): number {
    return this.ownedBusinessTiers() + this.legacyMonuments.length
  }

  ownedProducerIds(): string[] {
    return PRODUCERS.filter((p) => (this.producers[p.id] ?? 0) > 0).map((p) => p.id)
  }

  skylineWorldStageId(): WorldStageId {
    return currentWorldStage(this.financeNetWorth()).id
  }

  addGazette(headline: string, category: GazetteCategory): void {
    const day = gameDay(this.gameTimeMs)
    this.gazetteEntries = pushGazette(this.gazetteEntries, headline, day, category)
    this.emit({ type: 'gazette_headline', headline, category })
  }

  latestGazetteHeadlines(limit = 5): GazetteEntry[] {
    return this.gazetteEntries.slice(0, limit)
  }

  refreshPlayerTitle(): PlayerTitleDef {
    let illegalTypes = 0
    for (const p of PRODUCERS) {
      if (p.illegal && (this.producers[p.id] ?? 0) > 0) illegalTypes++
    }
    const title = computePlayerTitle({
      reputation: this.reputation,
      illegalHeat: this.illegalHeat,
      illegalTypesOwned: illegalTypes,
      politicsLevel: this.empire.politics.level,
      bankruptcyCount: this.bankruptcyCount,
      totalRaidsCaught: this.totalRaidsCaught,
      lifetimeTotalEarned: this.lifetimeTotalEarned,
    })
    if (title.id !== this.playerTitleId) {
      this.playerTitleId = title.id
      this.emit({ type: 'player_title', title })
    }
    return title
  }

  playerTitle(): PlayerTitleDef {
    return computePlayerTitle({
      reputation: this.reputation,
      illegalHeat: this.illegalHeat,
      illegalTypesOwned: PRODUCERS.filter((p) => p.illegal && (this.producers[p.id] ?? 0) > 0).length,
      politicsLevel: this.empire.politics.level,
      bankruptcyCount: this.bankruptcyCount,
      totalRaidsCaught: this.totalRaidsCaught,
      lifetimeTotalEarned: this.lifetimeTotalEarned,
    })
  }

  private tickMetaSystems(): void {
    if (!this.isMetaSystemsReady()) {
      this.tickCommodities()
      this.tickUndoExpiry()
      return
    }
    const day = gameDay(this.gameTimeMs)
    this.tickCalendarEvents()
    this.tickLifestyle(day)
    this.tickHealth(day)
    this.tickDiseases(day)
    this.tickPets(day)
    this.tickSiblings(day)
    this.tickFame(day)
    this.tickSpouseSatisfaction(day)
    this.tickAnnualSummary(day)
    this.tickAgeMilestones(day)
    this.tickHobby(day)
    this.tickFriendshipsDaily(day)
    this.tickMentorEnemy(day)
    this.tickLifeEvents(day)
    this.checkSkillUnlocks()
    this.tickInsurance(day)
    this.tickCommodities()
    this.tickInvestmentOffers(day)
    this.tickPendingInvestments(day)
    this.maybeSpawnCrisis(day)
    this.tickCrisisExpiry()
    this.tickTorpilGifts(day)
    this.maybeNaturalDisaster(day)
    this.tickUndoExpiry()
    if (day % 7 === 0 && day !== this.advisorTipDay) {
      this.advisorTipDay = day
      this.advisorTip = rollAdvisorTip(this.stock.marketFear, day)
      // Weekly income summary headline
      const weeklyIncome = formatMoney(this.incomePerDay() * 7)
      const topProducer = PRODUCERS
        .filter((p) => (this.producers[p.id] ?? 0) > 0)
        .sort((a, b) => this.producerIncome(b) - this.producerIncome(a))[0]
      const topName = topProducer ? topProducer.name : null
      const who = this.playerName.trim() || 'Baron'
      const weeklyHeadline = topName
        ? `📊 ${who} bu hafta ${weeklyIncome} kazandı — en iyi sektör: ${topName}`
        : `📊 ${who} bu hafta ${weeklyIncome} kazandı`
      this.addGazette(weeklyHeadline, 'player')
      // Rotating market & politics headlines for variety
      if (day % 14 === 0) {
        this.addGazette(headlineMarketRandom(this.playerName, this.financeNetWorth()), 'market')
      } else if (day % 14 === 7) {
        this.addGazette(headlinePoliticsRandom(this.playerName), 'politics')
      }
    }
    if (day % 30 === 0 && day > 0) {
      const rival = this.rivals.find((r) => r.relation !== 'merged')
      const amt = formatMoney(this.incomePerDay() * 30)
      this.addGazette(
        headlineMonthlyIncome(this.playerName, amt, rival?.name),
        'player',
      )
    }
  }

  private lastLifestyleTickDay = 0
  private tickLifestyle(day: number): void {
    if (day === this.lastLifestyleTickDay) return
    this.lastLifestyleTickDay = day
    const ls = this.lifestyle
    const activeBiz = Object.values(this.producers).filter((c) => c > 0).length
    const delta = dailyStressDelta(ls, activeBiz, this.illegalHeat, day)
    const roomStressReduction = homeRoomDailyStressReduction(ls)
    ls.stress = Math.max(0, Math.min(100, ls.stress + delta - roomStressReduction))
    if (ls.stress >= 80) {
      ls.burnoutDays += 1
    } else {
      ls.burnoutDays = Math.max(0, ls.burnoutDays - 1)
    }
    if (day % 30 === 0 && day > 0) {
      const expense = lifestyleMonthlyExpense(ls)
      if (expense > 0 && this.money >= expense) {
        this.money -= expense
        this.emit({ type: 'money_changed' })
      }
      const rentalInc = lifestyleRentalIncome(ls)
      if (rentalInc > 0) {
        this.money += rentalInc
        this.emit({ type: 'money_changed' })
      }
      // Luxury lifestyle draws media attention when heat is elevated
      const luxuryResidences = ['rezidans', 'villa', 'yali', 'saray', 'ada']
      const luxuryLevel = luxuryResidences.indexOf(ls.residence)
      if (this.illegalHeat > 30 && luxuryLevel >= 3) {
        const mediaRisk = (this.illegalHeat - 30) / 200  // 0-0.35 range
        if (Math.random() < mediaRisk) {
          this.reputation = Math.max(0, this.reputation - 2)
          this.addGazette(requiredDomainText('gz_luxury_media'), 'crisis')
        }
      }
    }
  }

  private lastHealthTickDay = 0
  private tickHealth(day: number): void {
    if (day === this.lastHealthTickDay) return
    this.lastHealthTickDay = day
    const age = this.dynasty.playerBornGameDay > 0
      ? Math.floor((day - this.dynasty.playerBornGameDay) / 365) + (this.dynasty.playerStartAge ?? 25)
      : 30
    const delta = dailyHealthDelta(age, this.lifestyle.stress, this.health)
    const gymBonus = hasHomeRoom(this.lifestyle, 'gym') ? 3 : 0
    const diseaseDmg = diseasesDailyDamage(this.diseases)
    this.health.health = Math.max(0, Math.min(100, this.health.health + delta + gymBonus - diseaseDmg))
    if (this.health.exerciseDaysActive > 0) {
      this.health.exerciseDaysActive--
    }
    this.emit({ type: 'health_changed', health: this.health.health })
  }

  private tickDiseases(day: number): void {
    if (day === this.lastDiseaseTickDay) return
    this.lastDiseaseTickDay = day
    const age = this.playerAge()
    const diagChance = dailyDiagnosisChance(age, this.health.health)
    const eligible = eligibleDiseases(age, this.diseases)
    if (eligible.length > 0) {
      const totalBaseChance = eligible.reduce((s, d) => s + d.baseChance, 0)
      if (Math.random() < totalBaseChance * diagChance) {
        const picked = pickRandomDisease(eligible)
        if (picked) {
          this.diseases.push({ id: picked.id, diagnosedDay: day })
          this.emit({ type: 'disease_diagnosed', diseaseId: picked.id, name: picked.name, emoji: picked.emoji })
        }
      }
    }
  }

  private lastPetTickDay = 0
  private tickPets(day: number): void {
    if (day === this.lastPetTickDay) return
    this.lastPetTickDay = day
    if (!this.lifestyle.ownedPets || this.lifestyle.ownedPets.length === 0) return
    const died = expirePets(this.lifestyle, day)
    for (const petId of died) {
      const pet = PETS.find((p) => p.id === petId)
      this.emit({ type: 'pet_died', petId, petName: pet?.name ?? petId, petEmoji: pet?.emoji ?? '🐾' })
    }
  }

  private lastFameTickDay = 0
  private tickFame(day: number): void {
    if (day === this.lastFameTickDay) return
    this.lastFameTickDay = day
    if (!this.fameState.isActive) return
    const prevLevel = Math.floor(this.fameState.fameLevel)
    tickFameDecay(this.fameState)
    const newLevel = Math.floor(this.fameState.fameLevel)
    if (newLevel !== prevLevel) {
      this.emit({ type: 'fame_changed', fameLevel: newLevel, label: '' })
    }
    const income = fameDailyIncome(this.fameState)
    if (income > 0) {
      this.money += income
      this.fameState.totalEarned += income
      this.emit({ type: 'money_changed' })
    }
  }

  private tickSiblings(day: number): void {
    const year = Math.floor(day / 365)
    if (year === this.lastSiblingTickYear) return
    this.lastSiblingTickYear = year
    const died = tickSiblingYear(this.siblings)
    if (died) {
      const inheritance = siblingInheritance(died)
      if (inheritance > 0) {
        this.money += inheritance
        this.emit({ type: 'money_changed' })
      }
      this.emit({ type: 'sibling_died', siblingName: died.name, inheritance })
    }
  }

  private lastSpouseTickDay = 0
  private tickSpouseSatisfaction(day: number): void {
    if (day === this.lastSpouseTickDay) return
    this.lastSpouseTickDay = day
    if (!this.dynasty.spouseId) return
    // Slow decay; high stress accelerates
    let decay = 0.05
    if (this.lifestyle.stress >= 60) decay += 0.1
    this.dynasty.spouseSatisfaction = Math.max(0, (this.dynasty.spouseSatisfaction ?? 70) - decay)
    // Children happiness slow decay
    for (const c of this.dynasty.children) {
      c.happiness = Math.max(0, (c.happiness ?? 60) - 0.03)
    }
    // Marriage crisis trigger
    const sat = this.dynasty.spouseSatisfaction ?? 70
    const lastCrisis = this.dynasty.lastMarriageCrisisDay ?? 0
    if (sat < 30 && day - lastCrisis > 60) {
      this.dynasty.lastMarriageCrisisDay = day
      this.pendingDecisions = this.pendingDecisions.filter(d => d.type !== 'marriage_crisis')
      this.pendingDecisions.push({ type: 'marriage_crisis', spouseId: this.dynasty.spouseId! })
      this.emit({ type: 'marriage_crisis' })
    }
  }

  private lastAnnualSummaryDay = 0
  private tickAnnualSummary(day: number): void {
    if (day === this.lastAnnualSummaryDay) return
    this.lastAnnualSummaryDay = day
    const currentYear = Math.floor(day / 365)
    if (currentYear > 0 && currentYear !== this.lastAnnualSummaryYear) {
      this.lastAnnualSummaryYear = currentYear
      const playerAge = this.dynasty.playerBornGameDay > 0
        ? Math.floor((day - this.dynasty.playerBornGameDay) / 365) + (this.dynasty.playerStartAge ?? 25)
        : 25 + currentYear
      const summaryEvent = {
        type: 'annual_summary' as const,
        year: currentYear,
        playerAge,
        totalEarned: this.totalEarned,
        businessCount: Object.values(this.producers).filter((c) => c > 0).length,
        incomePerDay: this.incomePerDay(),
      }
      this.pendingDecisions = this.pendingDecisions.filter(d => d.type !== 'annual_summary')
      this.pendingDecisions.push(summaryEvent)
      this.emit(summaryEvent)
    }
  }

  private lastAgeMilestoneTickDay = 0
  private tickAgeMilestones(day: number): void {
    if (day === this.lastAgeMilestoneTickDay) return
    this.lastAgeMilestoneTickDay = day
    const age = this.playerAge()
    const milestones = [30, 40, 50, 60, 70]
    for (const milestone of milestones) {
      if (age >= milestone && !this.ageMilestonesShown.includes(milestone)) {
        this.ageMilestonesShown.push(milestone)
        const msEvent = { type: 'age_milestone' as const, age: milestone, question: requiredDomainText(`milestone_${milestone}_question`) }
        this.pendingDecisions = this.pendingDecisions.filter(d => d.type !== 'age_milestone')
        this.pendingDecisions.push(msEvent)
        this.emit(msEvent)
        break // Bir seferinde biri
      }
    }
  }

  private lastHobbyTickDay = 0
  private tickHobby(day: number): void {
    if (day === this.lastHobbyTickDay) return
    this.lastHobbyTickDay = day
    if (day % 30 === 0 && day > 0 && this.hobby.hobbyId) {
      const cost = hobbyMonthlyCost(this.hobby)
      if (cost > 0 && this.money >= cost) {
        this.money -= cost
        this.emit({ type: 'money_changed' })
      }
      tickHobbyMonth(this.hobby)
    }
  }

  setEducation(id: EducationId): void {
    if (this.education !== null) return // Sadece bir kez seçilebilir
    this.education = id
    const def = EDUCATIONS.find((e) => e.id === id)
    if (!def) return
    // Başlangıç parası çarpanı uygula
    this.money = Math.floor(this.money * def.startingMoneyMult)
    // Başlangıç prestij bonusu
    if (def.startPrestige > 0) {
      this.prestigePoints += def.startPrestige
      this.lifetimePrestige += def.startPrestige
    }
    this.emit({ type: 'money_changed' })
  }

  setHobby(id: HobbyId): void {
    this.hobby.hobbyId = id
    this.hobby.monthsActive = 0
    this.hobby.bonusActive = false
  }

  socialStatusScore(): number {
    const wealth = Math.log10(Math.max(1, this.financeNetWorth())) * 10
    const rep = Math.max(0, this.reputation)
    const politics = { none: 0, muhtar: 5, belediye: 15, milletvekili: 25, bakan: 40, cumhurbaskan: 60 }
    const politicsScore = politics[this.empire.politics.level] ?? 0
    const familyHealth = Math.round((this.dynasty.spouseSatisfaction ?? 70) / 10)
    return Math.floor(wealth + rep + politicsScore + familyHealth)
  }

  socialStatusTitle(): { title: string; emoji: string } {
    const score = this.socialStatusScore()
    if (score >= 200) return { title: 'Efsanevi Baron', emoji: '🌟' }
    if (score >= 150) return { title: 'Tanınan Figür', emoji: '👑' }
    if (score >= 100) return { title: 'İş Dünyasının Yıldızı', emoji: '⭐' }
    if (score >= 70) return { title: 'Saygın Girişimci', emoji: '💼' }
    if (score >= 40) return { title: 'Yerel Tanınan', emoji: '🤝' }
    return { title: 'Sıradan Yatırımcı', emoji: '📈' }
  }

  private lastFriendshipTickDay = 0
  private tickFriendshipsDaily(day: number): void {
    if (day === this.lastFriendshipTickDay) return
    this.lastFriendshipTickDay = day
    tickFriendships(this.friendships, day)
    // Auto-unlock friends when totalEarned reaches threshold
    const newFriends = availableToUnlockFriends(this.friendships, this.totalEarned)
    for (const def of newFriends) {
      const name = randomFriendName(def.id)
      addFriend(this.friendships, def.id, name, day)
      this.emit({ type: 'friend_unlocked', friendName: name, typeLabel: def.name })
    }
    // Monthly: reputation from neighborhood friendship
    if (day % 30 === 0 && day > 0) {
      const repGain = friendshipReputationMonthly(this.friendships)
      if (repGain > 0) this.addReputation(repGain)
    }
    // Daily stress reduction from school friend
    const stressDelta = friendshipStressDaily(this.friendships)
    if (stressDelta !== 0) {
      this.lifestyle.stress = Math.max(0, Math.min(100, this.lifestyle.stress + stressDelta))
    }
  }

  private lastMentorTickDay = 0
  private tickMentorEnemy(day: number): void {
    if (day === this.lastMentorTickDay) return
    this.lastMentorTickDay = day
    // Assign mentor at day 3 if not yet assigned
    if (!this.mentorEnemy.mentorId && day >= 3) {
      this.mentorEnemy.mentorId = assignRandomMentor()
      this.mentorEnemy.mentorUnlockedDay = day
    }
    // Assign enemy at totalEarned >= 10K if not yet assigned
    if (!this.mentorEnemy.enemyId && this.totalEarned >= 10_000) {
      this.mentorEnemy.enemyId = assignRandomEnemy()
      this.mentorEnemy.enemyActiveDay = day
      this.emitEnemyAppeared()
    }
    // Check mentor quests
    const completable = checkMentorQuests(this.mentorEnemy, {
      totalEarned: this.totalEarned,
      ipoCount: this.ipoCount,
      reputation: this.reputation,
      businessCount: Object.keys(this.producers).filter((id) => (this.producers[id] ?? 0) > 0).length,
    })
    for (const quest of completable) {
      const reward = completeMentorQuest(this.mentorEnemy, quest.id)
      if (reward) {
        this.emit({ type: 'mentor_quest_completed', questLabel: quest.label, rewardLabel: reward })
      }
    }
  }

  private emitEnemyAppeared(): void {
    if (!this.mentorEnemy.enemyId) return
    // Import is synchronous (already loaded), just use the pre-imported function
    const enemies: Record<string, { name: string; title: string }> = {
      corrupt_rival: { name: 'Necdet Avcı', title: 'Yolsuz Rakip' },
      jealous_partner: { name: 'Sinan Koray', title: 'Kıskançlıktan Dönen Ortak' },
      hostile_regulator: { name: 'Müfettiş Cemal', title: 'Düşman Denetçi' },
    }
    const e = enemies[this.mentorEnemy.enemyId] ?? { name: '?', title: '?' }
    this.emit({ type: 'enemy_appeared', enemyName: e.name, title: e.title })
  }

  spendTimeWithFriend(typeId: FriendTypeId): void {
    const gain = spendTimeWithFriend(this.friendships, typeId, gameDay(this.gameTimeMs))
    if (gain > 0) {
      this.emit({ type: 'dynasty_update', kind: 'friend_time', name: typeId })
    }
  }

  sendMoneyToFriend(typeId: FriendTypeId): boolean {
    if (this.money < FRIEND_SEND_MONEY_COST) return false
    const gain = sendMoneyToFriend(this.friendships, typeId, gameDay(this.gameTimeMs))
    if (gain > 0) {
      this.money -= FRIEND_SEND_MONEY_COST
      this.emit({ type: 'money_changed' })
      this.emit({ type: 'dynasty_update', kind: 'friend_money', name: typeId })
    }
    return gain > 0
  }

  toggleDynastyLegacyItem(itemId: DynastyLegacyItemId): void {
    toggleLegacyItem(this.dynasty, itemId)
    this.emit({ type: 'legacy_selected', items: this.dynasty.legacyItems ?? [] })
  }

  buyHomeRoom(roomId: HomeRoomId): boolean {
    const roomDef = HOME_ROOMS.find((r) => r.id === roomId)
    if (!roomDef) return false
    if (hasHomeRoom(this.lifestyle, roomId)) return false
    if (!this.canAfford(roomDef.cost)) return false
    this.spendMoney(roomDef.cost)
    if (!this.lifestyle.homeRooms) this.lifestyle.homeRooms = []
    this.lifestyle.homeRooms.push(roomId)
    this.emit({ type: 'money_changed' })
    this.addGazette(fmt('gz_room_added', { emoji: roomDef.emoji, room: roomDef.name, bonus: roomDef.bonusLabel }), 'player')
    return true
  }

  goTravel(destinationId: TravelDestinationId): boolean {
    const def = travelDestinationDef(destinationId)
    if (!def || this.totalEarned < def.unlockAt) return false
    if (!this.canAfford(def.cost)) return false
    this.spendMoney(def.cost)
    const day = gameDay(this.gameTimeMs)
    // Apply stress reduction via lifestyle
    this.lifestyle.stress = Math.max(0, this.lifestyle.stress - def.stressReduction)
    // Apply income penalty (reuse vacation system)
    this.lifestyle.vacationActiveUntilDay = day + def.incomePenaltyDays
    // Apply bonus
    this.travel.lastDestinationId = destinationId
    this.travel.totalTrips++
    if (def.bonusDurationDays > 0) {
      this.travel.travelBonusUntilDay = day + def.bonusDurationDays
      this.travel.travelBonusType = def.bonusType
      this.travel.travelBonusValue = def.bonusValue
    } else {
      this.travel.travelBonusUntilDay = 0
      this.travel.travelBonusType = null
    }
    // Reputation bonus (flat)
    if (def.bonusType === 'reputation') {
      this.addReputation(def.bonusValue)
    }
    // Health improvement
    const healthGain = Math.floor(def.stressReduction * 0.3)
    this.health.health = Math.min(100, this.health.health + healthGain)
    this.emit({ type: 'health_changed', health: this.health.health })
    this.emit({ type: 'money_changed' })
    this.addGazette(`✈️ ${def.name} tatiline gidildi — stres eridi, bonuslar aktif`, 'player')
    return true
  }

  resolveEnemy(method: string): boolean {
    if (!this.mentorEnemy.enemyId || this.mentorEnemy.enemyResolved) return false
    const costMap: Record<string, number> = {
      money: 500_000, law: 200_000, politics: 350_000, diplomacy: 100_000,
    }
    const repMap: Record<string, number> = {
      money: -20, law: 15, politics: 5, diplomacy: 10,
    }
    const cost = costMap[method] ?? 200_000
    if (this.money < cost) return false
    this.money -= cost
    this.mentorEnemy.enemyResolved = true
    const repDelta = repMap[method] ?? 0
    this.addReputation(repDelta)
    this.emit({ type: 'money_changed' })
    this.addGazette(fmt('gz_enemy_defeated', { method }), 'player')
    return true
  }

  private lastLifeEventTickDay = 0
  private tickLifeEvents(day: number): void {
    if (day === this.lastLifeEventTickDay) return
    this.lastLifeEventTickDay = day
    const pending = this.pendingConsequences.filter((c) => c.triggerGameDay <= day)
    for (const pc of pending) {
      const result = resolveConsequence(pc.consequenceId, pc.eventId)
      if (result.moneyDelta !== 0) {
        this.money += result.moneyDelta
        this.emit({ type: 'money_changed' })
      }
      if (result.reputationDelta !== 0) {
        const repDelta = result.reputationDelta < 0 && torpilMediaProtect(this.torpil)
          ? Math.ceil(result.reputationDelta * 0.5)
          : result.reputationDelta
        this.reputation = Math.max(0, Math.min(100, this.reputation + repDelta))
      }
      if (result.healthDelta) {
        this.health.health = Math.max(0, Math.min(100, this.health.health + result.healthDelta))
      }
      this.addGazette(result.headline, result.moneyDelta < 0 ? 'crisis' : 'player')
      this.emit({ type: 'life_event_consequence', headline: result.headline, moneyDelta: result.moneyDelta })
    }
    this.pendingConsequences = this.pendingConsequences.filter((c) => c.triggerGameDay > day)
    if (this.pendingConsequences.length === 0) {
      for (const def of LIFE_EVENTS) {
        if (shouldTriggerLifeEvent(this.lifeEvents, def, day, this.totalEarned, this.eventChoiceHistory)) {
          this.lifeEvents.push({ eventId: def.id, seenAtGameDay: day })
          this.emit({ type: 'life_event_triggered', eventDef: def })
          break
        }
      }
    }
  }

  resolveLifeEventChoice(eventId: LifeEventId, choiceId: string): void {
    const def = LIFE_EVENTS.find((e) => e.id === eventId)
    if (!def) return
    const choice = def.choices.find((c) => c.id === choiceId)
    if (!choice) return
    // Record choice in history for chain events
    this.eventChoiceHistory.push({ eventId, choiceId, gameDay: gameDay(this.gameTimeMs) })
    // Alignment scoring based on choice
    this.scoreAlignment(eventId, choiceId)
    this.playerSkills.lifeEventsResolved++
    this.checkSkillUnlocks()
    if (choice.moneyDelta !== 0) {
      this.money += choice.moneyDelta
      this.emit({ type: 'money_changed' })
    }
    if (choice.reputationDelta !== 0) {
      const repDelta = choice.reputationDelta < 0 && torpilMediaProtect(this.torpil)
        ? Math.ceil(choice.reputationDelta * 0.5)
        : choice.reputationDelta
      this.reputation = Math.max(0, Math.min(100, this.reputation + repDelta))
    }
    if (choice.stressDelta !== 0) {
      const stressDelta = choice.stressDelta > 0
        ? choice.stressDelta * skillEventStressMult(this.playerSkills)
        : choice.stressDelta
      this.lifestyle.stress = Math.max(0, Math.min(100, this.lifestyle.stress + stressDelta))
    }
    if (choice.healthDelta) {
      this.health.health = Math.max(0, Math.min(100, this.health.health + choice.healthDelta))
    }
    if (choice.consequenceId && choice.consequenceDelayDays) {
      const currentDay = gameDay(this.gameTimeMs)
      this.pendingConsequences.push({
        id: `${eventId}_${choiceId}_${currentDay}`,
        triggerGameDay: currentDay + choice.consequenceDelayDays,
        eventId,
        choiceId,
        consequenceId: choice.consequenceId,
      })
    }
    // 2nd-layer risk outcome (dice roll applied immediately)
    if (choice.riskOutcome) {
      this.resolveRiskOutcome(choice.riskOutcome)
    }
    // Karma tracking
    this.applyChoiceKarma(choiceId)
  }

  private resolveRiskOutcome(risk: ChoiceRiskOutcome): void {
    const won = Math.random() < risk.winChance
    const moneyDelta = won ? risk.winMoneyDelta : risk.lossMoneyDelta
    const repDelta = won ? risk.winReputationDelta : risk.lossReputationDelta
    const headline = won ? risk.winHeadline : risk.lossHeadline
    if (moneyDelta !== 0) {
      this.money += moneyDelta
      this.emit({ type: 'money_changed' })
    }
    if (repDelta !== 0) {
      this.reputation = Math.max(0, Math.min(100, this.reputation + repDelta))
    }
    this.emit({ type: 'life_event_risk_outcome', headline, won })
  }

  private applyChoiceKarma(choiceId: string): void {
    const positiveIds = ['police', 'protect_workers', 'donate_charity', 'report_corruption', 'turn_down', 'legal', 'help_friend', 'honest_answer', 'refuse', 'pay_fine', 'support', 'donate_big', 'donate_small', 'settle_lawsuit', 'skip_gambling']
    const negativeIds = ['bribe', 'keep', 'pay_protection', 'cover_up', 'bribe_fix', 'go_all_in', 'fire_workers', 'bribe_official']
    if (positiveIds.includes(choiceId)) this.karma = Math.min(100, this.karma + 3)
    else if (negativeIds.includes(choiceId)) this.karma = Math.max(-100, this.karma - 5)
  }

  treatDisease(id: DiseaseId): boolean {
    const def = diseaseDef(id)
    if (!this.canAfford(def.treatCost)) return false
    this.money -= def.treatCost
    this.emit({ type: 'money_changed' })
    this.diseases = this.diseases.filter((d) => d.id !== id)
    this.emit({ type: 'disease_treated', diseaseId: id, name: def.name })
    return true
  }

  visitSiblingById(id: string): boolean {
    const sibling = this.siblings.find((s) => s.id === id && s.isAlive)
    if (!sibling) return false
    if (!this.canAfford(VISIT_SIBLING_COST)) return false
    this.money -= VISIT_SIBLING_COST
    this.emit({ type: 'money_changed' })
    doVisitSibling(sibling)
    return true
  }

  startFameCareer(type: FameCareerType): boolean {
    if (this.fameState.isActive) return false
    this.fameState = { ...createFameState(), careerType: type, isActive: true }
    return true
  }

  quitFameCareer(): void {
    this.fameState.isActive = false
  }

  doFameAction(actionId: string): boolean {
    const prevLevel = this.fameState.fameLevel
    const result = applyFameAction(this.fameState, actionId)
    if (!result) return false
    if (result.cost > 0 && !this.canAfford(result.cost)) {
      this.fameState.fameLevel = prevLevel
      return false
    }
    if (result.cost > 0) {
      this.money -= result.cost
      this.emit({ type: 'money_changed' })
    }
    this.lifestyle.stress = Math.min(100, this.lifestyle.stress + result.stressDelta)
    this.emit({ type: 'fame_action', careerName: this.fameState.careerType ?? '', fameDelta: this.fameState.fameLevel - prevLevel, newLevel: Math.floor(this.fameState.fameLevel) })
    return true
  }

  private scoreAlignment(eventId: string, choiceId: string): void {
    // Choices that clearly indicate a path give +2, ambiguous choices give +1
    const temizChoices = ['police', 'protect_workers', 'donate_charity', 'report_corruption', 'turn_down', 'legal', 'help_friend', 'honest_answer', 'refuse', 'pay_fine']
    const acımasızChoices = ['fire_workers', 'bribe_official', 'hostile_takeover', 'sue_rival', 'deny_raise', 'reject', 'harsh_discipline', 'press_charges']
    const gölgeChoices = ['keep', 'partner_mafia', 'bribe', 'smuggle', 'launder', 'accept_bribe', 'pay_protection', 'cover_up', 'fake_evidence', 'underground_deal']

    if (temizChoices.includes(choiceId)) this.characterAlignment.temiz += 2
    else if (acımasızChoices.includes(choiceId)) this.characterAlignment.acımasız += 2
    else if (gölgeChoices.includes(choiceId)) this.characterAlignment.gölge += 2
    // suppress unused param warning
    void eventId
  }

  characterPathLabel(): string {
    const { temiz, acımasız, gölge } = this.characterAlignment
    const total = temiz + acımasız + gölge
    if (total < 4) return 'Bilinmez'
    if (temiz >= acımasız && temiz >= gölge) return 'Temiz İş İnsanı'
    if (gölge >= acımasız) return 'Gölge Baron'
    return 'Acımasız CEO'
  }

  useAbility(id: string, cooldownMs: number): boolean {
    const until = this.abilityCooldowns[id] ?? 0
    if (Date.now() < until) return false
    this.abilityCooldowns[id] = Date.now() + cooldownMs
    return true
  }

  abilityRemainingMs(id: string): number {
    return Math.max(0, (this.abilityCooldowns[id] ?? 0) - Date.now())
  }

  checkSkillUnlocks(): void {
    const businessesOwned = Object.values(this.producers).reduce((s, c) => s + (c ?? 0), 0)
    const metrics = {
      businessesOwned,
      totalClicks: this.totalClicks,
      ipoCount: this.ipoCount,
      lifeEventsResolved: this.playerSkills.lifeEventsResolved,
      totalEarned: this.lifetimeTotalEarned,
    }
    const unlocked = newlyUnlockedSkills(this.playerSkills, metrics)
    for (const skill of unlocked) {
      this.playerSkills.unlocked.push(skill.id)
      this.emit({ type: 'skill_unlocked', skill })
      this.addGazette(fmt('gz_new_skill', { emoji: skill.emoji, skill: skill.name, desc: skill.description }), 'player')
    }
  }

  setPersonality(id: PersonalityId): void {
    if (this.personality) return
    this.personality = id
    this.emit({ type: 'money_changed' })
  }

  // ---- Günlük Rutin ----
  getDailyRoutineActions(): { used: string[]; remaining: number; max: number } {
    const day = gameDay(this.gameTimeMs)
    if (day !== this.dailyRoutineDay) {
      this.dailyRoutineDay = day
      this.dailyRoutineUsed = []
    }
    const max = 3
    return { used: [...this.dailyRoutineUsed], remaining: Math.max(0, max - this.dailyRoutineUsed.length), max }
  }

  doDailyRoutine(action: 'exercise' | 'read' | 'network' | 'family' | 'meditate'): boolean {
    const status = this.getDailyRoutineActions()
    if (status.remaining <= 0) return false
    if (this.dailyRoutineUsed.includes(action)) return false
    this.dailyRoutineUsed.push(action)
    switch (action) {
      case 'exercise':
        this.health.health = Math.min(100, this.health.health + 5)
        this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 5)
        this.health.exerciseDaysActive = Math.max(this.health.exerciseDaysActive, 2)
        break
      case 'read':
        this.dailyReadBonusUntilDay = gameDay(this.gameTimeMs) + 1
        break
      case 'network':
        this.money += Math.floor(this.incomePerDay() * 0.5)
        this.emit({ type: 'money_changed' })
        break
      case 'family':
        if (this.dynasty.spouseId) {
          this.dynasty.spouseSatisfaction = Math.min(100, (this.dynasty.spouseSatisfaction ?? 70) + 5)
        }
        for (const c of this.dynasty.children) {
          c.happiness = Math.min(100, (c.happiness ?? 60) + 10)
        }
        this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 3)
        break
      case 'meditate':
        this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 10)
        break
    }
    this.emit({ type: 'money_changed' })
    return true
  }

  dailyReadBonusUntilDay = 0

  // ---- Eş Etkileşimi ----
  giveSpouseGift(): boolean {
    if (!this.dynasty.spouseId) return false
    const cost = 50_000
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.dynasty.spouseSatisfaction = Math.min(100, (this.dynasty.spouseSatisfaction ?? 70) + 20)
    this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 5)
    this.addGazette(requiredDomainText('gz_spouse_gift'), 'player')
    this.emit({ type: 'money_changed' })
    this.emit({ type: 'dynasty_update', kind: 'spouse_gift', name: this.dynasty.spouseName ?? '' })
    return true
  }

  resolveMarriageCrisis(spendMoney: boolean): void {
    if (!this.dynasty.spouseId) return // guard: pending preserved when no spouse
    if (spendMoney) {
      const cost = 100_000
      if (this.canAfford(cost)) {
        this.money -= cost
        this.dynasty.spouseSatisfaction = Math.min(100, (this.dynasty.spouseSatisfaction ?? 0) + 40)
        this.emit({ type: 'money_changed' })
      }
    } else {
      this.dynasty.spouseSatisfaction = Math.min(100, (this.dynasty.spouseSatisfaction ?? 0) + 25)
      this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 10)
    }
    // Clear AFTER all effects applied — if guard failed above, pending is preserved
    this.pendingDecisions = this.pendingDecisions.filter(d => d.type !== 'marriage_crisis')
    this.emit({ type: 'dynasty_update', kind: 'crisis_resolved', name: this.dynasty.spouseName ?? '' })
  }

  // ---- Çocuk Etkileşimi ----
  setChildParentingStyle(childId: string, style: ParentingStyle): void {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return
    child.parentingStyle = style
    if (style === 'free') child.happiness = Math.min(100, (child.happiness ?? 60) + 15)
    this.emit({ type: 'dynasty_update', kind: 'child_parenting', name: child.name })
  }

  spendTimeWithChild(childId: string): boolean {
    const status = this.getDailyRoutineActions()
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return false
    child.happiness = Math.min(100, (child.happiness ?? 60) + 10)
    this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 5)
    void status
    this.emit({ type: 'dynasty_update', kind: 'child_time', name: child.name })
    return true
  }

  setChildCareer(childId: string, career: ChildCareer): void {
    const child = this.dynasty.children.find((c) => c.id === childId)
    if (!child) return
    child.career = career
    this.addGazette(fmt('gz_child_career', { child: child.name, career: childCareerDef(career)?.name ?? '' }), 'player')
    this.emit({ type: 'dynasty_update', kind: 'child_career', name: child.name })
  }

  annualFocusBonus: string | null = null
  annualFocusBonusUntilDay = 0

  applyAnnualFocus(focus: 'work' | 'family' | 'health' | 'social'): void {
    const day = gameDay(this.gameTimeMs)
    this.annualFocusBonus = focus
    this.annualFocusBonusUntilDay = day + 30
    if (focus === 'family') {
      this.lifestyle.stress = Math.max(0, this.lifestyle.stress - 15)
      this.health.health = Math.min(100, this.health.health + 5)
      this.addGazette(requiredDomainText('gz_focus_family'), 'player')
    } else if (focus === 'health') {
      this.health.health = Math.min(100, this.health.health + 20)
      this.health.exerciseDaysActive = 30
      this.addGazette(requiredDomainText('gz_focus_health'), 'player')
    } else if (focus === 'social') {
      this.reputation = Math.min(100, this.reputation + 15)
      this.addGazette(requiredDomainText('gz_focus_social'), 'player')
    } else if (focus === 'work') {
      this.addGazette(requiredDomainText('gz_focus_work'), 'player')
    }
    // Clear AFTER all effects applied — this method has no failure path, clear is always safe here
    this.pendingDecisions = this.pendingDecisions.filter(d => d.type !== 'annual_summary' && d.type !== 'age_milestone')
    this.emit({ type: 'money_changed' })
  }

  buyResidence(id: ResidenceId, count: number = 1): boolean {
    this.ensureDailyPlan()
    const res = RESIDENCES.find((r) => r.id === id)
    if (!res || count < 1) return false
    const totalCost = res.buyCost * count
    if (totalCost > 0 && !this.canAfford(totalCost)) return false
    if (totalCost > 0) {
      this.money -= totalCost
      this.emit({ type: 'money_changed' })
    }
    // Auto move-in only if currently renting
    if (this.lifestyle.residence === 'kira') this.lifestyle.residence = id
    if (res.buyCost > 0) {
      for (let i = 0; i < count; i++) {
        this.lifestyle.ownedResidences.push({
          id,
          purchasedDay: gameDay(this.gameTimeMs),
          isRenting: false,
          rentalMonthlyIncome: defaultRentalIncome(id),
        })
      }
      this.recordDailyEvent('life_item_bought')
    }
    return true
  }

  sellResidence(id: ResidenceId, count: number = 1): boolean {
    const ownedAll = this.lifestyle.ownedResidences.filter((e) => e.id === id)
    if (ownedAll.length === 0) return false
    const isHome = this.lifestyle.residence === id
    // Keep at least 1 if it's home; sell rest
    const sellable = isHome ? ownedAll.length - 1 : ownedAll.length
    const sellCount = Math.min(count, sellable)
    if (sellCount <= 0) return false
    let removed = 0
    let gained = 0
    for (let i = this.lifestyle.ownedResidences.length - 1; i >= 0 && removed < sellCount; i--) {
      if (this.lifestyle.ownedResidences[i].id === id) {
        gained += residenceSellValue(id)
        this.lifestyle.ownedResidences.splice(i, 1)
        removed++
      }
    }
    if (gained > 0) { this.money += gained; this.emit({ type: 'money_changed' }) }
    if (!this.lifestyle.ownedResidences.some((e) => e.id === this.lifestyle.residence)) {
      this.lifestyle.residence = 'kira'
    }
    return removed > 0
  }

  setRentResidence(id: ResidenceId, renting: boolean, count: number = 999): boolean {
    let affected = 0
    for (const entry of this.lifestyle.ownedResidences) {
      if (entry.id !== id) continue
      if (renting && this.lifestyle.residence === id && !entry.isRenting) {
        // Skip the one you live in
        continue
      }
      if (entry.isRenting !== renting && affected < count) {
        entry.isRenting = renting
        affected++
      }
    }
    return affected > 0
  }

  buyVehicle(id: VehicleId, count: number = 1): boolean {
    this.ensureDailyPlan()
    const veh = VEHICLES.find((v) => v.id === id)
    if (!veh || count < 1) return false
    const totalCost = veh.buyCost * count
    if (totalCost > 0 && !this.canAfford(totalCost)) return false
    if (totalCost > 0) {
      this.money -= totalCost
      this.emit({ type: 'money_changed' })
    }
    // Auto switch only if currently walking
    if (this.lifestyle.vehicle === 'yuruyus') this.lifestyle.vehicle = id
    if (veh.buyCost > 0) {
      for (let i = 0; i < count; i++) {
        this.lifestyle.ownedVehicles.push({
          id,
          purchasedDay: gameDay(this.gameTimeMs),
          isRenting: false,
          rentalMonthlyIncome: defaultVehicleRentalIncome(id),
        })
      }
      this.recordDailyEvent('life_item_bought')
    }
    return true
  }

  sellVehicle(id: VehicleId, count: number = 1): boolean {
    const ownedAll = this.lifestyle.ownedVehicles.filter((e) => e.id === id)
    if (ownedAll.length === 0) return false
    const isCurrent = this.lifestyle.vehicle === id
    const sellable = isCurrent ? ownedAll.length - 1 : ownedAll.length
    const sellCount = Math.min(count, sellable)
    if (sellCount <= 0) return false
    let removed = 0
    let gained = 0
    for (let i = this.lifestyle.ownedVehicles.length - 1; i >= 0 && removed < sellCount; i--) {
      if (this.lifestyle.ownedVehicles[i].id === id) {
        gained += vehicleSellValue(id)
        this.lifestyle.ownedVehicles.splice(i, 1)
        removed++
      }
    }
    if (gained > 0) { this.money += gained; this.emit({ type: 'money_changed' }) }
    if (!this.lifestyle.ownedVehicles.some((e) => e.id === this.lifestyle.vehicle)) {
      this.lifestyle.vehicle = 'yuruyus'
    }
    return removed > 0
  }

  setRentVehicle(id: VehicleId, renting: boolean, count: number = 999): boolean {
    let affected = 0
    for (const entry of this.lifestyle.ownedVehicles) {
      if (entry.id !== id) continue
      if (renting && this.lifestyle.vehicle === id && !entry.isRenting) continue
      if (entry.isRenting !== renting && affected < count) {
        entry.isRenting = renting
        affected++
      }
    }
    return affected > 0
  }

  buyPet(id: PetId): boolean {
    this.ensureDailyPlan()
    const pet = PETS.find((p) => p.id === id)
    if (!pet) return false
    if (!this.canAfford(pet.buyCost)) return false
    this.money -= pet.buyCost
    this.emit({ type: 'money_changed' })
    if (!this.lifestyle.pets.includes(id)) this.lifestyle.pets.push(id)
    const entry: OwnedPetEntry = {
      id,
      name: randomPetName(id),
      adoptedDay: gameDay(this.gameTimeMs),
      lifespanDays: petLifespanDays(id),
    }
    if (!this.lifestyle.ownedPets) this.lifestyle.ownedPets = []
    this.lifestyle.ownedPets.push(entry)
    this.recordDailyEvent('life_item_bought')
    return true
  }

  buyWellbeing(id: WellbeingActivityId): boolean {
    this.ensureDailyPlan()
    const act = WELLBEING_ACTIVITIES.find((a) => a.id === id)
    if (!act) return false
    if (!this.canAfford(act.cost)) return false
    this.money -= act.cost
    this.emit({ type: 'money_changed' })
    this.lifestyle.stress = Math.max(0, this.lifestyle.stress - act.stressReduction)
    const currentDay = gameDay(this.gameTimeMs)
    if (id === 'terapi') {
      this.lifestyle.therapyActiveUntilDay = currentDay + act.durationDays
    } else {
      this.lifestyle.vacationActiveUntilDay = currentDay + act.durationDays
    }
    this.recordDailyEvent('wellbeing_completed')
    return true
  }

  private tickCalendarEvents(): void {
    const dayKey = localDayKey()
    if (this.lastCalendarEmitDay === dayKey) return
    for (const ev of activeCalendarEvents()) {
      this.addGazette(ev.headline, 'calendar')
      this.emit({ type: 'calendar_event', headline: ev.headline, emoji: ev.emoji })
    }
    this.lastCalendarEmitDay = dayKey
  }

  private tickInsurance(day: number): void {
    if (day === this.lastInsuranceChargeDay) return
    this.lastInsuranceChargeDay = day
    const totalBiz = Object.values(this.producers).reduce((a, b) => a + (b ?? 0), 0)
    const cost = insuranceDailyCost(this.insurance, totalBiz, this.ipoCount, this.incomePerDay())
    if (cost > 0 && this.money >= cost) {
      this.money -= cost
      this.emit({ type: 'money_changed' })
    }
  }

  private tickCommodities(): void {
    if (Date.now() - this.lastCommodityTick < 8000) return
    this.lastCommodityTick = Date.now()
    tickCommodityPrices(this.commodities)
  }

  private tickInvestmentOffers(day: number): void {
    if (this.investmentOffer && Date.now() > this.investmentOffer.expiresAt) {
      this.investmentOffer = null
    }
    if (day - this.lastInvestmentOfferDay < 5) return
    if (this.investmentOffer) return
    this.lastInvestmentOfferDay = day
    const offer = createInvestmentOffer(this.incomePerDay(), day)
    this.investmentOffer = offer
    this.emit({ type: 'investment_offer', offer })
  }

  private tickPendingInvestments(day: number): void {
    const resolved: PendingInvestment[] = []
    for (const inv of this.pendingInvestments) {
      if (day < inv.resolveGameDay) continue
      const roll = inv.minReturn + Math.random() * (inv.maxReturn - inv.minReturn)
      const payout = Math.floor(inv.cost * roll)
      this.addMoney(payout)
      this.addGazette(fmt('gz_startup_payout', { name: this.playerName.trim() || 'Baron', amount: formatMoney(payout) }), 'market')
      resolved.push(inv)
    }
    if (resolved.length > 0) {
      this.pendingInvestments = this.pendingInvestments.filter((i) => !resolved.includes(i))
    }
  }

  private maybeSpawnCrisis(day: number): void {
    if (this.activeCrisis && !this.activeCrisis.resolved) return
    if (day - this.lastCrisisGameDay < 60) return
    if (Math.random() > 0.04) return
    const id = pickRandomCrisis()
    const def = crisisDef(id)
    this.activeCrisis = {
      crisisId: id,
      startedAt: Date.now(),
      expiresAt: Date.now() + def.durationMs,
      resolved: false,
    }
    this.lastCrisisGameDay = day
    this.addGazette(headlineCrisis(this.playerName, def.title), 'crisis')
    this.emit({ type: 'crisis_started', crisisId: id, title: def.title })
  }

  private tickCrisisExpiry(): void {
    if (!this.activeCrisis || this.activeCrisis.resolved) return
    if (Date.now() <= this.activeCrisis.expiresAt) return
    this.resolveCrisis('timeout')
  }

  resolveCrisis(choiceId: string): boolean {
    if (!this.activeCrisis || this.activeCrisis.resolved) return false
    const id = this.activeCrisis.crisisId
    const def = crisisDef(id)
    let summary = ''
    this.activeCrisis.resolved = true

    if (id === 'economic') {
      if (choiceId === 'sell') {
        this.crisisIncomeMult = 0.8
        summary = 'Erken çıktın — gelir geçici -%20'
        window.setTimeout(() => { this.crisisIncomeMult = 1 }, 60_000)
      } else if (choiceId === 'hold') {
        this.crisisIncomeMult = 0.6
        this.crisisHoldBonusUntil = Date.now() + 90_000
        summary = 'Tut ve bekle — kriz sonrası +%40 bonus şansı'
        window.setTimeout(() => { this.crisisIncomeMult = 1 }, 90_000)
      } else if (choiceId === 'buy') {
        const loan = Math.min(this.maxAvailableLoan(), Math.floor(this.incomePerDay() * 5))
        if (loan > 0) this.bankTakeLoan(loan)
        this.crisisHoldBonusUntil = Date.now() + 120_000
        summary = 'Ucuza aldın — büyük fırsat penceresi açık'
      } else {
        this.crisisIncomeMult = 0.6
        summary = 'Kararsız kaldın — gelir baskı altında'
        window.setTimeout(() => { this.crisisIncomeMult = 1 }, 60_000)
      }
    } else if (id === 'scandal') {
      if (choiceId === 'lobby') {
        const cost = Math.max(8000, this.incomePerDay() * 0.25)
        if (this.canAfford(cost)) {
          this.money -= cost
          this.addReputation(reputationFromLobby())
          summary = 'Lobi yaptın — itibar korundu'
        } else summary = 'Lobi için para yetmedi — itibar düştü'
      } else if (choiceId === 'pay') {
        const fine = Math.max(5000, this.incomePerDay() * 0.15)
        if (this.canAfford(fine)) this.money -= fine
        this.addReputation(-5)
        summary = 'Para cezası ödendi'
      } else {
        this.addReputation(reputationFromScandal())
        summary = 'Reddettin — medya saldırıyor'
      }
    } else if (id === 'rival_attack') {
      const rival = this.rivals.find((r) => r.relation !== 'merged')
      if (choiceId === 'pricewar') {
        this.crisisIncomeMult = 0.75
        if (rival) rival.attitude = Math.max(-100, rival.attitude - 5)
        summary = 'Fiyat savaşı — gelir geçici -%25'
        window.setTimeout(() => { this.crisisIncomeMult = 1 }, 75_000)
      } else if (choiceId === 'retreat') {
        this.crisisIncomeMult = 0.85
        summary = 'Sektörden çekildin — 3 gün düşük gelir'
        window.setTimeout(() => { this.crisisIncomeMult = 1 }, 90_000)
      } else if (rival) {
        const cost = mergeRivalCost(rival) * 0.15
        if (this.canAfford(cost)) {
          this.money -= cost
          cooperateWithRival(rival)
          summary = `${rival.name} ile masaya oturdun`
        } else summary = 'Birleşme masası için para yetmedi'
      }
    }

    this.addGazette(`${this.playerName.trim() || 'Baron'}: ${def.title} — ${summary}`, 'crisis')
    this.emit({ type: 'crisis_resolved', crisisId: id, choiceId, summary })
    this.activeCrisis = null
    this.emit({ type: 'money_changed' })
    return true
  }

  toggleInsurance(kind: keyof InsuranceState): void {
    this.insurance[kind] = !this.insurance[kind]
  }

  buyCommodity(id: CommodityId, units: number): boolean {
    const price = this.commodities.prices[id] ?? 0
    const cost = Math.floor(price * units)
    if (cost <= 0 || !this.canAfford(cost)) return false
    this.money -= cost
    const prev = this.commodities.holdings[id] ?? 0
    const prevAvg = this.commodities.avgBuy[id] ?? 0
    this.commodities.holdings[id] = prev + units
    this.commodities.avgBuy[id] = prev > 0 ? (prevAvg * prev + price * units) / (prev + units) : price
    this.emit({ type: 'money_changed' })
    return true
  }

  sellCommodity(id: CommodityId, units: number): boolean {
    const held = this.commodities.holdings[id] ?? 0
    if (units <= 0 || units > held) return false
    const price = this.commodities.prices[id] ?? 0
    this.commodities.holdings[id] = held - units
    this.addMoney(Math.floor(price * units))
    return true
  }

  acceptInvestmentOffer(): boolean {
    if (!this.investmentOffer) return false
    const offer = this.investmentOffer
    if (!this.canAfford(offer.cost)) return false
    this.money -= offer.cost
    this.pendingInvestments.push({
      offerId: offer.id,
      cost: offer.cost,
      resolveGameDay: offer.resolveGameDay,
      minReturn: offer.minReturn,
      maxReturn: offer.maxReturn,
    })
    this.investmentOffer = null
    this.emit({ type: 'money_changed' })
    return true
  }

  dismissInvestmentOffer(): void {
    this.investmentOffer = null
  }

  canOpenFranchise(producerId: string): boolean {
    return (this.producers[producerId] ?? 0) >= FRANCHISE_UNLOCK_COUNT
  }

  openFranchise(producerId: string, city: FranchiseCity): boolean {
    if (!this.canOpenFranchise(producerId)) return false
    const cityDef = FRANCHISE_CITIES.find((c) => c.id === city)
    if (!cityDef || this.reputation < cityDef.repReq) {
      this.emit({ type: 'loan_denied', reason: `${cityDef?.label ?? city} franchise için itibar yetersiz (min ${cityDef?.repReq ?? FRANCHISE_REPUTATION_MIN})` })
      return false
    }
    if (!this.canAfford(FRANCHISE_COST)) return false
    if (this.franchises.some((f) => f.producerId === producerId && f.city === city)) return false
    this.money -= FRANCHISE_COST
    this.franchises.push({
      producerId,
      city,
      openedGameDay: gameDay(this.gameTimeMs),
      incomeMult: 0.08,
    })
    const p = PRODUCERS.find((x) => x.id === producerId)
    this.addGazette(fmt('gz_franchise_opened', { name: this.playerName.trim() || 'Baron', city: cityDef.label, firm: p ? producerName(p) : '—' }), 'player')
    this.emit({ type: 'money_changed' })
    return true
  }

  hireNamedManager(id: NamedManagerId): boolean {
    if (this.namedManagers.some((m) => m.id === id)) return false
    const def = namedManagerDef(id)
    if (!def || !this.canAfford(def.hireCost)) return false
    this.money -= def.hireCost
    this.namedManagers.push({ id, hiredGameDay: gameDay(this.gameTimeMs) })
    this.pendingUndo = {
      id: `nm_${id}_${Date.now()}`,
      kind: 'named_manager',
      label: `${def.name} işe alımını geri al`,
      cost: Math.max(1000, Math.floor(def.hireCost * 0.2)),
      expiresAt: Date.now() + 60_000,
      namedManagerId: id,
    }
    this.emit({ type: 'undo_available', label: this.pendingUndo.label, cost: this.pendingUndo.cost, undoId: this.pendingUndo.id })
    this.addGazette(fmt('gz_mentor_joined', { mentor: def.name, player: this.playerName.trim() || 'Baron' }), 'player')
    this.emit({ type: 'money_changed' })
    return true
  }

  acceptRivalAllianceOffer(): boolean {
    if (!this.pendingRivalOffer) return false
    const rival = rivalById(this.rivals, this.pendingRivalOffer.rivalId)
    if (!rival) return false
    acceptRivalAlliance(rival)
    this.addGazette(fmt('gz_rival_deal', { rival: rival.name }), 'rival')
    this.pendingRivalOffer = null
    return true
  }

  declineRivalAlliance(): void {
    this.pendingRivalOffer = null
  }

  toggleUndergroundMarket(action: UndergroundMarketAction): boolean {
    if (!hasMechanic(this.victoryMechanics, 'shadow_network') && action === 'intel_leak') return false
    const idx = this.undergroundMarketActive.indexOf(action)
    if (idx >= 0) {
      this.undergroundMarketActive.splice(idx, 1)
      return true
    }
    const def = undergroundActionDef(action)
    if (!this.canAfford(def.dailyCost)) return false
    this.undergroundMarketActive.push(action)
    this.illegalHeat = Math.min(100, this.illegalHeat + def.heatGain)
    this.emit({ type: 'illegal_heat', heat: this.illegalHeat })
    return true
  }

  payAdvisorTip(): AdvisorTip | null {
    if (!this.advisorTip || !this.canAfford(ADVISOR_FEE)) return null
    this.money -= ADVISOR_FEE
    this.emit({ type: 'money_changed' })
    return this.advisorTip
  }

  hasVictoryMechanic(m: VictoryMechanic): boolean {
    return hasMechanic(this.victoryMechanics, m)
  }

  dynastyAcademyActive(): boolean {
    return hasMechanic(this.victoryMechanics, 'dynasty_academy')
  }

  progressPath(): ProgressPathSnapshot {
    return progressPathSnapshot(this.totalEarned, this.ipoCount)
  }

  baronDynastySummary(): ReturnType<typeof dynastyHistorySummary> {
    return dynastyHistorySummary(this.baronHistory)
  }

  activeCityId(): CityId {
    return this.cities.activeCity
  }

  private finalizeBaronOnDeath(causeLabel: string, causeEmoji: string, causeId: DeathCauseId): BaronRecord {
    const birthYear = gameCalendarDate((this.currentBaronStartedGameDay - 1) * MS_PER_GAME_DAY).getUTCFullYear()
    const deathYear = gameYear(this.gameTimeMs)
    const club = this.empire.football.find((c) => (this.producers[c.clubId] ?? 0) > 0)
    const stage = currentWorldStage(this.baronLifePeakNetWorth)
    const snapshot: BaronLifeSnapshot = {
      playerName: this.playerName,
      birthYear,
      deathYear,
      age: this.playerAge(),
      startedGameDay: this.currentBaronStartedGameDay,
      deathGameDay: gameDay(this.gameTimeMs),
      causeId,
      causeLabel,
      causeEmoji,
      peakNetWorth: this.baronLifePeakNetWorth,
      totalEarnedLife: Math.max(0, this.totalEarned - this.baronLifeEarnedStart),
      generation: this.dynasty.generation,
      politicsLevel: this.empire.politics.level,
      hasFootballClub: !!club,
      footballLeague: club ? leagueName(club.leagueLevel) : '',
      childCrisisCount: this.baronLifeChildCrises,
      raidsWithoutInsurance: this.baronLifeRaidsUninsured,
      hadInsurance: this.insurance.business || this.insurance.illegal || this.insurance.dynasty,
      factoriesLostToRaid: this.baronLifeFactoryRaidDamage,
      nearPresidency: this.empire.politics.level === 'bakan' && this.presidentSeasons >= 2,
      victoriesCount: this.victoriesUnlocked.length,
      reachedForbes: stage.id === 'forbes' || stage.id === 'endgame',
      baronNumber: this.baronCounter,
    }
    const record = buildBaronRecord(snapshot)
    this.baronHistory = [record, ...this.baronHistory].slice(0, 50)
    this.baronCounter++
    return record
  }

  private resetBaronLifeTracking(): void {
    this.currentBaronStartedGameDay = gameDay(this.gameTimeMs)
    this.baronLifePeakNetWorth = this.financeNetWorth()
    this.baronLifeEarnedStart = this.totalEarned
    this.baronLifeRaidsUninsured = 0
    this.baronLifeChildCrises = 0
    this.baronLifeFactoryRaidDamage = 0
    this.dynasty.pendingDeath = null
  }

  sellProducer(id: string, count = 1): boolean {
    const owned = this.producers[id] ?? 0
    if (count <= 0 || count > owned) return false
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def) return false
    const refund = Math.floor(this.producerCostFor(def, owned - count, count) * 0.55)
    this.producers[id] = owned - count
    if (hasManager(this.managers, id) && (this.producers[id] ?? 0) <= 0) {
      this.managers[id] = false
    }
    syncEmpireFromProducers(this.empire, this.producers)
    this.addMoney(refund)
    this.pendingUndo = {
      id: `sell_${id}_${Date.now()}`,
      kind: 'sell_producer',
      label: `${def.name} satışını geri al`,
      cost: Math.max(200, Math.floor(refund * 0.12)),
      expiresAt: Date.now() + 10_000,
      producerId: id,
      soldCount: count,
      soldCost: refund,
    }
    this.emit({ type: 'undo_available', label: this.pendingUndo.label, cost: this.pendingUndo.cost, undoId: this.pendingUndo.id })
    this.emit({ type: 'purchase' })
    return true
  }

  executeUndo(): boolean {
    const u = this.pendingUndo
    if (!u || Date.now() > u.expiresAt) return false
    if (!this.canAfford(u.cost)) return false
    this.money -= u.cost
    if (u.kind === 'manager_hire' && u.producerId) {
      this.managers[u.producerId] = false
    } else if (u.kind === 'named_manager' && u.namedManagerId) {
      this.namedManagers = this.namedManagers.filter((m) => m.id !== u.namedManagerId)
    } else if (u.kind === 'sell_producer' && u.producerId && u.soldCount) {
      this.producers[u.producerId] = (this.producers[u.producerId] ?? 0) + u.soldCount
      if (u.soldCost) this.money = Math.max(0, this.money - u.soldCost)
      syncEmpireFromProducers(this.empire, this.producers)
    }
    this.pendingUndo = null
    this.emit({ type: 'money_changed' })
    return true
  }

  dismissUndo(): void {
    this.pendingUndo = null
  }

  private tickUndoExpiry(): void {
    if (this.pendingUndo && Date.now() > this.pendingUndo.expiresAt) {
      this.pendingUndo = null
    }
  }

  unlockCity(id: CityId): boolean {
    this.ensureDailyPlan()
    const check = canUnlockCity(id, this.cities, this.money, this.reputation, this.ipoCount)
    if (!check.ok) return false
    const def = cityDef(id)
    this.money -= def.unlockCost
    this.cities.unlocked.push(id)
    this.cities.cityReputation[id] = Math.max(def.repReq, 40)
    this.addGazette(`${this.playerName.trim() || 'Baron'} ${def.label}'yi fethetti`, 'player')
    this.emit({ type: 'money_changed' })
    this.recordDailyEvent('city_unlocked')
    return true
  }

  setActiveCity(id: CityId): boolean {
    if (!this.cities.unlocked.includes(id)) return false
    this.cities.activeCity = id
    return true
  }

  hireTorpil(id: TorpilId): boolean {
    const contact = this.torpil.find((t) => t.id === id)
    const def = torpilDef(id)
    if (!contact || contact.active || !this.canAfford(def.hireCost)) return false
    this.money -= def.hireCost
    contact.active = true
    contact.lastGiftGameDay = gameDay(this.gameTimeMs)
    this.addGazette(fmt('gz_torpil_joined', { name: def.name }), 'player')
    this.emit({ type: 'money_changed' })
    return true
  }

  payTorpilGift(id: TorpilId): boolean {
    const contact = this.torpil.find((t) => t.id === id)
    const def = torpilDef(id)
    if (!contact?.active || !contact.giftDue || !this.canAfford(def.giftCost)) return false
    this.money -= def.giftCost
    contact.giftDue = false
    contact.lastGiftGameDay = gameDay(this.gameTimeMs)
    this.emit({ type: 'money_changed' })
    return true
  }

  private tickTorpilGifts(day: number): void {
    for (const t of this.torpil) {
      if (!t.active) continue
      const def = torpilDef(t.id)
      if (day - t.lastGiftGameDay >= def.giftIntervalDays) {
        t.giftDue = true
      }
    }
  }

  modernizeProducer(id: string): boolean {
    const def = PRODUCERS.find((p) => p.id === id)
    if (!def || (this.producers[id] ?? 0) <= 0) return false
    if (this.producerModernized[id]) return false
    const cost = modernizeCost(def.tier, this.producers[id] ?? 0)
    if (!this.canAfford(cost)) return false
    this.money -= cost
    this.producerModernized[id] = true
    this.emit({ type: 'money_changed' })
    return true
  }

  obsolescenceLabel(producerId: string): string | null {
    const def = PRODUCERS.find((p) => p.id === producerId)
    if (!def || this.ipoCount <= 0 || this.producerModernized[producerId]) return null
    const mult = obsolescenceMult(def.tier, this.ipoCount)
    if (mult >= 0.98) return null
    return `Teknoloji eskidi — gelir ${Math.round(mult * 100)}%`
  }

  private maybeNaturalDisaster(day: number): void {
    if (day - this.lastDisasterGameDay < 90) return
    if (Math.random() > 0.02) return
    const disaster = pickDisaster(this.cities.activeCity)
    if (!disaster) return
    this.lastDisasterGameDay = day
    const insured = this.insurance.business
    const damage = disasterDamage(disaster.baseDamage, this.incomePerDay(), insured)
    if (damage > 0) {
      this.money = Math.max(0, this.money - damage)
      this.emit({ type: 'money_changed' })
    }
    const cityLabel = cityDef(this.cities.activeCity).label
    this.addGazette(
      `${disaster.emoji} ${disaster.title} — ${cityLabel}'i etkiledi${insured ? ' (sigorta devrede)' : ` — ${formatMoney(damage)} zarar`}`,
      'crisis',
    )
    this.emit({
      type: 'disaster_hit',
      title: disaster.title,
      emoji: disaster.emoji,
      city: cityLabel,
      damage,
      insured,
    })
  }

  isCrisisActive(): boolean {
    return this.activeCrisis !== null && !this.activeCrisis.resolved
  }

  private checkAchievements(): void {
    if (this._checkingAchievements) return
    this._checkingAchievements = true
    try {
      const ctx = {
        totalEarned: this.totalEarned,
        totalClicks: this.totalClicks,
        comboBest: this.comboBest,
        prestigePoints: this.prestigePoints,
        producers: this.producers,
        achievements: this.achievements,
        lifetimePrestige: this.lifetimePrestige,
        lifetimeTotalEarned: this.lifetimeTotalEarned,
        ipoCount: this.ipoCount,
        managers: this.managers,
        stockShares: totalShares(this.stock),
        weeklyClaimed: this.weekly.claimed,
        seasonTier: currentTier(this.season.xp),
        prestigeTreeCount: ownedNodeCount(this.prestigeTree),
        stockTickerCount: ownedTickerCount(this.stock),
        nightEarnings: this.nightEarningsSession,
        managerAutoBuyCount: this.managerAutoBuyCount(),
        dailyStreak: this.dailyStreak,
        comebackClaimed: this.comebackClaimed,
        heatSurvived: this.heatSurvived,
        unlockedThemes: [...this.unlockedThemes],
        undergroundLawyerUsed: this.undergroundLawyerUsed,
        dynastyMarried: !!this.dynasty.spouseName,
        advisorBuys: this.advisorBuys,
      }
      const newOnes = checkNewAchievements(ctx)
      for (const a of newOnes) {
        this.achievements.add(a.id)
        this.money += a.reward
        this.emit({ type: 'achievement', def: a })
      }
    } finally {
      this._checkingAchievements = false
    }
  }

  // ── Kariyer metodları ──────────────────────────────────────────────────────

  setCareerJob(jobId: CareerJobId | null): void {
    this.ensureDailyPlan()
    const prevJobId = this.career.jobId
    this.career.jobId = jobId
    if (prevJobId == null && jobId != null && !this.career.isEntrepreneur) {
      this.recordDailyEvent('job_chosen')
    }
  }

  setCharacterBackground(backgroundId: CharacterBackgroundId | null): void {
    this.career.backgroundId = backgroundId
  }

  doCareerAction(actionId: CareerActionId): { money: number; xp: number; stressDelta: number; levelUp: boolean } {
    this.ensureDailyPlan()
    if (actionId === 'isten_ayril') {
      // Only a player who is actually employed can quit. Otherwise no-op:
      // no event, no daily progress, no state change.
      if (this.career.jobId === null || this.career.isEntrepreneur) {
        return { money: 0, xp: 0, stressDelta: 0, levelUp: false }
      }
      this.recordDailyEvent('career_action_completed')
      this.career.isEntrepreneur = true
      this.emit({ type: 'career_phase_changed', isEntrepreneur: true })
      return { money: 0, xp: 0, stressDelta: 0, levelUp: false }
    }
    const currentDay = gameDay(this.gameTimeMs)
    const result = applyCareerAction(this.career, actionId, currentDay)
    if (result.money > 0) this.addMoney(result.money, false)
    if (!this.career.firstGoalComplete && this.totalEarned >= FIRST_GOAL_TARGET) {
      this.career.firstGoalComplete = true
    }
    this.emit({ type: 'career_action', actionId, money: result.money, levelUp: result.levelUp })
    if (result.money > 0) this.emit({ type: 'money_changed' })
    if (result.money > 0 || result.xp > 0) {
      this.career.actionsTotal = (this.career.actionsTotal ?? 0) + 1
      this.recordDailyEvent('career_action_completed')
    }
    return result
  }

  // ── Firma seviyesi metodları ───────────────────────────────────────────────

  producerLevel(id: string): number {
    return this.producerLevels[id] ?? 1
  }

  firmLevelUpCostFor(def: ProducerDef): number {
    const owned = this.producers[def.id] ?? 0
    return firmLevelUpCost(def, this.producerLevel(def.id), owned)
  }

  levelUpFirm(producerId: string): boolean {
    this.ensureDailyPlan()
    const def = PRODUCERS.find((p) => p.id === producerId)
    if (!def) return false
    const owned = this.producers[producerId] ?? 0
    if (owned <= 0) return false
    const level = this.producerLevel(producerId)
    if (level >= FIRM_MAX_LEVEL) return false
    const cost = this.firmLevelUpCostFor(def)
    if (this.money < cost) return false
    this.money -= cost
    this.producerLevels[producerId] = level + 1
    this.addGazette(fmt('gz_firm_upgraded', { firm: producerName(def), level: String(level + 1) }), 'player')
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.recordDailyEvent('firm_level_upgraded')
    return true
  }

  /**
   * Geliştir butonu için tek doğruluk kaynağı: sahiplik/max/maliyet durumu,
   * gerçek başarısızlık nedeni ve seviye atlama ön izlemesi (mevcut→sonraki gelir).
   * Sonraki seviye geliri, gerçek `producerIncome` pipeline'ı geçici seviye
   * override'ı ile hesaplanır (UI kendi formülünü yazmaz).
   */
  firmLevelUpStatus(def: ProducerDef): {
    owned: boolean; atMax: boolean; canLevelUp: boolean;
    reason: 'not_owned' | 'max' | 'insufficient' | null;
    level: number; nextLevel: number; cost: number;
    currentIncome: number; nextIncome: number; incomePct: number;
  } {
    const owned = (this.producers[def.id] ?? 0) > 0
    const level = this.producerLevel(def.id)
    const atMax = level >= FIRM_MAX_LEVEL
    const cost = owned && !atMax ? this.firmLevelUpCostFor(def) : 0
    const currentIncome = this.producerIncome(def)
    let nextIncome = currentIncome
    if (owned && !atMax) {
      const had = Object.prototype.hasOwnProperty.call(this.producerLevels, def.id)
      const prev = this.producerLevels[def.id]
      this.producerLevels[def.id] = level + 1
      try { nextIncome = this.producerIncome(def) }
      finally { if (had) this.producerLevels[def.id] = prev!; else delete this.producerLevels[def.id] }
    }
    const incomePct = currentIncome > 0 ? Math.round((nextIncome / currentIncome - 1) * 100) : 0
    let reason: 'not_owned' | 'max' | 'insufficient' | null = null
    let canLevelUp = false
    if (!owned) reason = 'not_owned'
    else if (atMax) reason = 'max'
    else if (this.money < cost) reason = 'insufficient'
    else canLevelUp = true
    return { owned, atMax, canLevelUp, reason, level, nextLevel: level + 1, cost, currentIncome, nextIncome, incomePct }
  }

  // ── Firma geliştirme metodları ─────────────────────────────────────────────

  firmUpgradesPurchased(producerId: string): string[] {
    return this.producerUpgrades[producerId] ?? []
  }

  firmUpgradeCostFor(def: ProducerDef, upgradeId: string): number {
    const up = firmUpgradeDef(def, upgradeId)
    if (!up) return Infinity
    const owned = this.producers[def.id] ?? 0
    return firmUpgradeCost(def, up, owned)
  }

  buyFirmUpgrade(producerId: string, upgradeId: string): boolean {
    const def = PRODUCERS.find((p) => p.id === producerId)
    if (!def) return false
    const owned = this.producers[producerId] ?? 0
    if (owned <= 0) return false
    const purchased = this.firmUpgradesPurchased(producerId)
    if (purchased.includes(upgradeId)) return false
    const up = firmUpgradeDef(def, upgradeId)
    if (!up) return false
    const cost = firmUpgradeCost(def, up, owned)
    if (!isFinite(cost) || this.money < cost) return false
    this.money -= cost
    this.producerUpgrades[producerId] = [...purchased, upgradeId]
    this.addGazette(fmt('gz_firm_improvement', { emoji: up.emoji, firm: producerName(def), upgrade: up.name }), 'player')
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    return true
  }

  // ── Departman metodları ────────────────────────────────────────────────────

  departmentUpgradeCostFor(id: DepartmentId): number {
    return departmentUpgradeCost(id, this.departments[id] ?? 0)
  }

  upgradeDepartment(id: DepartmentId): boolean {
    this.ensureDailyPlan()
    const cost = this.departmentUpgradeCostFor(id)
    if (!isFinite(cost) || this.money < cost) return false
    this.money -= cost
    this.departments[id] = (this.departments[id] ?? 0) + 1
    this.emit({ type: 'purchase' })
    this.emit({ type: 'money_changed' })
    this.recordDailyEvent('department_upgraded')
    return true
  }

  // ── Günlük Plan (DailyPlan) ──────────────────────────────────────────────

  private buildDailyEligibilitySnapshot(): EligibilitySnapshot {
    const canAffordAnyFirm = PRODUCERS.some(p => {
      if (!isProducerUnlocked(p, this.totalEarned, this.forcedUnlocks, this.ipoCount)) return false
      const owned = this.producers[p.id] ?? 0
      return this.money >= this.producerCostFor(p, owned, 1) * DAILY_TASK_SPEND_BUFFER
    })
    const upgradeableFirms = PRODUCERS.filter(p => {
      const owned = this.producers[p.id] ?? 0
      return owned > 0 && (this.producerLevels[p.id] ?? 1) < FIRM_MAX_LEVEL
    })
    const hasUpgradeableFirm = upgradeableFirms.length > 0
    const canAffordAnyUpgrade = upgradeableFirms.some(
      p => this.money >= this.firmLevelUpCostFor(p) * DAILY_TASK_SPEND_BUFFER
    )
    // Pass money/BUFFER so canUnlockCity's money check becomes: money >= cost*BUFFER.
    // Rep and IPO checks inside canUnlockCity remain exact (no buffer applied).
    const canUnlockAnyCity = EXPANSION_CITIES.some(
      c => canUnlockCity(c.id, this.cities, this.money / DAILY_TASK_SPEND_BUFFER, this.reputation, this.ipoCount).ok
    )
    const hasDeptToUpgrade = DEPARTMENTS.some(d => {
      const level = this.departments[d.id] ?? 0
      if (level >= DEPARTMENT_MAX_LEVEL) return false
      return this.money >= departmentUpgradeCost(d.id, level) * DAILY_TASK_SPEND_BUFFER
    })
    const minWellbeingCost = Math.min(...WELLBEING_ACTIVITIES.map(a => a.cost))
    // HOME_ROOMS omitted: buyHomeRoom does not emit life_item_bought.
    const minLifeItemCost = Math.min(
      ...RESIDENCES.filter(r => r.buyCost > 0).map(r => r.buyCost),
      ...VEHICLES.filter(v => v.buyCost > 0).map(v => v.buyCost),
      ...PETS.map(p => p.buyCost),
    )
    const canDoMarketAction =
      Object.values(this.stock.tickers).some(t => this.money >= t.price) ||
      Object.values(this.stock.tickers).some(t => t.shares > 0)
    const canHireManager = PRODUCERS.some(p => {
      const owned = this.producers[p.id] ?? 0
      if (owned <= 0) return false
      if (hasManager(this.managers, p.id)) return false
      const cost = managerCost(p.baseIncome, owned)
      return this.money >= cost * DAILY_TASK_SPEND_BUFFER
    })
    return {
      hasJob: this.career.jobId != null && !this.career.isEntrepreneur,
      isEntrepreneur: this.career.isEntrepreneur,
      firmCount: Object.values(this.producers).filter(c => c > 0).length,
      canAffordAnyFirm,
      hasUpgradeableFirm,
      canAffordAnyUpgrade,
      canUnlockAnyCity,
      hasDeptToUpgrade,
      affordableWellbeing: this.money >= minWellbeingCost * DAILY_TASK_SPEND_BUFFER,
      affordableLifeItem:  this.money >= minLifeItemCost * DAILY_TASK_SPEND_BUFFER,
      canDoMarketAction,
      canHireManager,
      // Audit (2026-06): all five tabs open without any page-level gate.
      canVisitCareer: true,
      canVisitFirms:  true,
      canVisitMarket: true,
      canVisitEmpire: true,
      canVisitLife:   true,
    }
  }

  ensureDailyPlan(): boolean {
    const dayKey = localDayKey()
    if (this.dailyPlan?.version === 1 && this.dailyPlan.dayKey === dayKey) return false
    const snap = this.buildDailyEligibilitySnapshot()
    this.dailyPlan = createDailyPlanState(dayKey, selectDailyTasks(snap, dayKey))
    this.emit({ type: 'daily_plan_updated' })
    return true
  }

  recordDailyEvent(event: DailyEvent): void {
    this.ensureDailyPlan()
    const plan = this.dailyPlan!
    let changed = false
    for (const taskId of plan.taskIds) {
      const def = TASK_DEFS.find(d => d.id === taskId)
      if (!def || def.event !== event) continue
      if (plan.claimed.includes(taskId)) continue
      const prev = plan.progress[taskId] ?? 0
      if (prev < def.target) {
        plan.progress[taskId] = Math.min(def.target, prev + 1)
        changed = true
      }
    }
    if (changed) this.emit({ type: 'daily_plan_updated' })
  }

  claimDailyTask(taskId: DailyTaskId): boolean {
    this.ensureDailyPlan()
    const plan = this.dailyPlan!
    if (!plan.taskIds.includes(taskId)) return false
    if (plan.claimed.includes(taskId)) return false
    const def = TASK_DEFS.find(d => d.id === taskId)
    if (!def || (plan.progress[taskId] ?? 0) < def.target) return false
    plan.claimed.push(taskId)
    this.addMoney(def.reward, false)
    this.emit({ type: 'daily_plan_updated' })
    return true
  }

  claimDailyCompletionBonus(): boolean {
    this.ensureDailyPlan()
    const plan = this.dailyPlan!
    if (plan.completionBonusClaimed) return false
    if (plan.taskIds.length !== 4) return false
    if (!plan.taskIds.every(id => plan.claimed.includes(id))) return false
    plan.completionBonusClaimed = true
    this.addMoney(dailyCompletionBonusAmount(plan.taskIds), false)
    this.addReputation(DAILY_BONUS_REPUTATION)
    this.emit({ type: 'daily_plan_updated' })
    return true
  }

  toJSON(): SerializableState {
    return {
      money: this.money,
      totalEarned: this.totalEarned,
      totalClicks: this.totalClicks,
      producers: { ...this.producers },
      purchasedUpgrades: [...this.purchasedUpgrades],
      prestigePoints: this.prestigePoints,
      lifetimePrestige: this.lifetimePrestige,
      lastSaveTime: Date.now(),
      dailyLastClaim: this.dailyLastClaim,
      dailyStreak: this.dailyStreak,
      adIncomeBoostUntil: this.adIncomeBoostUntil,
      rewardedAdsToday: this.rewardedAdsToday,
      rewardedAdsDay: this.rewardedAdsDay,
      luckyChestReady: this.luckyChestReady,
      research: { ...this.research },
      achievements: [...this.achievements],
      missions: this.missions.map((m) => ({ ...m })),
      missionsDay: this.missionsDay,
      comboBest: this.comboBest,
      eventsSeen: this.eventsSeen,
      sessionEarned: this.sessionEarned,
      businessesBoughtSession: this.businessesBoughtSession,
      upgradesBoughtSession: this.upgradesBoughtSession,
      eventBoostUntil: this.eventBoostUntil,
      playTimeMs: this.playTimeMs,
      firstBusinessPlayTimeMs: this.firstBusinessPlayTimeMs,
      gameTimeMs: this.gameTimeMs,
      gamePaused: this.gamePaused,
      tutorialDone: this.tutorialDone,
      onboardingComplete: this.onboardingComplete,
      country: this.country,
      ipoCount: this.ipoCount,
      lifetimeTotalEarned: this.lifetimeTotalEarned,
      managers: { ...this.managers },
      stock: structuredClone(this.stock),
      bank: { ...this.bank },
      weekly: { ...this.weekly },
      milestonesReached: [...this.milestonesReached],
      managerDiscountActive: this.managerDiscountActive,
      dailyGoalEarned: this.dailyGoalEarned,
      dailyGoalDay: this.dailyGoalDay,
      dailyGoalClaimed: this.dailyGoalClaimed,
      dailyGoalTargetSnapshot: this.dailyGoalTargetSnapshot,
      dailyGoalRewardSnapshot: this.dailyGoalRewardSnapshot,
      season: {
        ...this.season,
        claimedTiers: [...this.season.claimedTiers],
        claimedPremiumTiers: [...this.season.claimedPremiumTiers],
      },
      prestigeTree: { ...this.prestigeTree },
      managerAutoBuy: { ...this.managerAutoBuy },
      nightEarningsSession: this.nightEarningsSession,
      hapticsEnabled: this.hapticsEnabled,
      reducedMotion: this.reducedMotion,
      removeAdsOwned: this.removeAdsOwned,
      vipPassActive: this.vipPassActive,
      lifestyle: { ...this.lifestyle, pets: [...this.lifestyle.pets], ownedPets: this.lifestyle.ownedPets ? this.lifestyle.ownedPets.map((p) => ({ ...p })) : [] },
      lifeEvents: this.lifeEvents.map((e) => ({ ...e })),
      pendingConsequences: this.pendingConsequences.map((c) => ({ ...c })),
      eventChoiceHistory: this.eventChoiceHistory.map((r) => ({ ...r })),
      characterAlignment: { ...this.characterAlignment },
      abilityCooldowns: { ...this.abilityCooldowns },
      activeRivalEvents: this.activeRivalEvents.map((e) => ({ ...e })),
      health: { ...this.health },
      lastAnnualSummaryYear: this.lastAnnualSummaryYear,
      personality: this.personality,
      playerSkills: { unlocked: [...this.playerSkills.unlocked], lifeEventsResolved: this.playerSkills.lifeEventsResolved },
      dailyRoutineDay: this.dailyRoutineDay,
      dailyRoutineUsed: [...this.dailyRoutineUsed],
      friendships: { friends: this.friendships.friends.map((f) => ({ ...f })), lastFriendshipTickDay: this.friendships.lastFriendshipTickDay },
      mentorEnemy: { ...this.mentorEnemy },
      legacyScore: this.legacyScore,
      education: this.education,
      hobby: { ...this.hobby },
      ageMilestonesShown: [...this.ageMilestonesShown],
      travel: { ...this.travel },
      diseases: this.diseases.map((d) => ({ ...d })),
      siblings: this.siblings.map((s) => ({ ...s })),
      fameState: { ...this.fameState },
      karma: this.karma,
      characterProfile: this.characterProfile ? { ...this.characterProfile } : null,
      characterIncomeDailyBonus: this.characterIncomeDailyBonus,
      characterBackground: this.characterBackground,
      career: { ...this.career, actionsUsedToday: [...this.career.actionsUsedToday] },
      producerLevels: { ...this.producerLevels },
      producerUpgrades: Object.fromEntries(
        Object.entries(this.producerUpgrades).map(([k, v]) => [k, [...v]])
      ),
      departments: { ...this.departments },
      departmentTasksClaimed: [...this.departmentTasksClaimed],
      netWorthHistory: [...this.netWorthHistory],
      difficulty: this.difficulty,
      difficultyChosen: this.difficultyChosen,
      playerName: this.playerName,
      birthYear: this.birthYear,
      playerGender: this.playerGender,
      forcedUnlocks: [...this.forcedUnlocks],
      illegalHeat: this.illegalHeat,
      unlockedThemes: [...this.unlockedThemes],
      activeTheme: this.activeTheme,
      codexUnlockDates: { ...this.codexUnlockDates },
      undergroundCooldowns: { ...this.undergroundCooldowns },
      heatShieldUntil: this.heatShieldUntil,
      heatProtectionUntil: this.heatProtectionUntil,
      launderingUntil: this.launderingUntil,
      lastActiveAt: Date.now(),
      comebackClaimedDay: this.comebackClaimedDay,
      comebackPending: this.comebackPending,
      notificationPrefs: { ...this.notificationPrefs },
      surpriseInvestorUntil: this.surpriseInvestorUntil,
      surpriseInvestorDay: this.surpriseInvestorDay,
      seenStoryBeats: [...this.seenStoryBeats],
      earnedBadges: [...this.earnedBadges],
      raidsToday: this.raidsToday,
      raidsDay: this.raidsDay,
      heatWasCritical: this.heatWasCritical,
      heatSurvived: this.heatSurvived,
      undergroundLawyerUsed: this.undergroundLawyerUsed,
      comebackClaimed: this.comebackClaimed,
      streakMilestonesClaimed: [...this.streakMilestonesClaimed],
      dynasty: {
        ...this.dynasty,
        children: this.dynasty.children.map((c) => ({ ...c })),
      },
      activeMarketNews: this.activeMarketNews ? { ...this.activeMarketNews } : null,
      shopBoostUntil: this.shopBoostUntil,
      upgradeDiscountActive: this.upgradeDiscountActive,
      undergroundTree: { ...this.undergroundTree },
      advisorBuys: this.advisorBuys,
      empire: {
        football: this.empire.football.map((c) => ({ ...c })),
        politics: { ...this.empire.politics },
        darkIndustry: { ...this.empire.darkIndustry },
      },
      gameStartYear: this.gameStartYear,
      pendingBoosts: this.pendingBoosts.map((b) => ({ ...b })),
      chestPityCounter: this.chestPityCounter,
      chestTickets: this.chestTickets,
      campaign: {
        ...this.campaign,
        completedChapters: [...this.campaign.completedChapters],
      },
      bankruptcyRecoveryPool: this.bankruptcyRecoveryPool,
      bankruptcyRecoveryClaimed: this.bankruptcyRecoveryClaimed,
      bankruptcySeizedSnapshot: this.bankruptcySeizedSnapshot.map((item) => ({ ...item })),
      lastBankruptcyAt: this.lastBankruptcyAt,
      bankruptcyCashGraceSince: this.bankruptcyCashGraceSince,
      reputation: this.reputation,
      rivals: this.rivals.map((r) => ({ ...r, sectorFocus: [...r.sectorFocus] })),
      chronicle: this.chronicle.map((e) => ({ ...e })),
      legacyMonuments: this.legacyMonuments.map((m) => ({ ...m })),
      victoriesUnlocked: [...this.victoriesUnlocked],
      totalRaidsCaught: this.totalRaidsCaught,
      presidentSeasons: this.presidentSeasons,
      presidentSinceSeasonKey: this.presidentSinceSeasonKey,
      lastWorldStageId: this.lastWorldStageId,
      childCrises: this.childCrises.map((c) => ({ ...c })),
      gazetteEntries: this.gazetteEntries.map((e) => ({ ...e })),
      activeCrisis: this.activeCrisis ? { ...this.activeCrisis } : null,
      crisisIncomeMult: this.crisisIncomeMult,
      crisisHoldBonusUntil: this.crisisHoldBonusUntil,
      victoryMechanics: [...this.victoryMechanics],
      bankruptcyCount: this.bankruptcyCount,
      insurance: { ...this.insurance },
      commodities: structuredClone(this.commodities),
      investmentOffer: this.investmentOffer ? { ...this.investmentOffer } : null,
      pendingInvestments: this.pendingInvestments.map((i) => ({ ...i })),
      franchises: this.franchises.map((f) => ({ ...f })),
      namedManagers: this.namedManagers.map((m) => ({ ...m })),
      pendingRivalOffer: this.pendingRivalOffer ? { ...this.pendingRivalOffer } : null,
      undergroundMarketActive: [...this.undergroundMarketActive],
      advisorTip: this.advisorTip ? { ...this.advisorTip } : null,
      advisorTipDay: this.advisorTipDay,
      calendarPurchaseDay: this.calendarPurchaseDay,
      lastCrisisGameDay: this.lastCrisisGameDay,
      lastInvestmentOfferDay: this.lastInvestmentOfferDay,
      playerTitleId: this.playerTitleId,
      baronHistory: this.baronHistory.map((b) => ({ ...b, achievements: [...b.achievements], weaknesses: [...b.weaknesses] })),
      baronCounter: this.baronCounter,
      currentBaronStartedGameDay: this.currentBaronStartedGameDay,
      baronLifePeakNetWorth: this.baronLifePeakNetWorth,
      baronLifeEarnedStart: this.baronLifeEarnedStart,
      baronLifeRaidsUninsured: this.baronLifeRaidsUninsured,
      baronLifeChildCrises: this.baronLifeChildCrises,
      cities: {
        unlocked: [...this.cities.unlocked],
        activeCity: this.cities.activeCity,
        cityReputation: { ...this.cities.cityReputation },
      },
      torpil: this.torpil.map((t) => ({ ...t })),
      producerModernized: { ...this.producerModernized },
      pendingUndo: this.pendingUndo ? { ...this.pendingUndo } : null,
      lastDisasterGameDay: this.lastDisasterGameDay,
      dynastyPassiveIncome: this.dynastyPassiveIncome,
      peakIncomePerDay: this.peakIncomePerDay,
      prestigeShopPurchased: [...this.prestigeShopPurchased],
      dailyPlan: this.dailyPlan ?? null,
      pendingDecisions: this.pendingDecisions.length > 0 ? [...this.pendingDecisions] : undefined,
    }
  }

  loadFrom(data: SerializableState): void {
    this.money = data.money
    this.totalEarned = data.totalEarned
    this.totalClicks = data.totalClicks
    this.producers = { ...data.producers }
    for (const p of PRODUCERS) {
      if (this.producers[p.id] === undefined) this.producers[p.id] = 0
    }
    this.purchasedUpgrades = new Set(data.purchasedUpgrades)
    this.prestigePoints = data.prestigePoints
    this.lifetimePrestige = data.lifetimePrestige
    this.dailyLastClaim = data.dailyLastClaim
    this.dailyStreak = data.dailyStreak
    this.adIncomeBoostUntil = data.adIncomeBoostUntil
    this.rewardedAdsToday = data.rewardedAdsToday
    this.rewardedAdsDay = data.rewardedAdsDay
    this.luckyChestReady = data.luckyChestReady
    this.research = { ...data.research }
    for (const r of RESEARCH_NODES) {
      if (this.research[r.id] === undefined) this.research[r.id] = 0
    }
    this.achievements = new Set(data.achievements ?? [])
    this.missions = data.missions ?? []
    this.missionsDay = data.missionsDay ?? ''
    this.comboBest = data.comboBest ?? 0
    this.eventsSeen = data.eventsSeen ?? 0
    this.sessionEarned = data.sessionEarned ?? 0
    this.businessesBoughtSession = data.businessesBoughtSession ?? 0
    this.upgradesBoughtSession = data.upgradesBoughtSession ?? 0
    this.eventBoostUntil = data.eventBoostUntil ?? 0
    this.playTimeMs = data.playTimeMs ?? 0
    this.firstBusinessPlayTimeMs = data.firstBusinessPlayTimeMs ?? null
    this.gameTimeMs = data.gameTimeMs ?? 0
    this.gamePaused = false // session-only: paused state never carries over to new sessions
    this.tutorialDone = data.tutorialDone ?? false
    this.onboardingComplete = data.onboardingComplete ?? data.tutorialDone ?? false
    this.country = data.country ?? 'tr'
    this.ipoCount = data.ipoCount ?? 0
    this.lifetimeTotalEarned = data.lifetimeTotalEarned ?? data.totalEarned ?? 0
    this.managers = { ...(data.managers ?? {}) }
    for (const p of PRODUCERS) {
      if (this.managers[p.id] === undefined) this.managers[p.id] = false
    }
    this.stock = data.stock && 'tickers' in data.stock
      ? migrateStockState(data.stock)
      : migrateLegacyStock((data.stock ?? {}) as { price?: number; shares?: number; avgBuyPrice?: number })
    this.bank = data.bank ? { ...createBankState(), ...data.bank } : createBankState()
    const loadedWeekly = data.weekly
    this.weekly = loadedWeekly
      ? {
          weekKey: String(loadedWeekly.weekKey ?? ''),
          eventId: loadedWeekly.eventId ?? createWeeklyState().eventId,
          progress: Math.max(0, Number(loadedWeekly.progress) || 0),
          target: Math.max(WEEKLY_EARN_MIN, Number(loadedWeekly.target) || WEEKLY_EARN_MIN),
          claimed: !!loadedWeekly.claimed,
          adDoubled: !!loadedWeekly.adDoubled,
          rewardCash: Number(loadedWeekly.rewardCash) > 0
            ? Number(loadedWeekly.rewardCash)
            : weeklyRewardCash(this.incomePerDay()),
        }
      : createWeeklyState()
    this.milestonesReached = data.milestonesReached ?? []
    this.managerDiscountActive = data.managerDiscountActive ?? false
    this.dailyGoalEarned = data.dailyGoalEarned ?? 0
    this.dailyGoalDay = data.dailyGoalDay ?? dailyGoalDayKey()
    this.dailyGoalClaimed = data.dailyGoalClaimed ?? false
    this.dailyGoalTargetSnapshot = data.dailyGoalTargetSnapshot ?? 0
    this.dailyGoalRewardSnapshot = data.dailyGoalRewardSnapshot ?? 0
    if (this.dailyGoalTargetSnapshot <= 0) this.refreshDailyGoalSnapshots()
    this.season = data.season
      ? {
          ...createSeasonState(),
          ...data.season,
          claimedTiers: [...(data.season.claimedTiers ?? [])],
          claimedPremiumTiers: [...(data.season.claimedPremiumTiers ?? [])],
          premiumUnlocked: !!data.season.premiumUnlocked,
        }
      : createSeasonState()
    this.prestigeTree = { ...(data.prestigeTree ?? {}) }
    this.managerAutoBuy = { ...(data.managerAutoBuy ?? {}) }
    for (const p of PRODUCERS) {
      if (this.managerAutoBuy[p.id] === undefined) this.managerAutoBuy[p.id] = false
    }
    this.nightEarningsSession = data.nightEarningsSession ?? 0
    this.hapticsEnabled = data.hapticsEnabled ?? true
    this.reducedMotion = data.reducedMotion ?? false
    this.removeAdsOwned = data.removeAdsOwned ?? false
    this.vipPassActive = data.vipPassActive ?? false
    if (data.lifestyle) {
      this.lifestyle = {
        ...createLifestyleState(),
        ...data.lifestyle,
        pets: [...(data.lifestyle.pets ?? [])],
        ownedResidences: [...(data.lifestyle.ownedResidences ?? [])],
        ownedVehicles: [...(data.lifestyle.ownedVehicles ?? [])],
        ownedPets: [...((data.lifestyle as { ownedPets?: OwnedPetEntry[] }).ownedPets ?? [])],
      }
      // Migrate: if old save has residence != 'kira' and no ownedResidences, backfill
      if (this.lifestyle.ownedResidences.length === 0 && this.lifestyle.residence !== 'kira') {
        this.lifestyle.ownedResidences = [{
          id: this.lifestyle.residence,
          purchasedDay: 0,
          isRenting: false,
          rentalMonthlyIncome: defaultRentalIncome(this.lifestyle.residence as ResidenceId),
        }]
      }
      if (this.lifestyle.ownedVehicles.length === 0 && this.lifestyle.vehicle !== 'yuruyus') {
        this.lifestyle.ownedVehicles = [{
          id: this.lifestyle.vehicle,
          purchasedDay: 0,
          isRenting: false,
          rentalMonthlyIncome: defaultVehicleRentalIncome(this.lifestyle.vehicle as VehicleId),
        }]
      }
    }
    this.lifeEvents = data.lifeEvents ?? []
    this.pendingConsequences = data.pendingConsequences ?? []
    this.eventChoiceHistory = data.eventChoiceHistory ?? []
    this.characterAlignment = data.characterAlignment ?? { temiz: 0, acımasız: 0, gölge: 0 }
    this.abilityCooldowns = data.abilityCooldowns ?? {}
    this.activeRivalEvents = data.activeRivalEvents ?? []
    if (data.health) {
      this.health = { ...createHealthState(), ...data.health }
    }
    this.lastAnnualSummaryYear = data.lastAnnualSummaryYear ?? -1
    this.personality = data.personality ?? null
    if (data.playerSkills) {
      this.playerSkills = {
        unlocked: [...(data.playerSkills.unlocked ?? [])],
        lifeEventsResolved: data.playerSkills.lifeEventsResolved ?? 0,
      }
    }
    this.dailyRoutineDay = data.dailyRoutineDay ?? 0
    this.dailyRoutineUsed = data.dailyRoutineUsed ?? []
    if (data.friendships) {
      this.friendships = {
        friends: (data.friendships.friends ?? []).map((f: any) => ({ ...f })),
        lastFriendshipTickDay: data.friendships.lastFriendshipTickDay ?? 0,
      }
    }
    if (data.mentorEnemy) {
      this.mentorEnemy = { ...createMentorEnemyState(), ...data.mentorEnemy }
    }
    this.legacyScore = data.legacyScore ?? 0
    this.education = data.education ?? null
    if (data.hobby) {
      this.hobby = { ...createHobbyState(), ...data.hobby }
    }
    this.ageMilestonesShown = data.ageMilestonesShown ?? []
    this.diseases = data.diseases ?? []
    this.siblings = data.siblings ?? generateSiblings()
    this.fameState = data.fameState ? { ...createFameState(), ...data.fameState } : createFameState()
    this.karma = data.karma ?? 0
    this.characterProfile = data.characterProfile ? { ...data.characterProfile } : null
    this.characterIncomeDailyBonus = data.characterIncomeDailyBonus ?? 0
    this.characterBackground = data.characterBackground ?? null
    if (!this.characterBackground && this.characterProfile?.backgroundId) {
      this.characterBackground = this.characterProfile.backgroundId
    }
    this.career = data.career ? { ...createCareerState(), ...data.career } : createCareerState()
    if (!Array.isArray(this.career.actionsUsedToday)) this.career.actionsUsedToday = []
    this.producerLevels = data.producerLevels ? { ...data.producerLevels } : {}
    this.producerUpgrades = data.producerUpgrades
      ? Object.fromEntries(Object.entries(data.producerUpgrades).map(([k, v]) => [k, [...(v as string[])]]))
      : {}
    this.departments = data.departments
      ? { ...createDepartmentState(), ...(data.departments as Record<DepartmentId, number>) }
      : createDepartmentState()
    this.departmentTasksClaimed = Array.isArray(data.departmentTasksClaimed) ? [...data.departmentTasksClaimed] : []
    if (Array.isArray(data.netWorthHistory)) {
      this.netWorthHistory = data.netWorthHistory.slice(-60)
    }
    if (data.travel) {
      this.travel = { ...createTravelState(), ...data.travel }
    }
    this.difficulty = (['easy', 'normal', 'hard'] as const).includes(data.difficulty as 'easy' | 'normal' | 'hard')
      ? (data.difficulty as 'easy' | 'normal' | 'hard')
      : 'normal'
    this.difficultyChosen = data.difficultyChosen ?? false
    this.playerName = data.playerName ?? 'Baron'
    this.birthYear = data.birthYear ?? 0
    this.playerGender = data.playerGender === 'female' ? 'female' : 'male'
    this.forcedUnlocks = new Set(data.forcedUnlocks ?? [])
    this.illegalHeat = data.illegalHeat ?? 0
    const savedThemes = new Set<string>(data.unlockedThemes ?? ['default'])
    savedThemes.add('light')
    savedThemes.add('dark')
    this.unlockedThemes = savedThemes
    const savedTheme = (data.activeTheme ?? 'light') as ThemeId
    this.activeTheme = savedTheme === 'default' ? 'light' : savedTheme
    this.codexUnlockDates = { ...(data.codexUnlockDates ?? {}) }
    this.undergroundCooldowns = { ...(data.undergroundCooldowns ?? {}) }
    this.heatShieldUntil = data.heatShieldUntil ?? 0
    this.heatProtectionUntil = data.heatProtectionUntil ?? 0
    this.launderingUntil = data.launderingUntil ?? 0
    this.lastActiveAt = data.lastActiveAt ?? Date.now()
    this.comebackClaimedDay = data.comebackClaimedDay ?? null
    this.comebackPending = data.comebackPending ?? 0
    this.notificationPrefs = {
      dailyReward: data.notificationPrefs?.dailyReward ?? true,
      passiveIncome: data.notificationPrefs?.passiveIncome ?? true,
      goalNear: data.notificationPrefs?.goalNear ?? true,
      webPush: data.notificationPrefs?.webPush ?? false,
    }
    this.chestPityCounter = data.chestPityCounter ?? 0
    this.chestTickets = data.chestTickets ?? 0
    this.campaign = data.campaign
      ? {
          chapterId: data.campaign.chapterId ?? 1,
          stepIndex: data.campaign.stepIndex ?? 0,
          stepProgress: data.campaign.stepProgress ?? 0,
          completedChapters: [...(data.campaign.completedChapters ?? [])],
        }
      : createCampaignState()
    this.surpriseInvestorUntil = data.surpriseInvestorUntil ?? 0
    this.surpriseInvestorDay = data.surpriseInvestorDay ?? ''
    this.seenStoryBeats = new Set(data.seenStoryBeats ?? [])
    this.earnedBadges = new Set(data.earnedBadges ?? [])
    this.raidsToday = data.raidsToday ?? 0
    this.raidsDay = data.raidsDay ?? todayKey()
    this.heatWasCritical = data.heatWasCritical ?? false
    this.heatSurvived = data.heatSurvived ?? false
    this.undergroundLawyerUsed = data.undergroundLawyerUsed ?? false
    this.comebackClaimed = data.comebackClaimed ?? false
    this.streakMilestonesClaimed = data.streakMilestonesClaimed ?? []
    this.dynasty = data.dynasty
      ? { ...data.dynasty, children: [...(data.dynasty.children ?? [])] }
      : createDynastyState()
    this.activeMarketNews = data.activeMarketNews ?? null
    this.shopBoostUntil = data.shopBoostUntil ?? 0
    this.upgradeDiscountActive = data.upgradeDiscountActive ?? false
    this.undergroundTree = data.undergroundTree ?? createUndergroundTreeState()
    this.advisorBuys = data.advisorBuys ?? 0
    this.empire = data.empire
      ? {
          football: [...(data.empire.football ?? [])],
          politics: { ...(data.empire.politics ?? createEmpireState().politics) },
          darkIndustry: { ...(data.empire.darkIndustry ?? createEmpireState().darkIndustry) },
        }
      : createEmpireState()
    this.gameStartYear = data.gameStartYear ?? 2026
    this.pendingBoosts = Array.isArray(data.pendingBoosts)
      ? data.pendingBoosts.filter((b) => b && typeof b.id === 'string' && typeof b.durationMs === 'number')
      : []
    const legacyInvestorMs = (data.surpriseInvestorUntil ?? 0) - Date.now()
    if (legacyInvestorMs > 1000) {
      this.grantPendingBoost('income_2x', legacyInvestorMs, 'Yatırımcı', '💎')
    }
    this.surpriseInvestorUntil = 0
    syncEmpireFromProducers(this.empire, this.producers)
    if (this.dynasty.children.length > 0) {
      this.dynasty.children = this.dynasty.children.map((c) => migrateChildRecord(c))
    }
    if (this.dynasty.playerBornGameDay === undefined) this.dynasty.playerBornGameDay = 1
    if (this.dynasty.playerStartAge === undefined) this.dynasty.playerStartAge = 18
    if (this.dynasty.lifespanNotified === undefined) this.dynasty.lifespanNotified = false
    if (this.dynasty.pendingDeath === undefined) this.dynasty.pendingDeath = null
    this.bankruptcyRecoveryPool = data.bankruptcyRecoveryPool ?? 0
    this.bankruptcyRecoveryClaimed = data.bankruptcyRecoveryClaimed ?? false
    this.bankruptcySeizedSnapshot = (data.bankruptcySeizedSnapshot ?? []).map((item) => ({ ...item }))
    this.lastBankruptcyAt = data.lastBankruptcyAt ?? 0
    this.bankruptcyCashGraceSince = data.bankruptcyCashGraceSince ?? 0
    this.reputation = data.reputation ?? REPUTATION_START
    if (data.rivals?.length) {
      this.rivals = data.rivals.map((r) => ({
        ...r,
        sectorFocus: [...r.sectorFocus],
        personality: r.personality ?? rivalDef(r.id)?.personality ?? 'conservative',
        copiedSector: r.copiedSector ?? null,
      }))
      // Yeni eklenen rakip aileleri eski kayıtlara ekle
      const fresh = createRivalsState()
      for (const def of fresh) {
        if (!this.rivals.some((r) => r.id === def.id)) this.rivals.push(def)
      }
    } else {
      this.rivals = createRivalsState()
    }
    for (const rival of this.rivals) {
      const def = rivalDef(rival.id)
      if (!def) continue
      if (!isRivalUnlocked(rival.id, this.totalEarned)) {
        rival.netWorth = def.startNetWorth
        rival.attitude = 0
        rival.copiedSector = null
      } else if (this.totalEarned < 10_000 && rival.netWorth > Math.max(def.startNetWorth * 2, 5_000)) {
        rival.netWorth = def.startNetWorth
      }
    }
    this.chronicle = data.chronicle ?? []
    this.legacyMonuments = data.legacyMonuments ?? []
    this.victoriesUnlocked = data.victoriesUnlocked ?? []
    this.victoryMechanics = data.victoryMechanics ?? []
    for (const vid of this.victoriesUnlocked) {
      const unlock = mechanicForVictory(vid)
      if (!this.victoryMechanics.includes(unlock.mechanic)) {
        this.victoryMechanics.push(unlock.mechanic)
      }
    }
    this.totalRaidsCaught = data.totalRaidsCaught ?? 0
    this.presidentSeasons = data.presidentSeasons ?? 0
    this.presidentSinceSeasonKey = data.presidentSinceSeasonKey ?? null
    this.lastWorldStageId = data.lastWorldStageId ?? currentWorldStage(netWorth(this.money, portfolioValue(this.stock), this.bank)).id
    this.childCrises = data.childCrises ?? []
    this.gazetteEntries = data.gazetteEntries ?? []
    this.activeCrisis = data.activeCrisis ?? null
    this.crisisIncomeMult = data.crisisIncomeMult ?? 1
    this.crisisHoldBonusUntil = data.crisisHoldBonusUntil ?? 0
    this.bankruptcyCount = data.bankruptcyCount ?? 0
    this.insurance = data.insurance ? { ...createInsuranceState(), ...data.insurance } : createInsuranceState()
    this.commodities = data.commodities ?? createCommodityMarket()
    this.investmentOffer = data.investmentOffer ?? null
    this.pendingInvestments = data.pendingInvestments ?? []
    this.franchises = data.franchises ?? []
    this.namedManagers = data.namedManagers ?? []
    this.pendingRivalOffer = data.pendingRivalOffer ?? null
    this.undergroundMarketActive = data.undergroundMarketActive ?? []
    this.advisorTip = data.advisorTip ?? null
    this.advisorTipDay = data.advisorTipDay ?? 0
    this.calendarPurchaseDay = data.calendarPurchaseDay ?? ''
    this.lastCrisisGameDay = data.lastCrisisGameDay ?? 0
    this.lastInvestmentOfferDay = data.lastInvestmentOfferDay ?? 0
    this.playerTitleId = data.playerTitleId ?? 'tycoon'
    this.baronHistory = data.baronHistory ?? []
    this.baronCounter = data.baronCounter ?? 1
    this.currentBaronStartedGameDay = data.currentBaronStartedGameDay ?? 1
    this.baronLifePeakNetWorth = data.baronLifePeakNetWorth ?? this.financeNetWorth()
    this.baronLifeEarnedStart = data.baronLifeEarnedStart ?? 0
    this.baronLifeRaidsUninsured = data.baronLifeRaidsUninsured ?? 0
    this.baronLifeChildCrises = data.baronLifeChildCrises ?? 0
    this.cities = data.cities ?? createCityState()
    const loadedTorpil = data.torpil?.length ? data.torpil.map((t) => ({ ...t })) : createTorpilState()
    const defaultTorpil = createTorpilState()
    this.torpil = defaultTorpil.map((def) => loadedTorpil.find((lt) => lt.id === def.id) ?? def)
    this.producerModernized = data.producerModernized ?? {}
    this.pendingUndo = data.pendingUndo ?? null
    this.lastDisasterGameDay = data.lastDisasterGameDay ?? 0
    this.dynastyPassiveIncome = data.dynastyPassiveIncome ?? 0
    this.peakIncomePerDay = data.peakIncomePerDay ?? 0
    this.prestigeShopPurchased = data.prestigeShopPurchased ?? []
    this.lastSaveTime = data.lastSaveTime
    this.isNight = isGameNight(this.gameTimeMs)
    this.dailyPlan = sanitizeDailyPlanState(data.dailyPlan ?? null)
    this.pendingDecisions = data.pendingDecisions ?? []
    this.ensureDailyGoal()
    this.ensureMissions()
    this.ensureWeekly()
    this.ensureSeason()
    this.ensureDailyPlan()
  }
}

export { PRESTIGE_THRESHOLD }

function todayKey(): string {
  return localDayKey()
}

function yesterdayKey(): string {
  return yesterdayLocalKey()
}
