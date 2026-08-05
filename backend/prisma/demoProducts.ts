import { PRODUCT_STOCK_TYPE, type ProductStockType } from '../src/constants/productStockTypes.js'

export type DemoSupplierSeed = {
  id: string
  code: string
  companyName: string
  contactName?: string
  phone?: string
}

export type DemoProductSeed = {
  productCode: string
  productName: string
  category: string
  suiteType: string | null
  defaultSalePrice: number
  minSalePrice: number
  purchasePrice: number
  supplierId: string
  deliveryDays: number
  isActive: boolean
  stockType: ProductStockType
  description?: string | null
}

/** Demo tedarikçiler — sabit id ile idempotent upsert */
export const DEMO_SUPPLIERS: DemoSupplierSeed[] = [
  {
    id: 'sup-seed-abc',
    code: 'ABC',
    companyName: 'ABC Mobilya',
    contactName: 'Mehmet Yılmaz',
    phone: '0532 111 22 33',
  },
  {
    id: 'sup-seed-mayer',
    code: 'MAYER',
    companyName: 'Mayer Mobilya San.',
    contactName: 'Ayşe Mayer',
    phone: '0533 222 33 44',
  },
  {
    id: 'sup-seed-nova',
    code: 'NOVA',
    companyName: 'Nova Home Tedarik',
    contactName: 'Can Demir',
    phone: '0534 333 44 55',
  },
  {
    id: 'sup-seed-linea',
    code: 'LINEA',
    companyName: 'Linea Mobilya İthalat',
    contactName: 'Selin Kaya',
    phone: '0535 444 55 66',
  },
  {
    id: 'sup-seed-garden',
    code: 'BAHCE',
    companyName: 'Bahçe Mobilya Ltd.',
    contactName: 'Oğuz Arslan',
    phone: '0536 555 66 77',
  },
]

const S = {
  abc: 'sup-seed-abc',
  mayer: 'sup-seed-mayer',
  nova: 'sup-seed-nova',
  linea: 'sup-seed-linea',
  garden: 'sup-seed-garden',
} as const

function p(
  code: string,
  name: string,
  category: string,
  suiteType: string | null,
  sale: number,
  purchase: number,
  supplierId: string,
  opts: {
    deliveryDays?: number
    isActive?: boolean
    stockType?: ProductStockType
    minSaleRatio?: number
    description?: string | null
  } = {},
): DemoProductSeed {
  const minRatio = opts.minSaleRatio ?? 0.9
  return {
    productCode: code,
    productName: name,
    category,
    suiteType,
    defaultSalePrice: sale,
    minSalePrice: Math.round(sale * minRatio),
    purchasePrice: purchase,
    supplierId,
    deliveryDays: opts.deliveryDays ?? 14,
    isActive: opts.isActive ?? true,
    stockType: opts.stockType ?? PRODUCT_STOCK_TYPE.ORDER,
    description: opts.description ?? null,
  }
}

