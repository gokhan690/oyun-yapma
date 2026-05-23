export interface StoryBeat {
  id: string
  text: string
}

export const STORY_BEATS: StoryBeat[] = [
  { id: 'illegal_first', text: 'Karanlık tarafa adım attın. Yüksek gelir, yüksek risk — radar seni izlemeye başladı.' },
  { id: 'heat_high', text: 'Radar yoğunlaşıyor. Avukat veya rüşvet düşünmeden önce bir baskın gelebilir.' },
  { id: 'heat_critical', text: 'Kritik seviye! Her gün baskın riski artıyor. Underground menüsünden heat temizle.' },
  { id: 'comeback', text: 'Seni özledik Baron! 2026\'da imparatorluğunu kurmaya devam et.' },
  { id: 'streak_7', text: '7 günlük seri! Sadık bir baron oldun. Ödüllerin büyüyor.' },
  { id: 'streak_14', text: '14 gün üst üste! Rakiplerin seni kıskanıyor.' },
  { id: 'streak_30', text: '30 günlük efsane seri! İmparatorluk senin imzanı taşıyor.' },
  { id: 'theme_gold', text: 'Altın tema açıldı — imparatorluk artık parlıyor.' },
  { id: 'codex_legal', text: 'Tüm yasal işletmeleri keşfettin! Global gelir +%5.' },
  { id: 'surprise_investor', text: 'Sürpriz yatırımcı! Bonus envanterine eklendi — istediğinde aktifleştir.' },
  { id: 'football_superlig', text: 'Kulübün Süper Lig\'e yükseldi! Taraftarlar coştu.' },
  { id: 'football_europe', text: 'Avrupa kupalarına merhaba! İmparatorluk stadyumları dolup taşıyor.' },
  { id: 'election_year', text: 'Seçim yılı geldi. Siyasi etkin arttı — lobi gücünü kullan.' },
  { id: 'year_2027', text: '2027\'ye girdin. Ekonomi hızlanıyor, günler saniyeler içinde akıyor.' },
  { id: 'lifespan_warning', text: 'Yaşın ilerliyor. Varis seçmezsen imparatorluk riske girer — Profil → Hanedan.' },
  { id: 'mortality_midlife', text: '50 yaşına geldin. Stres, siyaset ve illegal işler ölüm riskini artırıyor.' },
  { id: 'mortality_senior', text: '70 yaş üstü — doğal nedenler riski yükseldi ama hâlâ şansın var.' },
  { id: 'mortality_high_risk', text: '⚠️ Ölüm riskin çok yüksek! Hanedan sekmesinden riskleri kontrol et.' },
  { id: 'death_no_heir', text: 'Mirasçı olmadan vefat ettin — imparatorluk güçlü avukatlarla ayakta kaldı.' },
  { id: 'succession', text: 'Miras devri tamamlandı. Yeni nesil imparatorluğu devraldı!' },
]

export function storyBeat(id: string): StoryBeat | undefined {
  return STORY_BEATS.find((b) => b.id === id)
}
