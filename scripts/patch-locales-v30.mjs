import fs from 'fs'

const enBlock = `
  app_title: 'Business Empire',
  modal_daily_reward: 'Daily Reward',
  modal_daily_streak: 'Day {n} streak!',
  modal_spin_wheel: '🎡 Spin the Wheel!',
  modal_bankruptcy_title: 'Bankruptcy',
  modal_bankruptcy_loss: 'Total loss: {amount}',
  modal_bankruptcy_seized: 'Seized assets:',
  modal_bankruptcy_recovery: 'Watch an ad to recover {r40} (40%) or {r80} (80%). Some businesses are also returned.',
  modal_ipo_title: 'IPO — Company Merger',
  modal_ipo_intro: 'Run resets; prestige shares and meta progress are kept. Stocks and deposits convert to cash for your next run.',
  modal_golden_claim_ad: 'Watch ad & claim',
  modal_golden_claim_free: 'Claim free',
  modal_golden_timer: '{n}s',
  offline_accrued: 'Accrued earnings',
  btn_give_up: 'Cancel',
  hud_all_biz_unlocked: 'All businesses unlocked',
  hud_unlock_to_biz: 'Business → {name}',
  clock_day: 'Day',
  month_jan: 'Jan',
  month_feb: 'Feb',
  month_mar: 'Mar',
  month_apr: 'Apr',
  month_may: 'May',
  month_jun: 'Jun',
  month_jul: 'Jul',
  month_aug: 'Aug',
  month_sep: 'Sep',
  month_oct: 'Oct',
  month_nov: 'Nov',
  month_dec: 'Dec',
  events_missions_title: '📋 Daily Missions',
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
  if (!s.includes('app_title:')) {
    s = s.replace(/\n}\s*$/, `,${enBlock}\n}\n`)
  } else {
    s = s.replace(/\n}\s*$/, `,\n${enBlock.split('\n').slice(2).join('\n')}\n}\n`)
  }
  fs.writeFileSync(p, s)
  console.log('patched', loc)
}
