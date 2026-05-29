export interface HealthState {
  health: number
  lastHealthTickDay: number
  exerciseDaysActive: number
  privateDoctor: boolean
  foodQuality: 'fast' | 'normal' | 'chef'
}

export function createHealthState(): HealthState {
  return {
    health: 80,
    lastHealthTickDay: 0,
    exerciseDaysActive: 0,
    privateDoctor: false,
    foodQuality: 'normal',
  }
}

export function healthIncomePenalty(health: number): number {
  if (health <= 0) return 0.10
  if (health <= 20) return 0.75
  if (health <= 40) return 0.90
  return 1.0
}

export function healthDeathRiskBonus(health: number): number {
  if (health <= 0) return 0.3
  if (health <= 20) return 0.15
  if (health <= 40) return 0.05
  return 0
}

export function dailyHealthDelta(
  playerAge: number,
  stress: number,
  state: HealthState,
): number {
  let delta = 0

  // Age-based decline
  if (playerAge >= 70) delta -= 0.6
  else if (playerAge >= 60) delta -= 0.4
  else if (playerAge >= 50) delta -= 0.25
  else if (playerAge >= 40) delta -= 0.15
  else if (playerAge >= 30) delta -= 0.08
  else delta -= 0.03

  // Stress hurts health
  if (stress >= 80) delta -= 0.5
  else if (stress >= 60) delta -= 0.2
  else if (stress >= 40) delta -= 0.05

  // Positive factors
  if (state.exerciseDaysActive > 0) delta += 0.3
  if (state.privateDoctor) delta += 0.25

  // Food quality
  if (state.foodQuality === 'fast') delta -= 0.2
  else if (state.foodQuality === 'chef') delta += 0.3

  return delta
}

export function healthStatusLabel(health: number): string {
  if (health >= 80) return 'Mükemmel'
  if (health >= 60) return 'İyi'
  if (health >= 40) return 'Orta'
  if (health >= 20) return 'Zayıf'
  if (health > 0) return 'Kritik'
  return 'Hasta Yatağı'
}

export function healthStatusColor(health: number): string {
  if (health >= 80) return '#5ee0a0'
  if (health >= 60) return '#72b7ff'
  if (health >= 40) return '#f8b84e'
  if (health >= 20) return '#f87171'
  return '#dc2626'
}
