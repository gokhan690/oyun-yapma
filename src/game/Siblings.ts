export interface Sibling {
  id: string
  name: string
  gender: 'male' | 'female'
  /** Age offset relative to player (can be negative = older) */
  ageOffset: number
  relationScore: number   // 0–100
  alive: boolean
  job: string
  lastVisitDay: number
}

const MALE_NAMES = ['Emre', 'Can', 'Kerem', 'Selim', 'Arda', 'Mert', 'Tolga', 'Burak']
const FEMALE_NAMES = ['Ayşe', 'Elif', 'Deniz', 'Selin', 'Zeynep', 'Pınar', 'Naz', 'Buse']
const JOBS = ['Mühendis', 'Öğretmen', 'Doktor', 'Avukat', 'Esnaf', 'Gazeteci', 'Bankacı', 'Akademisyen']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** Generate 0–2 siblings at game start */
export function generateSiblings(): Sibling[] {
  const count = Math.random() < 0.25 ? 0 : Math.random() < 0.6 ? 1 : 2
  const siblings: Sibling[] = []
  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female'
    const name = gender === 'male' ? randomItem(MALE_NAMES) : randomItem(FEMALE_NAMES)
    // Age offset: -8 to +8 years (skip 0), not both same offset
    let offset: number
    do {
      offset = Math.round((Math.random() - 0.5) * 16)
    } while (offset === 0 || siblings.some((s) => s.ageOffset === offset))
    siblings.push({
      id: `sibling_${i}`,
      name,
      gender,
      ageOffset: offset,
      relationScore: 50 + Math.round((Math.random() - 0.5) * 30),
      alive: true,
      job: randomItem(JOBS),
      lastVisitDay: 0,
    })
  }
  return siblings
}

/** Sibling's current age (playerAge + ageOffset) */
export function siblingAge(playerAge: number, s: Sibling): number {
  return Math.max(1, playerAge + s.ageOffset)
}

/** Daily death chance for a sibling (starts at age 70) */
export function siblingDeathChance(age: number): number {
  if (age >= 80) return 0.0030
  if (age >= 75) return 0.0015
  if (age >= 70) return 0.0005
  return 0
}

/** Check for sibling deaths; returns ids of deceased siblings */
export function tickSiblingYear(siblings: Sibling[], playerAge: number): string[] {
  const died: string[] = []
  for (const s of siblings) {
    if (!s.alive) continue
    const age = siblingAge(playerAge, s)
    if (Math.random() < siblingDeathChance(age)) {
      s.alive = false
      died.push(s.id)
    }
  }
  return died
}

/** Visit a sibling once per day. Returns money gained (inheritance) or 0. */
export function visitSibling(s: Sibling, currentDay: number): number {
  if (!s.alive || s.lastVisitDay >= currentDay) return 0
  s.lastVisitDay = currentDay
  s.relationScore = Math.min(100, s.relationScore + 6)
  return 0
}

/** Inheritance when a sibling dies with high relation */
export function siblingInheritance(s: Sibling): number {
  if (!s.alive || s.relationScore < 60) return 0
  if (Math.random() < 0.6) {
    return 50_000 + Math.floor(Math.random() * 350_000)
  }
  return 0
}
