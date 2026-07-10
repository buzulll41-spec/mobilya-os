/**
 * Tahmin Motoru DTO'ları (backend `forecastEngineDto.ts` ile eş).
 * Tahminler açıklanabilir formüllerle üretilir; her projeksiyon `basis` alanında
 * nasıl hesaplandığını taşır.
 *
 * @typedef {'UP'|'DOWN'|'FLAT'} ForecastTrend
 *
 * @typedef {Object} ForecastProjectionDto
 * @property {string} current
 * @property {string} projected
 * @property {string} dailyRate
 * @property {string} basis
 *
 * @typedef {Object} ForecastEngineResponseDto
 * @property {Object} summary
 * @property {ForecastProjectionDto} salesForecast
 * @property {Object} profitForecast
 * @property {ForecastProjectionDto} collectionForecast
 * @property {ForecastProjectionDto} openBalanceForecast
 * @property {Object} riskForecast
 * @property {Object} shipmentForecast
 * @property {Object[]} staffForecast
 * @property {Object[]} sourceTrends
 * @property {Object} dataQualityTrend
 * @property {Object[]} alerts
 * @property {Object} filters
 * @property {string} currency
 * @property {string} today
 * @property {string} generatedAt
 */

export {}
