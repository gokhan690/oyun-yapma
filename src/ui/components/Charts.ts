/**
 * Yeniden kullanılabilir SVG grafik bileşenleri.
 * Hepsi saf fonksiyon — SVG string döndürür, DOM'a yazılır.
 * Oyunun "modern iş imparatorluğu" tasarım diline uygun.
 */

const COLORS = {
  green: '#34d399',
  red: '#f87171',
  gold: '#fbbf24',
  blue: '#60a5fa',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  orange: '#fb923c',
  muted: '#64748b',
}

export type ChartColor = keyof typeof COLORS

/** SVG path için noktaları normalize et */
function normalize(values: number[], width: number, height: number, pad = 2): { x: number; y: number }[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0
  return values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (height - pad * 2) * (1 - (v - min) / range),
  }))
}

/**
 * Küçük sparkline grafik — sektör kartları, mini göstergeler için.
 * Trend pozitifse yeşil, negatifse kırmızı.
 */
export function sparkline(values: number[], opts: { width?: number; height?: number; color?: ChartColor } = {}): string {
  const width = opts.width ?? 64
  const height = opts.height ?? 24
  if (values.length < 2) {
    return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`
  }
  const pts = normalize(values, width, height)
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const rising = values[values.length - 1]! >= values[0]!
  const color = opts.color ? COLORS[opts.color] : rising ? COLORS.green : COLORS.red
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
}

/**
 * Büyük çizgi grafik — net değer / fiyat geçmişi için.
 * Yükselişte yeşil dolgu, düşüşte kırmızı; alt alan gradyanlı.
 */
export function lineChart(
  values: number[],
  opts: { width?: number; height?: number; showFill?: boolean; baselineIndex?: number } = {},
): string {
  const width = opts.width ?? 320
  const height = opts.height ?? 120
  if (values.length < 2) {
    return `<svg class="line-chart" width="100%" height="${height}" viewBox="0 0 ${width} ${height}"><text x="${width / 2}" y="${height / 2}" fill="#64748b" font-size="11" text-anchor="middle">Veri toplanıyor…</text></svg>`
  }
  const pad = 4
  const pts = normalize(values, width, height, pad)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const rising = values[values.length - 1]! >= values[0]!
  const color = rising ? COLORS.green : COLORS.red
  const gradId = `grad-${Math.random().toString(36).slice(2, 8)}`
  const fillPath = `${line} L${pts[pts.length - 1]!.x.toFixed(1)},${height - pad} L${pts[0]!.x.toFixed(1)},${height - pad} Z`
  return `<svg class="line-chart" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${opts.showFill !== false ? `<path d="${fillPath}" fill="url(#${gradId})"/>` : ''}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pts[pts.length - 1]!.x.toFixed(1)}" cy="${pts[pts.length - 1]!.y.toFixed(1)}" r="3" fill="${color}"/>
  </svg>`
}

export interface DonutSegment {
  label: string
  value: number
  color: ChartColor
}

/**
 * Halka (donut) grafik — gelir kaynakları dağılımı için.
 */
export function donutChart(segments: DonutSegment[], opts: { size?: number } = {}): string {
  const size = opts.size ?? 120
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10
  const stroke = 16
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total <= 0) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#2d4a6f" stroke-width="${stroke}"/></svg>`
  }
  const circ = 2 * Math.PI * r
  let offset = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const frac = seg.value / total
      const len = frac * circ
      const dash = `${len.toFixed(2)} ${(circ - len).toFixed(2)}`
      const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS[seg.color]}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`
      offset += len
      return arc
    })
    .join('')
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-chart">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1a2d4a" stroke-width="${stroke}"/>
    ${arcs}
  </svg>`
}

/**
 * Yarım daire gauge — heat, stres, piyasa korkusu için.
 * 0-100 değer, renk seviyeye göre değişir.
 */
