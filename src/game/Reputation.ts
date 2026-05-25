/** Toplumda görünürlük — heat'ten bağımsız sosyal stat */
export const REPUTATION_MIN = 0
export const REPUTATION_MAX = 100
export const REPUTATION_START = 52

export function clampReputation(n: number): number {
  return Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, Math.round(n)))
}

/** Yüksek itibar → daha ucuz işletme (max ~%12 indirim) */
export function reputationCostMult(reputation: number): number {
  const t = clampReputation(reputation) / REPUTATION_MAX
  return 1.12 - t * 0.12
}

export function reputationLoanBlocked(reputation: number): boolean {
  return reputation < 25
}

export function reputationPoliticsBlocked(reputation: number): boolean {
  return reputation < 30
}

export function reputationLabel(reputation: number): string {
  const r = clampReputation(reputation)
  if (r >= 85) return 'Efsanevi'
  if (r >= 70) return 'Saygın'
  if (r >= 55) return 'Güvenilir'
  if (r >= 40) return 'Şüpheli'
  if (r >= 25) return 'Skandal'
  return 'Pariah'
}

export function reputationFromLegalBusiness(): number {
  return 0.6
}

export function reputationFromIllegalBusiness(): number {
  return -1.5
}

export function reputationFromRaid(): number {
  return -7
}

export function reputationFromLobby(): number {
  return 0.4
}

export function reputationFromScandal(): number {
  return -5
}

/** IPO sonrası taşınan itibar oranı */
export const REPUTATION_IPO_CARRY_RATIO = 0.3

export function carryReputationAfterIpo(reputation: number): number {
  return clampReputation(Math.floor(reputation * REPUTATION_IPO_CARRY_RATIO + REPUTATION_START * 0.5))
}
