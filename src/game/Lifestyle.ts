export type ResidenceId = 'kira' | 'daire' | 'villa' | 'saray'
export type VehicleId = 'yuruyus' | 'ekonomik' | 'luks_sedan' | 'super_araba' | 'ozel_jet'
export type PetId = 'kopek' | 'kedi' | 'at'
export type WellbeingActivityId = 'terapi' | 'meditasyon' | 'tatil_kisa' | 'tatil_uzun'

export interface ResidenceDef {
  id: ResidenceId
  name: string
  emoji: string
  description: string
  buyCost: number
  monthlyRent: number
  happinessBonus: number
  reputationBonus: number
  stressReduction: number
}

export interface VehicleDef {
  id: VehicleId
  name: string
  emoji: string
  description: string
  buyCost: number
  monthlyUpkeep: number
  reputationBonus: number
  incomeMult: number
}

export interface PetDef {
  id: PetId
  name: string
  emoji: string
  description: string
  buyCost: number
  monthlyUpkeep: number
  dailyStressReduction: number
}

export interface WellbeingActivityDef {
  id: WellbeingActivityId
  name: string
  emoji: string
  description: string
  cost: number
  stressReduction: number
  durationDays: number
  incomePenaltyDays: number
}

export const RESIDENCES: ResidenceDef[] = [
  {
    id: 'kira',
    name: 'Kiralık Daire',
    emoji: '🏠',
    description: 'Küçük ama yeterli. Her ay kira ödüyorsun.',
    buyCost: 0,
    monthlyRent: 8_000,
    happinessBonus: 0,
    reputationBonus: 0,
    stressReduction: 0,
  },
  {
    id: 'daire',
    name: '3+1 Kendi Dairesi',
    emoji: '🏢',
    description: 'Kira yok, huzur var. Şehir merkezinde konforlu daire.',
    buyCost: 350_000,
    monthlyRent: 0,
    happinessBonus: 10,
    reputationBonus: 5,
    stressReduction: 5,
  },
  {
    id: 'villa',
    name: 'Boğaz Villası',
    emoji: '🏡',
    description: 'Deniz manzaralı, havuzlu villa. Statü simgesi.',
    buyCost: 2_500_000,
    monthlyRent: 0,
    happinessBonus: 25,
    reputationBonus: 20,
    stressReduction: 15,
  },
  {
    id: 'saray',
    name: 'Özel Saray Kompleksi',
    emoji: '🏰',
    description: 'Özel güvenlik, helipad, olimpik havuz. Gerçek baron gibi.',
    buyCost: 25_000_000,
    monthlyRent: 0,
    happinessBonus: 50,
    reputationBonus: 50,
    stressReduction: 30,
  },
]

export const VEHICLES: VehicleDef[] = [
  {
    id: 'yuruyus',
    name: 'Yürüyüş',
    emoji: '🚶',
    description: 'Araç yok. Ucuz ama zaman kaybı.',
    buyCost: 0,
    monthlyUpkeep: 0,
    reputationBonus: 0,
    incomeMult: 1.0,
  },
  {
    id: 'ekonomik',
    name: 'Ekonomik Araç',
    emoji: '🚗',
    description: 'Güvenilir, pratik. Günlük hayat için yeterli.',
    buyCost: 120_000,
    monthlyUpkeep: 3_000,
    reputationBonus: 3,
    incomeMult: 1.02,
  },
  {
    id: 'luks_sedan',
    name: 'Lüks Sedan',
    emoji: '🚙',
    description: 'Mercedes, BMW veya Audi. Toplantılara stil katıyor.',
    buyCost: 850_000,
    monthlyUpkeep: 12_000,
    reputationBonus: 15,
    incomeMult: 1.05,
  },
  {
    id: 'super_araba',
    name: 'Süper Araba',
    emoji: '🏎️',
    description: 'Ferrari veya Lamborghini. Herkes dönüp bakıyor.',
    buyCost: 5_000_000,
    monthlyUpkeep: 40_000,
    reputationBonus: 35,
    incomeMult: 1.08,
  },
  {
    id: 'ozel_jet',
    name: 'Özel Jet',
    emoji: '✈️',
    description: 'Global iş görüşmeleri, VIP seyahat. Gerçek imparator böyle seyahat eder.',
    buyCost: 40_000_000,
    monthlyUpkeep: 500_000,
    reputationBonus: 75,
    incomeMult: 1.15,
  },
]

