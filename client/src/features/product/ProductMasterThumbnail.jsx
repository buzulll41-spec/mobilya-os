import { useState } from 'react'
import { productThumbnailInitial } from './productMasterCenterUi.js'

/**
 * @param {{
 *   name: string
 *   url?: string | null
 *   size?: 'sm' | 'md' | 'lg'
 *   className?: string
 * }} props
 */
export default function ProductMasterThumbnail({ name, url, size = 'sm', className = '' }) {
  const [broken, setBroken] = useState(false)
  const src = url?.trim()
  const showImage = Boolean(src) && !broken
  const initial = productThumbnailInitial(name)

  return (
    <span
      className={`mos-pmc-thumb-wrap mos-pmc-thumb-wrap--${size}${className ? ` ${className}` : ''}`}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="mos-pmc-thumb"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="mos-pmc-thumb mos-pmc-thumb--placeholder" title={name}>
          {initial}
        </span>
      )}
    </span>
  )
}
