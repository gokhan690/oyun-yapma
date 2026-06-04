;(function () {
  var BOOT_MS = 18000
  var booted = false

  function appEmpty() {
    var app = document.getElementById('app')
    return !app || app.children.length === 0
  }

  function clearSaves() {
    try {
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i)
        if (!k) continue
        if (k.indexOf('is_imparatorlugu_') === 0 || k === 'para_tuzagi_save_v1') {
          localStorage.removeItem(k)
        }
      }
    } catch (e) {
      console.warn('Kayıt temizlenemedi', e)
    }
  }

  function showBootError(message, opts) {
    opts = opts || {}
    var el = document.getElementById('boot-error')
    if (!el) return
    el.style.display = 'block'
    el.innerHTML = ''

    var p = document.createElement('p')
    p.textContent = message
    p.style.margin = '0 0 16px'
    el.appendChild(p)

    var actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.flexWrap = 'wrap'
    actions.style.gap = '10px'
    actions.style.justifyContent = 'center'

    var reloadBtn = document.createElement('button')
    reloadBtn.type = 'button'
    reloadBtn.textContent = 'Sayfayı yenile'
    reloadBtn.style.cssText =
      'padding:10px 16px;border:none;border-radius:10px;background:#fbbf24;color:#0a1628;font-weight:700;cursor:pointer'
    reloadBtn.addEventListener('click', function () {
      location.reload()
    })
    actions.appendChild(reloadBtn)

    if (opts.resetSave) {
      var resetBtn = document.createElement('button')
      resetBtn.type = 'button'
      resetBtn.textContent = 'Kaydı sıfırla ve başlat'
      resetBtn.style.cssText =
        'padding:10px 16px;border:1px solid #64748b;border-radius:10px;background:transparent;color:#e2e8f0;font-weight:600;cursor:pointer'
      resetBtn.addEventListener('click', function () {
        clearSaves()
        location.reload()
      })
      actions.appendChild(resetBtn)
    }

    el.appendChild(actions)

    var app = document.getElementById('app')
    if (app) app.style.display = 'none'
  }

  window.__II_MARK_BOOTED__ = function () {
    booted = true
  }

  window.__II_SHOW_BOOT_ERROR__ = showBootError

  window.addEventListener(
    'error',
    function (e) {
      var target = e.target
      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        var res = target.href || target.src || ''
        // Dış font kaynakları (Google Fonts vb.) KRİTİK DEĞİL — yüklenemese de
        // sistem fontuna düşülür; app boot'unu fail ettirmemeli.
        var isExternalFont =
          /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(res) ||
          (target.tagName === 'LINK' &&
            (target.rel === 'stylesheet' || target.rel === 'preconnect' || target.rel === 'preload') &&
            res.indexOf(location.origin) !== 0)
        if (isExternalFont) {
          if (console && console.warn) console.warn('Dış font yüklenemedi, sistem fontuna geçiliyor:', res)
          return
        }
        showBootError(
          'Oyun dosyaları yüklenemedi. Ctrl+F5 ile sert yenileme yap veya önbelleği temizle.',
          { resetSave: false },
        )
        return
      }
      if (!booted && appEmpty()) {
        showBootError('Oyun başlatılırken hata oluştu. Sayfayı yenile; sorun sürerse kaydı sıfırla.', {
          resetSave: true,
        })
      }
      console.error(e.error || e.message)
    },
    true,
  )

  window.addEventListener('unhandledrejection', function (e) {
    if (booted) return
    showBootError('Oyun başlatılırken beklenmeyen hata. Sayfayı yenile; sorun sürerse kaydı sıfırla.', {
      resetSave: true,
    })
    console.error(e.reason)
  })

  window.setTimeout(function () {
    if (booted || !appEmpty()) return
    showBootError(
      'Yükleme çok uzun sürdü. Kayıt bozulmuş olabilir — sıfırlayıp yeniden deneyebilirsin.',
      { resetSave: true },
    )
  }, BOOT_MS)

  // Outfit fontunu OPSİYONEL/ASENKRON yükle. Hata listener'ı zaten kayıtlı;
  // yüklenemezse hem onerror temizler hem de yukarıdaki guard boot'u fail
  // ettirmez → sistem fontuna sorunsuz fallback.
  try {
    var fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'
    fontLink.crossOrigin = 'anonymous'
    fontLink.setAttribute('data-optional-font', '1')
    fontLink.onerror = function () {
      try {
        fontLink.remove()
      } catch (e) {}
    }
    document.head.appendChild(fontLink)
  } catch (e) {}
})()
