import fs from 'node:fs'

for (const f of ['ar', 'de', 'es', 'fr', 'ja', 'pt', 'ru', 'zh']) {
  const p = `src/i18n/locales/${f}.ts`
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/badge',\r?,\r?\n/g, "badge',\n")
  fs.writeFileSync(p, s)
  console.log('fixed', f)
}
