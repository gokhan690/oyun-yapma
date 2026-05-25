type HapticFn = () => Promise<void>

async function runHaptic(fn: HapticFn): Promise<void> {
  try {
    if (!('Capacitor' in window)) return
    const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    if (!cap?.isNativePlatform?.()) return
    await fn()
  } catch {
    // haptics unavailable
  }
}

export async function hapticLight(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  })
}

export async function hapticHeavy(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
  })
}

export async function hapticMedium(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  })
}

export async function hapticPurchase(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
    await new Promise((r) => window.setTimeout(r, 80))
    await Haptics.impact({ style: ImpactStyle.Heavy })
  })
}

export async function hapticCombo10(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  })
}

export async function hapticDeath(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.vibrate({ duration: 450 })
  })
}

export async function hapticIpo(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
    await new Promise((r) => window.setTimeout(r, 100))
    await Haptics.impact({ style: ImpactStyle.Heavy })
    await new Promise((r) => window.setTimeout(r, 100))
    await Haptics.impact({ style: ImpactStyle.Medium })
  })
}

export async function hapticDisaster(): Promise<void> {
  await runHaptic(async () => {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.vibrate({ duration: 280 })
  })
}
