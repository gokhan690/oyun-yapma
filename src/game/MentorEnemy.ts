/** Mentor & Düşman sistemi */

export type MentorId = 'veteran_investor' | 'retired_politician' | 'old_industrialist'
export type EnemyId = 'corrupt_rival' | 'jealous_partner' | 'hostile_regulator'
export type EnemyResolveMethod = 'money' | 'law' | 'politics' | 'diplomacy'

export interface MentorDef {
  id: MentorId
  name: string
  emoji: string
  title: string
  backstory: string
  quests: MentorQuest[]
}

export interface MentorQuest {
  id: string
  label: string
  description: string
  /** Koşul: belirli bir threshold */
  requiresTotalEarned?: number
  requiresIpoCount?: number
  requiresReputation?: number
  requiresBusinessCount?: number
  /** Ödül */
  rewardLabel: string
  rewardType: 'income_pct' | 'cost_pct' | 'click_pct' | 'prestige_pct' | 'reputation'
  rewardValue: number
}

export const MENTORS: MentorDef[] = [
  {
    id: 'veteran_investor',
    name: 'Hüsnü Bey',
    emoji: '🧓',
    title: 'Emekli Yatırımcı',
    backstory: '40 yıllık piyasa tecrübesi olan efsanevi bir yatırımcı. Sana rehberlik etmeye hazır.',
    quests: [
      {
        id: 'first_million',
        label: 'İlk Milyon',
        description: '₺1.000.000 toplam kazanç elde et',
        requiresTotalEarned: 1_000_000,
        rewardLabel: 'Pasif gelir kalıcı +%5',
        rewardType: 'income_pct',
        rewardValue: 0.05,
      },
      {
        id: 'first_ipo',
        label: 'Halka Arz',
        description: 'İlk IPO\'yu gerçekleştir',
        requiresIpoCount: 1,
        rewardLabel: 'Maliyet kalıcı −%3',
        rewardType: 'cost_pct',
        rewardValue: -0.03,
      },
      {
        id: 'reputation_100',
        label: 'İtibar Taşı',
        description: '100 itibar puanına ulaş',
        requiresReputation: 100,
        rewardLabel: 'Prestij çarpanı +%8',
        rewardType: 'prestige_pct',
        rewardValue: 0.08,
      },
    ],
  },
  {
    id: 'retired_politician',
    name: 'Ahmet Paşa',
    emoji: '🏛️',
    title: 'Emekli Siyasetçi',
    backstory: 'Eski bir bakan; şimdi iş dünyasını şekillendiriyor. Siyasi ağı hâlâ güçlü.',
    quests: [
      {
        id: 'ten_businesses',
        label: 'On İşletme',
        description: '10 farklı işletme türüne sahip ol',
        requiresBusinessCount: 10,
        rewardLabel: 'Tıklama gücü +%8',
        rewardType: 'click_pct',
        rewardValue: 0.08,
      },
      {
        id: 'three_cities',
        label: 'Üç Şehir',
        description: '₺500.000 toplam kazanç elde et (şehir genişlemesi)',
        requiresTotalEarned: 500_000,
        rewardLabel: 'İtibar +50 (kalıcı)',
        rewardType: 'reputation',
        rewardValue: 50,
      },
      {
        id: 'second_ipo',
        label: 'İkinci Nesil',
        description: 'İkinci IPO\'yu gerçekleştir',
        requiresIpoCount: 2,
        rewardLabel: 'Pasif gelir kalıcı +%8',
        rewardType: 'income_pct',
        rewardValue: 0.08,
      },
    ],
  },
  {
    id: 'old_industrialist',
    name: 'Türkan Hanım',
    emoji: '🏭',
    title: 'Eski Sanayici',
    backstory: 'Türkiye\'nin ilk kadın sanayi baronlarından. Verdiği ipuçları paha biçilemez.',
    quests: [
      {
        id: 'fifty_businesses',
        label: '50 İşletme',
        description: '50 işletme türü satın al',
        requiresBusinessCount: 50,
        rewardLabel: 'Maliyet kalıcı −%5',
        rewardType: 'cost_pct',
        rewardValue: -0.05,
      },
      {
        id: 'ten_million',
        label: 'On Milyon',
        description: '₺10.000.000 toplam kazanç elde et',
        requiresTotalEarned: 10_000_000,
        rewardLabel: 'Pasif gelir kalıcı +%10',
        rewardType: 'income_pct',
        rewardValue: 0.10,
      },
      {
        id: 'three_ipos',
        label: 'Üç Nesil',
        description: 'Üç IPO gerçekleştir',
        requiresIpoCount: 3,
        rewardLabel: 'Prestij çarpanı +%15',
        rewardType: 'prestige_pct',
        rewardValue: 0.15,
      },
    ],
  },
]

