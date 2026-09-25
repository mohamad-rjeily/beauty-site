'use client'

import { useTranslation } from '@payloadcms/ui'

/** Sidebar note on orders: there is no payment field because payment is always cash, in USD. */
export const CashOnlyNote = () => {
  const { i18n } = useTranslation()
  return (
    <p className="field-description" style={{ marginBottom: 'var(--base)' }}>
      {i18n.language === 'ar'
        ? 'الدفع نقداً دائماً، بالدولار الأميركي.'
        : 'Payment is always cash, in US dollars.'}
    </p>
  )
}
