/** PIN / erişim kodu — kaynakta düz metin tutulmaz. */
export function fnv1aHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function configuredPinRaw(): string {
  const pin = import.meta.env.VITE_OWNER_PIN as string | undefined
  if (pin && pin.trim().length >= 4) return pin.trim()
  if (import.meta.env.DEV) return 'baron2026'
  return ''
}

export function configuredPinHash(): string {
  const pin = configuredPinRaw()
  return pin ? fnv1aHash(`ii_pin_v1:${pin}`) : ''
}

export function ownerAccessCode(): string {
  const env = import.meta.env.VITE_OWNER_ACCESS_CODE as string | undefined
  if (env && env.trim().length >= 4) return env.trim().toLowerCase()
  const pin = configuredPinRaw()
  if (!pin) return ''
  return fnv1aHash(`ii_gate_v1:${pin}`).slice(0, 9)
}

export function isOwnerPinConfigured(): boolean {
  return configuredPinRaw().length >= 4
}

export function verifyOwnerPin(pin: string): boolean {
  const expected = configuredPinHash()
  if (!expected) return false
  return fnv1aHash(`ii_pin_v1:${pin.trim()}`) === expected
}
