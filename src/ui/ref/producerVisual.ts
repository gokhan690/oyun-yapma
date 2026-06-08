import { assetUrl } from '../../utils/assetUrl'
import { producerIconPath, type ProducerDef } from '../../game/Economy'
import { getBusinessIcon, hasDedicatedBusinessIcon } from './refAssetsV2Generic'
import {
  chipToVisualTone,
  producerChipCategory,
  type ProducerVisualTone,
} from './refShared'

function ua(p: string): string {
  return assetUrl(p.startsWith('/') ? p.slice(1) : p)
}

/** ShopPanel ile aynı — public/icons/businesses/*.svg */
export const PRODUCER_SVG_IDS = new Set([
  'stajyer', 'robot', 'kafe', 'ofis', 'fabrika', 'mobil_app', 'holding', 'uzay', 'enerji',
  'ai', 'tuzaq', 'uydu', 'merkezbankasi', 'galaksiyum', 'piramit', 'bahis', 'offshore',
])

/** Economy emoji oyun verisinden gelir; Ref kartında semantik override (Economy.ts dokunulmaz). */
/** Economy emoji yanıltıcıysa override (stajyer hariç — Limonata Tezgahı 🍋). */
const DISPLAY_EMOJI_BY_ID: Record<string, string> = {
  robot: '🤖',
  fabrika: '🏭',
  kargo: '🚚',
}

/** Producer id → ref asset anahtarı (category undefined normal işletmeler dahil). */
const PRODUCER_ASSET_BY_ID: Record<string, string> = {
  stajyer: 'restaurant',
  berber: 'barber',
  firin: 'bakery',
  cicekci: 'retail',
  giyim: 'retail',
  gym: 'health',
  kafe: 'coffee',
  robot: 'software',
  ofis: 'restaurant',
  fabrika: 'factory',
  mobil_app: 'software',
  holding: 'software',
  data_center: 'software',
  oyun_studio: 'software',
  kripto: 'finance',
  tuzaq: 'finance',
  merkezbankasi: 'finance',
  uzay: 'real_estate',
  emlak_ofis: 'real_estate',
  enerji: 'energy',
  ruzgar: 'energy',
  kargo: 'logistics',
  drone: 'logistics',
  liman: 'logistics',
  otel: 'hotel',
  havayolu: 'hotel',
  medya: 'media',
  streaming: 'media',
  reklam_ajansi: 'media',
  insaat: 'factory',
  maden: 'factory',
  nukleer: 'factory',
  ev_araba: 'factory',
  cikolata: 'factory',
  ilac: 'health',
  hastane: 'health',
  universite: 'health',
  sigorta: 'finance',
  hukuk: 'finance',
  temizlik: 'health',
  pet_shop: 'retail',
  market_zincir: 'retail',
  tarim_tek: 'factory',
  bahis: 'illegal',
  piramit: 'illegal',
  offshore: 'illegal',
  kacak_sigara: 'illegal',
  sahte_evrak: 'illegal',
  gizli_kumarhane: 'illegal',
  nano: 'science',
  kuantum: 'science',
  fuzyon: 'energy',
  mars: 'science',
  asteroid: 'factory',
  uzay_turizmi: 'science',
  galaksiyum: 'science',
  ai: 'software',
  // İmparatorluk
  futbol_amateur: 'sport',
  futbol_superlig: 'sport',
  futbol_avrupa: 'sport',
  futbol_dunya: 'sport',
  basketbol: 'sport',
  espor: 'sport',
  siyaset_belediye: 'politics',
  siyaset_milletvekili: 'politics',
  siyaset_bakan: 'politics',
  siyaset_cumhurbaskanligi: 'politics',
  siyaset_dunya: 'politics',
  siyaset_lobi: 'politics',
  kacak_imalat: 'illegal',
  siyah_fabrika: 'factory',
  silah_ticareti: 'illegal',
  cyber_kara: 'illegal',
  kripto_aklama: 'illegal',
  veri_broker: 'illegal',
  banka_dolandirici: 'illegal',
  organize_suc: 'illegal',
  paralel_banka: 'illegal',
  yacht_filo: 'luxury',
  formula1: 'luxury',
  casino_legal: 'luxury',
  adalar: 'luxury',
  saat_marka: 'luxury',
  jet_filo: 'luxury',
  sanat_galeri: 'luxury',
  moda_evi: 'luxury',
  banka_ozel: 'finance',
  hedge_fund: 'finance',
  private_equity: 'finance',
  venture_capital: 'finance',
  family_office: 'finance',
  reasurans: 'finance',
  borsa_araci: 'finance',
  sovereign_fund: 'finance',
  biyotek: 'science',
  uzay_istasyonu: 'science',
  uydu_fab: 'science',
  havacilik: 'science',
  gen_terapi: 'health',
  superbilgisayar: 'science',
  uydu: 'science',
  multiverse: 'science',
}

const CATEGORY_ASSET: Record<string, string> = {
  sport: 'sport',
  politics: 'politics',
  dark: 'illegal',
  luxury: 'luxury',
  finance: 'finance',
  science: 'science',
}

/** Asset anahtarı → gradient ton sınıfı. */
const ASSET_TO_TONE: Record<string, ProducerVisualTone> = {
  office: 'hizmet',
  service: 'hizmet',
  barber: 'hizmet',
  health: 'hizmet',
  retail: 'hizmet',
  bakery: 'gida',
  coffee: 'gida',
  restaurant: 'gida',
  software: 'teknoloji',
  ecommerce: 'teknoloji',
  robot: 'teknoloji',
  factory: 'sanayi',
  industry: 'sanayi',
  energy: 'sanayi',
  logistics: 'lojistik',
  finance: 'finans',
  real_estate: 'finans',
  hotel: 'turizm',
  tourism: 'turizm',
  media: 'medya',
  luxury: 'luks',
  illegal: 'riskli',
  risky: 'riskli',
  sport: 'sport',
  politics: 'politics',
  science: 'science',
}

