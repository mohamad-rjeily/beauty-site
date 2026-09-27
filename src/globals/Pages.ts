import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '@/access'
import { accentLine, localizedText, photo, starredHeading } from '@/fields/content'
import { t } from '@/lib/i18n'

/**
 * The words and photos of the Services, Gallery, Shop and Contact pages. Services, gallery items,
 * opening hours, contact details and FAQ come from their own collections and settings; this
 * holds only each page's own titles, intro lines and photos.
 */
export const Pages: GlobalConfig = {
  slug: 'pages',
  label: t('Page texts', 'نصوص الصفحات'),
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
          name: 'services',
          label: t('Services page', 'صفحة الخدمات'),
          fields: [
            accentLine('accent', { en: 'الخدمات والأسعار', ar: 'Services & prices' }),
            starredHeading('title', t('Page title', 'عنوان الصفحة'), {
              en: 'Services *& prices*',
              ar: 'الخدمات *والأسعار*',
            }),
            localizedText('intro', t('Line under the title', 'السطر تحت العنوان'), {
              en: 'Prices in USD. [One line on how to choose, or what every visit includes.]',
              ar: 'الأسعار بالدولار الأميركي. [سطر عن كيفية الاختيار، أو ما تشمله كل زيارة.]',
            }),
            {
              type: 'row',
              fields: [
                localizedText('makeupIntro', t('Makeup: one line', 'المكياج: سطر واحد'), {
                  en: '[One line about your makeup approach.]',
                  ar: '[سطر عن أسلوبكِ في المكياج.]',
                }),
                localizedText(
                  'skincareIntro',
                  t('Skincare: one line', 'العناية بالبشرة: سطر واحد'),
                  {
                    en: '[One line about your skincare approach.]',
                    ar: '[سطر عن أسلوبكِ في العناية بالبشرة.]',
                  },
                ),
              ],
            },
            {
              type: 'row',
              fields: [
                photo(
                  'makeupPhoto',
                  t('Makeup photo', 'صورة المكياج'),
                  t('A makeup detail, vertical.', 'تفصيل من المكياج، عمودية.'),
                ),
                photo(
                  'skincarePhoto',
                  t('Skincare photo', 'صورة العناية بالبشرة'),
                  t('A facial treatment, vertical.', 'جلسة عناية بالوجه، عمودية.'),
                ),
              ],
            },
            starredHeading(
              'requestHeading',
              t('Title above request services', 'العنوان فوق خدمات الطلب'),
              { en: 'Bridal *& occasions*', ar: 'عرائس *ومناسبات*' },
            ),
            localizedText(
              'requestNote',
              t('Note for request services', 'ملاحظة لخدمات الطلب'),
              {
                en: 'No time slot to pick. Send your date and a few details, and [FIRST_NAME] confirms the time with you personally.',
                ar: 'لا حاجة لاختيار موعد. أرسلي التاريخ وبعض التفاصيل، و[FIRST_NAME] تؤكّد الوقت معكِ شخصياً.',
              },
              'textarea',
              t(
                'Shown above bridal and event services (the ones booked by request).',
                'تظهر فوق خدمات العرائس والمناسبات (التي تُحجز بطلب).',
              ),
            ),
            starredHeading('askLine', t('Line above the WhatsApp button', 'السطر فوق زر واتساب'), {
              en: 'Not sure what you need? *Ask me first.*',
              ar: 'لستِ متأكدة مما تحتاجين؟ *اسأليني أولاً.*',
            }),
          ],
        },
        {
          name: 'gallery',
          label: t('Gallery page', 'صفحة المعرض'),
          fields: [
            accentLine('accent', { en: 'من أعمالي', ar: 'Her work' }),
            starredHeading('title', t('Page title', 'عنوان الصفحة'), {
              en: 'Her *work.*',
              ar: '*أعمالها.*',
            }),
            localizedText('intro', t('Line under the title', 'السطر تحت العنوان'), {
              en: 'Every photo here is a real client. [Optional line about how the photos are taken.]',
              ar: 'كل صورة هنا لعميلة حقيقية. [سطر اختياري عن طريقة التصوير.]',
            }),
            starredHeading('beforeAfterHeading', t('Before & after title', 'عنوان قبل وبعد'), {
              en: 'Before *& after*',
              ar: 'قبل *وبعد*',
            }),
            localizedText(
              'beforeAfterNote',
              t(
                'Note under the before & after title (optional)',
                'ملاحظة تحت عنوان قبل وبعد (اختيارية)',
              ),
              {
                en: 'Drag to compare. Same light, same angle.',
                ar: 'اسحبي للمقارنة. نفس الإضاءة، نفس الزاوية.',
              },
            ),
            starredHeading('ctaHeading', t('Book band title', 'عنوان شريط الحجز'), {
              en: 'Love a *look?*',
              ar: 'أعجبتكِ *إطلالة؟*',
            }),
            localizedText('ctaText', t('Book band text', 'نص شريط الحجز'), {
              en: 'Mention the photo when you book, and we start from there.',
              ar: 'اذكري الصورة عند الحجز، ونبدأ من هناك.',
            }),
          ],
        },
        {
          name: 'shop',
          label: t('Shop page', 'صفحة المتجر'),
          fields: [
            accentLine('accent', { en: 'المتجر', ar: 'Shop' }),
            starredHeading('title', t('Page title', 'عنوان الصفحة'), {
              en: 'The *shop*',
              ar: 'المتجر',
            }),
            localizedText('intro', t('Line under the title', 'السطر تحت العنوان'), {
              en: 'Prices in USD. Order here, then confirm on WhatsApp. Cash on delivery or pickup.',
              ar: 'الأسعار بالدولار الأميركي. اطلبي هنا ثم أكّدي على واتساب. الدفع نقداً عند التوصيل أو الاستلام.',
            }),
          ],
        },
        {
          name: 'contact',
          label: t('Contact page', 'صفحة التواصل'),
          fields: [
            accentLine('accent', { en: 'أهلاً بكِ', ar: 'Welcome' }),
            starredHeading('title', t('Page title', 'عنوان الصفحة'), {
              en: 'Visit *or write.*',
              ar: 'زوري *أو اكتبي.*',
            }),
            photo(
              'mapPhoto',
              t('Map picture', 'صورة الخريطة'),
              t(
                "A screenshot of the studio's street on the map, entrance marked. Tapping it opens the map link from Site settings.",
                'لقطة شاشة لشارع الاستوديو على الخريطة مع تحديد المدخل. الضغط عليها يفتح رابط الخريطة من إعدادات الموقع.',
              ),
            ),
            localizedText(
              'areaLabel',
              t('Area label on the map (optional)', 'اسم المنطقة على الخريطة (اختياري)'),
              {
                en: '[AREA], [CITY]',
                ar: '[المنطقة]، [المدينة]',
              },
            ),
            starredHeading('hoursHeading', t('Hours title', 'عنوان ساعات العمل'), {
              en: 'Opening *hours*',
              ar: 'ساعات *العمل*',
            }),
            localizedText(
              'hoursNote',
              t('Note under the hours title (optional)', 'ملاحظة تحت عنوان ساعات العمل (اختيارية)'),
              {
                en: 'Visits by appointment.',
                ar: 'الزيارات بموعد مسبق.',
              },
            ),
            starredHeading('faqHeading', t('FAQ title', 'عنوان الأسئلة'), {
              en: 'Good *to know*',
              ar: 'من المفيد *أن تعرفي*',
            }),
          ],
        },
      ],
    },
  ],
}
