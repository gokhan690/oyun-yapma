/** İşletme kartlarına eklenen kısa gerçek dünya / Türkiye bağlamı */
export const PRODUCER_LORE: Record<string, string> = {
  stajyer: 'İstanbul\'da her yaz 2 milyon stajyer — imparatorluk böyle başlar.',
  berber: 'Mahalle berberi, Türkiye\'nin en dayanıklı mikro işletmesi.',
  limonata: 'Sıcak yaz günlerinde sokak satıcıları — nakit akışının temeli.',
  kafe: 'Third wave kahve dalgası — Nişantaşı\'ndan Kadıköy\'e.',
  otel: 'Turizm geliri Türkiye GDP\'sinin ~%12\'si; otel zincirleri kral.',
  fabrika: 'Organize sanayi bölgeleri — Kocaeli, Bursa, Gaziantep.',
  holding: 'Koç, Sabancı, Eczacıbaşı — holding modeli Türk kapitalizminin omurgası.',
  banka: 'Türkiye\'de 50+ banka; faiz politikası herkesi etkiler.',
  medya: 'Medya grubu = siyaset + iş dünyası kapısı.',
  futbol: 'Süper Lig TV hakları milyarlarca dolar — stadyum yatırımı stratejik.',
  siyaset: 'Lobi faaliyeti ve bağış — itibarın siyasi boyutu.',
  illegal: 'Radar yükselirse baskın riski — sigorta ve torpil devreye girer.',
}

export function producerLore(producerId: string): string | null {
  return PRODUCER_LORE[producerId] ?? null
}
