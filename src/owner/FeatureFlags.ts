export interface OwnerFlagDef {
  id: string
  label: string
  description: string
  default: boolean
}

export const OWNER_FLAGS: OwnerFlagDef[] = [
  { id: 'income_x2', label: 'Gelir x2', description: 'Pasif ve tıklama geliri iki kat', default: false },
  { id: 'no_heat', label: 'Radar kapalı', description: 'Illegal heat artmaz ve baskın olmaz', default: false },
  { id: 'free_boost', label: 'Sürekli x2 boost', description: 'Reklam boost sürekli aktif', default: false },
  { id: 'surprise_often', label: 'Sürpriz yatırımcı sık', description: 'Yatırımcı event şansı x5', default: false },
  { id: 'instant_missions', label: 'Anında görevler', description: 'Günlük görevler otomatik tamamlanır', default: false },
  { id: 'beta_ui', label: 'Beta arayüz', description: 'Deneysel UI parçacıkları', default: false },
]

const STORAGE_KEY = 'ii_owner_flags'

export type OwnerFlags = Record<string, boolean>

export function loadOwnerFlags(): OwnerFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultFlags()
    const parsed = JSON.parse(raw) as OwnerFlags
    const base = defaultFlags()
    for (const f of OWNER_FLAGS) {
      if (typeof parsed[f.id] === 'boolean') base[f.id] = parsed[f.id]
    }
    return base
  } catch {
    return defaultFlags()
  }
}

export function saveOwnerFlags(flags: OwnerFlags): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
}

export function defaultFlags(): OwnerFlags {
  const out: OwnerFlags = {}
  for (const f of OWNER_FLAGS) out[f.id] = f.default
  return out
}

export function isOwnerFlagEnabled(id: string): boolean {
  return loadOwnerFlags()[id] === true
}

export function setOwnerFlag(id: string, on: boolean): void {
  const flags = loadOwnerFlags()
  flags[id] = on
  saveOwnerFlags(flags)
}
