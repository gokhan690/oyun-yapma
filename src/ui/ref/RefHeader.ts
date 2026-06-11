import { assetUrl } from '../../utils/assetUrl'

export interface HeaderData {
  name: string
  title: string
  age: number
  city: string
  avatarEmoji: string
  /** Generic avatar asset yolu; yoksa emoji fallback. */
  avatarAsset?: string
  notifCount?: number
  /** Test/overlay modunda header'a kapat (✕) butonu ekler. */
  onClose?: () => void
  /** Avatar/isim alanına tıklayınca profil sayfasını aç. */
  onProfile?: () => void
  /** 🏆 Başarımlar hızlı erişim. */
  onAchievements?: () => void
  /** 🔔 Bildirimler hızlı erişim. */
  onNotifs?: () => void
}

export class RefHeader {
  readonly el: HTMLElement

  constructor(data: HeaderData) {
    const avatarInner = data.avatarAsset
      ? `<img src="${assetUrl(data.avatarAsset.startsWith('/') ? data.avatarAsset.slice(1) : data.avatarAsset)}" alt="" class="ref-avatar__img">`
      : `<span style="font-size:28px">${data.avatarEmoji}</span>`

    this.el = document.createElement('div')
    this.el.className = 'ref-header'
    this.el.innerHTML = `
      <div class="ref-header__row">
        <div class="ref-header__left${data.onProfile ? ' ref-header__left--clickable' : ''}">
          <div class="ref-avatar">
            ${avatarInner}
          </div>
          <div class="ref-header__info">
            <div class="ref-header__name">${data.name}</div>
            <div class="ref-header__title">${data.title}</div>
            <div class="ref-header__meta">
              <span class="ref-header__meta-item">👤 ${data.age}</span>
              <span class="ref-header__meta-item">📍 ${data.city}</span>
            </div>
          </div>
          ${data.onProfile ? '<span class="ref-header__profile-chevron">›</span>' : ''}
        </div>
        <div class="ref-header__actions">
          <button class="ref-hdr-btn" data-hdr="ach" title="Başarımlar">🏆</button>
          <button class="ref-hdr-btn" data-hdr="notifs" title="Bildirimler">
            🔔
            ${(data.notifCount ?? 0) > 0 ? '<span class="ref-hdr-btn__dot"></span>' : ''}
          </button>
          ${data.onClose ? '<button class="ref-hdr-close" title="Test modundan çık" aria-label="Kapat">✕</button>' : ''}
        </div>
      </div>
    `

    if (data.onClose) {
      this.el.querySelector('.ref-hdr-close')!.addEventListener('click', () => data.onClose!())
    }
    if (data.onProfile) {
      const left = this.el.querySelector<HTMLElement>('.ref-header__left')!
      left.addEventListener('click', () => data.onProfile!())
    }
    if (data.onAchievements) {
      this.el.querySelector('[data-hdr="ach"]')!.addEventListener('click', () => data.onAchievements!())
    }
    if (data.onNotifs) {
      this.el.querySelector('[data-hdr="notifs"]')!.addEventListener('click', () => data.onNotifs!())
    }
  }

  /** Header player bilgisini (isim, unvan, yaş, şehir) canlı günceller. */
  updatePlayer(name: string, title: string, age: number, city: string): void {
    const nameEl = this.el.querySelector<HTMLElement>('.ref-header__name')
    const titleEl = this.el.querySelector<HTMLElement>('.ref-header__title')
    const metaItems = this.el.querySelectorAll<HTMLElement>('.ref-header__meta-item')
    if (nameEl) nameEl.textContent = name
    if (titleEl) titleEl.textContent = title
    if (metaItems[0]) metaItems[0].textContent = `👤 ${age}`
    if (metaItems[1]) metaItems[1].textContent = `📍 ${city}`
  }

  /** 🔔 üstündeki okunmamış rozetini aç/kapat. */
  setNotifBadge(show: boolean): void {
    const btn = this.el.querySelector<HTMLElement>('[data-hdr="notifs"]')
    if (!btn) return
    const dot = btn.querySelector('.ref-hdr-btn__dot')
    if (show && !dot) {
      const span = document.createElement('span')
      span.className = 'ref-hdr-btn__dot'
      btn.appendChild(span)
    } else if (!show && dot) {
      dot.remove()
    }
  }

  setTitle(title: string, deco = '⭐'): void {
    const existing = this.el.querySelector('.ref-page-title')
    if (existing) existing.remove()
    const row = document.createElement('div')
    row.className = 'ref-page-title'
    row.innerHTML = `
      <span class="ref-page-title__deco">${deco}</span>
      <span class="ref-page-title__text">${title}</span>
      <span class="ref-page-title__deco">${deco}</span>
    `
    this.el.appendChild(row)
  }
}
