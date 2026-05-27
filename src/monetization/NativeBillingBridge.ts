import type { IAPProductId } from './IAPManager'

/** Google Play Console / App Store Connect ürün kimlikleri */
export const PLAY_PRODUCT_SKUS: Record<IAPProductId, string> = {
  season_premium: 'com.paratuzaqi.game.season_premium',
  chest_pack_5: 'com.paratuzaqi.game.chest_pack_5',
  remove_ads: 'com.paratuzaqi.game.remove_ads',
  vip_pass: 'com.paratuzaqi.game.vip_pass',
}

const INAPP_PRODUCTS: IAPProductId[] = ['season_premium', 'chest_pack_5', 'remove_ads']
const SUBSCRIPTION_PRODUCTS: IAPProductId[] = ['vip_pass']

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined'
    && 'Capacitor' in window
    && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true
}

function productIdForSku(sku: string): IAPProductId | null {
  for (const [id, s] of Object.entries(PLAY_PRODUCT_SKUS)) {
    if (s === sku) return id as IAPProductId
  }
  return null
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
    const isSub = SUBSCRIPTION_PRODUCTS.includes(productId)
    const productType = isSub ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [sku],
      productType,
    })
    if (!products?.length) return false
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: sku,
      productType,
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
    const out: Partial<Record<IAPProductId, string>> = {}
    const inappSkus = INAPP_PRODUCTS.map((id) => PLAY_PRODUCT_SKUS[id])
    const subSkus = SUBSCRIPTION_PRODUCTS.map((id) => PLAY_PRODUCT_SKUS[id])
    const { products: inappProducts } = await NativePurchases.getProducts({
      productIdentifiers: inappSkus,
      productType: PURCHASE_TYPE.INAPP,
    })
    for (const p of inappProducts ?? []) {
      const id = productIdForSku(p.identifier)
      if (id) out[id] = p.priceString
    }
    const { products: subProducts } = await NativePurchases.getProducts({
      productIdentifiers: subSkus,
      productType: PURCHASE_TYPE.SUBS,
    })
    for (const p of subProducts ?? []) {
      const id = productIdForSku(p.identifier)
      if (id) out[id] = p.priceString
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
    const restored = new Set<IAPProductId>()
    const { purchases: inapp } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP })
    for (const p of inapp ?? []) {
      const id = productIdForSku(p.productIdentifier)
      if (id && id !== 'chest_pack_5') restored.add(id)
    }
    try {
      const { purchases: subs } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS })
      for (const p of subs ?? []) {
        const id = productIdForSku(p.productIdentifier)
        if (id) restored.add(id)
      }
    } catch {
      // subscription API may be unavailable on some builds
    }
    return [...restored]
  } catch {
    return []
  }
}
