import { SearchBar } from '../../design-system/MobileOpsV2Components.jsx'

/** @param {{
 * value: string
 * onChange: (value: string) => void
 * onRefresh: () => void
 * }} props */
export default function HomeV2SearchBar({ value, onChange, onRefresh }) {
  return <SearchBar value={value} onValueChange={onChange} onRefresh={onRefresh} placeholder="Siparis, musteri, telefon, urun..." />
}
