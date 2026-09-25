import type { CollectionConfig } from 'payload'

import { authenticated, never } from '@/access'
import { moneyField } from '@/fields/money'
import { phoneField } from '@/fields/phone'
import { priceOrder } from '@/hooks/orders/priceOrder'
import { syncStock } from '@/hooks/orders/syncStock'
import { t } from '@/lib/i18n'

export const ORDER_STATUSES = [
  { label: t('New', 'جديد'), value: 'new' },
  { label: t('Confirmed', 'مؤكد'), value: 'confirmed' },
  { label: t('Delivered', 'تم التسليم'), value: 'delivered' },
  { label: t('Cancelled', 'ملغى'), value: 'cancelled' },
]

export const PAYMENT_METHODS = [
  { label: t('Cash on delivery', 'الدفع عند الاستلام'), value: 'cod' },
  { label: t('Pay in person', 'الدفع شخصياً'), value: 'in_person' },
]

/**
 * Shop orders (no online payment). Customer data is private: admin-only access.
 * The public checkout (phase 5) creates orders from server code.
 * No drafts or versions. Hook order matters: prices are set first, then stock moves.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: t('Order', 'طلب'), plural: t('Orders', 'الطلبات') },
  admin: {
    useAsTitle: 'customerName',
    group: t('Shop', 'المتجر'),
    defaultColumns: ['createdAt', 'customerName', 'area', 'status'],
  },
  defaultSort: '-createdAt',
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeChange: [priceOrder, syncStock],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'customerName',
          type: 'text',
          label: t('Customer name', 'اسم العميلة'),
          required: true,
        },
        phoneField(),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'address',
          type: 'textarea',
          label: t('Delivery address', 'عنوان التوصيل'),
          required: true,
        },
        { name: 'area', type: 'text', label: t('Area / town', 'المنطقة / البلدة'), required: true },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: t('Products', 'المنتجات'),
      labels: { singular: t('Line', 'سطر'), plural: t('Lines', 'أسطر') },
      required: true,
      minRows: 1,
      // Frozen after creation: to change what was ordered, cancel and create a new order.
      access: { update: never },
      admin: {
        description: t(
          'Names and prices are copied from the products when the order is created, and never change afterwards.',
          'تُنسخ الأسماء والأسعار من المنتجات عند إنشاء الطلب، ولا تتغير بعد ذلك.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'product',
              type: 'relationship',
              relationTo: 'products',
              label: t('Product', 'المنتج'),
              required: true,
              admin: { width: '70%' },
            },
            {
              name: 'quantity',
              type: 'number',
              label: t('Quantity', 'الكمية'),
              required: true,
              defaultValue: 1,
              min: 1,
              admin: { step: 1, width: '30%' },
            },
          ],
        },
        {
          name: 'productName',
          type: 'text',
          label: t('Name at order time', 'الاسم وقت الطلب'),
          admin: { readOnly: true },
        },
        moneyField({
          name: 'unitPrice',
          label: t('Unit price at order time', 'سعر الوحدة وقت الطلب'),
          readOnly: true,
        }),
        moneyField({ name: 'lineTotal', label: t('Line total', 'مجموع السطر'), readOnly: true }),
      ],
    },
    {
      ...moneyField({ name: 'total', label: t('Order total', 'مجموع الطلب'), readOnly: true }),
      access: { update: never },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      label: t('Payment', 'طريقة الدفع'),
      required: true,
      defaultValue: 'cod',
      options: PAYMENT_METHODS,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      label: t('Status', 'الحالة'),
      required: true,
      defaultValue: 'new',
      options: ORDER_STATUSES,
      admin: {
        position: 'sidebar',
        description: t(
          'Confirming takes the products out of stock; cancelling a confirmed order puts them back.',
          'التأكيد يخصم المنتجات من المخزون؛ إلغاء طلب مؤكد يعيدها.',
        ),
      },
    },
  ],
}
