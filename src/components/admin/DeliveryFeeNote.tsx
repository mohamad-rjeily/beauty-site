'use client'

import { useTranslation } from '@payloadcms/ui'

/** Under the delivery fee: what an empty fee means for customers. */
export const DeliveryFeeNote = () => {
  const { i18n } = useTranslation()
  return (
    <p className="field-description" style={{ marginBottom: 'var(--base)' }}>
      {i18n.language === 'ar'
        ? 'اتركيها فارغة إذا كانت تختلف حسب المنطقة: تقرأ العميلة "رسوم التوصيل تُؤكَّد على واتساب".'
        : 'Leave it empty if it depends on the area: customers then read "Delivery fee confirmed on WhatsApp".'}
    </p>
  )
}
