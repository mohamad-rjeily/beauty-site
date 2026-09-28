import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ar } from '../i18n/dictionaries/ar'
import { en } from '../i18n/dictionaries/en'
import { addressLine, buildOrderMessage, deliveryFee, type SavedOrder } from './orderMessage'

const order = (over: Partial<SavedOrder> = {}): SavedOrder => ({
  number: 'K7Q2MX',
  lines: [
    { name: 'Rose clay mask', quantity: 2, unitCents: 1800, lineCents: 3600 },
    { name: 'Hydrating serum', quantity: 1, unitCents: 3550, lineCents: 3550 },
  ],
  deliveryFeeCents: null,
  totalCents: 7150,
  fulfillment: 'delivery',
  address: {
    area: 'Achrafieh',
    street: 'Sursock street',
    building: 'Rose building',
    floor: '3',
    landmark: 'the pharmacy',
  },
  name: 'Layla',
  phone: '+9613123456',
  notes: '',
  ...over,
})

test('deliveryFee: no line for pickup, the amount when set, WhatsApp otherwise', () => {
  assert.deepEqual(deliveryFee('pickup', 300), { kind: 'none' })
  assert.deepEqual(deliveryFee('pickup', null), { kind: 'none' })
  assert.deepEqual(deliveryFee('delivery', 300), { kind: 'amount', cents: 300 })
  assert.deepEqual(deliveryFee('delivery', 0), { kind: 'amount', cents: 0 })
  assert.deepEqual(deliveryFee('delivery', null), { kind: 'onWhatsApp' })
})

test('addressLine: only the parts she filled in, with the right comma for the language', () => {
  const full = order().address!
  assert.equal(
    addressLine(full, en.checkout.message, false),
    'Achrafieh, Sursock street, Rose building, floor 3, near the pharmacy',
  )
  assert.equal(
    addressLine(
      { area: 'Hamra', street: ' Main road ', building: '', floor: '', landmark: '' },
      en.checkout.message,
      false,
    ),
    'Hamra, Main road',
  )
  assert.equal(
    addressLine({ ...full, building: '', landmark: '' }, ar.checkout.message, true),
    'Achrafieh، Sursock street، الطابق 3',
  )
})

test('message: delivery without a fee says so, and the total reads "+ delivery"', () => {
  const text = buildOrderMessage(order(), en.checkout.message, false)
  assert.equal(
    text,
    [
      'Hello! I just placed an order on the website:',
      '',
      'Order K7Q2MX',
      '• 2 × Rose clay mask: $36',
      '• 1 × Hydrating serum: $35.50',
      'Delivery fee: to confirm',
      'Total: $71.50 + delivery',
      '',
      'Deliver to: Achrafieh, Sursock street, Rose building, floor 3, near the pharmacy',
      'Name: Layla',
      'Phone: +961 3 123 456',
      '',
      'I will pay cash, in US dollars. Could you confirm, please? Thank you!',
    ].join('\n'),
  )
})

test('message: a set fee is its own line and part of the total', () => {
  const text = buildOrderMessage(
    order({ deliveryFeeCents: 300, totalCents: 7450 }),
    en.checkout.message,
    false,
  )
  assert.match(text, /^Delivery: \$3$/m)
  assert.match(text, /^Total: \$74\.50$/m)
  assert.doesNotMatch(text, /to confirm|\+ delivery/)
})

test('message: pickup has no fee line and no address; notes are trimmed, empty ones left out', () => {
  const pickup = order({ fulfillment: 'pickup', address: null, notes: '  After 5 pm please  ' })
  const text = buildOrderMessage(pickup, en.checkout.message, false)
  assert.match(text, /^Pickup from the studio$/m)
  assert.match(text, /^Total: \$71\.50$/m)
  assert.match(text, /^Notes: After 5 pm please$/m)
  assert.doesNotMatch(text, /Deliver to|Delivery/)

  assert.doesNotMatch(buildOrderMessage(order({ notes: '   ' }), en.checkout.message, false), /Notes/)
})

test('message: Arabic uses the Arabic labels, "$" prices and no direction marks', () => {
  const text = buildOrderMessage(order(), ar.checkout.message, true)
  assert.match(text, /^مرحباً! أرسلت للتو طلباً عبر الموقع:$/m)
  assert.match(text, /^الطلب K7Q2MX$/m)
  assert.match(text, /^• 2 × Rose clay mask: \$36$/m)
  assert.match(text, /^رسوم التوصيل: للتأكيد$/m)
  assert.match(text, /^المجموع: \$71\.50 \+ التوصيل$/m)
  assert.match(text, /^التوصيل إلى: Achrafieh، /m)
  assert.doesNotMatch(text, /[‎‏؜⁦-⁩]/)
  assert.doesNotMatch(text, /[٠-٩]/)
})

test('message: the delivery value on screen is short, the WhatsApp text is unchanged', () => {
  assert.equal(en.checkout.deliveryFeeOnWhatsApp, 'Confirmed on WhatsApp')
  assert.equal(ar.checkout.deliveryFeeOnWhatsApp, 'تُؤكَّد على واتساب')
  assert.equal(en.checkout.message.deliveryFeeOnWhatsApp, 'Delivery fee: to confirm')
})
