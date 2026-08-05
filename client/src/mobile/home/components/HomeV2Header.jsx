import { AppHeader } from '../../design-system/MobileOpsV2Components.jsx'

/** @param {{
 * greeting: string
 * name: string
 * roleLabel: string
 * storeLabel: string
 * unreadCount: number
 * initials: string
 * onOpenMenu: () => void
 * }} props */
export default function HomeV2Header({ greeting, name, roleLabel, storeLabel, unreadCount, initials, onOpenMenu }) {
  return <AppHeader eyebrow={greeting} title={name} subtitle={roleLabel} meta={storeLabel} unreadCount={unreadCount} initials={initials} onOpenMenu={onOpenMenu} />
}
