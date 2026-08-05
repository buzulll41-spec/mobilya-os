import { describe, expect, it } from 'vitest'
import {
  formatConfigurationLines,
  getFieldsForContext,
  parseLineConfiguration,
  requiresCornerDirection,
  resolveConfigurationProfile,
  validateLineConfiguration,
} from '../src/constants/productConfigurationSchema.js'

describe('productConfigurationSchema', () => {
  it('köşe koltuk — kumaş firması ve yön zorunlu', () => {
    const ctx = {
      title: 'Roma köşe takımı',
      productGroup: 'Oturma grubu',
      suiteType: 'Koltuk',
    }
    expect(resolveConfigurationProfile(ctx)).toBe('fabric')
    expect(requiresCornerDirection(ctx)).toBe(true)
    const { errors } = validateLineConfiguration(ctx, {})
    expect(errors.some((e) => e.includes('Kumaş firması'))).toBe(true)
    expect(errors.some((e) => e.includes('Kumaş kodu'))).toBe(false)
    expect(errors.some((e) => e.includes('yön'))).toBe(true)
    const ok = validateLineConfiguration(ctx, {
      fabricBrand: 'Yünsa',
      cornerDirection: 'Modüler',
    })
    expect(ok.errors).toHaveLength(0)
  })

  it('sandalye — kumaş profili, firma zorunlu', () => {
    const ctx = { title: 'Yemek sandalyesi', productGroup: 'Yemek odası' }
    expect(resolveConfigurationProfile(ctx)).toBe('fabric')
    const { errors } = validateLineConfiguration(ctx, {})
    expect(errors.some((e) => e.includes('Kumaş firması'))).toBe(true)
    const keys = getFieldsForContext(ctx).map((f) => f.key)
    expect(keys).not.toContain('cornerDirection')
  })

  it('TV ünitesi — kumaş alanları gösterilmez', () => {
    const ctx = { title: 'Modern TV ünitesi', category: 'TV ünitesi' }
    expect(resolveConfigurationProfile(ctx)).toBe('tv_unit')
    expect(getFieldsForContext(ctx).map((f) => f.key)).not.toContain('fabricBrand')
  })

  it('configuration parse bilinen ve legacy anahtarları alır', () => {
    const parsed = parseLineConfiguration({
      fabricBrand: ' Yünsa ',
      fabricCode: '217',
      bodyFabric: 'Antrasit',
      unknown: 'x',
      cornerDirection: 'Sol köşe',
    })
    expect(parsed?.fabricBrand).toBe('Yünsa')
    expect(parsed?.fabricCode).toBe('217')
    expect(parsed?.cornerDirection).toBe('Sol köşe')
    expect(parsed).not.toHaveProperty('unknown')
  })

  it('kumaş profili — koleksiyon/kod formda yok, eski snapshot okunur', () => {
    const ctx = { title: 'Berjer', productGroup: 'Oturma grubu', suiteType: 'Koltuk' }
    const keys = getFieldsForContext(ctx).map((f) => f.key)
    expect(keys).not.toContain('fabricCollection')
    expect(keys).not.toContain('fabricCode')
    const lines = formatConfigurationLines(ctx, {
      fabricBrand: 'Kartal',
      fabricCode: '12',
      fabricCollection: 'COMO',
    })
    expect(lines.join('\n')).toContain('Seri: COMO')
    expect(lines.join('\n')).not.toMatch(/Kumaş kodu/)
  })

  it('formatConfigurationLines sözleşme satırları', () => {
    const lines = formatConfigurationLines(
      { title: 'Berjer', productGroup: 'Oturma grubu', suiteType: 'Koltuk' },
      { fabricBrand: 'Kartal', fabricCode: '12', legColor: 'Siyah' },
    )
    expect(lines.join('\n')).toMatch(/Kumaş firması: Kartal/)
    expect(lines.join('\n')).not.toMatch(/Kumaş kodu/)
    expect(lines.join('\n')).not.toMatch(/Gövde kumaşı:/)
  })

  it('parseLineConfiguration kırlent dizilerini alır', () => {
    const parsed = parseLineConfiguration({
      fabricBrand: ' Mozze Tekstil ',
      pillows: [{ fabric: 'COMO02', qty: 6 }],
      lumbarPillows: [{ fabric: 'COMO04', qty: 2 }],
    })
    expect(parsed?.fabricBrand).toBe('Mozze Tekstil')
    expect(parsed?.pillows).toEqual([{ fabric: 'COMO02', qty: 6 }])
    expect(parsed?.lumbarPillows).toEqual([{ fabric: 'COMO04', qty: 2 }])
  })

  it('formatConfigurationLines kırlentleri madde işaretli yazar', () => {
    const lines = formatConfigurationLines(
      { title: 'Köşe', productGroup: 'Oturma grubu', suiteType: 'Koltuk' },
      {
        fabricBrand: 'Mozze',
        bodyFabric: 'COMO01',
        pillows: [{ fabric: 'COMO02', qty: 6 }],
      },
    )
    const text = lines.join('\n')
    expect(text).toContain('Kırlentler:')
    expect(text).toContain('• COMO02 x6')
  })
})
