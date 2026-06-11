import { sectionTitle, ua, fmtMoney, demoBanner } from './refShared'
import type { RefPage } from './RefApp'
import type { GameState } from '../../game/GameState'
import { healthStatusLabel } from '../../game/Health'
import { fameLevelLabel } from '../../game/Fame'
import { reputationLabel } from '../../game/Reputation'
import { educationDef } from '../../game/Education'
import { personalityDef } from '../../game/PlayerPersonality'
import { cityDef } from '../../game/ExpansionMap'

const AVATAR = '/assets/ref-v2/avatars/avatar_main_businessman.png'

/**
 * PROFİL — header'daki avatar/isim alanından açılır (iskelet, 1. tur).
 * SALT OKUNUR: GameState'e hiçbir yazma yapılmaz; tüm değerler mevcut
 * helper'lardan okunur (TEK KAYNAK kuralı).
 */
export class RefProfilePage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'PROFİL'
  readonly titleDeco = '👤'

  onOpenAchievements?: () => void

  private lastSig = ''

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-profile-page'
    this.renderMock()
    this.el.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-action="open-achievements"]')) this.onOpenAchievements?.()
    })
  }

  refresh(state: GameState): void {
    // İmza değişmediyse DOM'a dokunma (throttled refresh'lerde gereksiz rebuild yok)
    const sig = [
      state.playerName, state.playerAge(), Math.round(state.financeNetWorth()),
      Math.round(state.reputation), Math.round(state.health.health),
      Math.round(state.fameState?.fame ?? 0), state.karma ?? 0,
      state.achievements.size, state.ipoCount, Math.round(state.lifetimeTotalEarned),
    ].join('|')
    if (sig === this.lastSig) return
    this.lastSig = sig
    this.render(state)
  }

  private render(s: GameState): void {
    const age        = s.playerAge()
    const city       = cityDef(s.cities.activeCity).label
    const netWorth   = Math.round(s.financeNetWorth())
    const reputation = Math.round(s.reputation)
    const health     = Math.round(s.health.health)
    const fame       = Math.round(s.fameState?.fame ?? 0)
    const karma      = s.karma ?? 0
    const edu        = educationDef(s.education)
    const pers       = personalityDef(s.personality)
    const path       = s.characterPathLabel()
    const playHours  = Math.floor(s.playTimeMs / 3_600_000)
    const playMins   = Math.floor((s.playTimeMs % 3_600_000) / 60_000)

    this.el.innerHTML = ''
    this.el.appendChild(this.buildHero(s.playerName || 'Baron', age, city, s.playerGender))
    this.el.appendChild(this.buildKpis(netWorth, reputation, health, fame))

    // Kişisel bilgiler
    this.el.appendChild(sectionTitle('Kişisel'))
    this.el.appendChild(this.buildInfoRows([
      { ico: '🎓', label: 'Eğitim',       value: edu?.name ?? 'Seçilmedi' },
      { ico: '✨', label: 'Kişilik',      value: pers ? `${pers.emoji} ${pers.name}` : 'Seçilmedi' },
      { ico: '🧭', label: 'Karakter Yolu', value: path },
      { ico: karma >= 0 ? '😇' : '😈', label: 'Karma', value: `${karma > 0 ? '+' : ''}${karma}` },
    ]))

    // İstatistikler
    this.el.appendChild(sectionTitle('İstatistikler'))
    this.el.appendChild(this.buildInfoRows([
      { ico: '💰', label: 'Toplam Kazanç (ömür)', value: fmtMoney(Math.round(s.lifetimeTotalEarned)) },
      { ico: '🚀', label: 'IPO Sayısı',           value: String(s.ipoCount) },
      { ico: '🏆', label: 'Başarımlar',           value: `${s.achievements.size} adet` },
      { ico: '⏱️', label: 'Oynama Süresi',        value: `${playHours}sa ${playMins}dk` },
      { ico: '👆', label: 'Toplam Tıklama',       value: s.totalClicks.toLocaleString('tr-TR') },
    ]))

    // Başarımlar kısayolu
    const achBtn = document.createElement('button')
    achBtn.className = 'ref-profile-ach-btn'
    achBtn.type = 'button'
    achBtn.dataset.action = 'open-achievements'
    achBtn.innerHTML = '🏆 Başarımları Gör'
    this.el.appendChild(achBtn)
  }

  /** GameState yokken (saf önizleme) gösterilen mock iskelet. */
  private renderMock(): void {
    this.el.innerHTML = ''
    this.el.appendChild(demoBanner('profil sayfası iskeleti · canlı veriler oyun açılınca dolar'))
    this.el.appendChild(this.buildHero('Mert Karahan', 34, 'İstanbul', 'male'))
    this.el.appendChild(this.buildKpis(18_700_000, 72, 80, 0))
    this.el.appendChild(sectionTitle('Kişisel'))
    this.el.appendChild(this.buildInfoRows([
      { ico: '🎓', label: 'Eğitim',        value: 'MBA' },
      { ico: '✨', label: 'Kişilik',       value: 'Girişimci' },
      { ico: '🧭', label: 'Karakter Yolu', value: 'Bilinmez' },
      { ico: '😇', label: 'Karma',         value: '0' },
    ]))
  }

  private buildHero(name: string, age: number, city: string, gender: string): HTMLElement {
    const hero = document.createElement('div')
    hero.className = 'ref-profile-hero'
    hero.innerHTML = `
      <div class="ref-profile-avatar">
        <img src="${ua(AVATAR)}" alt="" class="ref-avatar__img">
      </div>
      <div class="ref-profile-id">
        <div class="ref-profile-name">${name}</div>
        <div class="ref-profile-chips">
          <span class="ref-member-chip">${gender === 'female' ? '👩' : '👨'} ${age} yaş</span>
          <span class="ref-member-chip">📍 ${city}</span>
        </div>
      </div>
    `
    return hero
  }

  private buildKpis(netWorth: number, reputation: number, health: number, fame: number): HTMLElement {
    const grid = document.createElement('div')
    grid.className = 'ref-kpi-strip'
    const items = [
      { icon: '💎', label: 'Net Servet', value: fmtMoney(netWorth), sub: 'Toplam' },
      { icon: '⭐', label: 'İtibar',     value: String(reputation), sub: reputationLabel(reputation) },
      { icon: '❤️', label: 'Sağlık',     value: String(health),     sub: healthStatusLabel(health) },
      { icon: '🌟', label: 'Şöhret',     value: String(fame),       sub: fameLevelLabel(fame) },
    ]
    grid.innerHTML = items.map(i => `
      <div class="ref-kpi-card">
        <div class="ref-kpi-icon">${i.icon}</div>
        <div class="ref-kpi-label">${i.label}</div>
        <div class="ref-kpi-value">${i.value}</div>
        <div class="ref-kpi-sub muted">${i.sub}</div>
      </div>
    `).join('')
    return grid
  }

  private buildInfoRows(rows: { ico: string; label: string; value: string }[]): HTMLElement {
    const list = document.createElement('div')
    list.className = 'ref-profile-info-list'
    list.innerHTML = rows.map(r => `
      <div class="ref-profile-info-row">
        <span class="ref-profile-info-ico">${r.ico}</span>
        <span class="ref-profile-info-lbl">${r.label}</span>
        <span class="ref-profile-info-val">${r.value}</span>
      </div>
    `).join('')
    return list
  }
}
