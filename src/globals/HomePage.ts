import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { localizedText, photo, STARS_HINT } from '@/fields/content'
import { t } from '@/lib/i18n'

/**
 * Every editable text and photo on the home page. Services, results, products, reviews and
 * contact details come from their own collections; this holds only the page's own words.
 * Empty optional fields hide their element on the website. Nothing here is a factual claim
 * until the owner writes it.
 */
export const HomePage: GlobalConfig = {
  slug: 'home',
  label: t('Home page', 'الصفحة الرئيسية'),
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
            photo(
              'heroPhoto',
              t('Main photo', 'الصورة الرئيسية'),
              t(
                'A portrait of you in soft light, vertical. Keep your face in the upper half: the headline sits over the lower part.',
                'صورة لكِ بإضاءة ناعمة، عمودية. اجعلي وجهكِ في النصف العلوي: العنوان يظهر فوق الجزء السفلي.',
              ),
            ),
            {
              type: 'row',
              fields: [
                localizedText('headlineLine1', t('Headline, line 1', 'العنوان، السطر 1'), {
                  en: 'Beauty',
                  ar: 'جمالٌ',
                }),
                localizedText('headlineLine2', t('Headline, line 2', 'العنوان، السطر 2'), {
                  en: 'rooted',
                  ar: 'متجذّرٌ',
                }),
                localizedText(
                  'headlineLine3',
                  t('Headline, line 3 (accent)', 'العنوان، السطر 3 (ملوّن)'),
                  {
                    en: 'in care.',
                    ar: 'في العناية.',
                  },
                ),
              ],
            },
            localizedText('tagline', t('Line under the headline', 'السطر تحت العنوان'), {
              en: 'Makeup & skin studio · Lebanon',
              ar: 'استوديو مكياج وعناية بالبشرة · لبنان',
            }),
            localizedText(
              'accentLine',
              t(
                'Accent line in the other language (optional)',
                'سطر مميّز باللغة الأخرى (اختياري)',
              ),
              { en: 'جمالكِ، بعناية', ar: 'Beauty, with care' },
              'text',
              t(
                'Shown small in sage next to the line above, in the other language. Leave empty to hide.',
                'يظهر صغيراً بلون المريمية بجانب السطر أعلاه، باللغة الأخرى. اتركيه فارغاً لإخفائه.',
              ),
            ),
          ],
        },
        {
          label: t('About you', 'عنكِ'),
          fields: [
            photo(
              'introPhoto',
              t('Photo of you at work', 'صورة لكِ أثناء العمل'),
              t(
                'Candid, while working with a client. Vertical.',
                'صورة عفوية أثناء العمل مع عميلة. عمودية.',
              ),
            ),
            localizedText(
              'introAccent',
              t(
                'Greeting word in the other language (optional)',
                'كلمة ترحيب باللغة الأخرى (اختياري)',
              ),
              { en: 'مرحبا', ar: 'Marhaba' },
            ),
            localizedText('introGreeting', t('Greeting', 'التحية'), {
              en: "Hello, I'm [FIRST_NAME].",
              ar: 'أهلاً، أنا [FIRST_NAME].',
            }),
            localizedText(
              'introText',
              t('A few words about you', 'كلمات قليلة عنكِ'),
              {
                en: 'I treat the skin first, then build a look that still feels like you: on your wedding day, at a soirée, or on an ordinary Tuesday.',
                ar: 'أعتني بالبشرة أولاً، ثم أبني إطلالة تشبهكِ: في يوم زفافكِ، في سهرة، أو في يوم عادي.',
              },
              'textarea',
            ),
            localizedText('signature', t('Signature (your first name)', 'التوقيع (اسمكِ الأول)'), {
              en: '[First name]',
              ar: '[الاسم الأول]',
            }),
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
          ],
        },
        {
          label: t('Section titles', 'عناوين الأقسام'),
          fields: [
            localizedText(
              'servicesHeading',
              t('Services title', 'عنوان الخدمات'),
              {
                en: 'Two crafts, one *hand.*',
                ar: 'حِرفتان، ويدٌ *واحدة.*',
              },
              'text',
              STARS_HINT,
            ),
            localizedText(
              'resultsHeading',
              t('Before & after title', 'عنوان قبل وبعد'),
              {
                en: 'Drag to see the *difference*',
                ar: 'اسحبي لتري *الفرق*',
              },
              'text',
              STARS_HINT,
            ),
            {
              name: 'resultsNote',
              type: 'text',
              label: t(
                'Note under the before & after title (optional)',
                'ملاحظة تحت عنوان قبل وبعد (اختياري)',
              ),
              localized: true,
              admin: {
                description: t(
                  'Only if true, e.g. "Same light, same angle, no filters."',
                  'فقط إذا كانت صحيحة، مثال: "نفس الإضاءة، نفس الزاوية، بدون فلاتر."',
                ),
              },
            },
            localizedText(
              'shopHeading',
              t('Shop title', 'عنوان المتجر'),
              {
                en: 'Her *shelf*',
                ar: 'من *رفّها*',
              },
              'text',
              STARS_HINT,
            ),
            localizedText(
              'reviewsHeading',
              t('Reviews title', 'عنوان الآراء'),
              {
                en: 'In *their* words',
                ar: '*بكلماتهنّ*',
              },
              'text',
              STARS_HINT,
            ),
            localizedText(
              'visitHeading',
              t('Visit title', 'عنوان الزيارة'),
              {
                en: 'Come *by* the studio',
                ar: 'زوري *الاستوديو*',
              },
              'text',
              STARS_HINT,
            ),
            localizedText(
              'footerSignoff',
              t('Footer sign-off before your signature', 'عبارة الختام قبل توقيعكِ'),
              {
                en: 'with love,',
                ar: 'مع حبّي،',
              },
            ),
          ],
        },
        {
          label: t('Studio photos', 'صور الاستوديو'),
          fields: [
            {
              name: 'studioPhotos',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              maxRows: 3,
              label: t('Studio photos (up to 3)', 'صور الاستوديو (حتى 3)'),
              admin: {
                description: t(
                  'Entrance, treatment room, and a detail. Shown in the three arches of the Visit section.',
                  'المدخل، غرفة العلاج، وتفصيل. تظهر في الأقواس الثلاثة في قسم الزيارة.',
                ),
              },
            },
          ],
        },
      ],
    },
  ],
}
