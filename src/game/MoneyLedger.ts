/**
 * TUR14 — Para muhasebesi: tüm para hareketleri açık kaynak + "kazanç mı?"
 * sınıflandırmasıyla kaydedilir. "Gerçek kazanç" totalEarned'i artırır; para
 * transferi/borç (çekim, kredi, ana para, firma/hisse satış ana parası, iflas
 * likidasyonu) ASLA totalEarned'i yapay olarak artırmaz.
 */
export type MoneySource =
  | 'daily_business_income'
  | 'career_salary'
  | 'career_action'
  | 'rental_income'
  | 'dynasty_income'
  | 'stock_buy'
  | 'stock_sell'
  | 'firm_buy'
  | 'firm_sell'
  | 'manager_hire'
  | 'manager_salary'
  | 'bank_deposit'
  | 'bank_withdraw'
  | 'loan_received'
  | 'loan_repaid'
  | 'bond_buy'
  | 'bond_sell'
  | 'reward'
  | 'inheritance'
  | 'football_bonus'
  | 'offline_reward'
  | 'bankruptcy_liquidation'
  | 'ipo_seed'
  | 'expense'
  | 'misc'

export interface MoneyTransaction {
  id: string
  gameDay: number
  amount: number
  direction: 'credit' | 'debit'
  source: MoneySource
  labelKey: string
  countsAsEarned: boolean
  balanceAfter: number
  metadata?: Record<string, string | number>
}

export const MONEY_TX_LIMIT = 50

/** Kaynak → locale etiket anahtarı (UI hareket geçmişi satırı için). */
export function moneySourceLabelKey(source: MoneySource): string {
  return `ledger_src_${source}`
}
