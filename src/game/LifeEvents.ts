export type LifeEventId =
  | 'found_wallet'
  | 'old_partner_offer'
  | 'employee_strike'
  | 'lucky_investment'
  | 'traffic_fine'
  | 'charity_request'
  | 'insider_tip'
  | 'media_coverage'
  | 'talent_headhunt'
  | 'neighborhood_conflict'

export interface LifeEventChoice {
  id: string
  label: string
  emoji: string
  moneyDelta: number
  reputationDelta: number
  stressDelta: number
  consequenceId?: string
  consequenceDelayDays?: number
}

export interface LifeEventDef {
  id: LifeEventId
  title: string
  description: string
  emoji: string
  minTotalEarned: number
  choices: [LifeEventChoice, LifeEventChoice]
  cooldownDays: number
}

export const LIFE_EVENTS: LifeEventDef[] = [
  {
    id: 'found_wallet',
    title: 'Cüzdan Buldun!',
    description: 'Kaldırımda içi para dolu bir cüzdan buldun. Ne yapacaksın?',
    emoji: '👛',
    minTotalEarned: 0,
    cooldownDays: 60,
    choices: [
      {
        id: 'police',
        label: 'Polise teslim et',
        emoji: '👮',
        moneyDelta: 0,
        reputationDelta: 15,
        stressDelta: -5,
        consequenceId: 'wallet_gratitude',
        consequenceDelayDays: 14,
      },
      {
        id: 'keep',
        label: 'Cüzdanı al',
        emoji: '💰',
        moneyDelta: 25_000,
        reputationDelta: -8,
        stressDelta: 10,
        consequenceId: 'wallet_mafia',
        consequenceDelayDays: 30,
      },
    ],
  },
  {
    id: 'old_partner_offer',
    title: 'Eski Ortağın Aradı',
    description: 'Yıllar önce ayrıldığın iş ortağın seni yeni bir projeye davet ediyor. Güvenilir mi?',
    emoji: '📞',
    minTotalEarned: 50_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'accept',
        label: 'Ortaklık kur',
        emoji: '🤝',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: 8,
        consequenceId: 'partner_bonus',
        consequenceDelayDays: 21,
      },
      {
        id: 'decline',
        label: 'Reddet — bağımsız kal',
        emoji: '🙅',
        moneyDelta: 0,
        reputationDelta: 10,
        stressDelta: -3,
      },
    ],
  },
  {
    id: 'employee_strike',
    title: 'Çalışan Grevi Tehdidi',
    description: 'Çalışanların bir kısmı maaş artışı talep ediyor. Yoksa greve gidecekler.',
    emoji: '✊',
    minTotalEarned: 100_000,
    cooldownDays: 45,
    choices: [
      {
        id: 'raise',
        label: 'Zam ver — %15 maaş artışı',
        emoji: '💵',
        moneyDelta: -50_000,
        reputationDelta: 12,
        stressDelta: -5,
      },
      {
        id: 'deny',
        label: 'Reddet — mücadele et',
        emoji: '🚫',
        moneyDelta: 0,
        reputationDelta: -15,
        stressDelta: 20,
        consequenceId: 'strike_penalty',
        consequenceDelayDays: 3,
      },
    ],
  },
  {
    id: 'lucky_investment',
    title: 'Fırsat: Startup Yatırımı',
    description: 'Tanıdık bir startup, erken yatırımcı arıyor. Yüksek risk, yüksek getiri.',
    emoji: '🚀',
    minTotalEarned: 200_000,
    cooldownDays: 60,
    choices: [
      {
        id: 'invest',
        label: '₺100K yatır — risk al',
        emoji: '🎰',
        moneyDelta: -100_000,
        reputationDelta: 5,
        stressDelta: 8,
        consequenceId: 'startup_payoff',
        consequenceDelayDays: 45,
      },
      {
        id: 'skip',
        label: 'Geç — güvenli kal',
        emoji: '🛡️',
        moneyDelta: 0,
        reputationDelta: 0,
        stressDelta: -2,
      },
    ],
  },
  {
    id: 'traffic_fine',
    title: 'Trafik Cezası',
    description: 'Araçla hız sınırını aştın. Memur ceza yazmak üzere.',
    emoji: '🚔',
    minTotalEarned: 0,
    cooldownDays: 30,
    choices: [
      {
        id: 'pay',
        label: 'Cezayı öde',
        emoji: '💸',
        moneyDelta: -3_500,
        reputationDelta: 0,
        stressDelta: 3,
      },
      {
        id: 'bribe',
        label: 'Torpil yap',
        emoji: '🤫',
        moneyDelta: -8_000,
        reputationDelta: -5,
        stressDelta: 8,
      },
    ],
  },
  {
    id: 'charity_request',
    title: 'Hayır Kurumu Talebi',
    description: 'Tanınan bir vakıf, şirketten bağış talep ediyor. Medyaya yansıyabilir.',
    emoji: '❤️',
    minTotalEarned: 500_000,
    cooldownDays: 60,
    choices: [
      {
        id: 'donate_big',
        label: '₺500K büyük bağış yap',
        emoji: '💝',
        moneyDelta: -500_000,
        reputationDelta: 30,
        stressDelta: -10,
      },
      {
        id: 'donate_small',
        label: '₺50K küçük bağış yap',
        emoji: '🤲',
        moneyDelta: -50_000,
        reputationDelta: 8,
        stressDelta: -3,
      },
    ],
  },
  {
    id: 'insider_tip',
    title: 'Borsa Tüyosu',
    description: 'Güvenilir bir kaynak sana yarın açıklanacak bir haber hakkında ipucu verdi.',
    emoji: '📈',
    minTotalEarned: 1_000_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'trade',
        label: 'Içeriden al-sat yap',
        emoji: '🎯',
        moneyDelta: 0,
        reputationDelta: -5,
        stressDelta: 15,
        consequenceId: 'insider_win',
        consequenceDelayDays: 2,
      },
      {
        id: 'ignore',
        label: 'Etik kal — tüyoyu yoksay',
        emoji: '✋',
        moneyDelta: 0,
        reputationDelta: 20,
        stressDelta: 0,
      },
    ],
  },
  {
    id: 'media_coverage',
    title: 'Medya Röportajı',
    description: 'Büyük bir gazete, seni kapak yapmak istiyor. Risk mi fırsat mı?',
    emoji: '📰',
    minTotalEarned: 5_000_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'accept_interview',
        label: 'Röportajı kabul et',
        emoji: '🎙️',
        moneyDelta: 0,
        reputationDelta: 25,
        stressDelta: 12,
      },
      {
        id: 'decline_interview',
        label: 'Gizliliği koru — reddet',
        emoji: '🔕',
        moneyDelta: 0,
        reputationDelta: -5,
        stressDelta: -5,
      },
    ],
  },
  {
    id: 'neighborhood_conflict',
    title: 'Komşu Problemi',
    description: 'Villanın komşusu senin inşaatına itiraz ediyor. Mahkeme açabilir.',
    emoji: '🏡',
    minTotalEarned: 2_000_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'settle',
        label: 'Uzlaşma teklif et — ₺200K',
        emoji: '🤝',
        moneyDelta: -200_000,
        reputationDelta: 5,
        stressDelta: -8,
      },
      {
        id: 'fight',
        label: 'Avukat tut — mahkemeye git',
        emoji: '⚖️',
        moneyDelta: -80_000,
        reputationDelta: -10,
        stressDelta: 25,
        consequenceId: 'court_win',
        consequenceDelayDays: 60,
      },
    ],
  },
]

