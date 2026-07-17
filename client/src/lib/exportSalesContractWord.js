/**
 * Satış sözleşmesi DOM alanını Word uyumlu .doc olarak indirir.
 */

/**
 * @param {string} orderNo
 * @returns {string}
 */
export function buildSalesContractWordFilename(orderNo) {
  const safe =
    String(orderNo ?? 'siparis')
      .trim()
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'siparis'
  return `satis-sozlesmesi-${safe}.doc`
}

/**
 * @param {HTMLElement} element `.sales-contract-print-area` kökü
 * @param {string} orderNo
 */
export async function exportSalesContractWord(element, orderNo) {
  const filename = buildSalesContractWordFilename(orderNo)
  const markup = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta http-equiv="Content-Type" content="application/msword; charset=utf-8" />
        <title>Satış Sözleşmesi</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.45; }
          .scp-document { width: 100%; }
          .scp-head { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 18px; }
          .scp-brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
          .scp-logo { width: 48px; height: 48px; border-radius: 14px; background: #0f172a; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; letter-spacing: 0.08em; }
          .scp-store-brand { margin: 0 0 3px; font-size: 16pt; font-weight: 800; }
          .scp-store-name { margin: 0 0 4px; font-size: 11pt; font-weight: 700; }
          .scp-store-meta, .scp-doc-meta, .scp-section-copy, .scp-muted, .scp-approval { margin: 2px 0 0; font-size: 9pt; color: #334155; }
          .scp-title-block { text-align: right; }
          .scp-doc-title { margin: 0 0 6px; font-size: 18pt; font-weight: 800; }
          .scp-section { margin-bottom: 14px; page-break-inside: avoid; }
          .scp-section-title { margin: 0 0 6px; font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
          .scp-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
          .scp-table th, .scp-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
          .scp-table th { background: #f1f5f9; font-weight: 700; }
          .scp-table--kv td:first-child { width: 32%; background: #f8fafc; font-weight: 700; }
          .scp-table--finance td:last-child, .scp-table--products td:nth-child(4), .scp-table--products td:nth-child(5), .scp-table--products td:nth-child(6) { text-align: right; }
          .scp-terms, .scp-clauses { margin: 0; padding-left: 18px; font-size: 9pt; }
          .scp-terms li, .scp-clauses li { margin-bottom: 4px; }
          .scp-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 16px; }
          .scp-sig-box { border-top: 1px solid #0f172a; padding-top: 6px; min-height: 56px; }
          .scp-sig-label { margin: 0; font-size: 9pt; font-weight: 700; color: #475569; }
          .scp-payment-schedule { margin-top: 6px; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `

  const blob = new Blob([markup], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
