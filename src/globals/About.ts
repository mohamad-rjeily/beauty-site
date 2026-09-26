import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { accentLine, localizedText, photo, starredHeading } from '@/fields/content'
import { t } from '@/lib/i18n'

/**
 * The About page: her portrait, her story in her own words, optional facts and
 * certifications, and her signature. The story starts as clearly marked placeholders; empty
 * optional fields hide their element on the website. Nothing here is a claim until she
 * writes it.
 */
export const About: GlobalConfig = {
  slug: 'about',
  label: t('About page', 'صفحة من أنا'),
  admin: { group: t('Content', 'المحتوى') },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: t('Top of the page', 'أعلى الصفحة'),
          fields: [
            accentLine('accent', { en: 'مرحبا', ar: 'Marhaba' }),
            starredHeading('greeting', t('Greeting (page title)', 'التحية (عنوان الصفحة)'), {
              en: "Hello, I'm *[FIRST_NAME].*",
              ar: 'أهلاً، أنا *[FIRST_NAME].*',
            }),
            photo(
              'portrait',
              t('Your portrait', 'صورتكِ'),
              t(
                'Waist up, in the studio window light, vertical. Keep your face in the upper third.',
                'من الخصر إلى الأعلى، بضوء نافذة الاستوديو، عمودية. اجعلي وجهكِ في الثلث العلوي.',
              ),
            ),
            photo(
              'handsPhoto',
              t('Small round photo (optional)', 'صورة دائرية صغيرة (اختيارية)'),
              t(
                'Your hands at work, shown in a small circle over the portrait.',
                'يداكِ أثناء العمل، تظهر في دائرة صغيرة فوق الصورة.',
              ),
            ),
          ],
        },
        {
          label: t('Your story', 'قصتكِ'),
          fields: [
            localizedText(
              'opening',
              t('Opening (shown larger)', 'الافتتاحية (بخط أكبر)'),
              {
                en: '[Opening: who you are and what you believe about beauty, in two sentences.]',
                ar: '[الافتتاحية: من أنتِ وما رأيكِ في الجمال، في جملتين.]',
              },
              'textarea',
            ),
            localizedText(
              'started',
              t('How you started', 'كيف بدأتِ'),
              {
                en: '[How you started: your training, your first clients, the moment it became your work.]',
                ar: '[كيف بدأتِ: تدريبكِ، أولى عميلاتكِ، واللحظة التي أصبح فيها هذا عملكِ.]',
              },
              'textarea',
            ),
            {
              name: 'storyPhotos',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              maxRows: 2,
              label: t('Two story photos (optional)', 'صورتان للقصة (اختياري)'),
              admin: {
                description: t(
                  'Your studio, your tools, or a training moment. Shown side by side in two arches.',
                  'الاستوديو، أدواتكِ، أو لحظة من التدريب. تظهران جنباً إلى جنب في قوسين.',
                ),
              },
            },
            localizedText(
              'working',
              t('How you work today', 'كيف تعملين اليوم'),
              {
                en: '[How you work today: skin first, then the look. What a client can expect in the chair.]',
                ar: '[كيف تعملين اليوم: البشرة أولاً ثم الإطلالة. ماذا تتوقع العميلة على الكرسي.]',
              },
              'textarea',
            ),
            localizedText(
              'quote',
              t('A line you live by (optional)', 'عبارة تعيشين بها (اختياري)'),
              {
                en: '[A line you live by, in your own words.]',
                ar: '[عبارة تعيشين بها، بكلماتكِ.]',
              },
            ),
            localizedText(
              'closing',
              t('Closing (optional)', 'الخاتمة (اختيارية)'),
              {
                en: '[Closing: why you do this, or who you love working with.]',
                ar: '[الخاتمة: لماذا تقومين بهذا، أو مع من تحبين العمل.]',
              },
              'textarea',
            ),
          ],
        },
        {
          label: t('Facts & signature', 'معلومات وتوقيع'),
          fields: [
            {
              name: 'facts',
              type: 'array',
              label: t('Facts about you (optional)', 'معلومات عنكِ (اختياري)'),
              labels: { singular: t('Fact', 'معلومة'), plural: t('Facts', 'معلومات') },
              maxRows: 3,
              admin: {
                description: t(
                  'Only real facts, e.g. "12 years" / "Experience". Leave empty to hide this row.',
                  'معلومات حقيقية فقط، مثال: "12 سنة" / "خبرة". اتركيها فارغة لإخفاء هذا السطر.',
                ),
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'value',
                      type: 'text',
                      label: t('Value', 'القيمة'),
                      required: true,
                      localized: true,
                    },
                    {
                      name: 'label',
                      type: 'text',
                      label: t('Label', 'الوصف'),
                      required: true,
                      localized: true,
                    },
                  ],
                },
              ],
            },
            {
              name: 'certifications',
              type: 'array',
              label: t('Certifications (optional)', 'الشهادات (اختياري)'),
              labels: {
                singular: t('Certification', 'شهادة'),
                plural: t('Certifications', 'شهادات'),
              },
              admin: {
                description: t(
                  'Only certificates you really hold. Leave empty to hide.',
                  'فقط الشهادات التي تحملينها فعلاً. اتركيها فارغة لإخفائها.',
                ),
              },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: t('Certificate', 'الشهادة'),
                  required: true,
                  localized: true,
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'school',
                      type: 'text',
                      label: t('School or academy', 'المدرسة أو الأكاديمية'),
                      localized: true,
                    },
                    { name: 'year', type: 'text', label: t('Year', 'السنة') },
                  ],
                },
              ],
            },
            localizedText('signature', t('Signature (your first name)', 'التوقيع (اسمكِ الأول)'), {
              en: '[First name]',
              ar: '[الاسم الأول]',
            }),
          ],
        },
        {
          label: t('Book section', 'قسم الحجز'),
          fields: [
            starredHeading('ctaHeading', t('Title', 'العنوان'), {
              en: 'Come sit in *my chair.*',
              ar: 'تعالي واجلسي *على كرسيّي.*',
            }),
            localizedText('ctaText', t('Text', 'النص'), {
              en: 'Book a visit, or send a request for your wedding or event date.',
              ar: 'احجزي زيارة، أو أرسلي طلباً لتاريخ زفافكِ أو مناسبتكِ.',
            }),
          ],
        },
      ],
    },
  ],
}
