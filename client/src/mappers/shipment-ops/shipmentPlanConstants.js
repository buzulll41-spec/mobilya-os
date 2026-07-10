/** @type {readonly string[]} */
export const SHIPMENT_FLEET_VEHICLES = ['Araç 1', 'Araç 2', 'Araç 3', 'Araç 4']

/** @type {readonly string[]} */
export const SHIPMENT_VEHICLE_OPTIONS = [...SHIPMENT_FLEET_VEHICLES, 'Dış ekip']

/** @type {readonly string[]} */
export const SHIPMENT_CREW_OPTIONS = ['Muhammet', 'Cihan', 'Dış ekip', 'Belirlenmedi']

/** Maksimum günlük durak — %100 doluluk */
export const MAX_STOPS_PER_VEHICLE = 4

/** Birleştirilen her ek sefer için tahmini tasarruf (TRY) */
export const TRIP_SAVINGS_TRY = 1200

/** Doluluk %50 altı uyarı eşiği */
export const LOW_OCCUPANCY_THRESHOLD = 50

/** @type {readonly string[]} */
export const KOCAELI_SHIPMENT_REGIONS = [
  'İzmit',
  'Başiskele',
  'Kartepe',
  'Derince',
  'Körfez',
  'Gebze',
  'Gölcük',
  'Kandıra',
]
