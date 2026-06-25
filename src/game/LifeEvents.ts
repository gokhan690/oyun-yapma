import { tRaw } from '../i18n'

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
  | 'mafia_extortion'
  | 'union_contract'
  | 'rival_copycat'
  | 'sick_friend'
  | 'son_in_trouble'
  | 'health_crisis'
  | 'startup_opportunity'
  | 'tv_show_invite'
  | 'unexpected_inheritance'
  | 'rival_bankrupt'
  | 'gov_contract'
  | 'industrial_accident'
  | 'whistleblower'
  | 'celebrity_endorsement'
  | 'hostile_takeover'
  | 'tax_audit'
  | 'divorce_threat'
  | 'mentor_call'
  | 'stock_market_crash'
  | 'city_expansion_offer'
  | 'street_lawsuit'
  | 'gambling_night'

export interface ChoiceRiskOutcome {
  /** 0-1 probability that the positive (win) outcome fires. */
  winChance: number
  winMoneyDelta: number
  winReputationDelta: number
  winHeadline: string
  lossMoneyDelta: number
  lossReputationDelta: number
  lossHeadline: string
}

export interface LifeEventChoice {
  id: string
  label: string
  emoji: string
  moneyDelta: number
  reputationDelta: number
  stressDelta: number
  healthDelta?: number
  consequenceId?: string
  consequenceDelayDays?: number
  /** 2nd-layer dice roll resolved immediately after choice effects. */
  riskOutcome?: ChoiceRiskOutcome
}

