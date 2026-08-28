/**
 * "Meyve Birleştir" giriş noktası — reklamsız, çevrimdışı çalışan Suika tipi oyun.
 */

import './merge/merge.css'
import { FRUITS, MAX_TIER } from './merge/fruits'
import { MergeGame } from './merge/MergeGame'
import { drawFruitPreview } from './merge/render'

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Eleman bulunamadı: ${id}`)
  return el as T
}

const canvas = $<HTMLCanvasElement>('board')
const scoreEl = $<HTMLElement>('score')
const bestEl = $<HTMLElement>('best')
const nextCanvas = $<HTMLCanvasElement>('next-fruit')
const dangerFill = $<HTMLElement>('danger-fill')
const overlay = $<HTMLElement>('overlay')
const finalEl = $<HTMLElement>('final-score')
const finalSub = $<HTMLElement>('final-sub')
const againBtn = $<HTMLButtonElement>('again')
const restartBtn = $<HTMLButtonElement>('restart')
const soundBtn = $<HTMLButtonElement>('sound')
const chainEl = $<HTMLElement>('chain')
const toastEl = $<HTMLElement>('toast')

// --- Meyve zinciri şeridi ---
const chainCanvases: HTMLCanvasElement[] = []
FRUITS.forEach((f, i) => {
  if (i > 0) {
    const arrow = document.createElement('span')
    arrow.className = 'chain-arrow'
    arrow.textContent = '›'
    chainEl.appendChild(arrow)
  }
  const item = document.createElement('div')
  item.className = 'chain-item'
  item.title = f.name
  const c = document.createElement('canvas')
  item.appendChild(c)
  chainEl.appendChild(item)
  chainCanvases.push(c)
  if (i < 5) item.classList.add('seen')
})

let toastTimer = 0
function toast(text: string): void {
  toastEl.textContent = text
  toastEl.classList.add('show')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 1800)
}

function bump(el: HTMLElement): void {
  el.classList.remove('bump')
  void el.offsetWidth
  el.classList.add('bump')
}

const game = new MergeGame(canvas, {
  onScore(score, best) {
    if (scoreEl.textContent !== String(score)) bump(scoreEl)
    scoreEl.textContent = String(score)
    bestEl.textContent = String(best)
  },
  onNext(tier) {
    drawFruitPreview(nextCanvas, tier, 2)
  },
  onCurrent() {
    /* tutulan meyve tuvalde çiziliyor */
  },
  onDanger(ratio) {
    dangerFill.style.width = `${Math.round(ratio * 100)}%`
  },
  onUnlock(tier) {
    const item = chainCanvases[tier]?.parentElement
    item?.classList.add('seen')
    if (tier >= 5) toast(`🎉 Yeni meyve: ${FRUITS[tier].name}!`)
    if (tier === MAX_TIER) toast('🍉 KARPUZ! Efsanesin!')
  },
  onGameOver(score, best, isRecord) {
    finalEl.textContent = String(score)
    finalSub.innerHTML = isRecord
      ? '<span class="record">🏆 Yeni rekor!</span>'
      : `Rekorun: <b>${best}</b>`
    overlay.classList.add('show')
  },
})

function restart(): void {
  overlay.classList.remove('show')
  dangerFill.style.width = '0%'
  for (let i = 0; i < chainCanvases.length; i++) {
    chainCanvases[i].parentElement?.classList.toggle('seen', i < 5)
  }
  game.reset()
}

againBtn.addEventListener('click', restart)
restartBtn.addEventListener('click', () => {
  if (game.isOver || window.confirm('Oyunu baştan başlatmak istiyor musun?')) restart()
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
  if (document.hidden) game.pause()
  else if (!game.isOver) game.resume()
})

function paintChain(): void {
  chainCanvases.forEach((c, i) => drawFruitPreview(c, i, 1))
}

window.addEventListener('resize', paintChain)
paintChain()
paintSoundBtn()
game.start()
