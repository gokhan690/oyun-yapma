import type { NavView } from '../ui/components/BottomNav'

/** Erken oyunda gösterilen ilk iki işletme */
export const STARTER_BUSINESS_IDS = ['stajyer', 'berber'] as const

export type ShopHubLock = 'powerup' | 'empire' | 'finance' | 'management'

export function ownedBusinessCount(producers: Record<string, number>): number {
  let n = 0
  for (const v of Object.values(producers)) {
    if (v > 0) n++
  }
  return n
}

export function isStarterPhase(producers: Record<string, number>): boolean {
  return ownedBusinessCount(producers) === 0
}

export function isStarterBusiness(id: string): boolean {
  return (STARTER_BUSINESS_IDS as readonly string[]).includes(id)
}

export function navLockReason(view: NavView, producers: Record<string, number>, totalEarned: number): string | null {
  const owned = ownedBusinessCount(producers)
  if (view === 'earn' || view === 'shop' || view === 'profile') return null
  if (owned === 0) {
    return 'Önce İş sekmesinden bir işletme satın al.'
  }
  if (view === 'market' && totalEarned < 800) {
    return `Piyasa ${formatUnlockMoney(800)} toplam kazançta açılır.`
  }
  return null
}

export function isNavLocked(view: NavView, producers: Record<string, number>, totalEarned: number): boolean {
  return navLockReason(view, producers, totalEarned) !== null
}

export function shopHubLockReason(hub: ShopHubLock, producers: Record<string, number>, totalEarned: number): string | null {
  const owned = ownedBusinessCount(producers)
  if (hub === 'management') {
    if (owned === 0) return 'Yönetim ilk işletme sonrası açılır.'
    return null
  }
  if (hub === 'powerup') {
    if (owned < 1) return 'Güçlendir & Ar-Ge ilk işletme sonrası açılır.'
    return null
  }
  if (hub === 'empire') {
    if (totalEarned < 5_000) return `İmparatorluk ${formatUnlockMoney(5_000)} kazançta açılır.`
    return null
  }
  if (hub === 'finance') {
    return null
  }
  return null
}

export function isShopHubLocked(hub: ShopHubLock, producers: Record<string, number>, totalEarned: number): boolean {
  return shopHubLockReason(hub, producers, totalEarned) !== null
}

function formatUnlockMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
