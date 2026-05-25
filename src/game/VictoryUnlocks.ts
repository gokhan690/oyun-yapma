import type { VictoryId } from './VictoryConditions'

export type VictoryMechanic =
  | 'sovereign_lending'
  | 'global_lobby'
  | 'dynasty_academy'
  | 'shadow_network'

export interface VictoryUnlockDef {
  mechanic: VictoryMechanic
  title: string
  description: string
  emoji: string
}

export const VICTORY_UNLOCK_MAP: Record<VictoryId, VictoryUnlockDef> = {
  economic: {
    mechanic: 'sovereign_lending',
    title: 'Egemen Borç Verme',
    description: 'Artık ülkelere borç verebilirsin — Piyasa → Fırsatlar sekmesinde.',
    emoji: '🌍',
  },
  political: {
    mechanic: 'global_lobby',
    title: 'Küresel Lobi',
    description: 'Tüm rakiplere karşı güçlü lobi — maliyet %30 düşük.',
    emoji: '🏛️',
  },
  dynasty: {
    mechanic: 'dynasty_academy',
    title: 'Hanedan Akademisi',
    description: 'Çocuk eğitimi 2x hızlı — kriz riski daha görünür.',
    emoji: '🎓',
  },
  shadow: {
    mechanic: 'shadow_network',
    title: 'Gölge Ağı',
    description: 'Kara Borsa genişletildi — bilgi kaçakçılığı ve vergi kaçakçılığı açık.',
    emoji: '🕶️',
  },
}

export function mechanicForVictory(id: VictoryId): VictoryUnlockDef {
  return VICTORY_UNLOCK_MAP[id]
}

export function hasMechanic(unlocked: VictoryMechanic[], m: VictoryMechanic): boolean {
  return unlocked.includes(m)
}