export interface PendingConsequence {
  id: string
  triggerGameDay: number
  eventId: LifeEventId
  choiceId: string
  consequenceId: string
}

export interface ActiveLifeEvent {
  eventId: LifeEventId
  seenAtGameDay: number
}

export function shouldTriggerLifeEvent(
  seenEvents: ActiveLifeEvent[],
  def: LifeEventDef,
  currentGameDay: number,
  totalEarned: number,
): boolean {
  if (totalEarned < def.minTotalEarned) return false
  const last = seenEvents.find((e) => e.eventId === def.id)
  if (last && currentGameDay - last.seenAtGameDay < def.cooldownDays) return false
  return Math.random() < 0.008
}

export function resolveConsequence(
  consequenceId: string,
  eventId: LifeEventId,
): { moneyDelta: number; reputationDelta: number; headline: string } {
  const map: Record<string, { moneyDelta: number; reputationDelta: number; headline: string }> = {
    wallet_gratitude: { moneyDelta: 15_000, reputationDelta: 10, headline: 'Cüzdan sahibi teşekkür etti ve ödül verdi — dürüstlük kazandırdı' },
    wallet_mafia: { moneyDelta: -80_000, reputationDelta: -20, headline: '⚠️ Cüzdan mafyadan çıktı! Şantaj tehdidi para aldı' },
    partner_bonus: { moneyDelta: 250_000, reputationDelta: 8, headline: 'Eski ortağın projesi başarıyla kapandı — ortak kâr payı geldi' },
    strike_penalty: { moneyDelta: 0, reputationDelta: -20, headline: '⚠️ Çalışanlar greve çıktı — 3 gün üretim durdu' },
    startup_payoff: { moneyDelta: 800_000, reputationDelta: 15, headline: '🚀 Startup yatırımın 8x getiri sağladı! Girişim haberlerde' },
    insider_win: { moneyDelta: 450_000, reputationDelta: -15, headline: 'İçeriden al-sat getirisi: +₺450K — ama piyasa dedikodular çıktı' },
    court_win: { moneyDelta: 150_000, reputationDelta: 20, headline: '⚖️ Mahkeme senin lehine bitti — tazminat ödendi' },
  }
  return map[consequenceId] ?? { moneyDelta: 0, reputationDelta: 0, headline: `${eventId} sonucu` }
}
