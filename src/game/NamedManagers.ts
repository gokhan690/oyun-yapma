import { tRaw } from '../i18n'

export type NamedManagerId = 'fatma' | 'mehmet' | 'ahmet' | 'zara' | 'ayse' | 'kemal' | 'leyla' | 'orhan'

export interface NamedManagerDef {
  id: NamedManagerId
  name: string
  emoji: string
  specialty: string
  dailySalary: number
  hireCost: number
  requiredFirmLevel?: number
  requiredFirmLevelByProducer?: Record<string, number>
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
    dailySalary: 750,
    hireCost: 25_000,
    producerMult: { stajyer: 0.12, fabrika: 0.3, liman: 0.25, kargo: 0.18, drone: 0.18, fulfillment: 0.18 },
    requiredFirmLevelByProducer: { stajyer: 2 },
  },
  {
    id: 'mehmet',
    name: 'Mehmet Bey',
    emoji: '👨‍💻',
    specialty: 'Yazılım +%25',
    dailySalary: 1250,
    hireCost: 80_000,
    producerMult: { robot: 0.16, mobil_app: 0.20, holding: 0.25, ai: 0.2, oyun_studio: 0.22, data_center: 0.20, streaming: 0.18, fitness_app: 0.16, online_egitim: 0.16 },
  },
  {
    id: 'ahmet',
    name: 'Ahmet Bey',
    emoji: '🧑‍💼',
    specialty: 'Tüm işletmeler +%5',
    dailySalary: 2500,
    hireCost: 200_000,
    globalPassiveMult: 0.05,
  },
  {
    id: 'zara',
    name: 'Zara Demir',
    emoji: '🕶️',
    specialty: 'Illegal risk azaltır',
    dailySalary: 1500,
    hireCost: 150_000,
    illegalHeatReduce: 0.15,
  },
  {
    id: 'ayse',
    name: 'Ayşe Çelik',
    emoji: '👩‍⚕️',
    specialty: 'Sağlık & İlaç +%35',
    dailySalary: 1200,
    hireCost: 95_000,
    producerMult: { berber: 0.16, guzellik: 0.18, gym: 0.12, hastane: 0.35, ilac: 0.25, gen_terapi: 0.20 },
  },
  {
    id: 'kemal',
    name: 'Kemal Arslan',
    emoji: '👨‍🌾',
    specialty: 'Tarım & Gıda +%30',
    dailySalary: 750,
    hireCost: 60_000,
    producerMult: { stajyer: 0.16, firin: 0.18, kafe: 0.18, ofis: 0.18, cikolata: 0.20, catering: 0.15, tarim_tek: 0.30 },
  },
  {
    id: 'leyla',
    name: 'Leyla Şahin',
    emoji: '👩‍💻',
    specialty: 'Fintech +%30',
    dailySalary: 1500,
    hireCost: 120_000,
    producerMult: { kripto: 0.30, nft_borsa: 0.25, borsa_araci: 0.20 },
  },
  {
    id: 'orhan',
    name: 'Orhan Doğan',
    emoji: '🤵',
    specialty: 'Lüks İmparatorluk +%25',
    dailySalary: 1500,
    hireCost: 180_000,
    producerMult: { berber: 0.12, kuyumcu: 0.25, tatil_koyu: 0.20, yacht_filo: 0.25, saat_marka: 0.20, moda_evi: 0.20, sanat_galeri: 0.18 },
    requiredFirmLevelByProducer: { berber: 2 },
  },
]

export interface HiredNamedManager {
  id: NamedManagerId
  hiredGameDay: number
}

export function namedManagerDef(id: NamedManagerId): NamedManagerDef | undefined {
  return NAMED_MANAGERS.find((m) => m.id === id)
}

export function managerDisplayName(m: NamedManagerDef): string {
  return tRaw('mgr_' + m.id) ?? m.name
}

export function managerSpecialty(m: NamedManagerDef): string {
  return tRaw('mgr_' + m.id + '_spec') ?? m.specialty
}

/**
 * TUR14 P5 — Bir isimli menajerin BELİRLİ bir firmaya atandığında sağladığı
 * günlük gelir bonusu oranı (tek kaynak). Firmaya özel `producerMult` varsa onu,
 * yoksa global `globalPassiveMult`'ı (ör. Ahmet Bey +%5) kullanır; ikisi de yoksa
 * 0 (bu firmaya özel gelir bonusu yok — UI bunu açıkça gösterir).
 */
export function namedManagerFirmBonus(def: NamedManagerDef, producerId: string): number {
  return def.producerMult?.[producerId] ?? def.globalPassiveMult ?? 0
}

export function managerRequiredFirmLevel(def: NamedManagerDef, producerId: string): number {
  return Math.max(1, Math.floor(def.requiredFirmLevelByProducer?.[producerId] ?? def.requiredFirmLevel ?? 1))
}

export type ManagerApplicability = 'specific' | 'general' | null

/**
 * TUR14 (kalan iş) — Bir menajerin bir firmada ANLAMLI olup olmadığını gerçek
 * bonus tanımlarından türetir (sabit isim listesi YOK):
 *  - 'specific': bu firmaya doğrudan etki — producer'a özel gelir bonusu (producerMult[id])
 *    veya illegal firmaya özel risk/heat azaltımı (illegalHeatReduce && isIllegal).
 *  - 'general' : tüm işletmelere gerçek bonus veren menajer (globalPassiveMult > 0).
 *  - null      : bu firmaya hiçbir etkisi yok → panelde GÖSTERİLMEZ.
 */
export function managerApplicability(def: NamedManagerDef, producerId: string, isIllegal: boolean): ManagerApplicability {
  if (def.producerMult?.[producerId] != null) return 'specific'
  if (isIllegal && (def.illegalHeatReduce ?? 0) > 0) return 'specific'
  if ((def.globalPassiveMult ?? 0) > 0) return 'general'
  return null
}
