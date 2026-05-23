import { formatMoney } from './Economy'

export interface BankState {
  deposit: number
  loan: number
  bonds: number
  lastInterestTick: number
  creditScore: number
  bankruptcyCooldownUntil: number
}

export const INTEREST_TICK_MS = 60_000
export const IPO_START_BASE = 12_000
export const IPO_START_PER_POINT = 40_000
export const MAX_LOAN_RATIO = 0.35

export function createBankState(): BankState {
  return {
    deposit: 0,
    loan: 0,
    bonds: 0,
    lastInterestTick: Date.now(),
    creditScore: 78,
    bankruptcyCooldownUntil: 0,
  }
}

export function depositRate(centralRate: number): number {
  return Math.max(0.01, centralRate * 0.82)
}

export function bondRate(centralRate: number): number {
  return Math.max(0.015, centralRate * 1.05)
}

export function loanRate(centralRate: number, creditScore: number): number {
  const risk = (100 - Math.min(100, Math.max(30, creditScore))) * 0.0008
  return Math.max(0.03, centralRate * 1.45 + risk)
}

export function maxLoan(totalEarned: number, netWorth: number): number {
  const cap = Math.max(50_000, totalEarned * MAX_LOAN_RATIO)
  return Math.floor(Math.min(cap, netWorth * 0.6))
}

export function calcIpoStartingCash(
  pointsEarned: number,
  prestigePoints: number,
  liquidationNet: number,
): number {
  const fromPoints = pointsEarned * IPO_START_PER_POINT
  const fromPrestige = prestigePoints * 8_000
  const fromLiquid = Math.min(5_000_000, Math.floor(Math.max(0, liquidationNet) * 0.18))
  return IPO_START_BASE + fromPoints + fromPrestige + fromLiquid
}

export interface InterestTickResult {
  depositGain: number
  bondGain: number
  loanCost: number
  bankrupt: boolean
  headline: string
}

export function tickBankInterest(
  bank: BankState,
  centralRate: number,
  now: number,
): InterestTickResult | null {
  if (now - bank.lastInterestTick < INTEREST_TICK_MS) return null
  bank.lastInterestTick = now

  const dRate = depositRate(centralRate) / 60
  const bRate = bondRate(centralRate) / 60
  const lRate = loanRate(centralRate, bank.creditScore) / 60

  const depositGain = Math.floor(bank.deposit * dRate)
  const bondGain = Math.floor(bank.bonds * bRate)
  const loanCost = Math.floor(bank.loan * lRate)

  bank.deposit += depositGain
  bank.bonds += bondGain
  bank.loan += loanCost

  let headline = ''
  if (depositGain + bondGain > 0) {
    headline = `Faiz geliri: ${formatMoney(depositGain + bondGain)}`
  }
  if (loanCost > 0) {
    headline = headline
      ? `${headline} · Kredi faizi: ${formatMoney(loanCost)}`
      : `Kredi faizi: ${formatMoney(loanCost)}`
  }

  const bankrupt = bank.loan > 0 && bank.deposit + bank.bonds < bank.loan * 0.08 && loanCost > 0
  return { depositGain, bondGain, loanCost, bankrupt, headline }
}

export interface IpoPreviewData {
  pointsToEarn: number
  newTotal: number
  newMultiplier: number
  portfolioValue: number
  depositValue: number
  bondValue: number
  loanDebt: number
  liquidationNet: number
  startingCash: number
  businessesOwned: number
  upgradesOwned: number
  managersOwned: number
  keepsPrestigeTree: boolean
  keepsResearch: boolean
}

export function netWorth(
  money: number,
  portfolioValue: number,
  bank: BankState,
): number {
  return money + portfolioValue + bank.deposit + bank.bonds - bank.loan
}
