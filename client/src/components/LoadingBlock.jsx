import MosSkeletonStandard from './standards/MosSkeletonStandard.jsx'



/**

 * İlk veri yüklemesi — standart skeleton (spinner yok).

 * @param {{ title?: string; hint?: string; label?: string; variant?: 'table' | 'block' | 'card-grid' }} props

 */

export default function LoadingBlock({

  title,

  hint,

  label,

  variant = 'table',

}) {

  const displayTitle = title ?? label ?? 'Veriler yükleniyor'

  const skeletonVariant = variant === 'block' ? 'block' : variant === 'card-grid' ? 'card-grid' : 'table'



  return (

    <div

      className="mos-loading-block mos-loading-block--skeleton"

      role="status"

      aria-live="polite"

      aria-busy="true"

    >

      <p className="mos-loading-title">{displayTitle}</p>

      {hint ? <p className="mos-loading-hint">{hint}</p> : null}

      <MosSkeletonStandard variant={skeletonVariant} label={displayTitle} />

    </div>

  )

}


