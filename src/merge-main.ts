/**
 * "Meyve Birleştir" giriş noktası — reklamsız, çevrimdışı çalışan Suika tipi oyun.
 */

import './merge/merge.css'
import { FRUITS } from './merge/fruits'
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
const biggestBox = $<HTMLElement>('biggest-box')
const biggestCanvas = $<HTMLCanvasElement>('biggest-fruit')
const comboEl = $<HTMLElement>('combo')
const startOverlay = $<HTMLElement>('start-overlay')
const overOverlay = $<HTMLElement>('over-overlay')
const startBtn = $<HTMLButtonElement>('start')
const freshBtn = $<HTMLButtonElement>('fresh')
const againBtn = $<HTMLButtonElement>('again')
const soundBtn = $<HTMLButtonElement>('sound')
const restartBtn = $<HTMLButtonElement>('restart')
const overTitle = $<HTMLElement>('over-title')
const finalEl = $<HTMLElement>('final-score')
const finalSub = $<HTMLElement>('final-sub')
const resultCanvas = $<HTMLCanvasElement>('result-fruit')
const resultName = $<HTMLElement>('result-name')

let nextTier = 0
let biggestTier = -1
let scoreTimer = 0
let startingBest = Number(localStorage.getItem('fm_best') ?? 0)
let recordShown = false

function flash(text: string): void {
  comboEl.textContent = text
  comboEl.classList.remove('show')
  void comboEl.offsetWidth
  comboEl.classList.add('show')
}

function bumpScore(): void {
  scoreEl.classList.add('bump')
  window.clearTimeout(scoreTimer)
  scoreTimer = window.setTimeout(() => scoreEl.classList.remove('bump'), 180)
}

const game = new MergeGame(canvas, {
  onScore(score, best) {
    if (scoreEl.textContent !== String(score)) bumpScore()
    scoreEl.textContent = String(score)
    bestEl.textContent = String(best)
    // Rekoru geçtiğin an kutlansın
    if (!recordShown && startingBest > 0 && score > startingBest) {
      recordShown = true
      flash('REKOR KIRILDI!')
    }
  },
  onNext(tier) {
    nextTier = tier
    drawFruitPreview(nextCanvas, tier, 2)
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
  onGameOver({ score, best, isRecord, biggest }) {
    overTitle.textContent = isRecord ? 'Yeni Rekor!' : 'Oyun Bitti'
    finalEl.textContent = String(score)
    finalSub.innerHTML = isRecord
      ? '<span class="record">Şimdiye kadarki en iyin 🏆</span>'
      : `En iyin: <b>${best}</b>`
    drawFruitPreview(resultCanvas, biggest, 1)
    resultName.textContent = `En büyük meyven: ${FRUITS[biggest].name}`
    overOverlay.classList.add('show')
  },
})

function beginPlay(): void {
  startOverlay.classList.remove('show')
  overOverlay.classList.remove('show')
  game.play()
}

function newGame(): void {
  startingBest = Number(localStorage.getItem('fm_best') ?? 0)
  recordShown = false
  startOverlay.classList.remove('show')
  overOverlay.classList.remove('show')
  game.reset()
}

startBtn.addEventListener('click', beginPlay)
freshBtn.addEventListener('click', newGame)
againBtn.addEventListener('click', newGame)

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
  drawFruitPreview(nextCanvas, nextTier, 2)
  if (biggestTier > 0) drawFruitPreview(biggestCanvas, biggestTier, 1)
})

// Kayıt varsa "Devam Et", yoksa "Başla"
const hasSave = game.boot()
startBtn.textContent = hasSave ? 'Devam Et' : 'Başla'
freshBtn.hidden = !hasSave
startOverlay.classList.add('show')
paintSoundBtn()