export interface EnemyDef {
  id: EnemyId
  name: string
  emoji: string
  title: string
  backstory: string
  /** Günlük pasif zarar (gelir çarpanı düşürücü) */
  dailyIncomePenalty: number
  /** Çözüm yöntemleri ve maliyetleri */
  resolveMethods: EnemyResolveOption[]
}

export interface EnemyResolveOption {
  method: EnemyResolveMethod
  label: string
  emoji: string
  moneyCost: number
  reputationDelta: number
  description: string
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'corrupt_rival',
    name: 'Necdet Avcı',
    emoji: '😈',
    title: 'Yolsuz Rakip',
    backstory: 'Senin başarını kıskanarak seni baltalamaya çalışıyor. Kiralık lobicileri var.',
    dailyIncomePenalty: 0.03,
    resolveMethods: [
      { method: 'money', label: 'Rüşvet ver', emoji: '💰', moneyCost: 500_000, reputationDelta: -20, description: 'Sessizce halleder ama itibarın zedelenir' },
      { method: 'law', label: 'Dava aç', emoji: '⚖️', moneyCost: 200_000, reputationDelta: +15, description: 'Zaman alır ama şerefli bir çözüm' },
      { method: 'politics', label: 'Siyasi baskı', emoji: '🏛️', moneyCost: 350_000, reputationDelta: +5, description: 'Bağlantılarını kullan' },
      { method: 'diplomacy', label: 'Müzakere', emoji: '🤝', moneyCost: 100_000, reputationDelta: +10, description: 'İş ortaklığı teklif et' },
    ],
  },
  {
    id: 'jealous_partner',
    name: 'Sinan Koray',
    emoji: '🗡️',
    title: 'Kıskançlıktan Dönen Ortak',
    backstory: 'Eski bir iş ortağın. Senden ayrılışından sonra seni mahvetmeye yemin etti.',
    dailyIncomePenalty: 0.04,
    resolveMethods: [
      { method: 'money', label: 'Tazminat öde', emoji: '💰', moneyCost: 300_000, reputationDelta: -5, description: 'Eski alacaklarını kapat' },
      { method: 'law', label: 'Hukuki çözüm', emoji: '⚖️', moneyCost: 150_000, reputationDelta: +10, description: 'Mahkemede belgeleri sun' },
      { method: 'diplomacy', label: 'Barış görüşmesi', emoji: '🤝', moneyCost: 50_000, reputationDelta: +20, description: 'Kötü geçmişi unut, yeni başlangıç yap' },
      { method: 'politics', label: 'Nüfuzunu kullan', emoji: '🏛️', moneyCost: 250_000, reputationDelta: 0, description: 'Onu susturmak için üst bağlantılar' },
    ],
  },
  {
    id: 'hostile_regulator',
    name: 'Müfettiş Cemal',
    emoji: '🕵️',
    title: 'Düşman Denetçi',
    backstory: 'Seni hedef alan bir devlet denetçisi. Her işletmeni denetim altında tutuyor.',
    dailyIncomePenalty: 0.05,
    resolveMethods: [
      { method: 'politics', label: 'Üst makama şikâyet', emoji: '🏛️', moneyCost: 400_000, reputationDelta: +25, description: 'Kurumsal kanalları kullan' },
      { method: 'law', label: 'İdare mahkemesi', emoji: '⚖️', moneyCost: 200_000, reputationDelta: +15, description: 'Uzun yol ama kalıcı çözüm' },
      { method: 'money', label: 'Lobici tut', emoji: '💰', moneyCost: 600_000, reputationDelta: -30, description: 'Hızlı ama riskli' },
      { method: 'diplomacy', label: 'Uzlaşma toplantısı', emoji: '🤝', moneyCost: 80_000, reputationDelta: +5, description: 'Tüm kayıtları açık yap, güven kazan' },
    ],
  },
]

