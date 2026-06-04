export interface HeaderData {
  name: string
  title: string
  age: number
  city: string
  avatarEmoji: string
  notifCount?: number
}

export class RefHeader {
  readonly el: HTMLElement

  constructor(data: HeaderData) {
    this.el = document.createElement('div')
    this.el.className = 'ref-header'
    this.el.innerHTML = `
      <div class="ref-header__row">
        <div class="ref-header__left">
          <div class="ref-avatar">
            <span style="font-size:28px">🧔</span>
            <span class="ref-avatar__lvl">M</span>
          </div>
          <div class="ref-header__info">
            <div class="ref-header__name">
              ${data.name}
              <span class="ref-header__name-star">⭐</span>
            </div>
            <div class="ref-header__title">${data.title}</div>
            <div class="ref-header__meta">
              <span class="ref-header__meta-item">
                <span>👤</span> Yaş: ${data.age}
              </span>
              <span class="ref-header__meta-item">
                <span>📍</span> ${data.city}
              </span>
            </div>
          </div>
        </div>
        <div class="ref-header__actions">
          <button class="ref-hdr-btn" title="VIP">👑</button>
          <button class="ref-hdr-btn" title="Mesajlar">
            ✉️
            ${(data.notifCount ?? 0) > 0 ? '<span class="ref-hdr-btn__dot"></span>' : ''}
          </button>
          <button class="ref-hdr-btn" title="Bildirimler">🔔</button>
        </div>
      </div>
    `
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
