import { THEMES, themeDef, type ThemeId } from '../game/Themes'

export function applyDocumentTheme(activeTheme: ThemeId): void {
  const html = document.documentElement
  for (const t of THEMES) {
    if (t.cssClass) html.classList.remove(t.cssClass)
  }
  const def = themeDef(activeTheme)
  if (def.cssClass) html.classList.add(def.cssClass)
}
