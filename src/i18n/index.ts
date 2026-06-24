import { tr } from './locales/tr'
import type { Translations } from './keys'

export type LangCode = 'tr' | 'en' | 'zh' | 'es' | 'ru' | 'pt' | 'ja' | 'ar' | 'de' | 'fr'

export const LANG_META: Record<LangCode, { label: string; nativeLabel: string; rtl?: boolean }> = {
  tr: { label: 'Turkish',    nativeLabel: 'Türkçe'    },
  en: { label: 'English',    nativeLabel: 'English'   },
  zh: { label: 'Chinese',    nativeLabel: '中文'       },
  es: { label: 'Spanish',    nativeLabel: 'Español'   },
  ru: { label: 'Russian',    nativeLabel: 'Русский'   },
  pt: { label: 'Portuguese', nativeLabel: 'Português' },
  ja: { label: 'Japanese',   nativeLabel: '日本語'     },
  ar: { label: 'Arabic',     nativeLabel: 'العربية', rtl: true },
  de: { label: 'German',     nativeLabel: 'Deutsch'   },
  fr: { label: 'French',     nativeLabel: 'Français'  },
}

const LS_KEY = 'baron_lang'

async function importLocale(code: LangCode): Promise<Translations> {
  if (code === 'tr') return tr
  switch (code) {
    case 'en': return (await import('./locales/en')).en
    case 'zh': return (await import('./locales/zh')).zh
    case 'es': return (await import('./locales/es')).es
    case 'ru': return (await import('./locales/ru')).ru
    case 'pt': return (await import('./locales/pt')).pt
    case 'ja': return (await import('./locales/ja')).ja
    case 'ar': return (await import('./locales/ar')).ar
    case 'de': return (await import('./locales/de')).de
    case 'fr': return (await import('./locales/fr')).fr
    default: return tr
  }
}

class I18nManager {
  private current: LangCode = 'tr'
  private dict: Translations = tr
  private cache = new Map<LangCode, Translations>([['tr', tr]])
  private ready = false

  /** Boot: yalnızca seçili dil yüklenir (lazy) */
  async init(): Promise<void> {
    const code = this.resolveInitialLang()
    await this.setLang(code)
    this.ready = true
  }

  initSync(): void {
    this.current = this.resolveInitialLang()
    this.dict = tr
    if (this.current !== 'tr') {
      void this.setLang(this.current)
    } else {
      this.ready = true
    }
  }

  isReady(): boolean {
    return this.ready
  }

  private resolveInitialLang(): LangCode {
    const saved = localStorage.getItem(LS_KEY) as LangCode | null
    if (saved && LANG_META[saved]) return saved
    const browser = navigator.language.split('-')[0] as LangCode
    if (LANG_META[browser]) return browser
    return 'tr'
  }

  async setLang(code: LangCode): Promise<void> {
    let dict = this.cache.get(code)
    if (!dict) {
      dict = await importLocale(code)
      this.cache.set(code, dict)
    }
    this.current = code
    this.dict = dict
    this.ready = true
    localStorage.setItem(LS_KEY, code)
    const meta = LANG_META[code]
    document.documentElement.setAttribute('lang', code)
    document.documentElement.setAttribute('dir', meta?.rtl ? 'rtl' : 'ltr')
  }

  getLang(): LangCode {
    return this.current
  }

  t(key: keyof Translations): string {
    return (this.dict[key] as string) ?? (tr[key] as string) ?? key
  }

  tRaw(key: string): string | undefined {
    return (this.dict as unknown as Record<string, string>)[key]
      ?? (tr as unknown as Record<string, string>)[key]
  }
}

export const i18n = new I18nManager()
export const t = (key: keyof Translations): string => i18n.t(key)
export const tRaw = (key: string): string | undefined => i18n.tRaw(key)

/** Languages available in production UI (Onboarding + Settings language selector). */
export const PRODUCTION_LANGS: readonly LangCode[] = ['tr', 'en']

/**
 * Normalize the stored language to a production-supported one.
 * Call once after i18n.init() if the user had a non-production lang saved.
 * Avoids infinite reload: setLang only writes localStorage, no reload triggered here.
 */
export async function normalizeToProductionLang(): Promise<void> {
  const current = i18n.getLang()
  if (!PRODUCTION_LANGS.includes(current)) {
    await i18n.setLang('en')
  }
}
