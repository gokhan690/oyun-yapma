import { tr } from './locales/tr'
import { en } from './locales/en'
import { zh } from './locales/zh'
import { es } from './locales/es'
import { ru } from './locales/ru'
import { pt } from './locales/pt'
import { ja } from './locales/ja'
import { ar } from './locales/ar'
import { de } from './locales/de'
import { fr } from './locales/fr'
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

const LOCALES: Record<LangCode, Translations> = { tr, en, zh, es, ru, pt, ja, ar, de, fr }

const LS_KEY = 'baron_lang'

class I18nManager {
  private current: LangCode = 'tr'
  private dict: Translations = tr

  init(): void {
    const saved = localStorage.getItem(LS_KEY) as LangCode | null
    if (saved && LOCALES[saved]) {
      this.setLang(saved)
    } else {
      const browser = navigator.language.split('-')[0] as LangCode
      if (LOCALES[browser]) this.setLang(browser)
    }
  }

  setLang(code: LangCode): void {
    this.current = code
    this.dict = LOCALES[code]
    localStorage.setItem(LS_KEY, code)
    const meta = LANG_META[code]
    document.documentElement.setAttribute('lang', code)
    document.documentElement.setAttribute('dir', meta?.rtl ? 'rtl' : 'ltr')
  }

  getLang(): LangCode {
    return this.current
  }

  t(key: keyof Translations): string {
    return (this.dict[key] as string) ?? (LOCALES.tr[key] as string) ?? key
  }

  tRaw(key: string): string | undefined {
    return (this.dict as unknown as Record<string, string>)[key] ?? (LOCALES.tr as unknown as Record<string, string>)[key]
  }
}

export const i18n = new I18nManager()
export const t = (key: keyof Translations): string => i18n.t(key)
export const tRaw = (key: string): string | undefined => i18n.tRaw(key)
