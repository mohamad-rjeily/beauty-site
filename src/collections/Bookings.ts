import type { CollectionConfig, FieldAccess, PayloadRequest } from 'payload'

import { authenticated, never } from '@/access'
import { isAdminRequest } from '@/access/isAdminRequest'
import { phoneField } from '@/fields/phone'
import { validateBooking } from '@/hooks/bookings/validateBooking'
import { bookingOverlapAfterError } from '@/lib/bookingErrors'
import { msg, t } from '@/lib/i18n'
import { BUSINESS_TIME_ZONE, businessDateKey, businessDateKeyFromToday } from '@/lib/time'

import { BOOKING_MODES } from './Services'

export const BOOKING_STATUSES = [
  { label: t('Pending', 'بانتظار التأكيد'), value: 'pending' },
  { label: t('Confirmed', 'مؤكد'), value: 'confirmed' },
  { label: t('Cancelled', 'ملغى'), value: 'cancelled' },
  { label: t('Completed', 'منجز'), value: 'completed' },
]

export const LOCATION_TYPES = [
  { label: t('At the studio', 'في الاستوديو'), value: 'studio' },
  { label: t('On location', 'في مكان العميلة'), value: 'onLocation' },
]

const beirutDateTime = {
  pickerAppearance: 'dayAndTime' as const,
  displayFormat: 'EEE d MMM yyyy, HH:mm',
  timeFormat: 'HH:mm',
  timeIntervals: 15,
}

const beirutOnly = {
  defaultTimezone: BUSINESS_TIME_ZONE,
  supportedTimezones: [{ label: 'Beirut', value: BUSINESS_TIME_ZONE }],
}

type BookingData = { mode?: string; locationType?: string } | undefined

const isRequest = (data: unknown): boolean => (data as BookingData)?.mode === 'request'

/** Request fields show on request bookings, and while creating one in the admin (mode is set on save). */
const showRequestFields = (data: Partial<{ id: unknown; mode: string }>): boolean =>
  data?.mode === 'request' || !data?.id

const required = (req: PayloadRequest) => msg(req, 'This field is required.', 'هذا الحقل مطلوب.')

/** Only request bookings let the owner type the end time; slot bookings get it from the service. */
const endTimeEditable: FieldAccess = ({ doc, req }) => Boolean(req.user) && isRequest(doc)

/**
 * Appointments. Two modes, copied from the service when the booking is created:
 * - slot: the customer picks an exact time; the end comes from the service duration.
 * - request (bridal, events): the customer sends a date and details, with no time. The owner
 *   enters start and end herself when she confirms; from then on it blocks the calendar.
 *
 * Customer data is private: every operation requires a logged-in admin. The public booking
 * form (phase 4) creates bookings from server code. No drafts or versions.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: t('Booking', 'حجز'), plural: t('Bookings', 'الحجوزات') },
  admin: {
    useAsTitle: 'customerName',
    group: t('Bookings', 'الحجوزات'),
    defaultColumns: ['startTime', 'requestedDate', 'customerName', 'service', 'mode', 'status'],
  },
  defaultSort: '-startTime',
  access: {
    create: authenticated,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeChange: [validateBooking],
    afterError: [bookingOverlapAfterError],
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
          name: 'service',
          type: 'relationship',
          relationTo: 'services',
          label: t('Service', 'الخدمة'),
          required: true,
          admin: { width: '70%' },
        },
        {
          // Copied from the service on creation and never changed afterwards.
          name: 'mode',
          type: 'select',
          label: t('Booking type', 'نوع الحجز'),
          required: true,
          defaultValue: 'slot',
          options: BOOKING_MODES,
          access: { create: never, update: never },
          admin: { readOnly: true, width: '30%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startTime',
          type: 'date',
          label: t('Starts', 'يبدأ'),
          index: true,
          timezone: beirutOnly,
          admin: {
            date: beirutDateTime,
            width: '50%',
            description: t('Requests: enter it when you confirm.', 'للطلبات: أدخليه عند التأكيد.'),
          },
        },
        {
          name: 'endTime',
          type: 'date',
          label: t('Ends', 'ينتهي'),
          timezone: beirutOnly,
          access: { create: never, update: endTimeEditable },
          admin: {
            date: beirutDateTime,
            width: '50%',
            description: t(
              'Time slots: calculated from the service. Requests: enter it yourself.',
              'المواعيد المحددة: تُحسب من مدة الخدمة. الطلبات: أدخليه بنفسك.',
            ),
          },
        },
      ],
    },
    {
      // End time plus the break after the appointment. Set by the server only; the
      // database's no-overlap constraint is built on [startTime, occupiedUntil).
      name: 'occupiedUntil',
      type: 'date',
      index: true,
      access: { create: never, update: never },
      admin: { hidden: true },
    },
    {
      type: 'collapsible',
      label: t('Request details (bridal, events)', 'تفاصيل الطلب (عرائس، مناسبات)'),
      admin: { condition: showRequestFields },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'requestedDate',
              type: 'date',
              label: t('Requested date', 'التاريخ المطلوب'),
              timezone: beirutOnly,
              admin: {
                date: { pickerAppearance: 'dayOnly', displayFormat: 'EEE d MMM yyyy' },
                width: '50%',
              },
              validate: (
                value: Date | string | null | undefined,
                { data, req }: { data: unknown; req: PayloadRequest },
              ) => {
                if (!isRequest(data)) return true
                if (!value) return required(req)
                // The public form can't ask for a past date; the owner may record anything.
                if (!isAdminRequest(req) && businessDateKey(value) < businessDateKeyFromToday(0)) {
                  return msg(
                    req,
                    'Choose today or a later date.',
                    'اختاري اليوم أو تاريخاً لاحقاً.',
                  )
                }
                return true
              },
            },
            {
              name: 'peopleCount',
              type: 'number',
              label: t('Number of people', 'عدد الأشخاص'),
              min: 1,
              admin: { step: 1, width: '50%' },
              validate: (
                value: number | null | undefined,
                { data, req }: { data: unknown; req: PayloadRequest },
              ) => {
                if (!isRequest(data)) return true
                if (value === null || value === undefined) return required(req)
                return (
                  (Number.isInteger(value) && value >= 1) ||
                  msg(req, 'Enter a whole number, 1 or more.', 'أدخلي عدداً صحيحاً، 1 أو أكثر.')
                )
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'locationType',
              type: 'select',
              label: t('Where', 'المكان'),
              options: LOCATION_TYPES,
              admin: { width: '50%' },
              validate: (
                value: string | null | undefined,
                { data, req }: { data: unknown; req: PayloadRequest },
              ) => !isRequest(data) || Boolean(value) || required(req),
            },
            {
              name: 'wantsTrial',
              type: 'checkbox',
              label: t('Wants a trial session', 'تريد جلسة تجربة'),
              defaultValue: false,
              admin: { width: '50%' },
            },
          ],
        },
        {
          name: 'locationAddress',
          type: 'textarea',
          label: t('On-location address', 'عنوان المكان'),
          admin: {
            condition: (data) => (data as BookingData)?.locationType === 'onLocation',
          },
          validate: (
            value: string | null | undefined,
            { data, req }: { data: unknown; req: PayloadRequest },
          ) =>
            !isRequest(data) ||
            (data as BookingData)?.locationType !== 'onLocation' ||
            Boolean(value?.trim()) ||
            required(req),
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: t('Status', 'الحالة'),
      required: true,
      defaultValue: 'pending',
      options: BOOKING_STATUSES,
      admin: { position: 'sidebar' },
    },
    { name: 'notes', type: 'textarea', label: t('Notes', 'ملاحظات') },
  ],
}
