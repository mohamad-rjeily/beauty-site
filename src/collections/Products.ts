import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { authenticated, never, publishedOrAuthenticated } from '@/access'
import { moneyField } from '@/fields/money'
import { slugField } from '@/fields/slug'
import { applyStockAdjustment } from '@/hooks/products/applyStockAdjustment'
import { msg, t } from '@/lib/i18n'

export const PRODUCT_TYPES = [
  { label: t('Brand product', 'منتج ماركة'), value: 'brand' },
  { label: t('Homemade mask', 'ماسك منزلي الصنع'), value: 'homemade' },
  // Size/colour variants with per-variant stock arrive in phase 7.
  { label: t('Fashion item', 'قطعة أزياء'), value: 'fashion' },
]

const isHomemade = (data: unknown): boolean =>
  (data as { type?: string } | undefined)?.type === 'homemade'

const isEmpty = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

/**
 * Required only for homemade masks. The check runs on the server with the
 * document's real `type`, so it can't be skipped by hiding the field in the admin.
 */
const requiredIfHomemade =
  (en: string, ar: string) =>
  (value: unknown, { data, req }: { data: unknown; req: PayloadRequest }): string | true =>
    isHomemade(data) && isEmpty(value)
      ? msg(req, `${en} is required for homemade masks.`, `${ar} مطلوب للماسكات المنزلية.`)
      : true

const homemadeText = (name: string, en: string, ar: string): Field => ({
  name,
  type: 'textarea',
  label: t(en, ar),
  localized: true,
  validate: requiredIfHomemade(en, ar),
})

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: t('Product', 'منتج'), plural: t('Products', 'المنتجات') },
  admin: {
    useAsTitle: 'name',
    group: t('Shop', 'المتجر'),
    defaultColumns: ['name', 'type', 'category', 'stock', 'active'],
  },
  hooks: {
    beforeChange: [applyStockAdjustment],
  },
  access: {
    read: publishedOrAuthenticated('active'),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', label: t('Name', 'الاسم'), required: true, localized: true },
    slugField('name'),
    {
      name: 'type',
      type: 'select',
      label: t('Product type', 'نوع المنتج'),
      required: true,
      defaultValue: 'brand',
      options: PRODUCT_TYPES,
      admin: { position: 'sidebar' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      label: t('Category', 'الفئة'),
    },
    {
      name: 'brand',
      type: 'text',
      label: t('Brand', 'الماركة'),
      admin: { condition: (data) => data?.type !== 'homemade' },
    },
    { name: 'description', type: 'richText', label: t('Description', 'الوصف'), localized: true },
    moneyField({ name: 'price', label: t('Price', 'السعر') }),
    {
      name: 'stock',
      type: 'number',
      label: t('In stock', 'الكمية المتوفرة'),
      required: true,
      defaultValue: 0,
      min: 0,
      // Never written from a form: only the server changes it (orders and "Adjust stock by").
      access: { create: never, update: never },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: t(
          'Goes down when an order is confirmed and back up if it is cancelled. To change it by hand, use "Adjust stock by".',
          'تنخفض عند تأكيد الطلب وتعود إذا أُلغي. لتغييرها يدوياً استخدمي "تعديل المخزون بمقدار".',
        ),
      },
      validate: (value: number | null | undefined, { req }: { req: PayloadRequest }) =>
        value !== null && value !== undefined && Number.isInteger(value) && value >= 0
          ? true
          : msg(req, 'Enter a whole number, 0 or more.', 'أدخلي عدداً صحيحاً، 0 أو أكثر.'),
    },
    {
      // Not stored: applied to `stock` with one atomic UPDATE on save, then gone.
      name: 'stockAdjustment',
      type: 'number',
      virtual: true,
      label: t('Adjust stock by', 'تعديل المخزون بمقدار'),
      admin: {
        step: 1,
        position: 'sidebar',
        placeholder: '+10 / -2',
        description: t(
          'Received 10 more: enter 10. Found 2 damaged: enter -2. Cleared after saving.',
          'وصلت 10 إضافية: أدخلي 10. وجدتِ 2 تالفة: أدخلي -2. يُمسح بعد الحفظ.',
        ),
      },
      validate: (value: number | null | undefined, { req }: { req: PayloadRequest }) =>
        value === null ||
        value === undefined ||
        Number.isInteger(value) ||
        msg(req, 'Enter a whole number, e.g. 10 or -2.', 'أدخلي عدداً صحيحاً، مثال: 10 أو -2.'),
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: t('Photos', 'الصور'),
    },
    {
      name: 'active',
      type: 'checkbox',
      label: t('Shown in the shop', 'ظاهر في المتجر'),
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'homemade',
      type: 'group',
      label: t('Homemade mask details', 'تفاصيل الماسك المنزلي'),
      admin: {
        condition: (data) => isHomemade(data),
        description: t(
          'All of these are shown on the product page.',
          'تظهر كل هذه المعلومات في صفحة المنتج.',
        ),
      },
      fields: [
        homemadeText('ingredients', 'Ingredients', 'المكونات'),
        {
          type: 'row',
          fields: [
            {
              name: 'madeOn',
              type: 'date',
              label: t('Made on', 'تاريخ التحضير'),
              admin: {
                date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
                width: '50%',
              },
              validate: requiredIfHomemade('Made-on date', 'تاريخ التحضير'),
            },
            {
              name: 'expiresOn',
              type: 'date',
              label: t('Expires on', 'تاريخ انتهاء الصلاحية'),
              admin: {
                date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
                width: '50%',
              },
              validate: (
                value: Date | string | null | undefined,
                {
                  data,
                  siblingData,
                  req,
                }: { data: unknown; siblingData: unknown; req: PayloadRequest },
              ) => {
                const required = requiredIfHomemade('Expiry date', 'تاريخ انتهاء الصلاحية')(value, {
                  data,
                  req,
                })
                if (required !== true) return required
                const madeOn = (siblingData as { madeOn?: string | null }).madeOn
                if (isHomemade(data) && value && madeOn && new Date(value) <= new Date(madeOn)) {
                  return msg(
                    req,
                    'The expiry date must be after the made-on date.',
                    'يجب أن يكون تاريخ الانتهاء بعد تاريخ التحضير.',
                  )
                }
                return true
              },
            },
          ],
        },
        homemadeText('storageInstructions', 'Storage instructions', 'طريقة الحفظ'),
        homemadeText('usageInstructions', 'How to use', 'طريقة الاستعمال'),
        homemadeText('patchTestNote', 'Patch-test note', 'ملاحظة اختبار الحساسية'),
      ],
    },
  ],
}
