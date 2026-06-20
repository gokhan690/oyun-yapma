export type FameCareerType = 'muzisyen' | 'oyuncu' | 'sosyal_medya'

export interface FameActionDef {
  id: string
  label: string
  emoji: string
  cost: number
  fameDelta: number
  stressDelta: number
}

export interface FameCareerDef {
  id: FameCareerType
  name: string
  emoji: string
  baseDailyIncome: number
  actions: FameActionDef[]
}

export interface FameState {
  careerType: FameCareerType | null
  fameLevel: number
  isActive: boolean
  daysActive: number
  totalEarned: number
}

export const FAME_CAREERS: FameCareerDef[] = [
  {
    id: 'muzisyen',
    name: 'Müzisyen',
    emoji: '🎵',
    baseDailyIncome: 500,
    actions: [
      { id: 'studio_session', label: 'Stüdyo Kayıt',   emoji: '🎙️', cost: 10_000, fameDelta: 5,  stressDelta: 5  },
      { id: 'concert',        label: 'Konser Ver',      emoji: '🎤', cost: 50_000, fameDelta: 15, stressDelta: 15 },
      { id: 'collab',         label: 'Feat Yap',        emoji: '🤝', cost: 25_000, fameDelta: 10, stressDelta: 8  },
    ],
  },
  {
    id: 'oyuncu',
    name: 'Oyuncu / Sanatçı',
    emoji: '🎬',
    baseDailyIncome: 650,
    actions: [
      { id: 'audition',    label: 'Seçmelere Git', emoji: '🎭', cost: 5_000,  fameDelta: 3,  stressDelta: 8  },
      { id: 'film_role',   label: 'Film Çek',      emoji: '🎥', cost: 80_000, fameDelta: 20, stressDelta: 20 },
      { id: 'red_carpet',  label: 'Galaya Kat',    emoji: '🪭', cost: 15_000, fameDelta: 8,  stressDelta: 5  },
    ],
  },
  {
    id: 'sosyal_medya',
    name: 'Sosyal Medya Fenomeni',
    emoji: '📱',
    baseDailyIncome: 350,
    actions: [
      { id: 'post_content', label: 'İçerik Paylaş',     emoji: '📸', cost: 2_000,  fameDelta: 2,  stressDelta: 2  },
      { id: 'brand_deal',   label: 'Marka İşbirliği',   emoji: '💼', cost: 0,      fameDelta: 5,  stressDelta: 3  },
      { id: 'viral_video',  label: 'Viral Video',        emoji: '🔥', cost: 20_000, fameDelta: 12, stressDelta: 10 },
    ],
  },
]

export function createFameState(): FameState {
  return { careerType: null, fameLevel: 0, isActive: false, daysActive: 0, totalEarned: 0 }
}

export function fameDef(type: FameCareerType): FameCareerDef {
  return FAME_CAREERS.find((c) => c.id === type)!
}

export function fameDailyIncome(state: FameState): number {
  if (!state.isActive || !state.careerType) return 0
  const career = FAME_CAREERS.find((c) => c.id === state.careerType)
  if (!career) return 0
  return career.baseDailyIncome + state.fameLevel * state.fameLevel * 12
}

export function fameLevelLabel(fame: number): string {
  if (fame >= 90) return 'Mega Star'
  if (fame >= 70) return 'Süper Star'
  if (fame >= 50) return 'Ünlü'
  if (fame >= 30) return 'Tanınan'
  if (fame >= 10) return 'Yükselen'
  return 'Yeni Başlayan'
}

export function applyFameAction(state: FameState, actionId: string): { cost: number; stressDelta: number } | null {
  if (!state.careerType) return null
  const career = FAME_CAREERS.find((c) => c.id === state.careerType)
  if (!career) return null
  const action = career.actions.find((a) => a.id === actionId)
  if (!action) return null
  state.fameLevel = Math.min(100, state.fameLevel + action.fameDelta)
  return { cost: action.cost, stressDelta: action.stressDelta }
}

export function tickFameDecay(state: FameState): void {
  if (!state.isActive) return
  state.daysActive++
  state.fameLevel = Math.max(0, state.fameLevel - 0.2)
}
