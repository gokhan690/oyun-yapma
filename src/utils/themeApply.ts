import { THEMES, themeDef, type ThemeId } from '../game/Themes'

const EXTRA_THEME_CLASSES = ['theme-light', 'theme-dark']

export function applyDocumentTheme(activeTheme: ThemeId): void {
  const html = document.documentElement
  for (const t of THEMES) {
    if (t.cssClass) html.classList.remove(t.cssClass)
  }
  for (const cls of EXTRA_THEME_CLASSES) {
    html.classList.remove(cls)
  }
  const def = themeDef(activeTheme)
  if (def.cssClass) html.classList.add(def.cssClass)
}
