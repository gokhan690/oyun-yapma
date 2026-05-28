/**
 * Upgrade, Research ve Manager i18n anahtarlarını keys.ts ve tüm locale dosyalarına ekler.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// --- Parse Economy.ts ---
const ecoSrc = fs.readFileSync(path.join(root, 'src/game/Economy.ts'), 'utf8')
const upgBlock = ecoSrc.split('export const UPGRADES')[1].split('\n]')[0]
const upgrades = []
const upgRe = /\{ id: '([a-z0-9_]+)', name: '([^']+)', description: '([^']+)'/g
let m
while ((m = upgRe.exec(upgBlock)) !== null) {
  upgrades.push({ id: m[1], name: m[2], desc: m[3] })
}

// --- Parse Research.ts ---
const resSrc = fs.readFileSync(path.join(root, 'src/game/Research.ts'), 'utf8')
const resBlock = resSrc.split('export const RESEARCH_NODES')[1].split('\n]')[0]
const research = []
const resRe = /id: '([a-z0-9_]+)',\s*\n\s*name: '([^']+)',\s*\n\s*description: '([^']+)'/g
while ((m = resRe.exec(resBlock)) !== null) {
  research.push({ id: m[1], name: m[2], desc: m[3] })
}

// --- Manager data ---
const managers = [
  { id: 'fatma', name: 'Fatma Hanım', spec: 'Lojistik +%30' },
  { id: 'mehmet', name: 'Mehmet Bey', spec: 'Yazılım +%25' },
  { id: 'ahmet', name: 'Ahmet Bey', spec: 'Tüm işletmeler +%5' },
  { id: 'zara', name: 'Zara Demir', spec: 'Illegal risk azaltır' },
  { id: 'ayse', name: 'Ayşe Çelik', spec: 'Sağlık & İlaç +%35' },
  { id: 'kemal', name: 'Kemal Arslan', spec: 'Tarım & Gıda +%30' },
  { id: 'leyla', name: 'Leyla Şahin', spec: 'Fintech +%30' },
  { id: 'orhan', name: 'Orhan Doğan', spec: 'Lüks İmparatorluk +%25' },
]

// --- English translations for upgrades ---
const upgEn = {
  click_x2: 'Marketing Campaign', click_x5: 'Viral Ad', global_x2: 'Corporate Growth',
  stajyer_x2: 'Franchise System', robot_x2: 'SEO Optimization', fabrika_x2: 'Warehouse Automation',
  holding_x2: 'Cloud Infrastructure', ofis_x2: 'Restaurant Franchise', uzay_x2: 'Portfolio Management',
  ai_x2: 'Merger Synergy', tuzaq_x2: 'IPO Boost', global_x3: 'Global Expansion',
  uydu_x2: 'Orbital Efficiency', merkezbankasi_x2: 'Monetary Policy', global_mega: 'Super Growth',
  kafe_x2: 'Coffee Franchise', mobil_app_x2: 'Premium Subscription', enerji_x2: 'Panel Efficiency',
  click_x10: 'Influencer Campaign', offshore_laundry: 'Offshore Laundering', otel_x2: 'Hotel Franchise',
  medya_x2: 'Media Empire', futbol_x2: 'Transfer Season', siyaset_x2: 'Lobby Power',
  siyah_fabrika_x2: 'Secret Production', berber_x2: 'Appointment System', giyim_x2: 'Season Collection',
  gym_x2: 'Premium Membership', kargo_x2: 'Express Delivery', reklam_ajansi_x2: 'Media Planning',
  cikolata_x2: 'Export Line', click_x3: 'Social Media', early_global_15: 'Early Growth',
  insaat_x2: 'Mega Project', hukuk_x2: 'International Case', oyun_studio_x2: 'AAA Studio',
  streaming_x2: 'Global Broadcast', ilac_x2: 'Patent Portfolio', sigorta_x2: 'Reinsurance Deal',
  havayolu_x2: 'New Routes', legal_bundle: 'Legal Portfolio', finance_bundle: 'Finance Synergy',
  hedge_fund_x2: 'Alpha Strategy', venture_capital_x2: 'Unicorn Hunt', luxury_bundle: 'Luxury Empire',
  formula1_x2: 'Podium Bonus', casino_legal_x2: 'VIP Lounge', sport_bundle: 'Sports Holding',
  futbol_amateur_x2: 'Youth Academy', futbol_avrupa_x2: 'Champions League', politics_bundle: 'State Support',
  siyaset_bakan_x2: 'Ministry Reform', global_x4: 'Mega Holding', global_x5: 'Galactic Expansion',
  kripto_x2: 'Listing Boost', bahis_x2: 'Underground Network', piramit_x2: 'Ponzi Optimization',
  kacak_imalat_x2: 'Hidden Line', silah_x2: 'Black Market Network', illegal_risk_down: 'Lawyer Network',
  nano_x2: 'Nano Patent',
}
const upgDescEn = {
  click_x2: 'Click income x2', click_x5: 'Click income x5', global_x2: 'All income x2',
  stajyer_x2: 'Lemonade income x2', robot_x2: 'E-commerce income x2', fabrika_x2: 'Logistics income x2',
  holding_x2: 'Software income x2', ofis_x2: 'Restaurant income x2', uzay_x2: 'Real estate income x2',
  ai_x2: 'Holding income x2', tuzaq_x2: 'IPO income x2', global_x3: 'All income x1.5',
  uydu_x2: 'Satellite network income x2', merkezbankasi_x2: 'Central bank income x2',
  global_mega: 'All income x2', kafe_x2: 'Coffee chain income x2', mobil_app_x2: 'Mobile app income x2',
  enerji_x2: 'Solar plant income x2', click_x10: 'Click income x10',
  offshore_laundry: 'Illegal income −10%, heat −20%', otel_x2: 'Hotel chain income x2',
  medya_x2: 'Media holding income x2', futbol_x2: 'Football clubs income x2',
  siyaset_x2: 'Politics income x1.5', siyah_fabrika_x2: 'Black factory income x2',
  berber_x2: 'Barber income x2', giyim_x2: 'Clothing store income x2', gym_x2: 'Gym income x2',
  kargo_x2: 'Cargo income x2', reklam_ajansi_x2: 'Ad agency income x2',
  cikolata_x2: 'Chocolate factory income x2', click_x3: 'Click income x3',
  early_global_15: 'All income x1.5', insaat_x2: 'Construction income x2',
  hukuk_x2: 'Law firm income x2', oyun_studio_x2: 'Game studio income x2',
  streaming_x2: 'Streaming income x2', ilac_x2: 'Pharma lab income x2',
  sigorta_x2: 'Insurance income x2', havayolu_x2: 'Airline income x2',
  legal_bundle: 'Legal businesses income x1.25', finance_bundle: 'Finance category income x2',
  hedge_fund_x2: 'Hedge fund income x2', venture_capital_x2: 'VC income x2',
  luxury_bundle: 'Luxury category income x1.5', formula1_x2: 'F1 team income x2',
  casino_legal_x2: 'Casino income x2', sport_bundle: 'Football clubs income x1.5',
  futbol_amateur_x2: 'Amateur club income x2', futbol_avrupa_x2: 'European club income x2',
  politics_bundle: 'Politics income x1.35', siyaset_bakan_x2: 'Ministry income x2',
  global_x4: 'All income x1.5', global_x5: 'All income x2', kripto_x2: 'Crypto exchange income x2',
  bahis_x2: 'Betting network income x2', piramit_x2: 'Pyramid income x2',
  kacak_imalat_x2: 'Illegal manufacturing income x2', silah_x2: 'Arms trade income x2',
  illegal_risk_down: 'Illegal raid risk −15%', nano_x2: 'Nano lab income x2',
}

// --- English translations for research ---
const resEn = {
  marketing: 'Marketing', automation: 'Automation', accounting: 'Accounting',
  lobby: 'Lobbying Activities', efficiency: 'Efficiency R&D', logistics: 'Logistics Optimization',
  automation2: 'Automation II', energy_eff: 'Energy Efficiency', finance_interest: 'Interest Optimization',
  credit_mgmt: 'Credit Management', stock_analysis: 'Stock Analysis', tax_shield: 'Tax Shield',
  football_fan: 'Fan Marketing', stadium_ops: 'Stadium Operations', politics_lobby_r: 'Political Lobbying R&D',
  dark_stealth: 'Underground Stealth', dark_production: 'Secret Production Line',
}
const resDescEn = {
  marketing: 'Click income +10% / level', automation: 'Passive income +5% / level',
  accounting: 'Offline cap +1 hour / level', lobby: 'Synergy bonuses x1.5',
  efficiency: 'Producer cost multiplier -2% / level', logistics: 'Passive income +4% / level',
  automation2: 'Passive income +6% / level', energy_eff: 'Cost -3% / level (energy & industrial)',
  finance_interest: 'Deposit interest return +8% / level', credit_mgmt: 'Credit score improvement +2 / level',
  stock_analysis: 'Click income +8% / level', tax_shield: 'Cost -2% / level',
  football_fan: 'Football club income +12% / level', stadium_ops: 'Football income +8% / level',
  politics_lobby_r: 'Synergy bonuses +25% / level', dark_stealth: 'Illegal heat accumulation -5% / level',
  dark_production: 'Passive income +4% / level (underground bonus)',
}

// --- English translations for managers ---
const mgrEn = {
  fatma: 'Fatma Hanım', mehmet: 'Mehmet Bey', ahmet: 'Ahmet Bey', zara: 'Zara Demir',
  ayse: 'Ayşe Çelik', kemal: 'Kemal Arslan', leyla: 'Leyla Şahin', orhan: 'Orhan Doğan',
}
const mgrSpecEn = {
  fatma: 'Logistics +30%', mehmet: 'Software +25%', ahmet: 'All businesses +5%',
  zara: 'Reduces illegal risk', ayse: 'Health & Pharma +35%', kemal: 'Agriculture & Food +30%',
  leyla: 'Fintech +30%', orhan: 'Luxury Empire +25%',
}

// --- Build keys.ts section to insert ---
function buildKeysBlock() {
  const lines = ['', '  // Upgrade names and descriptions']
  for (const u of upgrades) {
    lines.push(`  upg_${u.id}: string`)
    lines.push(`  upg_${u.id}_desc: string`)
  }
  lines.push('', '  // Research names and descriptions')
  for (const r of research) {
    lines.push(`  res_${r.id}: string`)
    lines.push(`  res_${r.id}_desc: string`)
  }
  lines.push('', '  // Named manager names and specialties')
  for (const mgr of managers) {
    lines.push(`  mgr_${mgr.id}: string`)
    lines.push(`  mgr_${mgr.id}_spec: string`)
  }
  return lines.join('\n')
}

// --- Build locale entries ---
function buildLocaleBlock(lang) {
  const lines = ['', '  // Upgrade names and descriptions']
  for (const u of upgrades) {
    const name = lang === 'tr' ? u.name : (upgEn[u.id] ?? u.name)
    const desc = lang === 'tr' ? u.desc : (upgDescEn[u.id] ?? u.desc)
    lines.push(`  upg_${u.id}: '${name.replace(/'/g, "\\'")}',`)
    lines.push(`  upg_${u.id}_desc: '${desc.replace(/'/g, "\\'")}',`)
  }
  lines.push('', '  // Research names and descriptions')
  for (const r of research) {
    const name = lang === 'tr' ? r.name : (resEn[r.id] ?? r.name)
    const desc = lang === 'tr' ? r.desc : (resDescEn[r.id] ?? r.desc)
    lines.push(`  res_${r.id}: '${name.replace(/'/g, "\\'")}',`)
    lines.push(`  res_${r.id}_desc: '${desc.replace(/'/g, "\\'")}',`)
  }
  lines.push('', '  // Named manager names and specialties')
  for (const mgr of managers) {
    const name = lang === 'tr' ? mgr.name : (mgrEn[mgr.id] ?? mgr.name)
    const spec = lang === 'tr' ? mgr.spec : (mgrSpecEn[mgr.id] ?? mgr.spec)
    lines.push(`  mgr_${mgr.id}: '${name.replace(/'/g, "\\'")}',`)
    lines.push(`  mgr_${mgr.id}_spec: '${spec.replace(/'/g, "\\'")}',`)
  }
  return lines.join('\n')
}

// --- Insert into keys.ts ---
const keysPath = path.join(root, 'src/i18n/keys.ts')
let keysSrc = fs.readFileSync(keysPath, 'utf8')

if (keysSrc.includes('upg_click_x2: string')) {
  console.log('keys.ts already has upgrade keys, skipping.')
} else {
  const insertAfter = '  upg_purchased: string'
  const keysBlock = buildKeysBlock()
  keysSrc = keysSrc.replace(insertAfter, insertAfter + '\n' + keysBlock)
  fs.writeFileSync(keysPath, keysSrc)
  console.log('✓ keys.ts updated')
}

// --- Insert into locale files ---
const locales = ['tr', 'en', 'de', 'es', 'fr', 'pt', 'ja', 'zh', 'ru', 'ar']
for (const lang of locales) {
  const filePath = path.join(root, `src/i18n/locales/${lang}.ts`)
  let src = fs.readFileSync(filePath, 'utf8')

  if (src.includes(`upg_click_x2:`)) {
    console.log(`${lang}.ts already has upgrade keys, skipping.`)
    continue
  }

  // Find insertion point: after upg_purchased line
  const insertAfter = `  upg_purchased:`
  const idx = src.indexOf(insertAfter)
  if (idx === -1) {
    console.error(`Could not find insertion point in ${lang}.ts`)
    continue
  }
  const lineEnd = src.indexOf('\n', idx)
  const localeBlock = buildLocaleBlock(lang)
  src = src.slice(0, lineEnd + 1) + localeBlock + '\n' + src.slice(lineEnd + 1)
  fs.writeFileSync(filePath, src)
  console.log(`✓ ${lang}.ts updated`)
}

console.log('Done!')
