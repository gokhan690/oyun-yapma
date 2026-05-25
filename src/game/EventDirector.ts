import { nextEventDelayMs } from './Events'

/** Golden / reklam olayları arası sabit ritim (AdManager ile hizalı) */
export const GOLDEN_EVENT_INTERVAL_MS = 240_000
/** Yeni oyuncuya ilk golden event — retention hook */
export const FIRST_GOLDEN_EVENT_MS = 120_000
export const GOLDEN_EVENT_CLAIM_MS = 15_000
export const NEAR_MISS_COOLDOWN_MS = 120_000
export const EVENT_PREVIEW_LEAD_MS = 2_000

/** İlk golden event gecikmesi — playTimeMs ile hizalanır */
export function computeGoldenEventDelay(eventsSeen: number, playTimeMs: number): number {
  if (eventsSeen === 0) {
    return Math.max(8_000, FIRST_GOLDEN_EVENT_MS - playTimeMs)
  }
  return nextEventDelayMs()
}

export type PopupPriority = 1 | 2 | 3 | 4

export interface PopupQueueItem {
  id: string
  priority: PopupPriority
  run: () => void
}

/** Tek seferde bir modal — öncelik kuyruğu */
export class EventDirector {
  private queue: PopupQueueItem[] = []
  private busy = false
  private nearMissUntil = 0

  canNearMiss(now: number): boolean {
    return now >= this.nearMissUntil
  }

  recordNearMiss(now: number): void {
    this.nearMissUntil = now + NEAR_MISS_COOLDOWN_MS
  }

  enqueue(item: PopupQueueItem): void {
    const existing = this.queue.findIndex((q) => q.id === item.id)
    if (existing >= 0) this.queue.splice(existing, 1)
    this.queue.push(item)
    this.queue.sort((a, b) => a.priority - b.priority)
    this.pump()
  }

  release(): void {
    this.busy = false
    this.pump()
  }

  isBusy(): boolean {
    return this.busy
  }

  clear(): void {
    this.queue = []
    this.busy = false
  }

  private pump(): void {
    if (this.busy || this.queue.length === 0) return
    const next = this.queue.shift()
    if (!next) return
    this.busy = true
    next.run()
  }
}
