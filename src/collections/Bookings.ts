import type { CollectionConfig } from 'payload'

import { authenticated, never } from '@/access'
import { phoneField } from '@/fields/phone'
import { validateBooking } from '@/hooks/bookings/validateBooking'
import { t } from '@/lib/i18n'
import { BUSINESS_TIME_ZONE } from '@/lib/time'

export const BOOKING_STATUSES = [
  { label: t('Pending', 'بانتظار التأكيد'), value: 'pending' },
  { label: t('Confirmed', 'مؤكد'), value: 'confirmed' },
  { label: t('Cancelled', 'ملغى'), value: 'cancelled' },
  { label: t('Completed', 'منجز'), value: 'completed' },
]

const beirutDateTime = {
  pickerAppearance: 'dayAndTime' as const,
  displayFormat: 'EEE d MMM yyyy, HH:mm',
  timeFormat: 'HH:mm',
  timeIntervals: 15,
}

/**
 * Appointment requests. Customer data is private: every operation requires a logged-in
 * admin. The public booking form (phase 4) creates bookings from server code.
 * No drafts or versions: a booking is a single live record.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: t('Booking', 'حجز'), plural: t('Bookings', 'الحجوزات') },
  admin: {
    useAsTitle: 'customerName',
    group: t('Bookings', 'الحجوزات'),
    defaultColumns: ['startTime', 'customerName', 'service', 'status'],
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
      name: 'service',
      type: 'relationship',
      relationTo: 'services',
      label: t('Service', 'الخدمة'),
      required: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startTime',
          type: 'date',
          label: t('Starts', 'يبدأ'),
          required: true,
          index: true,
          timezone: {
            defaultTimezone: BUSINESS_TIME_ZONE,
            supportedTimezones: [{ label: 'Beirut', value: BUSINESS_TIME_ZONE }],
          },
          admin: { date: beirutDateTime, width: '50%' },
        },
        {
          name: 'endTime',
          type: 'date',
          label: t('Ends (from the service duration)', 'ينتهي (حسب مدة الخدمة)'),
          access: { create: never, update: never },
          admin: { date: beirutDateTime, readOnly: true, width: '50%' },
        },
      ],
    },
    {
      // End time plus the break after the appointment. Set by the server only;
      // the database's no-overlap constraint is built on [startTime, occupiedUntil).
      name: 'occupiedUntil',
      type: 'date',
      index: true,
      access: { create: never, update: never },
      admin: { hidden: true },
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
