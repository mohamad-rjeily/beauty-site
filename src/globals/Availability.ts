import type { GlobalConfig, PayloadRequest } from 'payload'

import { anyone, authenticated, authenticatedField } from '@/access'
import { msg, t } from '@/lib/i18n'
import { BUSINESS_TIME_ZONE, minutesOfDay, TIME_OF_DAY } from '@/lib/time'

export const WEEKDAY_OPTIONS = [
  { label: t('Monday', 'الإثنين'), value: 'mon' },
  { label: t('Tuesday', 'الثلاثاء'), value: 'tue' },
  { label: t('Wednesday', 'الأربعاء'), value: 'wed' },
  { label: t('Thursday', 'الخميس'), value: 'thu' },
  { label: t('Friday', 'الجمعة'), value: 'fri' },
  { label: t('Saturday', 'السبت'), value: 'sat' },
  { label: t('Sunday', 'الأحد'), value: 'sun' },
]

const beirutDate = {
  pickerAppearance: 'dayOnly' as const,
  displayFormat: 'd MMM yyyy',
}

const beirutOnly = {
  defaultTimezone: BUSINESS_TIME_ZONE,
  supportedTimezones: [{ label: 'Beirut', value: BUSINESS_TIME_ZONE }],
}

/**
 * Working hours are Beirut wall-clock times ("10:00"), not UTC: opening hours follow
 * the local clock, and UTC values would shift by an hour at every daylight-saving change.
 * Bookings themselves are stored in UTC and checked against these hours in Beirut time.
 */
export const Availability: GlobalConfig = {
  slug: 'availability',
  label: t('Availability', 'أوقات العمل'),
  admin: { group: t('Settings', 'الإعدادات') },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'weeklyHours',
      type: 'array',
      label: t('Weekly working hours', 'ساعات العمل الأسبوعية'),
      labels: { singular: t('Time range', 'فترة'), plural: t('Time ranges', 'فترات') },
      admin: {
        description: t(
          'Beirut time. Add two ranges for the same day to take a break (e.g. 10:00–14:00 and 16:00–20:00). Days with no range are closed.',
          'بتوقيت بيروت. أضيفي فترتين لليوم نفسه لأخذ استراحة (مثال: 10:00–14:00 و16:00–20:00). الأيام بدون فترة تعتبر مغلقة.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'day',
              type: 'select',
              label: t('Day', 'اليوم'),
              required: true,
              options: WEEKDAY_OPTIONS,
              admin: { width: '40%' },
            },
            {
              name: 'opens',
              type: 'text',
              label: t('Opens (HH:mm)', 'يفتح (س:د)'),
              required: true,
              admin: { placeholder: '10:00', width: '30%' },
              validate: (value: string | null | undefined, { req }: { req: PayloadRequest }) =>
                (value && TIME_OF_DAY.test(value)) ||
                msg(req, 'Use 24-hour HH:mm, e.g. 09:30.', 'استخدمي صيغة 24 ساعة، مثال: 09:30.'),
            },
            {
              name: 'closes',
              type: 'text',
              label: t('Closes (HH:mm)', 'يغلق (س:د)'),
              required: true,
              admin: { placeholder: '18:00', width: '30%' },
              validate: (
                value: string | null | undefined,
                { siblingData, req }: { siblingData: unknown; req: PayloadRequest },
              ) => {
                if (!value || !TIME_OF_DAY.test(value)) {
                  return msg(
                    req,
                    'Use 24-hour HH:mm, e.g. 18:00.',
                    'استخدمي صيغة 24 ساعة، مثال: 18:00.',
                  )
                }
                const opens = (siblingData as { opens?: string }).opens
                if (
                  opens &&
                  TIME_OF_DAY.test(opens) &&
                  minutesOfDay(value) <= minutesOfDay(opens)
                ) {
                  return msg(
                    req,
                    'Closing time must be after opening time.',
                    'يجب أن يكون وقت الإغلاق بعد وقت الفتح.',
                  )
                }
                return true
              },
            },
          ],
        },
      ],
    },
    {
      name: 'blockedDates',
      type: 'array',
      label: t('Closed dates and holidays', 'أيام الإغلاق والعطل'),
      labels: {
        singular: t('Closed period', 'فترة إغلاق'),
        plural: t('Closed periods', 'فترات الإغلاق'),
      },
      admin: {
        description: t(
          'No booking may touch these days. Leave "To" empty for a single day.',
          'لا يمكن الحجز في هذه الأيام. اتركي "إلى" فارغاً ليوم واحد.',
        ),
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'from',
              type: 'date',
              label: t('From', 'من'),
              required: true,
              timezone: beirutOnly,
              admin: { date: beirutDate, width: '50%' },
            },
            {
              name: 'to',
              type: 'date',
              label: t('To (optional)', 'إلى (اختياري)'),
              timezone: beirutOnly,
              admin: { date: beirutDate, width: '50%' },
              validate: (
                value: Date | string | null | undefined,
                { siblingData, req }: { siblingData: unknown; req: PayloadRequest },
              ) => {
                const from = (siblingData as { from?: string | null }).from
                if (value && from && new Date(value) < new Date(from)) {
                  return msg(
                    req,
                    '"To" must be on or after "From".',
                    'يجب أن يكون "إلى" في نفس يوم "من" أو بعده.',
                  )
                }
                return true
              },
            },
          ],
        },
        {
          name: 'note',
          type: 'text',
          label: t('Private note', 'ملاحظة خاصة'),
          // Visible to admins only, never in the public API.
          access: { read: authenticatedField },
          admin: { placeholder: 'Eid, travel, wedding season...' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'slotIntervalMinutes',
          type: 'number',
          label: t('Start times every (minutes)', 'أوقات البدء كل (دقيقة)'),
          required: true,
          defaultValue: 30,
          min: 5,
          max: 240,
          admin: {
            step: 5,
            width: '50%',
            description: t(
              '30 = customers can start at 10:00, 10:30, 11:00...',
              '30 = يمكن البدء عند 10:00، 10:30، 11:00...',
            ),
          },
        },
        {
          name: 'bufferMinutes',
          type: 'number',
          label: t('Break between appointments (minutes)', 'استراحة بين المواعيد (دقيقة)'),
          required: true,
          defaultValue: 0,
          min: 0,
          max: 240,
          admin: {
            step: 5,
            width: '50%',
            description: t('Kept free after every appointment.', 'وقت يبقى فارغاً بعد كل موعد.'),
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'minNoticeHours',
          type: 'number',
          label: t('Minimum notice (hours)', 'أقل مدة قبل الموعد (ساعات)'),
          required: true,
          defaultValue: 24,
          min: 0,
          admin: {
            step: 1,
            width: '50%',
            description: t(
              'How long before the start a booking must be made.',
              'كم ساعة قبل الموعد يجب أن يتم الحجز.',
            ),
          },
        },
        {
          name: 'maxDaysAhead',
          type: 'number',
          label: t('Bookable days ahead', 'عدد الأيام المتاحة للحجز مسبقاً'),
          required: true,
          defaultValue: 60,
          min: 1,
          admin: {
            step: 1,
            width: '50%',
            description: t(
              'How far into the future customers can book.',
              'إلى أي مدى في المستقبل يمكن الحجز.',
            ),
          },
        },
      ],
    },
  ],
}
