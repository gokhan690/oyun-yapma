import type { IAPProductId } from './IAPManager'

/** Google Play Console / App Store Connect ürün kimlikleri */
export const PLAY_PRODUCT_SKUS: Record<IAPProductId, string> = {
  season_premium: 'com.paratuzaqi.game.season_premium',
  chest_pack_5: 'com.paratuzaqi.game.chest_pack_5',
  remove_ads: 'com.paratuzaqi.game.remove_ads',
  vip_pass: 'com.paratuzaqi.game.vip_pass',
}

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined'
    && 'Capacitor' in window
    && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
}

let billingReady = false

export async function initNativeBilling(): Promise<boolean> {
  if (!isNativePlatform() || billingReady) return billingReady
  try {
    const { NativePurchases } = await import('@capgo/native-purchases')
    const res = await NativePurchases.isBillingSupported()
    billingReady = res.isBillingSupported
    return billingReady
  } catch {
    return false
  }
}

export async function nativePurchaseProduct(productId: IAPProductId): Promise<boolean> {
  if (!isNativePlatform()) return false
  const sku = PLAY_PRODUCT_SKUS[productId]
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases')
    if (!(await initNativeBilling())) return false
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [sku],
      productType: PURCHASE_TYPE.INAPP,
    })
    if (!products?.length) return false
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: sku,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: productId === 'chest_pack_5',
    })
    return tx.purchaseState === '1' || !!tx.transactionId
  } catch {
    return false
  }
}

export async function fetchNativeStorePrices(): Promise<Partial<Record<IAPProductId, string>>> {
  if (!isNativePlatform()) return {}
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases')
    if (!(await initNativeBilling())) return {}
    const skus = Object.values(PLAY_PRODUCT_SKUS)
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: skus,
      productType: PURCHASE_TYPE.INAPP,
    })
    const out: Partial<Record<IAPProductId, string>> = {}
    for (const p of products ?? []) {
      if (p.identifier === PLAY_PRODUCT_SKUS.season_premium) out.season_premium = p.priceString
      if (p.identifier === PLAY_PRODUCT_SKUS.chest_pack_5) out.chest_pack_5 = p.priceString
    }
    return out
  } catch {
    return {}
  }
}

export async function nativeRestorePurchases(): Promise<IAPProductId[]> {
  if (!isNativePlatform()) return []
  try {
    const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases')
    if (!(await initNativeBilling())) return []
    await NativePurchases.restorePurchases()
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP })
    const restored: IAPProductId[] = []
    for (const p of purchases) {
      if (p.productIdentifier === PLAY_PRODUCT_SKUS.season_premium) restored.push('season_premium')
      if (p.productIdentifier === PLAY_PRODUCT_SKUS.chest_pack_5) restored.push('chest_pack_5')
    }
    return restored
  } catch {
    return []
  }
}
