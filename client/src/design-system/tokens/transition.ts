export const transitionTokens = {
  fade: 'opacity var(--ds-duration-base)ms var(--ds-ease-standard)',
  press: 'transform var(--ds-duration-fast)ms var(--ds-ease-standard)',
  color: 'background-color var(--ds-duration-fast)ms var(--ds-ease-standard), color var(--ds-duration-fast)ms var(--ds-ease-standard)',
  panel: 'transform var(--ds-duration-slow)ms var(--ds-ease-entrance), opacity var(--ds-duration-slow)ms var(--ds-ease-entrance)',
} as const
