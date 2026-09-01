/**
 * Başarımlar — hem tek oyunun sayaçlarına hem de kalıcı profile bakar.
 */

import type { Profile } from './profile'
import type { RunStats } from './missions'

export interface Achievement {
  id: string
  icon: string
  name: string
  hint: string
  test: (run: RunStats, profile: Profile) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_melon', icon: '🍉', name: 'İlk Karpuz', hint: 'Bir karpuz yap', test: (r, p) => r.watermelons > 0 || p.stats.watermelons > 0 },
  { id: 'score5k', icon: '🥉', name: '5.000 Puan', hint: 'Tek oyunda 5.000 puan', test: (r) => r.score >= 5000 },
  { id: 'score10k', icon: '🥈', name: '10.000 Puan', hint: 'Tek oyunda 10.000 puan', test: (r) => r.score >= 10000 },
  { id: 'combo5', icon: '🔥', name: 'Combo ×5', hint: 'Zincirleme 5 birleşme', test: (r, p) => r.maxCombo >= 5 || p.stats.bestCombo >= 5 },
  { id: 'merges100', icon: '💥', name: '100 Birleştirme', hint: 'Toplamda 100 birleştirme', test: (_r, p) => p.stats.merges >= 100 },
  { id: 'melons10', icon: '🏵️', name: '10 Karpuz', hint: 'Toplamda 10 karpuz', test: (_r, p) => p.stats.watermelons >= 10 },
  { id: 'melon_nobomb', icon: '🎯', name: 'Bombasız Karpuz', hint: 'Bomba kullanmadan karpuz yap', test: (r) => r.watermelons > 0 && !r.bombUsed },
  { id: 'escape', icon: '😮‍💨', name: 'Kıl Payı', hint: 'Tehlike çizgisinden geri dön', test: (r) => r.escaped === true },
  { id: 'golden', icon: '✨', name: 'Altın Dokunuş', hint: 'İki altın meyveyi birleştir', test: (r) => r.goldenMerges > 0 },
  { id: 'daily', icon: '📅', name: 'Günün Adamı', hint: 'Günlük meydan okumayı tamamla', test: (_r, p) => p.daily.done },
]

/** Yeni kazanılanların id listesini döndürür (profili değiştirmez). */
export function newlyEarned(run: RunStats, profile: Profile): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !profile.achievements.includes(a.id) && a.test(run, profile))
}
