import type { GameState } from '../../game/GameState'
import { progressPathSnapshot } from '../../game/ProgressPath'
import { playerGameAge } from '../../game/Dynasty'
import { cityDef } from '../../game/ExpansionMap'

export interface PageHeaderOpts {
  /** Sağ üst ikon butonları için tıklama (ops.) */
  onCrown?: () => void
  onMessage?: () => void
  onBell?: () => void
  /** Bildirim rozeti sayısı */
  bellBadge?: number
}

/**
 * Tüm sayfalarda ortak üst bölüm (referans görsel düzeni):
 * - Sol: yuvarlak avatar + isim + ünvan + yaş/şehir
 * - Sağ: 3 yuvarlak ikon buton (taç, mesaj, bildirim)
 * - Ortada: büyük altın detaylı sayfa başlığı
 */
export function renderPageHeader(state: GameState, title: string, opts: PageHeaderOpts = {}): HTMLElement {
  const age = playerGameAge(state.gameTimeMs, state.dynasty)
  const snap = progressPathSnapshot(state.totalEarned, state.ipoCount)
  const city = cityDef(state.activeCityId())
  const avatar = state.playerGender === 'female' ? '👩‍💼' : '👨‍💼'

  const header = document.createElement('div')
  header.className = 'page-header'

  // Üst satır: profil + ikon butonlar
  const top = document.createElement('div')
  top.className = 'page-header-top'
  top.innerHTML = `
    <div class="ph-profile">
      <div class="ph-avatar">${avatar}</div>
      <div class="ph-profile-info">
        <div class="ph-name">${state.playerName}</div>
        <div class="ph-rank">${snap.currentEmoji} ${snap.currentRank}</div>
        <div class="ph-meta">🎂 ${age} · ${city.emoji} ${city.label}</div>
      </div>
    </div>
    <div class="ph-icons">
      <button type="button" class="ph-icon-btn" data-ph="crown" title="Profil">👑</button>
      <button type="button" class="ph-icon-btn" data-ph="msg" title="Mesajlar">✉️</button>
      <button type="button" class="ph-icon-btn" data-ph="bell" title="Bildirimler">🔔${opts.bellBadge ? `<span class="ph-bell-badge">${opts.bellBadge}</span>` : ''}</button>
    </div>
  `

  // Büyük başlık + altın dekoratif çizgi
  const titleEl = document.createElement('div')
  titleEl.className = 'page-header-title'
  titleEl.innerHTML = `
    <span class="ph-title-deco left">◆</span>
    <h1 class="ph-title-text">${title}</h1>
    <span class="ph-title-deco right">◆</span>
  `

  header.append(top, titleEl)

  if (opts.onCrown) top.querySelector('[data-ph="crown"]')?.addEventListener('click', opts.onCrown)
  if (opts.onMessage) top.querySelector('[data-ph="msg"]')?.addEventListener('click', opts.onMessage)
  if (opts.onBell) top.querySelector('[data-ph="bell"]')?.addEventListener('click', opts.onBell)

  return header
}

export interface KpiItem {
  icon: string
  label: string
  value: string
  tone?: 'cash' | 'nw' | 'income' | 'risk' | 'neutral'
}

/** Yatay KPI şeridi — referans görsel düzeni */
export function renderKpiStrip(items: KpiItem[]): HTMLElement {
  const strip = document.createElement('div')
  strip.className = 'page-kpi-strip'
  for (const it of items) {
    const cell = document.createElement('div')
    cell.className = `page-kpi-cell kpi-${it.tone ?? 'neutral'}`
    cell.innerHTML = `
      <span class="page-kpi-icon">${it.icon}</span>
      <div class="page-kpi-body">
        <span class="page-kpi-label">${it.label}</span>
        <strong class="page-kpi-value">${it.value}</strong>
      </div>
    `
    strip.appendChild(cell)
  }
  return strip
}
