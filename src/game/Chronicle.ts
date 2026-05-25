export type ChronicleCategory = 'business' | 'dynasty' | 'ipo' | 'rival' | 'victory' | 'world' | 'crisis'

export interface ChronicleEntry {
  id: string
  gameDay: number
  generation: number
  ipoEra: number
  text: string
  emoji: string
  category: ChronicleCategory
}

export interface LegacyMonument {
  id: string
  producerId: string
  producerName: string
  emoji: string
  builtGameDay: number
  generation: number
  ipoEra: number
}

let entrySeq = 0

export function createChronicleEntry(
  partial: Omit<ChronicleEntry, 'id'>,
): ChronicleEntry {
  entrySeq++
  return { id: `ch_${Date.now()}_${entrySeq}`, ...partial }
}

export function appendChronicle(
  entries: ChronicleEntry[],
  entry: ChronicleEntry,
  max = 80,
): ChronicleEntry[] {
  return [entry, ...entries].slice(0, max)
}

export function createMonument(
  producerId: string,
  producerName: string,
  emoji: string,
  gameDay: number,
  generation: number,
  ipoEra: number,
): LegacyMonument {
  return {
    id: `mon_${producerId}_${ipoEra}_${gameDay}`,
    producerId,
    producerName,
    emoji,
    builtGameDay: gameDay,
    generation,
    ipoEra,
  }
}