/** İsim/id anahtar kelime → asset (category undefined için). */
function inferAssetKeyFromText(id: string, name: string): string | null {
  const blob = `${id} ${name}`
  if (/limonata|limon|tezgah|içecek|icecek/.test(blob)) return 'restaurant'
  if (/intern|junior/.test(blob) && !/limonata|limon/.test(blob)) return 'office'
  if (/\bofis\b|office/.test(blob) && !/restoran/.test(blob)) return 'office'
  if (/berber|kuaför|kuaför|temizlik/.test(blob)) return 'barber'
  if (/kahve|kafe|coffee/.test(blob)) return 'coffee'
  if (/fırın|firin|ekmek|pastane|bakery/.test(blob)) return 'bakery'
  if (/restoran|restaurant|yemek|döner|lokanta/.test(blob)) return 'restaurant'
  if (/\brobot\b|yapay zeka|\bai\b|yazılım|yazilim|uygulama|app|teknoloji|nano|kuantum|bilgisayar|siber|cyber|oyun.stüdyo|studio/.test(blob)) return 'software'
  if (/fabrika|factory|üretim|sanayi|imalat|maden|nükleer|santral/.test(blob)) return 'factory'
  if (/lojistik|kargo|cargo|nakliye|depo|liman|drone|teslimat/.test(blob)) return 'logistics'
  if (/banka|bank|finans|kripto|crypto|borsa|sigorta|hedge|equity|venture|fon/.test(blob)) return 'finance'
  if (/otel|hotel|turizm|tatil|havayolu/.test(blob)) return 'hotel'
  if (/medya|reklam|tv|yayın|streaming/.test(blob)) return 'media'
  if (/lüks|luxury|mücevher|yacht|jet.filo|saat.marka/.test(blob)) return 'luxury'
  if (/bahis|piramit|offshore|illegal|dark|mafia|kaçak|organize|silah|kumar|sahte/.test(blob)) return 'illegal'
  if (/futbol|football|spor|sport|basket|espor/.test(blob)) return 'sport'
  if (/siyaset|politika|politics|belediye|milletvekili|bakan|lobi|cumhur/.test(blob)) return 'politics'
  if (/science|lab|nano|arge|research|biyotek|gen.terapi/.test(blob)) return 'science'
  if (/e.ticaret|eticaret|perakende|mağaza|magaza|giyim|çiçek|cicek/.test(blob)) return 'retail'
  if (/emlak|gayrimenkul/.test(blob)) return 'real_estate'
  if (/hastane|sağlık|saglik|ilaç|üniversite|universite|pet/.test(blob)) return 'health'
  return null
}

export function resolveProducerAssetKey(def: ProducerDef): string {
  if (PRODUCER_ASSET_BY_ID[def.id]) return PRODUCER_ASSET_BY_ID[def.id]!
  if (def.category && CATEGORY_ASSET[def.category]) return CATEGORY_ASSET[def.category]!
  if (def.illegal && !def.category) return 'illegal'
  const inferred = inferAssetKeyFromText(def.id, def.name)
  if (inferred) return inferred
  if (hasDedicatedBusinessIcon(def.id)) return def.id
  return producerChipCategory(def)
}

export function producerVisualTone(def: ProducerDef, assetKey: string): ProducerVisualTone {
  if (def.category === 'sport') return 'sport'
  if (def.category === 'politics') return 'politics'
  if (def.category === 'science') return 'science'
  if (def.category === 'luxury') return 'luks'
  if (def.category === 'finance') return 'finans'
  if (def.category === 'dark' || (def.illegal && !def.category)) return 'riskli'
  if (ASSET_TO_TONE[assetKey]) return ASSET_TO_TONE[assetKey]!
  return chipToVisualTone(producerChipCategory(def))
}

export interface ProducerVisual {
  emoji: string
  tone: ProducerVisualTone
  assetKey: string
  svgSrc: string | null
  refIconSrc: string | null
  emojiOnly: boolean
}

export function producerVisual(def: ProducerDef): ProducerVisual {
  const emoji = DISPLAY_EMOJI_BY_ID[def.id] ?? def.emoji
  const assetKey = resolveProducerAssetKey(def)
  const tone = producerVisualTone(def, assetKey)

  const svgSrc = PRODUCER_SVG_IDS.has(def.id) ? producerIconPath(def.id) : null
  let refIconSrc: string | null = null
  if (!svgSrc && hasDedicatedBusinessIcon(assetKey)) {
    refIconSrc = ua(getBusinessIcon(assetKey))
  }

  return {
    emoji,
    tone,
    assetKey,
    svgSrc,
    refIconSrc,
    emojiOnly: !svgSrc && !refIconSrc,
  }
}

export function renderProducerIconHtml(visual: ProducerVisual): string {
  const imgHtml = visual.svgSrc
    ? `<img class="ref-firm-badge-img" src="${visual.svgSrc}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
    : visual.refIconSrc
      ? `<img class="ref-firm-badge-img ref-firm-ref-badge" src="${visual.refIconSrc}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
      : ''
  return `
    <div class="ref-firm-icon ref-tone-${visual.tone}">
      <span class="ref-firm-emoji" aria-hidden="true">${visual.emoji}</span>
      ${imgHtml}
    </div>`
}
