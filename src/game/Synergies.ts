export interface SynergyDef {
  id: string
  name: string
  requires: [string, string]
  effect: 'global' | 'producer'
  targetProducer?: string
  bonus: number
}

export const SYNERGIES: SynergyDef[] = [
  {
    id: 'restoran_lojistik',
    name: 'Tedarik Zinciri',
    requires: ['ofis', 'fabrika'],
    effect: 'producer',
    targetProducer: 'fabrika',
    bonus: 0.15,
  },
  {
    id: 'eticaret_yazilim',
    name: 'Dijital Dönüşüm',
    requires: ['robot', 'holding'],
    effect: 'global',
    bonus: 0.2,
  },
  {
    id: 'gayrimenkul_birlesme',
    name: 'Portföy Sinergisi',
    requires: ['uzay', 'ai'],
    effect: 'producer',
    targetProducer: 'uzay',
    bonus: 0.25,
  },
  {
    id: 'yazilim_lojistik',
    name: 'Tech Lojistik',
    requires: ['holding', 'fabrika'],
    effect: 'producer',
    targetProducer: 'holding',
    bonus: 0.2,
  },
  {
    id: 'uydu_merkez',
    name: 'Finansal Altyapı',
    requires: ['uydu', 'merkezbankasi'],
    effect: 'global',
    bonus: 0.3,
  },
  {
    id: 'medya_siyaset',
    name: 'Medya Etkisi',
    requires: ['medya', 'siyaset_belediye'],
    effect: 'producer',
    targetProducer: 'siyaset_belediye',
    bonus: 0.2,
  },
  {
    id: 'futbol_medya',
    name: 'Spor Medyası',
    requires: ['futbol_superlig', 'medya'],
    effect: 'producer',
    targetProducer: 'futbol_superlig',
    bonus: 0.25,
  },
  {
    id: 'siyah_lojistik',
    name: 'Gizli Tedarik',
    requires: ['siyah_fabrika', 'fabrika'],
    effect: 'producer',
    targetProducer: 'siyah_fabrika',
    bonus: 0.2,
  },
  {
    id: 'otel_turizm',
    name: 'Turizm Zinciri',
    requires: ['otel', 'futbol_amateur'],
    effect: 'global',
    bonus: 0.15,
  },
]

export interface ActiveSynergy {
  def: SynergyDef
  active: boolean
}

export function getActiveSynergies(
  producers: Record<string, number>,
): ActiveSynergy[] {
  return SYNERGIES.map((def) => ({
    def,
    active: def.requires.every((id) => (producers[id] ?? 0) > 0),
  }))
}

export function globalSynergyBonus(producers: Record<string, number>): number {
  let bonus = 0
  for (const s of SYNERGIES) {
    if (s.effect !== 'global') continue
    if (s.requires.every((id) => (producers[id] ?? 0) > 0)) bonus += s.bonus
  }
  return bonus
}

export function producerSynergyBonus(
  producerId: string,
  producers: Record<string, number>,
): number {
  let bonus = 0
  for (const s of SYNERGIES) {
    if (s.effect !== 'producer' || s.targetProducer !== producerId) continue
    if (s.requires.every((id) => (producers[id] ?? 0) > 0)) bonus += s.bonus
  }
  return bonus
}