/** ≥40 gerçekçi mobilya demo ürünü — productCode benzersiz */
export const DEMO_PRODUCTS: DemoProductSeed[] = [
  p('PRD-MAYER-001', 'MAYER KÖŞE TAKIMI', 'Oturma grubu', 'Takım', 89_000, 52_000, S.mayer, { deliveryDays: 21 }),
  p('PRD-ROMA-001', 'ROMA KOLTUK TAKIMI', 'Oturma grubu', 'Takım', 72_000, 41_000, S.abc),
  p('PRD-LUNA-001', 'LUNA YEMEK ODASI', 'Yemek odası', 'Takım', 118_000, 68_000, S.linea, { deliveryDays: 28 }),
  p('PRD-DEFNE-001', 'DEFNE YATAK ODASI TAKIMI', 'Yatak odası', 'Takım', 145_000, 88_000, S.nova, { deliveryDays: 25 }),
  p('PRD-OSCAR-001', 'OSCAR 6 KAPAKLI DOLAP', 'Yatak odası', 'Dolap', 64_000, 38_000, S.mayer),
  p('PRD-TRAVERTEN-001', 'TRAVERTEN TV ÜNİTESİ', 'TV ünitesi', 'Modül', 28_500, 16_500, S.nova),
  p('PRD-MILANO-001', 'MİLANO ORTA SEHPA', 'Sehpa', 'Tekil', 8_900, 5_200, S.abc, { stockType: PRODUCT_STOCK_TYPE.STOCK }),
  p('PRD-VENEDIK-001', 'VENEDİK KONSOL', 'Yatak odası', 'Modül', 19_500, 11_800, S.linea),
  p('PRD-ALFA-001', 'ALFA GENÇ ODASI', 'Genç odası', 'Takım', 96_000, 58_000, S.nova, { deliveryDays: 18 }),
  p('PRD-BAHCE-001', 'BAHÇE MASA TAKIMI', 'Bahçe mobilyası', 'Takım', 42_000, 24_000, S.garden, { deliveryDays: 12 }),
  p('PRD-ZEN-001', 'ZEN KOLTUK 3+1', 'Oturma grubu', 'Takım', 54_000, 32_000, S.abc),
  p('PRD-LINEA-001', 'LINEA KÖŞE MODÜL', 'Oturma grubu', 'Modül', 38_000, 22_000, S.linea),
  p('PRD-ATLAS-001', 'ATLAS YEMEK MASASI', 'Yemek odası', 'Masa', 32_000, 18_500, S.abc),
  p('PRD-NOVA-001', 'NOVA GARDIROP 240', 'Yatak odası', 'Dolap', 48_000, 28_000, S.nova),
  p('PRD-MODUL-001', 'MODÜL BAZA + BAŞLIK', 'Yatak odası', 'Takım', 36_000, 21_000, S.mayer),
  p('PRD-VEGA-001', 'VEGA TV ÜNİTESİ 180', 'TV ünitesi', 'Modül', 22_000, 12_800, S.nova),
  p('PRD-KALE-001', 'KALE ÇALIŞMA MASASI', 'Genç odası', 'Masa', 14_500, 8_600, S.abc),
  p('PRD-BUTIK-001', 'BUTİK ŞİFONYER', 'Yatak odası', 'Tekil', 16_800, 9_900, S.linea),
  p('PRD-PARK-001', 'PARK KANEPE 2+1', 'Oturma grubu', 'Koltuk', 41_000, 24_500, S.abc),
  p('PRD-ELIT-001', 'ELİT YEMEK SANDALYESİ (6)', 'Yemek odası', 'Tekil', 18_000, 10_500, S.linea, {
    stockType: PRODUCT_STOCK_TYPE.STOCK,
  }),
  p('PRD-MARMO-001', 'MARMO KONSOL AYNASI', 'Aksesuar', 'Tekil', 7_200, 4_100, S.nova, {
    stockType: PRODUCT_STOCK_TYPE.DISPLAY,
  }),
  p('PRD-CITY-001', 'CITY BERJER', 'Oturma grubu', 'Koltuk', 12_500, 7_400, S.abc, { stockType: PRODUCT_STOCK_TYPE.STOCK }),
  p('PRD-WOOD-001', 'WOOD KİTAPLIK 5 RAFLI', 'Genç odası', 'Modül', 9_800, 5_800, S.nova),
  p('PRD-STELLA-001', 'STELLA KARYOLA 160', 'Yatak odası', 'Tekil', 28_000, 16_200, S.mayer),
  p('PRD-PORTO-001', 'PORTO BAHÇE KOLTUĞU', 'Bahçe mobilyası', 'Koltuk', 6_500, 3_800, S.garden),
  p('PRD-DENIZ-001', 'DENİZ ŞEZLONG SETİ', 'Bahçe mobilyası', 'Takım', 15_900, 9_200, S.garden),
  p('PRD-PRIME-001', 'PRIME TV SEHPASI', 'Sehpa', 'Tekil', 5_400, 3_100, S.abc, { stockType: PRODUCT_STOCK_TYPE.STOCK }),
  p('PRD-COSMO-001', 'COSMO YEMEK ODASI 7 PARÇA', 'Yemek odası', 'Takım', 132_000, 78_000, S.linea, { deliveryDays: 30 }),
  p('PRD-ROYAL-001', 'ROYAL MASTER BAZA', 'Yatak odası', 'Tekil', 52_000, 31_000, S.mayer),
  p('PRD-FLEX-001', 'FLEX KÖŞE KANEPE', 'Oturma grubu', 'Koltuk', 67_000, 39_000, S.mayer),
  p('PRD-ARTE-001', 'ARTE DUVAR ÜNİTESİ', 'TV ünitesi', 'Modül', 31_000, 18_000, S.nova),
  p('PRD-PURE-001', 'PURE KOMODİN ÇİFT', 'Yatak odası', 'Tekil', 11_200, 6_500, S.linea),
  p('PRD-JOY-001', 'JOY GENÇ ÇALIŞMA TAKIMI', 'Genç odası', 'Takım', 44_000, 26_000, S.nova),
  p('PRD-TERRA-001', 'TERRA BAHÇE MASASI 8 KİŞİ', 'Bahçe mobilyası', 'Masa', 38_500, 22_000, S.garden),
  p('PRD-SILK-001', 'SİLK ORTA SEHPA CAM', 'Sehpa', 'Tekil', 7_800, 4_600, S.abc),
  p('PRD-NEO-001', 'NEO TV ÜNİTESİ ASKI', 'TV ünitesi', 'Modül', 19_900, 11_500, S.nova),
  p('PRD-CLASS-001', 'CLASS 4 KAPAK GARDIROP', 'Yatak odası', 'Dolap', 58_000, 34_000, S.mayer),
  p('PRD-MINI-001', 'MİNİ PUF', 'Aksesuar', 'Tekil', 3_900, 2_200, S.abc, { stockType: PRODUCT_STOCK_TYPE.STOCK }),
  p('PRD-HOME-001', 'HOME YEMEK BUFFET', 'Yemek odası', 'Modül', 26_000, 15_000, S.linea),
  p('PRD-SKY-001', 'SKY KÖŞE TAKIMI L', 'Oturma grubu', 'Takım', 95_000, 56_000, S.mayer, { deliveryDays: 24 }),
  p('PRD-PEARL-001', 'PEARL YATAK ODASI 5 PARÇA', 'Yatak odası', 'Takım', 128_000, 76_000, S.nova),
  p('PRD-URBAN-001', 'URBAN TV ÜNİTESİ + KİTAPLIK', 'TV ünitesi', 'Takım', 44_500, 26_000, S.nova),
  p('PRD-SUN-001', 'SUN BAHÇE ŞEMSİYE SET', 'Bahçe mobilyası', 'Takım', 12_800, 7_400, S.garden, {
    stockType: PRODUCT_STOCK_TYPE.STOCK,
  }),
  p('PRD-DREAM-001', 'DREAM ORTA SEHPA AHŞAP', 'Sehpa', 'Tekil', 6_200, 3_600, S.abc),
  p('PRD-MAX-001', 'MAX GENÇ GARDIROP', 'Genç odası', 'Dolap', 29_500, 17_200, S.nova),
  p('PRD-LUX-001', 'LUX KOLTUK TAKIMI 3+2+1', 'Oturma grubu', 'Takım', 112_000, 66_000, S.mayer, { deliveryDays: 28 }),
  p('PRD-COMFORT-001', 'COMFORT TV SEHPASI ÇEKMECELİ', 'Sehpa', 'Modül', 9_500, 5_500, S.abc),
  p('PRD-NATURE-001', 'NATURE BAHÇE SALINCAK', 'Bahçe mobilyası', 'Tekil', 18_900, 11_000, S.garden),
  p('PRD-OPAL-001', 'OPAL YEMEK MASASI 180', 'Yemek odası', 'Masa', 36_500, 21_000, S.linea),
  p('PRD-STUDIO-001', 'STUDIO WALL UNIT', 'TV ünitesi', 'Modül', 27_000, 15_800, S.nova, {
    description: 'Demo ürün — duvar ünitesi',
  }),
  p('PRD-PASSIVE-001', 'ESKİ MODEL KOLTUK (PASİF)', 'Oturma grubu', 'Koltuk', 22_000, 14_000, S.abc, {
    isActive: false,
    description: 'Pasif demo kartı',
  }),
]
