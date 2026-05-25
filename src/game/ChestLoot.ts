export type ChestRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface ChestLootResult {
  rarity: ChestRarity
  label: string
  emoji: string
  money: number
  boostMinutes: number
  seasonXp: number
  chestTickets: number
}

const RARITY_WEIGHTS: { rarity: ChestRarity; weight: number }[] = [
  { rarity: 'common', weight: 52 },
  { rarity: 'uncommon', weight: 28 },
  { rarity: 'rare', weight: 14 },
  { rarity: 'epic', weight: 5 },
  { rarity: 'legendary', weight: 1 },
]

const RARITY_META: Record<ChestRarity, { label: string; emoji: string; moneyMult: number; boostMin: number; xp: number }> = {
  common: { label: 'Sıradan', emoji: '📦', moneyMult: 0.35, boostMin: 0, xp: 15 },
  uncommon: { label: 'Nadir', emoji: '💎', moneyMult: 0.75, boostMin: 3, xp: 35 },
  rare: { label: 'Efsanevi', emoji: '✨', moneyMult: 1.4, boostMin: 8, xp: 80 },
  epic: { label: 'Epik', emoji: '🔥', moneyMult: 2.5, boostMin: 15, xp: 150 },
  legendary: { label: 'Efsane', emoji: '👑', moneyMult: 5, boostMin: 30, xp: 300 },
}

function rollRarity(pityCounter: number, forceMinRare = false): ChestRarity {
  if (pityCounter >= 9 || forceMinRare) return pityCounter >= 19 ? 'legendary' : 'rare'
  let roll = Math.random() * 100
  for (const { rarity, weight } of RARITY_WEIGHTS) {
    roll -= weight
    if (roll <= 0) return rarity
  }
  return 'common'
}

export function rollChestLoot(incomePerDay: number, pityCounter: number, paid = false): ChestLootResult {
  const ipd = Math.max(1, incomePerDay)
  const rarity = rollRarity(pityCounter, paid)
  const meta = RARITY_META[rarity]
  const money = Math.max(paid ? 120 : 40, Math.floor(ipd * meta.moneyMult * (paid ? 1.25 : 1)))
  const boostMinutes = meta.boostMin + (paid ? 2 : 0)
  const seasonXp = meta.xp + (paid ? 25 : 0)
  const chestTickets = rarity === 'legendary' ? 1 : 0

  return {
    rarity,
    label: meta.label,
    emoji: meta.emoji,
    money,
    boostMinutes,
    seasonXp,
    chestTickets,
  }
}

export function shouldResetPity(rarity: ChestRarity): boolean {
  return rarity === 'rare' || rarity === 'epic' || rarity === 'legendary'
}

export function rarityColor(rarity: ChestRarity): string {
  if (rarity === 'legendary') return '#fbbf24'
  if (rarity === 'epic') return '#c084fc'
  if (rarity === 'rare') return '#60a5fa'
  if (rarity === 'uncommon') return '#34d399'
  return '#94a3b8'
}
