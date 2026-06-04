import { RefApp } from './RefApp'

/*
 * İZOLE GÖRSEL TEST MODU.
 * Ana oyuna RefApp'i bağlamaz, GameState'e dokunmaz, ekonomi/tutorial/piyasa
 * kilidini değiştirmez. Yalnızca yüzen bir butonla RefApp'i (mock data) tam
 * ekran overlay olarak açıp kapatır. Onay sonrası gerçek entegrasyon ayrı aşama.
 */
export function installRefTestLauncher(): void {
  if (document.getElementById('ref-test-launch')) return

  const btn = document.createElement('button')
  btn.id = 'ref-test-launch'
  btn.type = 'button'
  btn.textContent = '✨ Yeni Arayüz'
  btn.title = 'Yeni arayüz tasarımı (görsel test — mock data)'
  Object.assign(btn.style, {
    position: 'fixed',
    left: '10px',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
    zIndex: '9000',
    padding: '9px 14px',
    borderRadius: '999px',
    border: '1.5px solid rgba(246,200,76,0.7)',
    background: 'linear-gradient(180deg,#13B8A6,#078B83)',
    color: '#fff',
    fontWeight: '800',
    fontSize: '12px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 4px 14px rgba(0,60,80,0.28)',
    cursor: 'pointer',
  } as CSSStyleDeclaration)

  let overlay: HTMLElement | null = null

  const close = (): void => {
    overlay?.remove()
    overlay = null
    btn.style.display = ''
  }

  const open = (): void => {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.id = 'ref-test-overlay'
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '8999',
    } as CSSStyleDeclaration)

    const app = new RefApp({ initial: 'firms', onExit: close })
    app.mount(overlay)
    document.body.appendChild(overlay)
    btn.style.display = 'none'
  }

  btn.addEventListener('click', open)
  document.body.appendChild(btn)
}
