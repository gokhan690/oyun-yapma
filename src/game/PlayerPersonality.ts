export type PersonalityId = 'entrepreneur' | 'diplomat' | 'risk_hunter'

export interface PersonalityDef {
  id: PersonalityId
  name: string
  emoji: string
  description: string
  /** Pasif gelir çarpanı */
  incomeMult: number
  /** İşletme maliyet çarpanı */
  costMult: number
  /** İtibar kazanç çarpanı */
  reputationMult: number
  /** Illegal gelir çarpanı */
  illegalMult: number
  /** Ölüm riski çarpanı */
  deathRiskMult: number
}

export const PERSONALITIES: PersonalityDef[] = [
  {
    id: 'entrepreneur',
    name: 'Girişimci',
    emoji: '🚀',
    description: 'Para kazanmak için doğmuşsun. +%15 gelir, ama +%10 maliyet.',
    incomeMult: 1.15,
    costMult: 1.1,
    reputationMult: 1,
    illegalMult: 1,
    deathRiskMult: 1,
  },
  {
    id: 'diplomat',
    name: 'Diplomat',
    emoji: '🤝',
    description: 'İlişkilerin gücüne inanırsın. +%15 itibar kazancı, ama -%10 gelir.',
    incomeMult: 0.9,
    costMult: 1,
    reputationMult: 1.15,
    illegalMult: 1,
    deathRiskMult: 1,
  },
  {
    id: 'risk_hunter',
    name: 'Risk Avcısı',
    emoji: '🎲',
    description: 'Tehlike seni heyecanlandırır. +%25 illegal gelir, ama +%20 ölüm riski.',
    incomeMult: 1,
    costMult: 1,
    reputationMult: 1,
    illegalMult: 1.25,
    deathRiskMult: 1.2,
  },
]

export function personalityDef(id: PersonalityId | null): PersonalityDef | null {
  if (!id) return null
  return PERSONALITIES.find((p) => p.id === id) ?? null
}

export function personalityIncomeMult(id: PersonalityId | null): number {
  return personalityDef(id)?.incomeMult ?? 1
}

export function personalityCostMult(id: PersonalityId | null): number {
  return personalityDef(id)?.costMult ?? 1
}

export function personalityReputationMult(id: PersonalityId | null): number {
  return personalityDef(id)?.reputationMult ?? 1
}

export function personalityIllegalMult(id: PersonalityId | null): number {
  return personalityDef(id)?.illegalMult ?? 1
}

export function personalityDeathRiskMult(id: PersonalityId | null): number {
  return personalityDef(id)?.deathRiskMult ?? 1
}
