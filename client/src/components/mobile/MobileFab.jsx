import { resolveMobileFabAction } from '../../constants/mobileFabActions.js'



/**

 * @param {{

 *   page: string

 *   onFabIntent: (intent: string) => void

 * }} props

 */

export default function MobileFab({ page, onFabIntent }) {

  const action = resolveMobileFabAction(page)

  if (!action) return null



  return (

    <button

      type="button"

      className="mos-mobile-fab"

      aria-label={action.label}

      title={action.label}

      onClick={() => onFabIntent(action.intent)}

    >

      <span className="mos-mobile-fab__icon" aria-hidden>

        +

      </span>

    </button>

  )

}


