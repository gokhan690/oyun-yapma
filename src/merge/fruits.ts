/**
 * Meyve zinciri — Suika tipi birleştirme oyununun meyve tanımları.
 * Sıra: küçükten büyüğe; iki aynı meyve birleşince bir üst tier doğar.
 */

export type FruitDeco = 'cherry' | 'berry' | 'grape' | 'citrus' | 'apple' | 'pear' | 'peach' | 'pineapple' | 'melon' | 'watermelon'

export interface FruitDef {
  /** Zincirdeki sıra (0 = kiraz) */
  tier: number
  name: string
  /** Oyun birimi cinsinden yarıçap (tahta genişliği 440) */
  radius: number
  /** Ana gövde rengi */
  color: string
  /** Gölge / alt taraf rengi */
  shade: string
  /** Parlama rengi */
  light: string
  deco: FruitDeco
}

export const FRUITS: FruitDef[] = [
  { tier: 0, name: 'Kiraz', radius: 17, color: '#e63946', shade: '#a4162a', light: '#ff8b95', deco: 'cherry' },
  { tier: 1, name: 'Çilek', radius: 23, color: '#f2495c', shade: '#b31f34', light: '#ff9aa4', deco: 'berry' },
  { tier: 2, name: 'Üzüm', radius: 31, color: '#9b5de5', shade: '#5f2f9c', light: '#c99bff', deco: 'grape' },
  { tier: 3, name: 'Mandalina', radius: 38, color: '#f6c445', shade: '#c08a0d', light: '#ffe694', deco: 'citrus' },
  { tier: 4, name: 'Portakal', radius: 46, color: '#f4842c', shade: '#b8560c', light: '#ffc07a', deco: 'citrus' },
  { tier: 5, name: 'Elma', radius: 56, color: '#e23b3b', shade: '#96181f', light: '#ff8a7d', deco: 'apple' },
  { tier: 6, name: 'Armut', radius: 65, color: '#c3d94b', shade: '#7f9418', light: '#e9f79b', deco: 'pear' },
  { tier: 7, name: 'Şeftali', radius: 75, color: '#f7a482', shade: '#c5613f', light: '#ffd4bd', deco: 'peach' },
  { tier: 8, name: 'Ananas', radius: 87, color: '#f0cf3f', shade: '#b08c10', light: '#ffeb96', deco: 'pineapple' },
  { tier: 9, name: 'Kavun', radius: 99, color: '#b3e06a', shade: '#6f9a2d', light: '#dcf7a8', deco: 'melon' },
  { tier: 10, name: 'Karpuz', radius: 114, color: '#3aa14b', shade: '#1d6229', light: '#7fd189', deco: 'watermelon' },
]

export const MAX_TIER = FRUITS.length - 1

/** Kutudan düşürülebilen meyveler — sadece ilk 5 tier. */
export const SPAWNABLE_TIERS = 5

/**
 * `tier` seviyesindeki meyve oluşturulduğunda kazanılan puan.
 * Üçgen sayılar: 1, 3, 6, 10, 15, 21, 28, 36, 45, 55.
 */
export function mergeScore(tier: number): number {
  return (tier * (tier + 1)) / 2
}
