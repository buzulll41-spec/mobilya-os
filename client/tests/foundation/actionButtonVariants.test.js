import { describe, expect, it } from 'vitest'
import {
  erpDetailActionClass,
  erpOpsButtonClass,
  erpTableOpClass,
  mosButtonClass,
  resolveActionButtonVariant,
} from '../../src/lib/actionButtonVariants.js'

describe('resolveActionButtonVariant (FAZ 16A)', () => {
  it('maps PRIMARY actions to blue', () => {
    expect(resolveActionButtonVariant('Kaydet')).toBe('primary')
    expect(resolveActionButtonVariant('Planla')).toBe('primary')
    expect(resolveActionButtonVariant('Sipariş oluştur')).toBe('primary')
    expect(resolveActionButtonVariant('Giriş yap')).toBe('primary')
  })

  it('maps SUCCESS actions to green', () => {
    expect(resolveActionButtonVariant('Onayla')).toBe('success')
    expect(resolveActionButtonVariant('Teslim Edildi')).toBe('success')
    expect(resolveActionButtonVariant('Teslim Et')).toBe('success')
    expect(resolveActionButtonVariant('Ödeme al')).toBe('success')
  })

  it('maps sevk INFO and DANGER actions', () => {
    expect(resolveActionButtonVariant('Yola Çıktı')).toBe('info')
    expect(resolveActionButtonVariant('İptal')).toBe('danger')
    expect(resolveActionButtonVariant('Teslim Edilemedi')).toBe('danger')
  })

  it('maps INFO navigation actions to navy', () => {
    expect(resolveActionButtonVariant('Detay')).toBe('info')
    expect(resolveActionButtonVariant('Görüntüle')).toBe('info')
    expect(resolveActionButtonVariant('Aç')).toBe('info')
  })
})

describe('MosButton class helpers', () => {
  it('builds standardized tone classes', () => {
    expect(mosButtonClass('head', 'Kaydet')).toContain('mos-erp-ops__btn--primary')
    expect(mosButtonClass('table', 'Planla', 'primary')).toContain('mos-erp-tbl-op--primary')
    expect(mosButtonClass('table', 'Yola Çıktı', 'info')).toContain('mos-erp-tbl-op--info')
    expect(mosButtonClass('table', 'Teslim Edildi', 'success')).toContain('mos-erp-tbl-op--success')
  })

  it('keeps legacy erp helpers working', () => {
    expect(erpOpsButtonClass('Kaydet')).toContain('--primary')
    expect(erpDetailActionClass('Pasifleştir')).toContain('--danger')
    expect(erpTableOpClass('Onayla')).toContain('--success')
  })
})
