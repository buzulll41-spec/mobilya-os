import { AppHttpError } from '../errors/apiError.js'
import type { WooCredentials } from './wooApiClient.js'

export function resolveWooEnvCredentials(): WooCredentials {
  const storeUrl = process.env.WOO_STORE_URL?.trim()
  const consumerKey = process.env.WOO_CONSUMER_KEY?.trim()
  const consumerSecret = process.env.WOO_CONSUMER_SECRET?.trim()

  if (!storeUrl || !consumerKey || !consumerSecret) {
    throw new AppHttpError(
      503,
      'WooCommerce bağlantı ayarları eksik. WOO_STORE_URL, WOO_CONSUMER_KEY ve WOO_CONSUMER_SECRET tanımlayın.',
      'Service Unavailable',
    )
  }

  return { storeUrl, consumerKey, consumerSecret }
}
