import Link from 'next/link'

import { ArchMark } from '@/components/ui/Icon'

/** Shown for unknown pages under /en or /ar. Bilingual, because it can't know the locale. */
export default function NotFound() {
  return (
    <section className="grain flex min-h-[70dvh] flex-col items-center justify-center gap-5 bg-limestone px-6 py-24 text-center">
      <ArchMark className="text-stone" />
      <h1 className="display m-0 text-[2.5rem]">
        This page doesn’t exist.{' '}
        <span lang="ar" dir="rtl">
          هذه الصفحة غير موجودة.
        </span>
      </h1>
      <p className="m-0 flex gap-6 font-semibold">
        <Link href="/en" className="text-clay">
          Home
        </Link>
        <Link href="/ar" lang="ar" className="text-clay">
          الرئيسية
        </Link>
      </p>
    </section>
  )
}
