import { formatGameClock } from './GameClock'

export type GazetteCategory = 'player' | 'rival' | 'market' | 'politics' | 'crisis' | 'calendar'

export interface GazetteEntry {
  id: string
  headline: string
  gameDay: number
  category: GazetteCategory
  at: number
}

let seq = 0

export function pushGazette(
  entries: GazetteEntry[],
  headline: string,
  gameDay: number,
  category: GazetteCategory,
  max = 40,
): GazetteEntry[] {
  seq++
  const entry: GazetteEntry = {
    id: `gz_${Date.now()}_${seq}`,
    headline,
    gameDay,
    category,
    at: Date.now(),
  }
  return [entry, ...entries.filter((e) => e.headline !== headline)].slice(0, max)
}

export function formatGazetteDate(gameTimeMs: number): string {
  return formatGameClock(gameTimeMs).split(' · ')[0] ?? 'Bugün'
}

export function headlinePurchase(playerName: string, businessName: string, count: number): string {
  const who = playerName.trim() || 'Baron'
  if (count > 1) {
    return `${who}, ${businessName} portföyünü ${count} birimle genişletti`
  }
  return `${who}, yeni ${businessName} yatırımını duyurdu`
}

export function headlineRivalBehind(_playerName: string, rivalName: string, _amount: string): string {
  const who = _playerName.trim() || 'Baron'
  return `${rivalName} bu çeyrek geride kaldı — ${who} liderliği sürdürüyor`
}

export function headlineMonthlyIncome(playerName: string, amount: string, rivalName?: string): string {
  const who = playerName.trim() || 'Baron'
  if (rivalName) {
    return `${who}'un işletmeleri bu ay ${amount} gelir üretti — ${rivalName} geride kaldı`
  }
  return `${who}'un imparatorluğu bu ay ${amount} gelir kaydetti`
}

export function headlineLoanDenied(playerName: string): string {
  const who = playerName.trim() || 'Baron'
  return `Bankalar ${who}'un kredi başvurusunu reddetti — itibar endişesi`
}

export function headlineCrisis(playerName: string, crisisLabel: string): string {
  const who = playerName.trim() || 'Baron'
  return `⚠️ ${crisisLabel} — ${who} karar vermek zorunda`
}

export function headlineMarketRandom(playerName: string, netWorth: number): string {
  const who = playerName.trim() || 'Baron'
  const worth = netWorth
  const templates = [
    `Merkez Bankası faiz kararı açıkladı — ${who}'un portföyü izleniyor`,
    `Dolar kuru dalgalanıyor — ${who} yatırım stratejisini güncelliyor`,
    `Borsa İstanbul rekor kırdı — yatırımcılar coştu`,
    `Enflasyon raporu yayımlandı — tüketici harcamaları ${worth > 1_000_000 ? 'yükselişte' : 'baskı altında'}`,
    `Yabancı yatırımcılar Türkiye'ye ilgisini artırdı — ${who} fırsatı değerlendiriyor`,
    `Sanayi üretimi arttı — imalat sektörü canlandı`,
    `Turizm geliri beklentileri aştı — sektör patladı`,
    `E-ticaret hacmi yıllık %60 büyüdü — lojistik tıkandı`,
  ]
  return templates[Math.floor(Date.now() / 86_400_000) % templates.length]
}

export function headlinePoliticsRandom(playerName: string): string {
  const who = playerName.trim() || 'Baron'
  const templates = [
    `Yeni teşvik paketi açıklandı — ${who} başvurularını hazırlıyor`,
    `Vergi reformu gündemde — iş dünyası temkinli bekliyor`,
    `Büyükelçilik ziyareti — ${who}'un uluslararası bağlantıları güçleniyor`,
    `Belediye ihalesi açıklandı — ${who} teklif hazırlıyor`,
    `Serbest ticaret anlaşması müzakere masasında`,
    `Ekonomi bakanı büyüme hedefini revize etti`,
  ]
  return templates[Math.floor(Date.now() / 86_400_000 + 3) % templates.length]
}
