import { lineChart } from './Charts'

export interface IpoCelebrationData {
  playerName: string
  ipoNumber: number
  pointsEarned: number
  oldMultiplier: number
  newMultiplier: number
  startingCash: number
  unlockedCity?: string | null
  reputation: number
}

function fmtMoney(n: number): string {
  if (n >= 1e12) return `₺${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `₺${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `₺${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `₺${(n / 1e3).toFixed(1)}K`
  return `₺${Math.round(n)}`
}

function headline(ipoNumber: number, reputation: number): string {
  if (reputation >= 75) {
    return ['Yatırımcılar kuyrukta!', 'Borsa tarihine geçti', 'Dev halka arz tamamlandı'][ipoNumber % 3]!
  }
  if (reputation >= 50) {
    return ['Piyasalar heyecanlı', 'Analistler takipte', 'Dikkat çeken halka arz'][ipoNumber % 3]!
  }
  return ['Tartışmalı halka arz', 'Yatırımcılar temkinli', 'Analistler soru işareti koyuyor'][ipoNumber % 3]!
}

/**
 * IPO kutlama sineması (Section 13 — IPO ekranı görseli).
 * Konfeti + gazete manşeti + hisse grafiği yükselişi + "Halka arz başarılı!"
 */
export class IpoCelebration {
  private overlay: HTMLElement | null = null

  show(data: IpoCelebrationData, onDone?: () => void): void {
    if (this.overlay) { this.overlay.remove(); this.overlay = null }

    const overlay = document.createElement('div')
    overlay.className = 'ipo-celebration-overlay'

    // Yükselen hisse grafiği — dramatik artış
    const chartData = [40, 38, 45, 42, 50, 55, 52, 60, 72, 85, 100]
    const risingChart = lineChart(chartData, { height: 90 })

    // Konfeti parçacıkları
    const confetti = Array.from({ length: 28 }, (_, i) => {
      const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa']
      const c = colors[i % colors.length]
      const left = Math.random() * 100
      const delay = Math.random() * 0.6
      const dur = 1.6 + Math.random() * 1.2
      return `<span class="ipo-confetti" style="left:${left}%;background:${c};animation-delay:${delay}s;animation-duration:${dur}s"></span>`
    }).join('')

    const effects: string[] = [
      `+${data.pointsEarned} kalıcı hisse ✦`,
      `Çarpan x${data.oldMultiplier.toFixed(2)} → x${data.newMultiplier.toFixed(2)}`,
      `${fmtMoney(data.startingCash)} başlangıç sermayesi`,
    ]
    if (data.unlockedCity) effects.push(`🗺️ ${data.unlockedCity} açıldı`)
    effects.push('📊 Yeni prestij düğümü erişilebilir')

    overlay.innerHTML = `
      <div class="ipo-confetti-layer">${confetti}</div>
      <div class="ipo-celebration-card">
        <div class="ipo-bell">🔔</div>
        <div class="ipo-celebration-title">Halka Arz Başarılı!</div>
        <div class="ipo-celebration-sub">${data.playerName} · IPO #${data.ipoNumber}</div>
        <div class="ipo-newspaper">
          <span class="ipo-newspaper-tag">📰 BARON GAZETESİ</span>
          <strong class="ipo-newspaper-headline">"${headline(data.ipoNumber, data.reputation)}"</strong>
        </div>
        <div class="ipo-chart-rise">${risingChart}</div>
        <div class="ipo-effects">
          ${effects.map((e) => `<div class="ipo-effect-row">✓ ${e}</div>`).join('')}
        </div>
        <button class="ipo-celebration-btn" id="ipo-celebration-continue">Yeni Tura Başla 🚀</button>
      </div>
    `

    document.body.appendChild(overlay)
    this.overlay = overlay

    const close = () => {
      this.dismiss()
      onDone?.()
    }
    overlay.querySelector('#ipo-celebration-continue')?.addEventListener('click', close)
    window.setTimeout(() => { if (this.overlay) close() }, 12_000)
  }

  private dismiss(): void {
    if (!this.overlay) return
    this.overlay.classList.add('ipo-celebration-out')
    const el = this.overlay
    this.overlay = null
    window.setTimeout(() => el.remove(), 500)
  }
}