export function gauge(
  value: number,
  opts: { size?: number; thresholds?: { at: number; color: ChartColor }[]; label?: string } = {},
): string {
  const size = opts.size ?? 120
  const v = Math.max(0, Math.min(100, value))
  const cx = size / 2
  const cy = size * 0.62
  const r = size / 2 - 12
  const stroke = 12
  // Yarım daire: 180° (sol) → 0° (sağ)
  const startAngle = Math.PI
  const endAngle = 0
  const valueAngle = startAngle + (endAngle - startAngle) * (v / 100)
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(valueAngle)
  const y2 = cy + r * Math.sin(valueAngle)
  const bgX = cx + r * Math.cos(endAngle)
  const bgY = cy + r * Math.sin(endAngle)
  const thresholds = opts.thresholds ?? [
    { at: 30, color: 'green' as ChartColor },
    { at: 60, color: 'gold' as ChartColor },
    { at: 80, color: 'orange' as ChartColor },
    { at: 100, color: 'red' as ChartColor },
  ]
  let color: ChartColor = 'green'
  for (const th of thresholds) {
    if (v <= th.at) { color = th.color; break }
    color = th.color
  }
  const largeArc = v > 50 ? 1 : 0
  return `<svg width="${size}" height="${size * 0.7}" viewBox="0 0 ${size} ${size * 0.7}" class="gauge-chart">
    <path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 1 1 ${bgX.toFixed(1)},${bgY.toFixed(1)}" fill="none" stroke="#1a2d4a" stroke-width="${stroke}" stroke-linecap="round"/>
    <path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc} 1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${COLORS[color]}" stroke-width="${stroke}" stroke-linecap="round"/>
    <text x="${cx}" y="${cy - 2}" fill="${COLORS[color]}" font-size="${size * 0.18}" font-weight="800" text-anchor="middle">${Math.round(v)}</text>
    ${opts.label ? `<text x="${cx}" y="${cy + size * 0.12}" fill="#94a3b8" font-size="${size * 0.08}" text-anchor="middle">${opts.label}</text>` : ''}
  </svg>`
}

/**
 * Yatay ilerleme barı — eğitim, terfi, hedef için.
 */
export function progressBar(pct: number, opts: { color?: ChartColor; height?: number; glow?: boolean } = {}): string {
  const p = Math.max(0, Math.min(100, pct))
  const color = opts.color ? COLORS[opts.color] : COLORS.gold
  const height = opts.height ?? 8
  return `<div class="chart-progress" style="height:${height}px">
    <div class="chart-progress-fill${opts.glow ? ' chart-progress-glow' : ''}" style="width:${p}%;background:${color}${opts.glow ? `;box-shadow:0 0 8px ${color}` : ''}"></div>
  </div>`
}

/**
 * Gelir/gider karşılaştırma çubukları.
 */
export function incomeExpenseBars(income: number, expense: number): string {
  const max = Math.max(income, expense, 1)
  const incPct = (income / max) * 100
  const expPct = (expense / max) * 100
  const net = income - expense
  const netPct = (Math.abs(net) / max) * 100
  return `<div class="ie-bars">
    <div class="ie-bar-row">
      <span class="ie-bar-label">Gelir</span>
      <div class="ie-bar-track"><div class="ie-bar-fill" style="width:${incPct}%;background:${COLORS.green}"></div></div>
    </div>
    <div class="ie-bar-row">
      <span class="ie-bar-label">Gider</span>
      <div class="ie-bar-track"><div class="ie-bar-fill" style="width:${expPct}%;background:${COLORS.red}"></div></div>
    </div>
    <div class="ie-bar-row ie-bar-net">
      <span class="ie-bar-label">Net</span>
      <div class="ie-bar-track"><div class="ie-bar-fill" style="width:${netPct}%;background:${net >= 0 ? COLORS.gold : COLORS.orange}"></div></div>
    </div>
  </div>`
}

export { COLORS as CHART_COLORS }
