export interface VictoryData {
  victoryId: string
  playerName: string
  totalEarned: number
  ipoCount: number
  generation: number
  alignment: string
}

interface VictoryConfig {
  emoji: string
  title: string
  subtitle: string
  legacy: string
}

function fmtMoney(n: number): string {
  if (n >= 1e12) return `₺${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9) return `₺${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `₺${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `₺${(n / 1e3).toFixed(1)}K`
  return `₺${Math.round(n)}`
}

function getConfig(victoryId: string): VictoryConfig {
  switch (victoryId) {
    case 'economic':
      return {
        emoji: '💰',
        title: 'Ekonomik Zafer!',
        subtitle: 'Türkiye\'nin en büyük iş imparatorluğunu kurdun',
        legacy: '"Para hem amaç hem araçtı — sen ikisini de ustalıkla kullandın."',
      }
    case 'political':
      return {
        emoji: '🎖️',
        title: 'Siyasi Zafer!',
        subtitle: 'Cumhurbaşkanlığı koltuğuna oturarak ülkeyi yönettin',
        legacy: '"Güç sadece para değildi — halkın güvenini de kazandın."',
      }
    case 'dynasty':
      return {
        emoji: '👑',
        title: 'Hanedan Zaferi!',
        subtitle: '7 nesil boyunca imparatorluğu yaşattın',
        legacy: '"Adın tarihe geçti — torunların bu mirası taşıyacak."',
      }
    case 'shadow':
      return {
        emoji: '🕶️',
        title: 'Gölge Zafer!',
        subtitle: 'Karanlıkta yükselerek rakipsiz güce ulaştın',
        legacy: '"Sistem seni yakalayamadı — sen sistemi yönettin."',
      }
    default:
      return {
        emoji: '🏆',
        title: 'Zafer!',
        subtitle: 'İmparatorluğunu zirveye taşıdın',
        legacy: '"Baron olarak tarihe geçtin."',
      }
  }
}

export class VictoryCinematic {
  private overlay: HTMLElement | null = null

  show(data: VictoryData): void {
    if (this.overlay) return

    const cfg = getConfig(data.victoryId)
    const overlay = document.createElement('div')
    overlay.className = 'victory-cinematic-overlay'

    overlay.innerHTML = `
      <div class="victory-cinematic-card">
        <div class="victory-cinematic-emoji">${cfg.emoji}</div>
        <div class="victory-cinematic-title">${cfg.title}</div>
        <div class="victory-cinematic-player">${data.playerName}</div>
        <div class="victory-cinematic-subtitle">${cfg.subtitle}</div>
        <div class="victory-cinematic-stats">
          <div class="vc-stat">
            <span class="vc-stat-label">Toplam Kazanç</span>
            <span class="vc-stat-value">${fmtMoney(data.totalEarned)}</span>
          </div>
          <div class="vc-stat">
            <span class="vc-stat-label">IPO Sayısı</span>
            <span class="vc-stat-value">${data.ipoCount}</span>
          </div>
          <div class="vc-stat">
            <span class="vc-stat-label">Nesil</span>
            <span class="vc-stat-value">${data.generation}</span>
          </div>
          <div class="vc-stat">
            <span class="vc-stat-label">Karakter Yolu</span>
            <span class="vc-stat-value">${data.alignment}</span>
          </div>
        </div>
        <div class="victory-cinematic-legacy">${cfg.legacy}</div>
        <button class="victory-cinematic-btn" id="vc-continue-btn">Devam Et →</button>
      </div>
    `

    document.body.appendChild(overlay)
    this.overlay = overlay

    overlay.querySelector('#vc-continue-btn')?.addEventListener('click', () => this.dismiss())
    setTimeout(() => this.dismiss(), 45_000)
  }

  private dismiss(): void {
    if (!this.overlay) return
    this.overlay.classList.add('victory-cinematic-out')
    setTimeout(() => {
      this.overlay?.remove()
      this.overlay = null
    }, 600)
  }
}
