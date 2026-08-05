/**
 * Satış sözleşmesi DOM alanını PDF olarak indirir (yazdırma penceresi açılmaz).
 */

/**
 * @param {string} orderNo
 * @returns {string}
 */
export function buildSalesContractPdfFilename(orderNo) {
  const safe =
    String(orderNo ?? 'siparis')
      .trim()
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'siparis'
  return `satis-sozlesmesi-${safe}.pdf`
}

/**
 * @param {HTMLElement} element `.sales-contract-print-area` kökü
 * @param {string} orderNo
 */
export async function exportSalesContractPdf(element, orderNo) {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])
  const html2canvas = html2canvasModule.default

  const canvas = await html2canvas(/** @type {HTMLElement} */ (element), {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
  })

  const filename = buildSalesContractPdfFilename(orderNo)
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginMm = 12
  const printableWidth = pageWidth - marginMm * 2
  const printableHeight = pageHeight - marginMm * 2

  const imgWidthMm = printableWidth
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width

  let heightLeftMm = imgHeightMm
  let offsetMm = marginMm

  pdf.addImage(imgData, 'JPEG', marginMm, offsetMm, imgWidthMm, imgHeightMm, undefined, 'FAST')
  heightLeftMm -= printableHeight

  while (heightLeftMm > 0) {
    pdf.addPage()
    offsetMm = marginMm - (imgHeightMm - heightLeftMm)
    pdf.addImage(imgData, 'JPEG', marginMm, offsetMm, imgWidthMm, imgHeightMm, undefined, 'FAST')
    heightLeftMm -= printableHeight
  }

  pdf.save(filename)
}