export interface LifeEventDef {
  id: LifeEventId
  title: string
  description: string
  emoji: string
  minTotalEarned: number
  choices: [LifeEventChoice, LifeEventChoice]
  cooldownDays: number
  requiresChoice?: { eventId: LifeEventId; choiceId: string }
  chainOf?: LifeEventId
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
    id: 'mafia_extortion',
    title: 'Mafya Kapında!',
    description: 'Aylar önce aldığın cüzdan mafyadan çıktı. Şimdi haraç istiyorlar — ya da iş ortağı olabilirsin.',
    emoji: '🔫',
    minTotalEarned: 100_000,
    cooldownDays: 999,
    chainOf: 'found_wallet',
    requiresChoice: { eventId: 'found_wallet', choiceId: 'keep' },
    choices: [
      {
        id: 'pay_protection',
        label: 'Haraç öde — ₺150K',
        emoji: '💸',
        moneyDelta: -150_000,
        reputationDelta: -5,
        stressDelta: 15,
      },
      {
        id: 'partner_mafia',
        label: 'İş ortaklığı kur',
        emoji: '🤝',
        moneyDelta: 0,
        reputationDelta: -20,
        stressDelta: -5,
        consequenceId: 'mafia_partner_income',
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
    id: 'union_contract',
    title: 'Sendika Anlaşması Yenileniyor',
    description: 'Geçen sefer grevden kaçınmak için zam verdin. Sendika şimdi toplu sözleşme yenileme talep ediyor.',
    emoji: '📋',
    minTotalEarned: 200_000,
    cooldownDays: 999,
    chainOf: 'employee_strike',
    requiresChoice: { eventId: 'employee_strike', choiceId: 'raise' },
    choices: [
      {
        id: 'fair_contract',
        label: 'Adil sözleşme imzala',
        emoji: '✍️',
        moneyDelta: -80_000,
        reputationDelta: 20,
        stressDelta: -8,
      },
      {
        id: 'minimize_contract',
        label: 'Minimum ver, gerisi müzakere',
        emoji: '🔄',
        moneyDelta: -20_000,
        reputationDelta: -5,
        stressDelta: 10,
        consequenceId: 'strike_penalty',
        consequenceDelayDays: 15,
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
    id: 'startup_opportunity',
    title: 'Eski İş Arkadaşın Startup Kurdu',
    description: 'Eski çalışanın umut vadeden bir startup kurdu ve 50K yatırım arıyor. 60 gün içinde sonuç alınacak.',
    emoji: '💡',
    minTotalEarned: 500_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'invest_startup',
        label: '₺50K yatır',
        emoji: '💰',
        moneyDelta: -50_000,
        reputationDelta: 5,
        stressDelta: 5,
        consequenceId: 'startup_big_payoff',
        consequenceDelayDays: 60,
      },
      {
        id: 'pass',
        label: 'Hayır teşekkürler',
        emoji: '👋',
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
        riskOutcome: {
          winChance: 0.70,
          winMoneyDelta: 0, winReputationDelta: 0, winHeadline: '🤫 Torpil tuttu — kayıt silindirildi',
          lossMoneyDelta: -20_000, lossReputationDelta: -15, lossHeadline: '🚔 Torpil işe yaramadı — ek ceza kesildi!',
        },
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
        consequenceId: 'media_rival_copy',
        consequenceDelayDays: 45,
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
    id: 'rival_copycat',
    title: 'Rakip Seni Kopyaladı!',
    description: 'Röportajın sonrası bir rakip şirket iş modelini kopya etti. Dava aç mı, yoksa pazar payınla mı savun?',
    emoji: '📑',
    minTotalEarned: 8_000_000,
    cooldownDays: 999,
    chainOf: 'media_coverage',
    requiresChoice: { eventId: 'media_coverage', choiceId: 'accept_interview' },
    choices: [
      {
        id: 'lawsuit',
        label: 'Avukat tut — dava aç',
        emoji: '⚖️',
        moneyDelta: -200_000,
        reputationDelta: 5,
        stressDelta: 20,
        consequenceId: 'lawsuit_verdict',
        consequenceDelayDays: 60,
      },
      {
        id: 'market_war',
        label: 'Pazar savaşı — fiyatları düşür',
        emoji: '📉',
        moneyDelta: -100_000,
        reputationDelta: 10,
        stressDelta: 10,
        riskOutcome: {
          winChance: 0.55,
          winMoneyDelta: 300_000, winReputationDelta: 10, winHeadline: '📈 Pazar savaşı kazanıldı — pazar payı arttı!',
          lossMoneyDelta: -200_000, lossReputationDelta: -5, lossHeadline: '📉 Rakip direndi — fiyat savaşı kayıpla bitti',
        },
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
  {
    id: 'sick_friend',
    title: 'Yakın Arkadaşın Ağır Hasta',
    description: 'Yıllardır tanıdığın bir dost ağır hasta. Yanında olmak zaman ve para gerektirecek.',
    emoji: '🏥',
    minTotalEarned: 300_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'support',
        label: 'Yanında ol — ₺30K harca',
        emoji: '🤲',
        moneyDelta: -30_000,
        reputationDelta: 15,
        stressDelta: 15,
        healthDelta: -5,
        consequenceId: 'friend_recovery',
        consequenceDelayDays: 30,
      },
      {
        id: 'send_money',
        label: 'Para gönder — ₺100K',
        emoji: '💸',
        moneyDelta: -100_000,
        reputationDelta: 8,
        stressDelta: 5,
      },
    ],
  },
  {
    id: 'son_in_trouble',
    title: 'Çocuğun Başını Belaya Soktu',
    description: 'Oğlun/kızın yasadışı bir olaya karıştı. Sessiz mi kalacaksın, yoksa harekete mi geçeceksin?',
    emoji: '👦',
    minTotalEarned: 1_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'bribe_fix',
        label: 'Rüşvetle çöz — ₺200K',
        emoji: '🤫',
        moneyDelta: -200_000,
        reputationDelta: -15,
        stressDelta: 20,
        riskOutcome: {
          winChance: 0.65,
          winMoneyDelta: 0, winReputationDelta: 0, winHeadline: '🤝 Rüşvet kabul edildi — dosya kapandı',
          lossMoneyDelta: -150_000, lossReputationDelta: -20, lossHeadline: '🚨 Rüşvet deşifre oldu — skandal büyüdü!',
        },
      },
      {
        id: 'legal_route',
        label: 'Avukat tut — hukuki yol',
        emoji: '⚖️',
        moneyDelta: -80_000,
        reputationDelta: -5,
        stressDelta: 30,
        consequenceId: 'child_case_outcome',
        consequenceDelayDays: 45,
      },
    ],
  },
  {
    id: 'health_crisis',
    title: 'Sağlık Krizi Geçirdin!',
    description: 'Ani bir sağlık problemi yaşadın. Hastanede 2 hafta yatman gerekiyor.',
    emoji: '🚑',
    minTotalEarned: 500_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'private_hospital',
        label: 'Özel hastaneye git — ₺150K',
        emoji: '🏥',
        moneyDelta: -150_000,
        reputationDelta: 0,
        stressDelta: -10,
        healthDelta: 20,
      },
      {
        id: 'public_hospital',
        label: 'Devlet hastanesine git',
        emoji: '🩺',
        moneyDelta: -15_000,
        reputationDelta: 0,
        stressDelta: 5,
        healthDelta: 8,
      },
    ],
  },
  {
    id: 'tv_show_invite',
    title: 'TV Programına Davet',
    description: 'Popüler bir iş programı seni konuk olarak davet etti. İtibar artacak ama rekabeti de çekeceksin.',
    emoji: '📺',
    minTotalEarned: 3_000_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'appear',
        label: 'Programa çık',
        emoji: '🎬',
        moneyDelta: 0,
        reputationDelta: 30,
        stressDelta: 10,
        consequenceId: 'tv_advertising_bonus',
        consequenceDelayDays: 7,
      },
      {
        id: 'decline_tv',
        label: 'Reddet — alçakgönüllü kal',
        emoji: '🙏',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: -5,
      },
    ],
  },
  {
    id: 'unexpected_inheritance',
    title: 'Beklenmedik Miras!',
    description: 'Hiç tanımadığın uzak bir akraban sana miras bırakmış. Avukat arayarak bildirdi.',
    emoji: '🏛️',
    minTotalEarned: 100_000,
    cooldownDays: 999,
    choices: [
      {
        id: 'accept_inheritance',
        label: 'Mirası kabul et',
        emoji: '✅',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: 5,
        consequenceId: 'inheritance_received',
        consequenceDelayDays: 14,
      },
      {
        id: 'donate_inheritance',
        label: 'Hayır kurumuna bağışla',
        emoji: '❤️',
        moneyDelta: 0,
        reputationDelta: 25,
        stressDelta: -5,
        consequenceId: 'inheritance_donated',
        consequenceDelayDays: 7,
      },
    ],
  },
  {
    id: 'rival_bankrupt',
    title: 'Rakip Şirket İflas Ediyor!',
    description: 'Büyük rakibin batıyor. Varlıklarını piyasa değerinin yarısına satın alabilirsin.',
    emoji: '💥',
    minTotalEarned: 5_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'buy_assets',
        label: 'Varlıkları satın al — ₺500K',
        emoji: '🛒',
        moneyDelta: -500_000,
        reputationDelta: 5,
        stressDelta: 8,
        consequenceId: 'rival_assets_profit',
        consequenceDelayDays: 30,
      },
      {
        id: 'watch_fall',
        label: 'İzle, işlerini gönder',
        emoji: '👀',
        moneyDelta: 0,
        reputationDelta: 10,
        stressDelta: -3,
        consequenceId: 'rival_clients_gained',
        consequenceDelayDays: 14,
      },
    ],
  },
  {
    id: 'gov_contract',
    title: 'Devlet İhalesi Fırsatı',
    description: 'Şehir belediyesi büyük bir altyapı ihalesine seni davet etti. Bürokrasi zor ama kazanç büyük.',
    emoji: '🏗️',
    minTotalEarned: 2_000_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'bid_clean',
        label: 'Temiz teklif ver',
        emoji: '📝',
        moneyDelta: -50_000,
        reputationDelta: 15,
        stressDelta: 10,
        consequenceId: 'gov_contract_win',
        consequenceDelayDays: 45,
      },
      {
        id: 'bid_bribe',
        label: 'Torpille garantile — ₺300K',
        emoji: '🤑',
        moneyDelta: -300_000,
        reputationDelta: -10,
        stressDelta: 5,
        consequenceId: 'gov_contract_guaranteed',
        consequenceDelayDays: 20,
      },
    ],
  },
  {
    id: 'industrial_accident',
    title: 'İşletmende Kaza!',
    description: 'Bir fabrikanda iş kazası yaşandı. İşçiler yaralı, medya kapıda.',
    emoji: '⚠️',
    minTotalEarned: 1_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'compensate_fully',
        label: 'Tam tazminat öde — ₺400K',
        emoji: '💰',
        moneyDelta: -400_000,
        reputationDelta: 10,
        stressDelta: 5,
      },
      {
        id: 'legal_minimum',
        label: 'Yasal minimumu öde',
        emoji: '📋',
        moneyDelta: -80_000,
        reputationDelta: -25,
        stressDelta: 20,
        consequenceId: 'accident_lawsuit',
        consequenceDelayDays: 30,
      },
    ],
  },
  {
    id: 'whistleblower',
    title: 'İçeriden Sızdırma Tehdidi',
    description: 'Eski bir çalışan şirketin gizli bilgilerini sızdırmakla tehdit ediyor.',
    emoji: '🕵️',
    minTotalEarned: 3_000_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'pay_silence',
        label: 'Susturma parası — ₺250K',
        emoji: '🤫',
        moneyDelta: -250_000,
        reputationDelta: -5,
        stressDelta: 10,
      },
      {
        id: 'call_bluff',
        label: 'Tehdidin boş olduğunu düşün',
        emoji: '💪',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: 20,
        consequenceId: 'whistleblower_outcome',
        consequenceDelayDays: 21,
      },
    ],
  },
  {
    id: 'celebrity_endorsement',
    title: 'Ünlü Marka Ortaklığı',
    description: 'Tanınmış bir ünlü markana ortak olmak istiyor. Kısa vadeli maliyet, uzun vadeli kazanç.',
    emoji: '⭐',
    minTotalEarned: 4_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'partner_celebrity',
        label: 'Anlaşmayı imzala — ₺600K',
        emoji: '🤝',
        moneyDelta: -600_000,
        reputationDelta: 35,
        stressDelta: 8,
        consequenceId: 'celebrity_deal_payoff',
        consequenceDelayDays: 30,
      },
      {
        id: 'decline_celebrity',
        label: 'Kurumsal kimliği koru',
        emoji: '🏛️',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: -5,
      },
    ],
  },
  {
    id: 'hostile_takeover',
    title: 'Şirketi Ele Geçirme Teklifi',
    description: 'Büyük bir holding şirketini satın almak istiyor. Yüksek teklif var ama bağımsızlığını kaybedersin.',
    emoji: '🏢',
    minTotalEarned: 50_000_000,
    cooldownDays: 360,
    choices: [
      {
        id: 'sell_company',
        label: 'Sat — büyük kazanç al',
        emoji: '💎',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: -20,
        consequenceId: 'company_sold_bonus',
        consequenceDelayDays: 7,
      },
      {
        id: 'defend_company',
        label: 'Bağımsızlığı koru — reddet',
        emoji: '🛡️',
        moneyDelta: 0,
        reputationDelta: 20,
        stressDelta: 15,
        riskOutcome: {
          winChance: 0.70,
          winMoneyDelta: 0, winReputationDelta: 15, winHeadline: '🛡️ Savunma başarılı — holding geri çekildi',
          lossMoneyDelta: -500_000, lossReputationDelta: -10, lossHeadline: '⚠️ Holding baskı uyguladı — hukuki masraf arttı',
        },
      },
    ],
  },
  {
    id: 'tax_audit',
    title: 'Vergi Denetimi!',
    description: 'Maliye Bakanlığı şirketini denetlemeye aldı. Kayıtların temiz mi?',
    emoji: '📊',
    minTotalEarned: 5_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'full_compliance',
        label: 'Tam uyum — her şeyi aç',
        emoji: '📋',
        moneyDelta: -100_000,
        reputationDelta: 15,
        stressDelta: 10,
      },
      {
        id: 'partial_hide',
        label: 'Bazı kayıtları sakla',
        emoji: '🙈',
        moneyDelta: 50_000,
        reputationDelta: -10,
        stressDelta: 25,
        consequenceId: 'tax_audit_caught',
        consequenceDelayDays: 30,
      },
    ],
  },
  {
    id: 'divorce_threat',
    title: 'Evlilik Krizi',
    description: 'Eşin son zamanlarda ihmal edildiğini söylüyor. İlişkiniz tehlikede.',
    emoji: '💔',
    minTotalEarned: 1_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'make_time',
        label: 'Zaman ayır — işi bırak biraz',
        emoji: '🌹',
        moneyDelta: 0,
        reputationDelta: 8,
        stressDelta: -15,
        healthDelta: 5,
      },
      {
        id: 'expensive_gift',
        label: 'Büyük hediye — ₺300K',
        emoji: '💍',
        moneyDelta: -300_000,
        reputationDelta: 5,
        stressDelta: -5,
        riskOutcome: {
          winChance: 0.60,
          winMoneyDelta: 0, winReputationDelta: 8, winHeadline: '💑 Hediye işe yaradı — ilişki güçlendi',
          lossMoneyDelta: 0, lossReputationDelta: -5, lossHeadline: '💔 Hediye yetmedi — eş hâlâ mutsuz',
        },
      },
    ],
  },
  {
    id: 'mentor_call',
    title: 'Mentor Çağırıyor',
    description: 'Eski bir iş danışmanı seni aradı. Değerli tavsiyeler verebilir ama zaman ve para isteyecek.',
    emoji: '🧑‍🏫',
    minTotalEarned: 500_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'meet_mentor',
        label: 'Buluş — ₺50K danışmanlık ücreti',
        emoji: '☕',
        moneyDelta: -50_000,
        reputationDelta: 10,
        stressDelta: -5,
        healthDelta: 5,
        consequenceId: 'mentor_wisdom',
        consequenceDelayDays: 7,
      },
      {
        id: 'skip_mentor',
        label: 'Meşgulsün — reddet',
        emoji: '⏰',
        moneyDelta: 0,
        reputationDelta: -3,
        stressDelta: 5,
      },
    ],
  },
  {
    id: 'stock_market_crash',
    title: 'Borsa Çöküşü!',
    description: 'Ekonomik belirsizlik piyasaları sarstı. Borsadaki yatırımların büyük kayıp gördü.',
    emoji: '📉',
    minTotalEarned: 2_000_000,
    cooldownDays: 240,
    choices: [
      {
        id: 'panic_sell',
        label: 'Panikle sat — zararı durdur',
        emoji: '🏃',
        moneyDelta: 0,
        reputationDelta: -5,
        stressDelta: 20,
        consequenceId: 'crash_sold_cheap',
        consequenceDelayDays: 30,
      },
      {
        id: 'hold_and_buy',
        label: 'Tut ve daha fazla al',
        emoji: '💎',
        moneyDelta: -200_000,
        reputationDelta: 10,
        stressDelta: 25,
        consequenceId: 'crash_recovery_gain',
        consequenceDelayDays: 60,
      },
    ],
  },
  {
    id: 'city_expansion_offer',
    title: 'Yeni Şehir Yatırım Fırsatı',
    description: 'Büyüyen bir şehirde erken yatırım fırsatı çıktı. Belediye seni resmi davet etti.',
    emoji: '🌆',
    minTotalEarned: 10_000_000,
    cooldownDays: 180,
    choices: [
      {
        id: 'expand_city',
        label: 'Yatırım yap — ₺2M',
        emoji: '🏗️',
        moneyDelta: -2_000_000,
        reputationDelta: 20,
        stressDelta: 10,
        consequenceId: 'city_investment_return',
        consequenceDelayDays: 90,
      },
      {
        id: 'focus_current',
        label: 'Mevcut şehre odaklan',
        emoji: '🎯',
        moneyDelta: 0,
        reputationDelta: 0,
        stressDelta: -5,
      },
    ],
  },
  {
    id: 'talent_headhunt',
    title: 'Üst Düzey Yetenek Teklifi',
    description: 'Rakip firmadan yetenekli bir direktör seni seçti. İşe almak pahalı ama değerli.',
    emoji: '🎯',
    minTotalEarned: 5_000_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'hire_talent',
        label: 'İşe al — aylık ₺500K maaş',
        emoji: '👔',
        moneyDelta: 0,
        reputationDelta: 10,
        stressDelta: -5,
        consequenceId: 'talent_productivity',
        consequenceDelayDays: 30,
      },
      {
        id: 'decline_talent',
        label: 'İç kaynaklarını tercih et',
        emoji: '🤷',
        moneyDelta: 0,
        reputationDelta: 5,
        stressDelta: 0,
      },
    ],
  },
  {
    id: 'street_lawsuit',
    title: 'Anlık Dava Tehdidi',
    description: 'Bir iş ortağın geçmiş anlaşmazlık nedeniyle dava açmakla tehdit ediyor. Uzlaşır mısın?',
    emoji: '⚖️',
    minTotalEarned: 2_000_000,
    cooldownDays: 90,
    choices: [
      {
        id: 'settle_lawsuit',
        label: 'Uzlaş — ₺250K',
        emoji: '🤝',
        moneyDelta: -250_000,
        reputationDelta: -5,
        stressDelta: 10,
        riskOutcome: {
          winChance: 0.80,
          winMoneyDelta: 0, winReputationDelta: 5, winHeadline: '✅ Uzlaşma kabul edildi — dava kapandı',
          lossMoneyDelta: -100_000, lossReputationDelta: -10, lossHeadline: '⚖️ Uzlaşma reddedildi — dava devam ediyor',
        },
      },
      {
        id: 'fight_lawsuit',
        label: 'Avukat tut — mahkemeye git',
        emoji: '⚖️',
        moneyDelta: -120_000,
        reputationDelta: 0,
        stressDelta: 30,
        consequenceId: 'lawsuit_verdict',
        consequenceDelayDays: 45,
      },
    ],
  },
  {
    id: 'gambling_night',
    title: 'Kumar Gecesi',
    description: 'İş ortakların seni özel bir casino gecesine davet etti. Yüksek riskli ama kazanç büyük olabilir.',
    emoji: '🎰',
    minTotalEarned: 500_000,
    cooldownDays: 120,
    choices: [
      {
        id: 'go_all_in',
        label: 'Her şeyi masaya koy — ₺500K',
        emoji: '🎲',
        moneyDelta: -500_000,
        reputationDelta: -5,
        stressDelta: 20,
        riskOutcome: {
          winChance: 0.40,
          winMoneyDelta: 1_500_000, winReputationDelta: 10, winHeadline: '🎉 Büyük kazanç! Masa senindi',
          lossMoneyDelta: 0, lossReputationDelta: -10, lossHeadline: '😞 Kumar gecesi çok pahalıya patladı',
        },
      },
      {
        id: 'skip_gambling',
        label: 'Katılma — riski alma',
        emoji: '🙅',
        moneyDelta: 0,
        reputationDelta: 3,
        stressDelta: -5,
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

export interface EventChoiceRecord {
  eventId: LifeEventId
  choiceId: string
  gameDay: number
}

export function shouldTriggerLifeEvent(
  seenEvents: ActiveLifeEvent[],
  def: LifeEventDef,
  currentGameDay: number,
  totalEarned: number,
  choiceHistory: EventChoiceRecord[],
): boolean {
  if (totalEarned < def.minTotalEarned) return false
  const last = seenEvents.find((e) => e.eventId === def.id)
  if (last && currentGameDay - last.seenAtGameDay < def.cooldownDays) return false

  if (def.requiresChoice) {
    const req = def.requiresChoice
    const hasChoice = choiceHistory.some(
      (r) => r.eventId === req.eventId && r.choiceId === req.choiceId,
    )
    if (!hasChoice) return false
    // Chain events: only trigger once — check if already seen
    if (def.chainOf && last) return false
  }

  return Math.random() < 0.008
}

export function resolveConsequence(
  consequenceId: string,
  eventId: LifeEventId,
): { moneyDelta: number; reputationDelta: number; healthDelta?: number; headline: string } {
  const map: Record<string, { moneyDelta: number; reputationDelta: number; healthDelta?: number; headline: string }> = {
    wallet_gratitude: { moneyDelta: 15_000, reputationDelta: 10, headline: '✅ Cüzdan sahibi teşekkür etti ve ödül verdi — dürüstlük kazandırdı' },
    wallet_mafia: { moneyDelta: -80_000, reputationDelta: -20, headline: '⚠️ Cüzdan mafyadan çıktı! Şantaj tehdidi para aldı' },
    mafia_partner_income: { moneyDelta: 300_000, reputationDelta: -10, headline: '💼 Mafya ortaklığından gelir aktarıldı — ama itibarın zedelendi' },
    partner_bonus: { moneyDelta: 250_000, reputationDelta: 8, headline: '🤝 Eski ortağın projesi başarıyla kapandı — ortak kâr payı geldi' },
    strike_penalty: { moneyDelta: 0, reputationDelta: -20, headline: '⚠️ Çalışanlar greve çıktı — 3 gün üretim durdu' },
    startup_payoff: { moneyDelta: 800_000, reputationDelta: 15, headline: '🚀 Startup yatırımın 8x getiri sağladı! Girişim haberlerde' },
    startup_big_payoff: { moneyDelta: 400_000, reputationDelta: 12, headline: '💡 Startup yatırımın meyvesini verdi — 8x getiri geldi!' },
    insider_win: { moneyDelta: 450_000, reputationDelta: -15, headline: '📈 İçeriden al-sat getirisi: +₺450K — ama piyasa dedikodular çıktı' },
    court_win: { moneyDelta: 150_000, reputationDelta: 20, headline: '⚖️ Mahkeme senin lehine bitti — tazminat ödendi' },
    media_rival_copy: { moneyDelta: 0, reputationDelta: -5, headline: '📑 Rakip şirket röportajın sonrası iş modelini kopyaladı!' },
    lawsuit_verdict: { moneyDelta: 500_000, reputationDelta: 15, headline: '⚖️ Dava kazanıldı! Rakipten ₺500K tazminat alındı' },
    friend_recovery: { moneyDelta: 0, reputationDelta: 10, healthDelta: 3, headline: '💚 Arkadaşın iyileşti — o da seni asla unutmayacak' },
    child_case_outcome: { moneyDelta: 0, reputationDelta: 10, headline: '👨‍⚖️ Hukuki süreç sonuçlandı — çocuğun aklandı' },
    tv_advertising_bonus: { moneyDelta: 500_000, reputationDelta: 5, headline: '📺 TV görünürlüğü reklam gelirini artırdı — ₺500K bonus' },
    inheritance_received: { moneyDelta: 2_000_000, reputationDelta: 5, headline: '🏛️ Miras devri tamamlandı — ₺2M hesabına geçti' },
    inheritance_donated: { moneyDelta: 0, reputationDelta: 30, headline: '❤️ Mirası bağışladın — şehir iyiliğini konuşuyor' },
    rival_assets_profit: { moneyDelta: 1_500_000, reputationDelta: 8, headline: '💥 Rakip varlıkları 3x getiriyle satıldı!' },
    rival_clients_gained: { moneyDelta: 800_000, reputationDelta: 10, headline: '👥 Rakibin müşterileri sana aktı — müşteri tabanı genişledi' },
    gov_contract_win: { moneyDelta: 3_000_000, reputationDelta: 20, headline: '🏗️ Devlet ihalesi temiz teklifle kazanıldı!' },
    gov_contract_guaranteed: { moneyDelta: 4_000_000, reputationDelta: -5, headline: '🏗️ İhale kazanıldı — ama bazı çevreler torpili fark etti' },
    accident_lawsuit: { moneyDelta: -1_000_000, reputationDelta: -30, headline: '⚠️ Kaza davası kaybedildi — ₺1M tazminat ödenecek' },
    whistleblower_outcome: { moneyDelta: -500_000, reputationDelta: -25, headline: '🕵️ Eski çalışan sızdırdı — kamuoyu baskısı altındasın' },
    celebrity_deal_payoff: { moneyDelta: 2_000_000, reputationDelta: 10, headline: '⭐ Ünlü ortaklık markanı zirveye taşıdı!' },
    company_sold_bonus: { moneyDelta: 100_000_000, reputationDelta: -5, headline: '💎 Şirket satışı tamamlandı — büyük kazanç hesabında' },
    tax_audit_caught: { moneyDelta: -2_000_000, reputationDelta: -30, headline: '📊 Vergi denetiminde kayıtlar tutarsız bulundu — ağır ceza!' },
    crash_sold_cheap: { moneyDelta: -100_000, reputationDelta: -5, headline: '📉 Panikle sattıkların çok ucuza gitti — yanlış karar' },
    crash_recovery_gain: { moneyDelta: 1_500_000, reputationDelta: 15, headline: '📈 Borsa toparlandı — sabredenin büyük kazancı var' },
    city_investment_return: { moneyDelta: 8_000_000, reputationDelta: 20, headline: '🌆 Şehir yatırımı 4x getiriyle döndü!' },
    mentor_wisdom: { moneyDelta: 0, reputationDelta: 5, healthDelta: 5, headline: '🧑‍🏫 Mentorun tavsiyesi zihnini açtı — yeni perspektif kazandın' },
    talent_productivity: { moneyDelta: 500_000, reputationDelta: 8, headline: '👔 İşe aldığın direktör şirketi büyüttü — verimlilik arttı' },
  }
  return map[consequenceId] ?? { moneyDelta: 0, reputationDelta: 0, headline: `${eventId} sonucu` }
}

export function lifeEventTitle(def: LifeEventDef): string {
  return tRaw(`life_${def.id}_title`) ?? def.title
}
export function lifeEventDesc(def: LifeEventDef): string {
  return tRaw(`life_${def.id}_desc`) ?? def.description
}
export function lifeChoiceLabel(eventId: string, choice: LifeEventChoice): string {
  return tRaw(`life_${eventId}_choice_${choice.id}_label`) ?? choice.label
}
