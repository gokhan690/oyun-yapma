;(function () {
  var BOOT_MS = 18000
  var booted = false

  // Boot guard çalışır i18n bundle yüklenmeden ÖNCE — bu yüzden i18n.t() yok.
  // Dil tercihi localStorage['baron_lang'] içinden okunur; yoksa tr'ye düşülür.
  var BOOT_I18N = {
    tr: {
      reload: 'Sayfayı yenile',
      reset: 'Kaydı sıfırla ve başlat',
      errFiles: 'Oyun dosyaları yüklenemedi. Ctrl+F5 ile sert yenileme yap veya önbelleği temizle.',
      errBoot: 'Oyun başlatılırken hata oluştu. Sayfayı yenile; sorun sürerse kaydı sıfırla.',
      errUnexpected: 'Oyun başlatılırken beklenmeyen hata. Sayfayı yenile; sorun sürerse kaydı sıfırla.',
      errTimeout: 'Yükleme çok uzun sürdü. Kayıt bozulmuş olabilir — sıfırlayıp yeniden deneyebilirsin.',
    },
    en: {
      reload: 'Reload page',
      reset: 'Reset save and start',
      errFiles: 'Game files failed to load. Do a hard refresh with Ctrl+F5 or clear your cache.',
      errBoot: 'An error occurred while starting the game. Reload the page; if the problem persists, reset your save.',
      errUnexpected: 'Unexpected error while starting the game. Reload the page; if the problem persists, reset your save.',
      errTimeout: 'Loading took too long. Your save may be corrupted — you can reset it and try again.',
    },
    de: {
      reload: 'Seite neu laden',
      reset: 'Spielstand zurücksetzen und starten',
      errFiles: 'Spieldateien konnten nicht geladen werden. Mache einen harten Neustart mit Strg+F5 oder leere den Cache.',
      errBoot: 'Beim Start des Spiels ist ein Fehler aufgetreten. Lade die Seite neu; wenn das Problem bleibt, setze den Spielstand zurück.',
      errUnexpected: 'Unerwarteter Fehler beim Start des Spiels. Lade die Seite neu; wenn das Problem bleibt, setze den Spielstand zurück.',
      errTimeout: 'Das Laden hat zu lange gedauert. Dein Spielstand ist möglicherweise beschädigt — du kannst ihn zurücksetzen und es erneut versuchen.',
    },
    zh: {
      reload: '刷新页面',
      reset: '重置存档并开始',
      errFiles: '游戏文件加载失败。请使用 Ctrl+F5 强制刷新或清除缓存。',
      errBoot: '启动游戏时出错。请刷新页面；如果问题仍然存在，请重置存档。',
      errUnexpected: '启动游戏时发生意外错误。请刷新页面；如果问题仍然存在，请重置存档。',
      errTimeout: '加载时间过长。存档可能已损坏——你可以重置后重试。',
    },
    es: {
      reload: 'Recargar página',
      reset: 'Reiniciar partida y empezar',
      errFiles: 'No se pudieron cargar los archivos del juego. Haz una recarga forzada con Ctrl+F5 o borra la caché.',
      errBoot: 'Ocurrió un error al iniciar el juego. Recarga la página; si el problema persiste, reinicia tu partida.',
      errUnexpected: 'Error inesperado al iniciar el juego. Recarga la página; si el problema persiste, reinicia tu partida.',
      errTimeout: 'La carga tardó demasiado. Tu partida puede estar dañada — puedes reiniciarla e intentarlo de nuevo.',
    },
    ru: {
      reload: 'Обновить страницу',
      reset: 'Сбросить сохранение и начать',
      errFiles: 'Не удалось загрузить файлы игры. Выполните жёсткое обновление с помощью Ctrl+F5 или очистите кэш.',
      errBoot: 'Произошла ошибка при запуске игры. Обновите страницу; если проблема сохраняется, сбросьте сохранение.',
      errUnexpected: 'Непредвиденная ошибка при запуске игры. Обновите страницу; если проблема сохраняется, сбросьте сохранение.',
      errTimeout: 'Загрузка заняла слишком много времени. Возможно, сохранение повреждено — вы можете сбросить его и повторить попытку.',
    },
    pt: {
      reload: 'Recarregar página',
      reset: 'Redefinir jogo e começar',
      errFiles: 'Falha ao carregar os arquivos do jogo. Faça uma atualização forçada com Ctrl+F5 ou limpe o cache.',
      errBoot: 'Ocorreu um erro ao iniciar o jogo. Recarregue a página; se o problema persistir, redefina seu jogo.',
      errUnexpected: 'Erro inesperado ao iniciar o jogo. Recarregue a página; se o problema persistir, redefina seu jogo.',
      errTimeout: 'O carregamento demorou demais. Seu jogo pode estar corrompido — você pode redefini-lo e tentar novamente.',
    },
    ja: {
      reload: 'ページを再読み込み',
      reset: 'セーブをリセットして開始',
      errFiles: 'ゲームファイルの読み込みに失敗しました。Ctrl+F5 でハード更新するか、キャッシュをクリアしてください。',
      errBoot: 'ゲームの起動中にエラーが発生しました。ページを再読み込みしてください。問題が続く場合はセーブをリセットしてください。',
      errUnexpected: 'ゲームの起動中に予期しないエラーが発生しました。ページを再読み込みしてください。問題が続く場合はセーブをリセットしてください。',
      errTimeout: '読み込みに時間がかかりすぎました。セーブが破損している可能性があります。リセットして再試行できます。',
    },
    ar: {
      reload: 'إعادة تحميل الصفحة',
      reset: 'إعادة تعيين الحفظ والبدء',
      errFiles: 'فشل تحميل ملفات اللعبة. قم بتحديث قوي باستخدام Ctrl+F5 أو امسح ذاكرة التخزين المؤقت.',
      errBoot: 'حدث خطأ أثناء بدء اللعبة. أعد تحميل الصفحة؛ إذا استمرت المشكلة، أعد تعيين الحفظ.',
      errUnexpected: 'خطأ غير متوقع أثناء بدء اللعبة. أعد تحميل الصفحة؛ إذا استمرت المشكلة، أعد تعيين الحفظ.',
      errTimeout: 'استغرق التحميل وقتًا طويلاً. قد يكون الحفظ تالفًا — يمكنك إعادة تعيينه والمحاولة مرة أخرى.',
    },
    fr: {
      reload: 'Recharger la page',
      reset: 'Réinitialiser la sauvegarde et démarrer',
      errFiles: 'Échec du chargement des fichiers du jeu. Effectuez une actualisation forcée avec Ctrl+F5 ou videz le cache.',
      errBoot: "Une erreur s'est produite au démarrage du jeu. Rechargez la page ; si le problème persiste, réinitialisez la sauvegarde.",
      errUnexpected: "Erreur inattendue au démarrage du jeu. Rechargez la page ; si le problème persiste, réinitialisez la sauvegarde.",
      errTimeout: 'Le chargement a pris trop de temps. Votre sauvegarde est peut-être corrompue — vous pouvez la réinitialiser et réessayer.',
    },
  }

  var BOOT_LANG = (function () {
    try {
      var l = localStorage.getItem('baron_lang')
      return l && BOOT_I18N[l] ? l : 'tr'
    } catch (e) {
      return 'tr'
    }
  })()
  var T = BOOT_I18N[BOOT_LANG] || BOOT_I18N.tr

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
      localStorage.removeItem('baron_setup_done') // baron_lang is intentionally kept
    } catch (e) {
      console.warn('Kayıt temizlenemedi', e)
    }
  }

  function showBootError(message, opts) {
    opts = opts || {}
    var el = document.getElementById('boot-error')
    if (!el) return
    el.style.display = 'block'
    if (BOOT_LANG === 'ar') el.setAttribute('dir', 'rtl')
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
    reloadBtn.textContent = T.reload
    reloadBtn.style.cssText =
      'padding:10px 16px;border:none;border-radius:10px;background:#fbbf24;color:#0a1628;font-weight:700;cursor:pointer'
    reloadBtn.addEventListener('click', function () {
      location.reload()
    })
    actions.appendChild(reloadBtn)

    if (opts.resetSave) {
      var resetBtn = document.createElement('button')
      resetBtn.type = 'button'
      resetBtn.textContent = T.reset
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
        showBootError(T.errFiles, { resetSave: false })
        return
      }
      if (!booted && appEmpty()) {
        showBootError(T.errBoot, { resetSave: true })
      }
      console.error(e.error || e.message)
    },
    true,
  )

  window.addEventListener('unhandledrejection', function (e) {
    if (booted) return
    showBootError(T.errUnexpected, { resetSave: true })
    console.error(e.reason)
  })

  window.setTimeout(function () {
    if (booted || !appEmpty()) return
    showBootError(T.errTimeout, { resetSave: true })
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
