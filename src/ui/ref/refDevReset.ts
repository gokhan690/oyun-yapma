import type { GameState } from '../../game/GameState'
import { SaveManager, allGamePersistKeys } from '../../security/SaveManager'

/** Sıfırlamadan önce otomatik yedek — yalnızca DEV reset akışında yazılır. */
export const DEV_BEFORE_RESET_BACKUP_KEY = 'is_imparatorlugu_dev_before_reset_backup'

interface DevBeforeResetSnapshot {
  version: 1
  createdAt: number
  entries: Record<string, string>
}

function devEnabled(): boolean {
  return import.meta.env.DEV
}

function backupBeforeReset(): number {
  const entries: Record<string, string> = {}
  for (const key of allGamePersistKeys()) {
    const raw = localStorage.getItem(key)
    if (raw !== null) entries[key] = raw
  }
  const snapshot: DevBeforeResetSnapshot = {
    version: 1,
    createdAt: Date.now(),
    entries,
  }
  localStorage.setItem(DEV_BEFORE_RESET_BACKUP_KEY, JSON.stringify(snapshot))
  return Object.keys(entries).length
}

/** Eski migration slotlarını temizler; alakasız localStorage anahtarlarına dokunmaz. */
function clearGamePersistKeys(): void {
  for (const key of allGamePersistKeys()) {
    localStorage.removeItem(key)
  }
}

/** Sıfırlamadan önce alınan snapshot'tan tüm kayıtları geri yükler. */
export function performRefCareerRestore(): { ok: boolean; message: string } {
  if (!devEnabled()) {
    return { ok: false, message: 'Geri yükleme yalnızca DEV ortamında kullanılabilir.' }
  }

  const raw = localStorage.getItem(DEV_BEFORE_RESET_BACKUP_KEY)
  if (!raw) {
    return { ok: false, message: 'Sıfırlama öncesi yedek bulunamadı.' }
  }

  let snapshot: { version: number; entries: Record<string, string> }
  try {
    snapshot = JSON.parse(raw) as typeof snapshot
  } catch {
    return { ok: false, message: 'Yedek verileri bozuk — geri yüklenemedi.' }
  }

  if (!window.confirm(`Yedekten geri yüklensin mi? ${Object.keys(snapshot.entries).length} anahtar yazılacak.`)) {
    return { ok: false, message: 'Geri yükleme iptal edildi.' }
  }

  for (const [key, value] of Object.entries(snapshot.entries)) {
    localStorage.setItem(key, value)
  }

  sessionStorage.setItem('ii_ref_auto_open', '1')
  sessionStorage.setItem('ii_ref_open_tab', 'career')

  return {
    ok: true,
    message: `Yedek geri yüklendi (${Object.keys(snapshot.entries).length} anahtar). Sayfa yenileniyor…`,
  }
}

export function performRefCareerReset(state: GameState): { ok: boolean; message: string } {
  if (!devEnabled()) {
    return { ok: false, message: 'Yeni oyun aracı yalnızca DEV ortamında kullanılabilir.' }
  }

  if (!window.confirm('Oyunu sıfırlamak istediğine emin misin?')) {
    return { ok: false, message: 'Sıfırlama iptal edildi.' }
  }
  if (!window.confirm('Bu işlem mevcut save\'i siler. Devam edilsin mi?')) {
    return { ok: false, message: 'Sıfırlama iptal edildi.' }
  }

  const backedUp = backupBeforeReset()
  state.stopTick()
  state.applyRefCareerFreshStart()
  clearGamePersistKeys()
  localStorage.setItem('baron_setup_done', '1')

  const saveManager = new SaveManager()
  saveManager.save(state)

  sessionStorage.setItem('ii_ref_auto_open', '1')
  sessionStorage.setItem('ii_ref_open_tab', 'career')

  return {
    ok: true,
    message: `RefApp çalışan başlangıcı hazır. ${backedUp} anahtar yedeklendi (${DEV_BEFORE_RESET_BACKUP_KEY}). Sayfa yenileniyor…`,
  }
}
