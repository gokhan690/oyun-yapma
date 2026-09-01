/**
 * "Meyve Birleştir" giriş noktası — reklamsız, çevrimdışı çalışan Suika tipi oyun.
 * Bu dosya yalnızca arayüzü bağlar; oyun mantığı `src/merge/` altında.
 */

import './merge/merge.css'
import { FRUITS } from './merge/fruits'
import { MergeGame, dailyStatus } from './merge/MergeGame'
import type { Mode, MissionView, PowerupState } from './merge/MergeGame'
import { drawFruitPreview } from './merge/render'
import { storageGet, storageSet, storagePersists } from './merge/storage'
import { loadProfile, updateProfile } from './merge/profile'
import { ACHIEVEMENTS } from './merge/achievements'
import { POWERUPS, MAX_LOADOUT } from './merge/powerups'
import { prettyDate } from './merge/rng'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Eleman bulunamadı: ${id}`)
  return el as T
}

const canvas = $<HTMLCanvasElement>('board')
const scoreEl = $<HTMLElement>('score')
const bestEl = $<HTMLElement>('best')
const nextCanvas = $<HTMLCanvasElement>('next-fruit')
const biggestBox = $<HTMLElement>('biggest-box')
const biggestCanvas = $<HTMLCanvasElement>('biggest-fruit')
const timerBox = $<HTMLElement>('timer')
const clockEl = $<HTMLElement>('clock')
const missionsEl = $<HTMLElement>('missions')
const feverBar = $<HTMLElement>('fever-bar')
const feverFill = $<HTMLElement>('fever-fill')
const comboEl = $<HTMLElement>('combo')
const toastEl = $<HTMLElement>('toast')
const powerupsEl = $<HTMLElement>('powerups')

const startOverlay = $<HTMLElement>('start-overlay')
const overOverlay = $<HTMLElement>('over-overlay')
const achOverlay = $<HTMLElement>('ach-overlay')
const albumOverlay = $<HTMLElement>('album-overlay')

const startBtn = $<HTMLButtonElement>('start')
const freshBtn = $<HTMLButtonElement>('fresh')
const againBtn = $<HTMLButtonElement>('again')
const toMenuBtn = $<HTMLButtonElement>('to-menu')
const soundBtn = $<HTMLButtonElement>('sound')
const restartBtn = $<HTMLButtonElement>('restart')

const overTitle = $<HTMLElement>('over-title')
const finalEl = $<HTMLElement>('final-score')
const finalSub = $<HTMLElement>('final-sub')
const reportEl = $<HTMLElement>('report')
const missionResultEl = $<HTMLElement>('mission-result')
const earnedEl = $<HTMLElement>('earned')

const chainEl = $<HTMLElement>('chain')
const modesEl = $<HTMLElement>('modes')
const dailyLine = $<HTMLElement>('daily-line')
const loadoutEl = $<HTMLElement>('loadout')
const loadoutCount = $<HTMLElement>('loadout-count')
const statsEl = $<HTMLElement>('stats')
const fineEl = $<HTMLElement>('fine')
const trophiesEl = $<HTMLElement>('trophies')
const achCount = $<HTMLElement>('ach-count')
const albumEl = $<HTMLElement>('album')
const albumCount = $<HTMLElement>('album-count')

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'classic', label: 'Klasik', hint: 'Tehlike çizgisine dikkat' },
  { id: 'zen', label: 'Zen', hint: 'Tehlike çizgisi yok' },
  { id: 'timed', label: '2 Dakika', hint: '2 dakikada en yüksek skor' },
  { id: 'daily', label: 'Günlük', hint: 'Herkese aynı meyve sırası' },
]

let nextTier = 0
let nextGolden = false
let biggestTier = -1
let scoreTimer = 0
let toastTimer = 0
let startingBest = Number(storageGet('fm_best') ?? 0)
let recordShown = false
let mode: Mode = (storageGet('fm_mode') as Mode) ?? 'classic'
if (!MODES.some((m) => m.id === mode)) mode = 'classic'

// ---------------------------------------------------------------- küçük yardımcılar

function flash(text: string): void {
  comboEl.textContent = text
  comboEl.classList.remove('show')
  void comboEl.offsetWidth
  comboEl.classList.add('show')
}

function toast(text: string): void {
  toastEl.textContent = text
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200)
}

function bumpScore(): void {
  scoreEl.classList.add('bump')
  window.clearTimeout(scoreTimer)
  scoreTimer = window.setTimeout(() => scoreEl.classList.remove('bump'), 180)
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ---------------------------------------------------------------- oyun

const game = new MergeGame(canvas, {
  onScore(score, best) {
    if (scoreEl.textContent !== String(score)) bumpScore()
    scoreEl.textContent = String(score)
    bestEl.textContent = String(best)
    if (!recordShown && startingBest > 0 && score > startingBest) {
      recordShown = true
      flash('REKOR KIRILDI!')
    }
  },
  onNext(tier, golden) {
    nextTier = tier
    nextGolden = golden
    drawFruitPreview(nextCanvas, tier, 2, golden)
  },
  onBiggest(tier) {
    biggestTier = tier
    if (tier <= 0) {
      biggestBox.hidden = true
      return
    }
    biggestBox.hidden = false
    drawFruitPreview(biggestCanvas, tier, 1)
  },
  onCombo(count) {
    if (count < 2) return
    flash(`COMBO ×${count}`)
  },
  onFever(active, meter) {
    feverBar.classList.toggle('active', active)
    feverBar.classList.toggle('visible', active || meter > 0.02)
    feverFill.style.width = `${Math.round(meter * 100)}%`
    document.body.classList.toggle('fever', active)
  },
  onPowerups(list) {
    paintPowerups(list)
  },
  onMissions(list) {
    paintMissions(list)
  },
  onTime(seconds) {
    if (seconds === null) {
      timerBox.hidden = true
      return
    }
    timerBox.hidden = false
    clockEl.textContent = clock(seconds)
    clockEl.classList.toggle('low', seconds <= 15)
  },
  onToast(text) {
    toast(text)
  },
  onGameOver(report) {
    overTitle.textContent = report.isRecord ? 'Yeni Rekor!' : 'Oyun Bitti'
    finalEl.textContent = String(report.score)

    if (report.mode === 'daily') {
      finalSub.innerHTML =
        report.score >= report.dailyTarget
          ? `<span class="record">Günlük hedefi geçtin! 🎯</span>`
          : `Günlük hedef: <b>${report.dailyTarget}</b>`
    } else if (report.isRecord) {
      finalSub.innerHTML = '<span class="record">Şimdiye kadarki en iyin 🏆</span>'
    } else if (report.mode === 'zen') {
      finalSub.textContent = 'Zen turu — rekora yazılmaz'
    } else {
      finalSub.innerHTML = `Rekoruna <b>${report.toRecord}</b> puan kaldı`
    }

    reportEl.innerHTML = [
      row('🍉', 'En büyük', FRUITS[report.biggest].name),
      row('🔥', 'En yüksek combo', report.maxCombo > 1 ? `×${report.maxCombo}` : '—'),
      row('💥', 'Birleştirme', String(report.merges)),
      row('⏱', 'Süre', clock(report.seconds)),
      row('🍒', 'Atılan meyve', String(report.drops)),
      row('🪙', 'Kazanılan', String(report.coins)),
    ].join('')

    missionResultEl.innerHTML =
      '<div class="chain-label">GÖREVLER</div>' +
      report.missions
        .map((m) => `<div class="mission-line ${m.done ? 'done' : ''}">${m.done ? '✅' : '⬜'} ${m.text}</div>`)
        .join('')

    earnedEl.innerHTML = report.achievements.length
      ? '<div class="chain-label">YENİ BAŞARIM</div>' +
        report.achievements.map((a) => `<div class="mission-line done">${a.icon} ${a.name}</div>`).join('')
      : ''

    overOverlay.classList.add('show')
    paintStats()
  },
})

function row(icon: string, label: string, value: string): string {
  return `<div class="report-row"><span class="ri">${icon}</span><span class="rl">${label}</span><span class="rv">${value}</span></div>`
}

// ---------------------------------------------------------------- HUD parçaları

function paintPowerups(list: PowerupState[]): void {
  powerupsEl.innerHTML = ''
  for (const p of list) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `power-btn${p.count <= 0 ? ' empty' : ''}${p.armed ? ' armed' : ''}`
    btn.setAttribute('aria-label', p.name)
    btn.innerHTML = `<span class="ic">${p.icon}</span><span class="count">${p.count}</span>`
    btn.addEventListener('click', () => game.usePowerup(p.id))
    powerupsEl.appendChild(btn)
  }
}

function paintMissions(list: MissionView[]): void {
  missionsEl.innerHTML = ''
  for (const m of list) {
    const chip = document.createElement('div')
    chip.className = `mission${m.done ? ' done' : ''}`
    chip.innerHTML = `<span class="fill" style="width:${Math.round(m.progress * 100)}%"></span><span class="mt">${
      m.done ? '✅ ' : ''
    }${m.text}</span>`
    missionsEl.appendChild(chip)
  }
}

// ---------------------------------------------------------------- menü parçaları

const chainCanvases: HTMLCanvasElement[] = []
FRUITS.forEach((f, i) => {
  if (i > 0) {
    const sep = document.createElement('span')
    sep.className = 'sep'
    sep.textContent = '›'
    chainEl.appendChild(sep)
  }
  const item = document.createElement('span')
  item.title = f.name
  if (i === FRUITS.length - 1) item.className = 'goal'
  const c = document.createElement('canvas')
  item.appendChild(c)
  chainEl.appendChild(item)
  chainCanvases.push(c)
})

function paintChain(): void {
  chainCanvases.forEach((c, i) => drawFruitPreview(c, i, 1))
}

function paintModes(): void {
  modesEl.innerHTML = ''
  for (const m of MODES) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = `mode-chip${mode === m.id ? ' on' : ''}`
    chip.innerHTML = `<b>${m.label}</b><span>${m.hint}</span>`
    chip.addEventListener('click', () => {
      mode = m.id
      storageSet('fm_mode', mode)
      game.setMode(m.id)
      paintModes()
      paintDaily()
      freshBtn.hidden = true
      startBtn.textContent = 'Başla'
    })
    modesEl.appendChild(chip)
  }
}

function paintDaily(): void {
  if (mode !== 'daily') {
    dailyLine.hidden = true
    return
  }
  const d = dailyStatus()
  dailyLine.hidden = false
  dailyLine.innerHTML = d.done
    ? `📅 <b>${prettyDate()}</b> — bugünkü skorun: <b>${d.score}</b>. Yeni turlar antrenman sayılır.`
    : `📅 <b>${prettyDate()}</b> — hedef <b>${d.target}</b> puan. Günde 1 resmi deneme.`
}

function paintLoadout(): void {
  const profile = loadProfile()
  loadoutEl.innerHTML = ''
  loadoutCount.textContent = String(profile.loadout.length)
  for (const def of POWERUPS) {
    const on = profile.loadout.includes(def.id)
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = `load-chip${on ? ' on' : ''}`
    chip.title = def.desc
    chip.innerHTML = `<span class="ic">${def.icon}</span><span class="nm">${def.name}</span>`
    chip.addEventListener('click', () => {
      updateProfile((p) => {
        if (p.loadout.includes(def.id)) {
          if (p.loadout.length > 1) p.loadout = p.loadout.filter((x) => x !== def.id)
        } else if (p.loadout.length < MAX_LOADOUT) {
          p.loadout.push(def.id)
        } else {
          toast(`En fazla ${MAX_LOADOUT} yardımcı seçebilirsin`)
        }
      })
      game.syncLoadout()
      paintLoadout()
    })
    loadoutEl.appendChild(chip)
  }
}

function paintStats(): void {
  const p = loadProfile()
  const { games, merges } = p.stats
  if (games === 0 && merges === 0 && p.coins === 0) {
    statsEl.hidden = true
    return
  }
  statsEl.hidden = false
  statsEl.innerHTML = `🪙 <b>${p.coins}</b> · ⭐ <b>${p.stars}</b> · ${games} oyun · ${merges} birleşme`
}

function paintTrophies(): void {
  const p = loadProfile()
  achCount.textContent = `${p.achievements.length} / ${ACHIEVEMENTS.length} kazanıldı`
  trophiesEl.innerHTML = ACHIEVEMENTS.map((a) => {
    const got = p.achievements.includes(a.id)
    return `<div class="trophy ${got ? 'got' : ''}"><span class="ti">${got ? a.icon : '🔒'}</span><span class="tn">${
      a.name
    }</span><span class="th">${a.hint}</span></div>`
  }).join('')
}

function paintAlbum(): void {
  const p = loadProfile()
  albumCount.textContent = `${p.album.length} / ${FRUITS.length} meyve açıldı`
  albumEl.innerHTML = ''
  FRUITS.forEach((f, i) => {
    const got = p.album.includes(i) || i < 5
    const cell = document.createElement('div')
    cell.className = `album-cell ${got ? 'got' : ''}`
    const c = document.createElement('canvas')
    cell.appendChild(c)
    const name = document.createElement('span')
    name.textContent = got ? f.name : '???'
    cell.appendChild(name)
    albumEl.appendChild(cell)
    if (got) drawFruitPreview(c, i, 2)
    else {
      const ctx = c.getContext('2d')
      if (ctx) {
        const size = c.clientWidth || 40
        const dpr = Math.min(window.devicePixelRatio || 1, 3)
        c.width = Math.round(size * dpr)
        c.height = Math.round(size * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.fillStyle = 'rgba(140,100,60,0.22)'
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(90,60,20,0.5)'
        ctx.font = `700 ${Math.round(size * 0.5)}px system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', size / 2, size / 2 + 1)
      }
    }
  })
}

