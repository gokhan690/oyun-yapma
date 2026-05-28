export interface PrestigeShopItem {
  id: string
  name: string
  description: string
  emoji: string
  cost: number  // in prestige points
  repeatable?: boolean
}

export const PRESTIGE_SHOP_ITEMS: PrestigeShopItem[] = [
  { id: 'start_stajyer_10', name: '10 Tezgah Başlangıcı', description: 'Her IPO başında 10 adet Limonata Tezgahı otomatik açılır.', emoji: '🍋', cost: 5 },
  { id: 'click_bonus_50', name: 'Tıklama Ustası', description: 'Tıklama geliri kalıcı olarak +%50 artar.', emoji: '👆', cost: 8 },
  { id: 'start_cash_2x', name: 'Miras Serveti', description: 'IPO başlangıç parası her seferinde ×2 olur.', emoji: '💰', cost: 6 },
  { id: 'auto_tier4', name: 'Hızlı Başlangıç', description: 'Her koşuda ilk tier 4 işletme otomatik açık gelir.', emoji: '🚀', cost: 12 },
  { id: 'manager_discount', name: 'İnsan Kaynakları', description: 'Tüm yönetici ücretleri daima -%15 indirimli.', emoji: '🤝', cost: 10 },
  { id: 'dynasty_income_boost', name: 'Hanedan Güçlendirme', description: 'Hanedan pasif geliri %50 daha fazla birikir (%1 yerine %1.5).', emoji: '👑', cost: 15, repeatable: false },
]