export const PETS: PetDef[] = [
  {
    id: 'kopek',
    name: 'Sahiplenilen Köpek',
    emoji: '🐕',
    description: 'En sadık arkadaş. Her gün stresi azaltır.',
    buyCost: 15_000,
    monthlyUpkeep: 3_000,
    dailyStressReduction: 4,
  },
  {
    id: 'kedi',
    name: 'Aristokrat Kedi',
    emoji: '🐈',
    description: 'Bağımsız ve zarif. Sakinleştirici etkisi var.',
    buyCost: 8_000,
    monthlyUpkeep: 1_500,
    dailyStressReduction: 2,
  },
  {
    id: 'at',
    name: 'Yarış Atı',
    emoji: '🐎',
    description: 'Hipodromda prestij, hafta sonu terapi.',
    buyCost: 500_000,
    monthlyUpkeep: 25_000,
    dailyStressReduction: 6,
  },
]

export const WELLBEING_ACTIVITIES: WellbeingActivityDef[] = [
  {
    id: 'terapi',
    name: 'Psikoloji Terapisi',
    emoji: '🛋️',
    description: 'Aylık düzenli seans. Stres birikimini engeller.',
    cost: 25_000,
    stressReduction: 30,
    durationDays: 30,
    incomePenaltyDays: 0,
  },
  {
    id: 'meditasyon',
    name: 'Meditasyon Kursu',
    emoji: '🧘',
    description: 'Tek seferlik kurs. Stres toleransını artırır.',
    cost: 12_000,
    stressReduction: 20,
    durationDays: 7,
    incomePenaltyDays: 0,
  },
  {
    id: 'tatil_kisa',
    name: 'Kısa Tatil (3 Gün)',
    emoji: '🏖️',
    description: 'Antalya, Bodrum. Stres eriyip gider ama 3 gün işletmeler yavaş.',
    cost: 50_000,
    stressReduction: 45,
    durationDays: 3,
    incomePenaltyDays: 3,
  },
  {
    id: 'tatil_uzun',
    name: 'Lüks Yurt Dışı Tatil',
    emoji: '🌍',
    description: 'Maldivler, Paris, Dubai. Stres sıfırlanır. 7 gün tam huzur.',
    cost: 200_000,
    stressReduction: 100,
    durationDays: 7,
    incomePenaltyDays: 7,
  },
]

export interface OwnedPropertyEntry {
  id: string
  purchasedDay: number
  isRenting: boolean
  rentalMonthlyIncome: number
}

export interface LifestyleState {
  residence: ResidenceId
  vehicle: VehicleId
  pets: PetId[]
  stress: number
  burnoutDays: number
  meditationLevel: number
  therapyActiveUntilDay: number
  vacationActiveUntilDay: number
  ownedResidences: OwnedPropertyEntry[]
  ownedVehicles: OwnedPropertyEntry[]
}

export function createLifestyleState(): LifestyleState {
  return {
    residence: 'kira',
    vehicle: 'yuruyus',
    pets: [],
    stress: 15,
    burnoutDays: 0,
    meditationLevel: 0,
    therapyActiveUntilDay: 0,
    vacationActiveUntilDay: 0,
    ownedResidences: [],
    ownedVehicles: [],
  }
}