// ---------------------------------------------------------------- akış

function beginPlay(): void {
  startOverlay.classList.remove('show')
  overOverlay.classList.remove('show')
  game.play()
}

function newGame(): void {
  startingBest = Number(storageGet('fm_best') ?? 0)
  recordShown = false
  startOverlay.classList.remove('show')
  overOverlay.classList.remove('show')
  game.reset()
}

function toMenu(): void {
  overOverlay.classList.remove('show')
  startOverlay.classList.add('show')
  startBtn.textContent = 'Başla'
  freshBtn.hidden = true
  paintDaily()
  paintStats()
  paintLoadout()
}

startBtn.addEventListener('click', beginPlay)
freshBtn.addEventListener('click', newGame)
againBtn.addEventListener('click', newGame)
toMenuBtn.addEventListener('click', () => {
  game.reset()
  game.pause()
  toMenu()
})

$<HTMLButtonElement>('open-ach').addEventListener('click', () => {
  paintTrophies()
  achOverlay.classList.add('show')
})
$<HTMLButtonElement>('close-ach').addEventListener('click', () => achOverlay.classList.remove('show'))
$<HTMLButtonElement>('open-album').addEventListener('click', () => {
  paintAlbum()
  albumOverlay.classList.add('show')
})
$<HTMLButtonElement>('close-album').addEventListener('click', () => albumOverlay.classList.remove('show'))

