import { useCallback, useRef, useState } from 'react'



const PULL_THRESHOLD = 72

const MAX_PULL = 120



/**

 * Telefon pull-to-refresh dokunma mantığı.

 * @param {() => void | Promise<void>} onRefresh

 * @param {{ disabled?: boolean }} [options]

 */

export function usePullToRefresh(onRefresh, options = {}) {

  const { disabled = false } = options

  const startYRef = useRef(0)

  const pullingRef = useRef(false)

  const [pullDistance, setPullDistance] = useState(0)

  const [isRefreshing, setIsRefreshing] = useState(false)



  const onTouchStart = useCallback(

    (event) => {

      if (disabled || isRefreshing) return

      const scrollTop = document.scrollingElement?.scrollTop ?? 0

      if (scrollTop > 4) return

      startYRef.current = event.touches[0]?.clientY ?? 0

      pullingRef.current = true

    },

    [disabled, isRefreshing],

  )



  const onTouchMove = useCallback(

    (event) => {

      if (!pullingRef.current || disabled || isRefreshing) return

      const currentY = event.touches[0]?.clientY ?? 0

      const delta = Math.max(0, currentY - startYRef.current)

      if (delta <= 0) return

      setPullDistance(Math.min(delta, MAX_PULL))

    },

    [disabled, isRefreshing],

  )



  const onTouchEnd = useCallback(async () => {

    if (!pullingRef.current) return

    pullingRef.current = false

    const shouldRefresh = pullDistance >= PULL_THRESHOLD

    setPullDistance(0)

    if (!shouldRefresh || disabled) return

    setIsRefreshing(true)

    try {

      await onRefresh?.()

    } finally {

      setIsRefreshing(false)

    }

  }, [disabled, onRefresh, pullDistance])



  return {

    pullDistance,

    isRefreshing,

    handlers: {

      onTouchStart,

      onTouchMove,

      onTouchEnd,

      onTouchCancel: onTouchEnd,

    },

  }

}