export function lifestyleRentalIncome(ls: LifestyleState): number {
  let income = 0
  for (const entry of ls.ownedResidences) {
    if (entry.isRenting) income += entry.rentalMonthlyIncome
  }
  for (const entry of ls.ownedVehicles) {
    if (entry.isRenting) income += entry.rentalMonthlyIncome
  }
  return income
}

export function residenceSellValue(id: ResidenceId): number {
  const def = RESIDENCES.find((r) => r.id === id)
  if (!def || def.buyCost <= 0) return 0
  return Math.floor(def.buyCost * 0.75)
}

export function vehicleSellValue(id: VehicleId): number {
  const def = VEHICLES.find((v) => v.id === id)
  if (!def || def.buyCost <= 0) return 0
  return Math.floor(def.buyCost * 0.65)
}

export function defaultRentalIncome(id: ResidenceId): number {
  const def = RESIDENCES.find((r) => r.id === id)
  if (!def || def.buyCost <= 0) return 0
  return Math.floor(def.buyCost * 0.005)
}

export function defaultVehicleRentalIncome(id: VehicleId): number {
  const def = VEHICLES.find((v) => v.id === id)
  if (!def || def.buyCost <= 0) return 0
  return Math.floor(def.buyCost * 0.003)
}

export function residenceDef(id: ResidenceId): ResidenceDef {
  return RESIDENCES.find((r) => r.id === id) ?? RESIDENCES[0]!
}

export function vehicleDef(id: VehicleId): VehicleDef {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0]!
}

export function lifestyleMonthlyExpense(ls: LifestyleState): number {
  const res = residenceDef(ls.residence)
  const veh = vehicleDef(ls.vehicle)
  const petCost = ls.pets.reduce((sum, pid) => {
    const p = PETS.find((x) => x.id === pid)
    return sum + (p?.monthlyUpkeep ?? 0)
  }, 0)
  return res.monthlyRent + veh.monthlyUpkeep + petCost
}

export function lifestyleReputationBonus(ls: LifestyleState): number {
  const res = residenceDef(ls.residence)
  const veh = vehicleDef(ls.vehicle)
  return res.reputationBonus + veh.reputationBonus
}

export function lifestyleVehicleIncomeMult(ls: LifestyleState): number {
  return vehicleDef(ls.vehicle).incomeMult
}

export function stressIncomePenalty(stress: number, burnoutDays: number): number {
  if (burnoutDays >= 3) return 0.5
  if (stress >= 80) return 0.75
  if (stress >= 60) return 0.88
  if (stress >= 40) return 0.96
  return 1
}

export function stressLabel(stress: number): string {
  if (stress >= 90) return 'Tükenmişlik'
  if (stress >= 70) return 'Kritik'
  if (stress >= 50) return 'Yüksek'
  if (stress >= 30) return 'Orta'
  return 'Düşük'
}

export function stressEmoji(stress: number): string {
  if (stress >= 90) return '💀'
  if (stress >= 70) return '😤'
  if (stress >= 50) return '😰'
  if (stress >= 30) return '😕'
  return '😊'
}

export function dailyStressDelta(
  ls: LifestyleState,
  activeBizCount: number,
  illegalHeat: number,
  currentGameDay: number,
): number {
  let delta = 0

  // Stres artışı
  delta += Math.max(0, (activeBizCount - 5) * 0.4)
  delta += illegalHeat * 0.08

  // Evcil hayvan azaltma
  for (const pid of ls.pets) {
    const p = PETS.find((x) => x.id === pid)
    if (p) delta -= p.dailyStressReduction
  }

  // Konut rahatlatma
  delta -= residenceDef(ls.residence).stressReduction * 0.3

  // Terapi aktif mi?
  if (currentGameDay < ls.therapyActiveUntilDay) delta -= 2

  // Meditasyon
  delta -= ls.meditationLevel * 0.5

  // Tatil aktif mi?
  if (currentGameDay < ls.vacationActiveUntilDay) delta -= 8

  return delta
}