restartBtn.addEventListener('click', () => {
  if (game.isOver || !game.isPlaying || window.confirm('Oyunu baştan başlatmak istiyor musun?')) newGame()
})

function paintSoundBtn(): void {
  soundBtn.textContent = game.soundOn ? '🔊' : '🔇'
  soundBtn.classList.toggle('off', !game.soundOn)
  soundBtn.setAttribute('aria-label', game.soundOn ? 'Sesi kapat' : 'Sesi aç')
}
soundBtn.addEventListener('click', () => {
  game.toggleSound()
  paintSoundBtn()
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.pause()
  } else if (!game.isOver && !startOverlay.classList.contains('show')) {
    game.play()
  }
})

window.addEventListener('resize', () => {
  drawFruitPreview(nextCanvas, nextTier, 2, nextGolden)
  if (biggestTier > 0) drawFruitPreview(biggestCanvas, biggestTier, 1)
  paintChain()
})

// ---------------------------------------------------------------- açılış

paintChain()
paintModes()
paintDaily()
paintLoadout()
paintStats()
paintSoundBtn()
if (!storagePersists()) {
  fineEl.textContent = 'Reklamsız · çevrimdışı · skorlar bu oturumda tutulur'
}

// Servis çalışanı: sadece manifestli sayfada (gerçek sunucuda) devreye girer
if (document.querySelector('link[rel="manifest"]') && location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('merge-sw.js', { scope: './' })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [
          location.href.split('#')[0],
          ...[...document.querySelectorAll<HTMLScriptElement>('script[src]')].map((el) => el.src),
          ...[...document.querySelectorAll<HTMLLinkElement>('link[href]')].map((el) => el.href),
        ].filter((url) => url.startsWith(location.origin))
        reg.active?.postMessage({ type: 'cache', urls })
      })
      .catch(() => {
        /* çevrimdışı desteği olmadan da oyun çalışır */
      })
  })
}

game.setMode(mode)
const hasSave = game.boot()
mode = game.currentMode
paintModes()
paintDaily()
startBtn.textContent = hasSave ? 'Devam Et' : 'Başla'
freshBtn.hidden = !hasSave
startOverlay.classList.add('show')
