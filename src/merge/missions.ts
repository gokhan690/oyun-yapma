/**
 * Görev sistemi — her oyunda havuzdan 3 küçük hedef seçilir.
 * Tamamlananlar 🪙 para (bazıları ⭐ yıldız) verir.
 */

import { FRUITS } from './fruits'
import type { Rng } from './rng'

/** Oyun boyunca biriken sayaçlar; görevler bunlara bakar. */
export interface RunStats {
  score: number
  merges: number
  drops: number
  maxCombo: number
  biggest: number
  watermelons: number
  goldenMerges: number
  fevers: number
  bombUsed: boolean
  /** Tehlike çizgisine takılıp sonra kurtuldu mu? */
  escaped: boolean
  seconds: number
}

export function emptyRun(): RunStats {
  return {
    score: 0,
    merges: 0,
    drops: 0,
    maxCombo: 0,
    biggest: 0,
    watermelons: 0,
    goldenMerges: 0,
    fevers: 0,
    bombUsed: false,
    escaped: false,
    seconds: 0,
  }
}

export interface Mission {
  id: string
  text: string
  /** 0..1 ilerleme */
  progress: (run: RunStats) => number
  coins: number
  stars?: number
  done?: boolean
}

interface MissionSpec {
  id: string
  make: (rng: Rng) => Mission
}

const ratio = (value: number, target: number): number => Math.max(0, Math.min(1, value / target))

const POOL: MissionSpec[] = [
  {
    id: 'combo',
    make: (rng) => {
      const target = 3 + Math.floor(rng() * 3) // 3..5
      return {
        id: `combo${target}`,
        text: `×${target} combo yap`,
        coins: 20 + target * 5,
        progress: (r) => ratio(r.maxCombo, target),
      }
    },
  },
  {
    id: 'tier',
    make: (rng) => {
      const target = 5 + Math.floor(rng() * 3) // Elma..Şeftali
      return {
        id: `tier${target}`,
        text: `${FRUITS[target].name} yap`,
        coins: 25 + (target - 5) * 15,
        progress: (r) => ratio(r.biggest, target),
      }
    },
  },
  {
    id: 'score',
    make: (rng) => {
      const target = [1000, 2000, 3000][Math.floor(rng() * 3)]
      return {
        id: `score${target}`,
        text: `${target} puan yap`,
        coins: Math.round(target / 60),
        progress: (r) => ratio(r.score, target),
      }
    },
  },
  {
    id: 'merges',
    make: (rng) => {
      const target = [20, 30, 40][Math.floor(rng() * 3)]
      return {
        id: `merges${target}`,
        text: `${target} birleştirme yap`,
        coins: Math.round(target * 1.2),
        progress: (r) => ratio(r.merges, target),
      }
    },
  },
  {
    id: 'nobomb',
    make: () => ({
      id: 'nobombMelon',
      text: 'Bomba kullanmadan Kavun yap',
      coins: 80,
      stars: 1,
      progress: (r) => (r.bombUsed ? 0 : ratio(r.biggest, 9)),
    }),
  },
  {
    id: 'fever',
    make: () => ({
      id: 'fever',
      text: 'FEVER moduna gir',
      coins: 40,
      progress: (r) => ratio(r.fevers, 1),
    }),
  },
  {
    id: 'golden',
    make: () => ({
      id: 'golden',
      text: 'Altın meyve birleştir',
      coins: 50,
      progress: (r) => ratio(r.goldenMerges, 1),
    }),
  },
]

/** Havuzdan tekrarsız 3 görev seçer. */
export function rollMissions(rng: Rng, count = 3): Mission[] {
  const specs = [...POOL]
  const picked: Mission[] = []
  while (picked.length < count && specs.length > 0) {
    const i = Math.floor(rng() * specs.length)
    const [spec] = specs.splice(i, 1)
    picked.push({ ...spec.make(rng), done: false })
  }
  return picked
}
