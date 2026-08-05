import { usePullToRefresh } from '../../hooks/usePullToRefresh.js'



/**

 * @param {{

 *   onRefresh: () => void | Promise<void>

 *   disabled?: boolean

 *   children: import('react').ReactNode

 * }} props

 */

export default function MobilePullToRefresh({ onRefresh, disabled = false, children }) {

  const { pullDistance, isRefreshing, handlers } = usePullToRefresh(onRefresh, { disabled })



  const progress = Math.min(100, Math.round((pullDistance / 72) * 100))

  const visible = pullDistance > 8 || isRefreshing



  return (

    <div className="mos-mobile-ptr" {...handlers}>

      <div

        className="mos-mobile-ptr__indicator"

        data-visible={visible ? 'true' : 'false'}

        data-refreshing={isRefreshing ? 'true' : 'false'}

        style={{ transform: `translateY(${Math.min(pullDistance, 72) - 48}px)` }}

        aria-hidden={!visible}

      >

        <span className="mos-mobile-ptr__spinner" />

        <span className="mos-mobile-ptr__label">

          {isRefreshing ? 'Yenileniyor…' : progress >= 100 ? 'Bırakın' : 'Yenilemek için çekin'}

        </span>

      </div>

      <div className="mos-mobile-ptr__content">{children}</div>

    </div>

  )

}


