/** Yardımcı tanımları — oyuncu en fazla 3 tanesini seçip sahaya çıkar. */

export interface PowerupDef {
  id: string
  icon: string
  name: string
  desc: string
  /** Oyun başı hak */
  start: number
  /** Kaç puanda bir yeni hak */
  every: number
  max: number
}

export const POWERUPS: PowerupDef[] = [
  { id: 'bomb', icon: '💣', name: 'Bomba', desc: 'Dokunduğun meyveyi patlatır', start: 1, every: 1500, max: 3 },
  { id: 'swap', icon: '🔄', name: 'Takas', desc: 'Eldeki meyveyle sıradakini değiştirir', start: 3, every: 2000, max: 5 },
  { id: 'undo', icon: '↩️', name: 'Geri Al', desc: 'Son attığın meyveyi geri alır', start: 1, every: 2500, max: 2 },
  { id: 'shake', icon: '🌀', name: 'Salla', desc: 'Kutuyu sallar, sıkışan meyveler yerinden oynar', start: 1, every: 3000, max: 2 },
  { id: 'joker', icon: '🌈', name: 'Joker', desc: 'Eldeki meyveyi seçtiğinin aynısı yapar', start: 1, every: 3500, max: 2 },
]

export const MAX_LOADOUT = 3

export function powerupById(id: string): PowerupDef | undefined {
  return POWERUPS.find((p) => p.id === id)
}
