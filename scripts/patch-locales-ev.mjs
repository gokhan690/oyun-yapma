import fs from 'node:fs'

const extra = `
  ev_daily_goal_title: 'Daily goal',
  ev_season_road: 'Empire Path',
  ev_lucky_chest: 'Lucky Chest',
`

for (const loc of ['zh', 'es', 'ru', 'pt', 'ja', 'ar', 'de', 'fr']) {
  const p = `src/i18n/locales/${loc}.ts`
  let s = fs.readFileSync(p, 'utf8')
  if (s.includes('ev_daily_goal_title:')) {
    console.log('skip', loc)
    continue
  }
  s = s.replace(/\n}\s*$/, `,${extra}\n}\n`)
  fs.writeFileSync(p, s)
  console.log('patched', loc)
}