export interface MentorEnemyState {
  mentorId: MentorId | null
  mentorUnlockedDay: number
  completedQuests: string[]
  /** Kalıcı bonus birikimi */
  mentorIncomeBonusPct: number
  mentorCostBonusPct: number
  mentorClickBonusPct: number
  mentorPrestigeBonusPct: number
  mentorReputationBonus: number
  enemyId: EnemyId | null
  enemyActiveDay: number
  enemyResolved: boolean
}

export function createMentorEnemyState(): MentorEnemyState {
  return {
    mentorId: null,
    mentorUnlockedDay: 0,
    completedQuests: [],
    mentorIncomeBonusPct: 0,
    mentorCostBonusPct: 0,
    mentorClickBonusPct: 0,
    mentorPrestigeBonusPct: 0,
    mentorReputationBonus: 0,
    enemyId: null,
    enemyActiveDay: 0,
    enemyResolved: false,
  }
}

export function mentorDef(id: MentorId): MentorDef {
  return MENTORS.find((m) => m.id === id)!
}

export function enemyDef(id: EnemyId): EnemyDef {
  return ENEMIES.find((e) => e.id === id)!
}

/** Mentoru al — her oyunda rastgele 1 tanesi */
export function assignRandomMentor(): MentorId {
  const ids: MentorId[] = ['veteran_investor', 'retired_politician', 'old_industrialist']
  return ids[Math.floor(Math.random() * ids.length)]
}

/** Düşmanı al — rastgele 1 tanesi (10K totalEarned sonrası) */
export function assignRandomEnemy(): EnemyId {
  const ids: EnemyId[] = ['corrupt_rival', 'jealous_partner', 'hostile_regulator']
  return ids[Math.floor(Math.random() * ids.length)]
}

/** Tamamlanabilir görev kontrol */
export function checkMentorQuests(
  state: MentorEnemyState,
  metrics: { totalEarned: number; ipoCount: number; reputation: number; businessCount: number },
): MentorQuest[] {
  if (!state.mentorId) return []
  const def = mentorDef(state.mentorId)
  return def.quests.filter((q) => {
    if (state.completedQuests.includes(q.id)) return false
    if (q.requiresTotalEarned && metrics.totalEarned < q.requiresTotalEarned) return false
    if (q.requiresIpoCount && metrics.ipoCount < q.requiresIpoCount) return false
    if (q.requiresReputation && metrics.reputation < q.requiresReputation) return false
    if (q.requiresBusinessCount && metrics.businessCount < q.requiresBusinessCount) return false
    return true
  })
}

/** Görevi tamamla, kalıcı bonusu uygula */
export function completeMentorQuest(state: MentorEnemyState, questId: string): string {
  if (!state.mentorId) return ''
  const def = mentorDef(state.mentorId)
  const quest = def.quests.find((q) => q.id === questId)
  if (!quest || state.completedQuests.includes(questId)) return ''
  state.completedQuests.push(questId)
  switch (quest.rewardType) {
    case 'income_pct': state.mentorIncomeBonusPct += quest.rewardValue; break
    case 'cost_pct': state.mentorCostBonusPct += quest.rewardValue; break
    case 'click_pct': state.mentorClickBonusPct += quest.rewardValue; break
    case 'prestige_pct': state.mentorPrestigeBonusPct += quest.rewardValue; break
    case 'reputation': state.mentorReputationBonus += quest.rewardValue; break
  }
  return quest.rewardLabel
}

/** Düşman aktif değil ise günlük ceza yok */
export function enemyIncomePenalty(state: MentorEnemyState): number {
  if (!state.enemyId || state.enemyResolved) return 1
  const def = enemyDef(state.enemyId)
  return 1 - def.dailyIncomePenalty
}

/** Mentor bonus çarpanları */
export function mentorIncomeMult(state: MentorEnemyState): number {
  return 1 + state.mentorIncomeBonusPct
}
export function mentorCostMult(state: MentorEnemyState): number {
  return 1 + state.mentorCostBonusPct
}
export function mentorClickMult(state: MentorEnemyState): number {
  return 1 + state.mentorClickBonusPct
}
export function mentorPrestigeMult(state: MentorEnemyState): number {
  return 1 + state.mentorPrestigeBonusPct
}
