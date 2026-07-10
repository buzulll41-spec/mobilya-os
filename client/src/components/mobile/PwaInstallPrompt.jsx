import { useEffect, useState } from 'react'



const DISMISS_KEY = 'mobilya-os.pwa-install-dismissed'

const FIRST_VISIT_KEY = 'mobilya-os.pwa-first-visit'



function readFirstVisit() {

  try {

    return localStorage.getItem(FIRST_VISIT_KEY) !== '1'

  } catch {

    return true

  }

}



function markVisited() {

  try {

    localStorage.setItem(FIRST_VISIT_KEY, '1')

  } catch {

    /* ignore */

  }

}



/**

 * PWA kurulum istemi — ilk girişte ana ekrana ekleme önerisi.

 */

export default function PwaInstallPrompt() {

  const [deferredPrompt, setDeferredPrompt] = useState(

    /** @type {BeforeInstallPromptEvent | null} */ (null),

  )

  const [isFirstVisit] = useState(readFirstVisit)

  const [dismissed, setDismissed] = useState(() => {

    try {

      return localStorage.getItem(DISMISS_KEY) === '1'

    } catch {

      return false

    }

  })



  useEffect(() => {

    /** @param {Event} event */

    function onBeforeInstall(event) {

      event.preventDefault()

      setDeferredPrompt(/** @type {BeforeInstallPromptEvent} */ (event))

    }



    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)

  }, [])



  useEffect(() => {

    if (isFirstVisit) markVisited()

  }, [isFirstVisit])



  if (dismissed) return null

  if (!isFirstVisit && !deferredPrompt) return null



  async function handleInstall() {

    if (deferredPrompt) {

      await deferredPrompt.prompt()

      setDeferredPrompt(null)

      setDismissed(true)

      try {

        localStorage.setItem(DISMISS_KEY, '1')

      } catch {

        /* ignore */

      }

      return

    }

    setDismissed(true)

    try {

      localStorage.setItem(DISMISS_KEY, '1')

    } catch {

      /* ignore */

    }

  }



  function handleDismiss() {

    setDismissed(true)

    try {

      localStorage.setItem(DISMISS_KEY, '1')

    } catch {

      /* ignore */

    }

  }



  return (

    <div className="mos-pwa-install mos-pwa-install--faz112" role="region" aria-label="Ana ekrana ekle">

      <div className="mos-pwa-install__copy">

        <strong>Uygulamayı Ana Ekrana Ekle</strong>

        <span>

          {deferredPrompt

            ? 'MOBILYA OS’u telefonunuzda uygulama gibi kullanın.'

            : 'Safari/Chrome menüsünden “Ana Ekrana Ekle” seçeneğini kullanın.'}

        </span>

      </div>

      <div className="mos-pwa-install__actions">

        <button

          type="button"

          className="mos-pwa-install__btn mos-pwa-install__btn--primary"

          onClick={() => void handleInstall()}

        >

          {deferredPrompt ? 'Ekle' : 'Anladım'}

        </button>

        <button type="button" className="mos-pwa-install__btn" onClick={handleDismiss}>

          Sonra

        </button>

      </div>

    </div>

  )

}


