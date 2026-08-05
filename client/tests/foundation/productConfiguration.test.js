import { describe, expect, it } from 'vitest'
import {
  formatConfigurationLines,
  getFieldsForContext,
  migrateLegacyPillows,
  parseLineConfiguration,
  patchLineConfiguration,
  patchPillowRows,
  requiresCornerDirection,
  resolveConfigurationProfile,
  sanitizeConfigurationForContext,
  validateLineConfiguration,
} from '../../src/constants/productConfigurationSchema.js'
import { mapWizardProductsToLines } from '../../src/features/orders/newOrderWizardModel.js'

describe('productConfigurationSchema', () => {
  it('köşe koltuk — kumaş profili, firma ve yön zorunlu', () => {
    const ctx = {
      title: 'Roma köşe takımı',
      productGroup: 'Oturma grubu',
      suiteType: 'Koltuk',
    }
    expect(resolveConfigurationProfile(ctx)).toBe('fabric')
    expect(requiresCornerDirection(ctx)).toBe(true)
    const fields = getFieldsForContext(ctx)
    expect(fields.some((f) => f.key === 'fabricBrand' && f.required)).toBe(true)
    expect(fields.some((f) => f.key === 'fabricCode')).toBe(false)
    expect(fields.some((f) => f.key === 'cornerDirection')).toBe(true)
    const { errors } = validateLineConfiguration(ctx, {})
    expect(errors.some((e) => e.includes('Kumaş firması'))).toBe(true)
    expect(errors.some((e) => e.includes('Kumaş kodu'))).toBe(false)
    expect(errors.some((e) => e.includes('yön'))).toBe(true)
    const ok = validateLineConfiguration(ctx, {
      fabricBrand: 'Yünsa',
      cornerDirection: 'Sağ köşe',
    })
    expect(ok.errors).toHaveLength(0)
  })

  it('TV ünitesi — kumaş alanı yok', () => {
    const ctx = { title: 'Line TV ünitesi', category: 'TV ünitesi' }
    expect(resolveConfigurationProfile(ctx)).toBe('tv_unit')
    const keys = getFieldsForContext(ctx).map((f) => f.key)
    expect(keys).not.toContain('fabricBrand')
    expect(keys).toContain('bodyColor')
  })

  it('yemek masası — tabla tipi, kumaş yok', () => {
    const ctx = { title: 'Vega yemek masası', category: 'Yemek odası' }
    expect(resolveConfigurationProfile(ctx)).toBe('dining_table')
    const keys = getFieldsForContext(ctx).map((f) => f.key)
    expect(keys).toContain('topType')
    expect(keys).not.toContain('fabricBrand')
  })

  it('aksesuar — yalnızca not', () => {
    const ctx = { title: 'Dekor vazo', category: 'Aksesuar' }
    expect(resolveConfigurationProfile(ctx)).toBe('accessory')
    expect(getFieldsForContext(ctx).map((f) => f.key)).toEqual(['note'])
  })

  it('wizard satırından configuration wire alanı üretir', () => {
    const lines = mapWizardProductsToLines({
      products: [
        {
          id: 'l1',
          name: 'Roma köşe',
          group: 'Oturma grubu',
          qty: '1',
          unitPrice: '50000',
          note: '',
          configuration: {
            fabricBrand: 'Yünsa',
            cornerDirection: 'Sağ köşe',
          },
          suiteType: 'Koltuk',
        },
      ],
    })
    expect(lines[0].configuration?.fabricBrand).toBe('Yünsa')
    expect(lines[0].configuration?.cornerDirection).toBe('Sağ köşe')
  })

  it('kumaş profili — koleksiyon ve kumaş kodu formda yok', () => {
    const ctx = {
      title: 'Roma köşe takımı',
      productGroup: 'Oturma grubu',
      suiteType: 'Koltuk',
    }
    const fields = getFieldsForContext(ctx)
    expect(fields.some((f) => f.key === 'fabricBrand' && f.required)).toBe(true)
    expect(fields.some((f) => f.key === 'fabricCode')).toBe(false)
    expect(fields.some((f) => f.key === 'fabricCollection')).toBe(false)
  })

  it('formatConfigurationLines yalnızca dolu alanları yazar', () => {
    const lines = formatConfigurationLines(
      { title: 'Koltuk', productGroup: 'Oturma grubu', suiteType: 'Koltuk' },
      {
        fabricBrand: 'Yünsa',
        fabricCollection: 'Soft Touch',
        fabricCode: '217 Antrasit',
        legColor: 'Ceviz',
        bodyFabric: '',
      },
    )
    expect(lines).toContain('Kumaş firması: Yünsa')
    expect(lines).toContain('Seri: Soft Touch')
    expect(lines.join('\n')).not.toMatch(/Kumaş kodu/)
    expect(lines).not.toContain('Gövde kumaşı:')
  })

  it('parseLineConfiguration eski fabricCode snapshot okur', () => {
    const parsed = parseLineConfiguration({
      fabricBrand: 'Yünsa',
      fabricCode: '217 Antrasit',
    })
    expect(parsed?.fabricCode).toBe('217 Antrasit')
  })

  it('sanitizeConfigurationForContext eski fabricCode korur', () => {
    const ctx = { title: 'Koltuk', productGroup: 'Oturma grubu', suiteType: 'Koltuk' }
    const saved = sanitizeConfigurationForContext(ctx, {
      fabricBrand: 'Yünsa',
      fabricCode: '217',
      bodyFabric: 'Antrasit',
    })
    expect(saved.fabricCode).toBe('217')
    expect(saved.bodyFabric).toBe('Antrasit')
  })

  it('formatConfigurationLines boş fabricCollection yazmaz', () => {
    const lines = formatConfigurationLines(
      { title: 'Koltuk', productGroup: 'Oturma grubu', suiteType: 'Koltuk' },
      { fabricBrand: 'Yünsa', fabricCode: '217', fabricCollection: '' },
    )
    expect(lines.join('\n')).not.toMatch(/Seri:/)
    expect(lines.join('\n')).not.toMatch(/Kumaş kodu/)
  })

  it('patchLineConfiguration yazım sırasında kelime arası boşluğu korur', () => {
    const ctx = { title: 'Köşe koltuk', productGroup: 'Oturma grubu', suiteType: 'Koltuk' }
    const step1 = patchLineConfiguration(ctx, {}, 'fabricBrand', 'MOZZE ')
    expect(step1.fabricBrand).toBe('MOZZE ')
    const step2 = patchLineConfiguration(ctx, step1, 'fabricBrand', 'MOZZE TEKSTİL')
    expect(step2.fabricBrand).toBe('MOZZE TEKSTİL')
    const saved = sanitizeConfigurationForContext(ctx, step2)
    expect(saved.fabricBrand).toBe('MOZZE TEKSTİL')
  })

  it('kırlent dizileri — format ve legacy migrate', () => {
    const ctx = { title: 'Flex köşe', productGroup: 'Oturma grubu', suiteType: 'Koltuk' }
    const config = {
      fabricBrand: 'Mozze Tekstil',
      fabricCollection: 'COMO',
      bodyFabric: 'COMO01',
      pillows: [
        { fabric: 'COMO02', qty: 6 },
        { fabric: 'COMO03', qty: 2 },
      ],
      lumbarPillows: [{ fabric: 'COMO04', qty: 2 }],
      legColor: 'Ceviz',
      cornerDirection: 'Sağ köşe',
    }
    const text = formatConfigurationLines(ctx, config).join('\n')
    expect(text).toMatch(/Kumaş firması: Mozze Tekstil/)
    expect(text).toMatch(/Kırlentler:\n• COMO02 x6\n• COMO03 x2/)
    expect(text).toMatch(/Bel kırlenti:\n• COMO04 x2/)
    const legacy = migrateLegacyPillows({ pillowFabric: 'ESKİ01', lumbarPillow: 'ESKİ02' })
    expect(legacy.pillows).toEqual([{ fabric: 'ESKİ01', qty: 1 }])
    expect(legacy.lumbarPillows).toEqual([{ fabric: 'ESKİ02', qty: 1 }])
  })

  it('stripLegacyPillowKeys yazım sırasında eski lumbarPillow ile hayalet doldurmayı önler', () => {
    const ctx = { title: 'Köşe', productGroup: 'Oturma grubu', suiteType: 'Koltuk' }
    const next = patchLineConfiguration(
      ctx,
      { bodyFabric: 'COMO 01', lumbarPillow: 'COMO 01' },
      'fabricBrand',
      'MOZZE',
    )
    expect(next.lumbarPillow).toBeUndefined()
    expect(next.lumbarPillows).toBeUndefined()
    const saved = sanitizeConfigurationForContext(ctx, {
      fabricBrand: 'MOZZE',
      fabricCode: 'COMO01',
      bodyFabric: 'COMO 01',
      lumbarPillow: 'COMO 01',
    })
    expect(saved.lumbarPillows).toEqual([{ fabric: 'COMO 01', qty: 1 }])
    expect(saved.lumbarPillow).toBeUndefined()
  })

  it('patchPillowRows boş kumaş satırını yazarken tutar', () => {
    const next = patchPillowRows({}, 'pillows', [{ fabric: '', qty: 2 }])
    expect(next.pillows).toEqual([{ fabric: '', qty: 2 }])
    const parsed = parseLineConfiguration({
      pillows: [{ fabric: 'COMO01', qty: 6 }],
    })
    expect(parsed?.pillows).toEqual([{ fabric: 'COMO01', qty: 6 }])
  })

  it('formatConfigurationLines boş bel kırlenti bloğu yazmaz', () => {
    const lines = formatConfigurationLines(
      { title: 'Köşe', productGroup: 'Oturma grubu', suiteType: 'Koltuk' },
      {
        fabricBrand: 'MOZZE',
        bodyFabric: 'COMO 01',
        pillows: [{ fabric: 'COMO01', qty: 4 }],
        lumbarPillows: [{ fabric: '', qty: 2 }],
      },
    )
    const text = lines.join('\n')
    expect(text).toContain('Kırlentler:')
    expect(text).not.toMatch(/Bel kırlenti:/)
  })
})
