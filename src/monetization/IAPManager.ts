export type IAPProductId = 'season_premium' | 'chest_pack_5'

export interface IAPProduct {
  id: IAPProductId
  name: string
  description: string
  priceLabel: string
}

import {
  initNativeBilling,
  isNativePlatform,
  nativePurchaseProduct,
  nativeRestorePurchases,
} from './NativeBillingBridge'

const PRODUCTS: Record<IAPProductId, IAPProduct> = {
  season_premium: {
    id: 'season_premium',
    name: 'Premium Sezon Yolu',
    description: 'Bu ay için premium ödül kolonunu aç — 2x para, özel temalar, sandık biletleri.',
    priceLabel: '₺49,99',
  },
  chest_pack_5: {
    id: 'chest_pack_5',
    name: '5x Sandık Paketi',
    description: 'Reklamsız 5 premium sandık açma hakkı.',
    priceLabel: '₺29,99',
  },
}

const RECEIPTS_KEY = 'is_imparatorlugu_iap_receipts'

function loadReceipts(): IAPProductId[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is IAPProductId => id === 'season_premium' || id === 'chest_pack_5')
  } catch {
    return []
  }
}

function saveReceipts(ids: IAPProductId[]): void {
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    // ignore
  }
}

export class IAPManager {
  getProduct(id: IAPProductId): IAPProduct {
    return PRODUCTS[id]
  }

  listProducts(): IAPProduct[] {
    return Object.values(PRODUCTS)
  }

  /** Native: Google Play / App Store — Web: onay diyaloğu */
  async purchase(productId: IAPProductId): Promise<{ success: boolean; reason?: string }> {
    if (isNativePlatform()) {
      try {
        await initNativeBilling()
        const ok = await nativePurchaseProduct(productId)
        if (ok) {
          this.grantReceipt(productId)
          return { success: true }
        }
        return { success: false, reason: 'Mağaza satın alması tamamlanamadı. Play Console SKU tanımlı mı?' }
      } catch {
        return { success: false, reason: 'Ödeme sistemi hazır değil' }
      }
    }

    const confirmed = typeof window !== 'undefined'
      && window.confirm(`${PRODUCTS[productId].name} (${PRODUCTS[productId].priceLabel})\n\nSatın almayı onaylıyor musun? (Web test modu)`)
    if (!confirmed) return { success: false, reason: 'İptal edildi' }

    this.grantReceipt(productId)
    return { success: true }
  }

  async restorePurchases(): Promise<IAPProductId[]> {
    if (isNativePlatform()) {
      try {
        const restored = await nativeRestorePurchases()
        for (const id of restored) this.grantReceipt(id)
      } catch {
        // ignore
      }
    }
    return loadReceipts()
  }

  hasReceipt(productId: IAPProductId): boolean {
    return loadReceipts().includes(productId)
  }

  private grantReceipt(productId: IAPProductId): void {
    if (productId === 'chest_pack_5') return
    const receipts = loadReceipts()
    if (!receipts.includes(productId)) {
      receipts.push(productId)
      saveReceipts(receipts)
    }
  }
}

export const iapManager = new IAPManager()
