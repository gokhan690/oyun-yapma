export type NamedManagerId = 'fatma' | 'mehmet' | 'ahmet' | 'zara'

export interface NamedManagerDef {
  id: NamedManagerId
  name: string
  emoji: string
  specialty: string
  dailySalary: number
  hireCost: number
  passiveMult?: number
  producerMult?: Record<string, number>
  illegalHeatReduce?: number
  globalPassiveMult?: number
}

export const NAMED_MANAGERS: NamedManagerDef[] = [
  {
    id: 'fatma',
    name: 'Fatma Hanım',
    emoji: '👩‍💼',
    specialty: 'Lojistik +%30',
    dailySalary: 2000,
    hireCost: 25_000,
    producerMult: { fabrika: 0.3, liman: 0.25 },
  },
  {
    id: 'mehmet',
    name: 'Mehmet Bey',
    emoji: '👨‍💻',
    specialty: 'Yazılım +%25',
    dailySalary: 8000,
    hireCost: 80_000,
    producerMult: { holding: 0.25, ai: 0.2 },
  },
  {
    id: 'ahmet',
    name: 'Ahmet Bey',
    emoji: '🧑‍💼',
    specialty: 'Tüm işletmeler +%5',
    dailySalary: 15_000,
    hireCost: 200_000,
    globalPassiveMult: 0.05,
  },
  {
    id: 'zara',
    name: 'Zara Demir',
    emoji: '🕶️',
    specialty: 'Illegal risk azaltır',
    dailySalary: 12_000,
    hireCost: 150_000,
    illegalHeatReduce: 0.15,
  },
]

export interface HiredNamedManager {
  id: NamedManagerId
  hiredGameDay: number
}

export function namedManagerDef(id: NamedManagerId): NamedManagerDef | undefined {
  return NAMED_MANAGERS.find((m) => m.id === id)
}
