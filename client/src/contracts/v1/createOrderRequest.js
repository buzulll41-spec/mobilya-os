/**

 * POST /v1/orders wire gövdesi

 * @typedef {Object} CreateOrderLineInput

 * @property {string} title

 * @property {number} quantity

 * @property {number} unitPrice

 * @property {string} [productGroup]

 * @property {number} [sortOrder]

 * @property {string} [productId]

 * @property {string} [lineNote]

 * @property {Record<string, string>} [configuration]

 */



/**

 * @typedef {Object} CreateOrderRequest

 * @property {string} customerName

 * @property {string} [productTitle]

 * @property {number} [totalAmount]

 * @property {number} paidAmount

 * @property {import('../../data/constants.js').OrderStatus} status

 * @property {CreateOrderLineInput[]} [lines]

 * @property {string} [phone]

 * @property {string} [salesPerson]

 * @property {string} [dueDate]

 * @property {string} [shipmentDate]

 * @property {string} [notes]

 * @property {number} [cost]

 * @property {string} [phone2] İstemci — mock tam persist; API wire dışı

 * @property {string} [nationalId] İstemci — mock tam persist; API wire dışı

 * @property {string} [taxNumber] İstemci — mock tam persist; API wire dışı

 * @property {string} [taxOffice] İstemci — mock tam persist; API wire dışı

 * @property {import('./enums.js').PaymentMethod} [paymentMethod]

 * @property {string} [paymentNote]

 * @property {string} [mailOrderCustomerId]

 * @property {string} [mailOrderSupplierId]

 * @property {number} [mailOrderCommissionRate]

 * @property {number} [mailOrderAmount] Kısmi mail order tahsilat (boşsa paidAmount = genel toplam)

 */



export {}


