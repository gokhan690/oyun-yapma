import fs from 'node:fs'

const extra = `
  modal_streak_lost: '⚠️ Streak reset — starting over!',
  modal_spin_seg_chest: 'Chest',
  modal_spin_seg_boost: 'Boost',
  modal_spin_won: 'You won {emoji} {label}!',
  modal_spin_collect: '✅ Collect!',
  modal_spin_premium: '📺 Watch ad → Premium Wheel (2x reward!)',
  modal_spin_premium_loading: '📺 Loading ad...',
  modal_streak_bonus_7: '🔥 7-day bonus!',
  modal_streak_bonus_14: '💪 Iron will bonus!',
  modal_streak_bonus_30: '🏆 Legendary streak bonus!',
  modal_ipo_confirm: '🚀 IPO · Start with {cash}',
  modal_ipo_section_gain: 'You will gain',
  modal_ipo_section_loss: 'Reset this run',
  modal_ipo_section_keep: 'Kept (meta)',
  modal_ipo_row_shares_earn: 'Permanent shares earned',
  modal_ipo_row_shares_total: 'New total shares',
  modal_ipo_row_multiplier: 'Permanent income multiplier',
  modal_ipo_row_start_cash: 'Starting capital',
  modal_ipo_row_portfolio: 'Stock portfolio (sold)',
  modal_ipo_row_deposits: 'Deposits + bonds',
  modal_ipo_row_loan: 'Loan debt (cleared)',
  modal_ipo_row_biz_reset: 'Businesses reset',
  modal_ipo_row_upg_reset: 'Upgrades reset',
  modal_ipo_row_mgr_reset: 'Managers reset',
  modal_ipo_row_prestige_tree: 'Prestige tree',
  modal_ipo_row_research: 'Research levels',
  modal_ipo_row_dynasty: 'Dynasty / empire',
  modal_ipo_preserved: '✓ Kept',
  modal_ipo_count_unit: '{n} items',
`

for (const loc of ['zh', 'es', 'ru', 'pt', 'ja', 'ar', 'de', 'fr']) {
  const p = `src/i18n/locales/${loc}.ts`
  let s = fs.readFileSync(p, 'utf8')
  if (s.includes('modal_streak_lost:')) {
    console.log('skip', loc)
    continue
  }
  s = s.replace(/\n}\s*$/, `,${extra}\n}\n`)
  fs.writeFileSync(p, s)
  console.log('patched', loc)
}
