/**
 * Güvenli yerel depolama.
 *
 * Dosyayı telefona indirip `file://` ile açtığında (özellikle iOS Safari'de,
 * ayrıca "siteye veri kaydetme" kapalıyken) `localStorage` erişimi istisna
 * fırlatır. Sarmalanmamış tek bir çağrı bile oyunun hiç açılmamasına yol açar;
 * burada her erişim try/catch ile korunur, olmadığında bellekteki kopya kullanılır.
 */

const memory = new Map<string, string>()

let available: boolean | null = null

function usable(): boolean {
  if (available !== null) return available
  try {
    const probe = '__fm_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    available = true
  } catch {
    available = false
  }
  return available
}

export function storageGet(key: string): string | null {
  if (usable()) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      /* aşağıdaki bellek kopyasına düş */
    }
  }
  return memory.has(key) ? (memory.get(key) as string) : null
}

export function storageSet(key: string, value: string): void {
  memory.set(key, value)
  if (!usable()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* kota dolu ya da erişim kapalı — bellekteki kopya yeter */
  }
}

export function storageRemove(key: string): void {
  memory.delete(key)
  if (!usable()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* yok sayılabilir */
  }
}

/** Depolama gerçekten kalıcı mı? (false ise skorlar sekme kapanınca kaybolur) */
export function storagePersists(): boolean {
  return usable()
}
