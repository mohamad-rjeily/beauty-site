/**
 * Interface labels only (buttons, states, accessibility text). Editorial copy lives in the
 * admin (the `home` global and the collections), never here.
 */
export const en = {
  skipToContent: 'Skip to content',
  switchLanguage: 'عربي',
  switchLanguageLabel: 'اقرئي الموقع بالعربية',
  quickActions: 'Quick actions',

  book: 'Book now',
  bookBadgeRing: 'BOOK YOUR DATE · BOOK NOW · ',
  bookBadgeLabel: 'Book your date',
  shop: 'Shop',
  whatsapp: 'WhatsApp',
  chatOnWhatsApp: 'Chat on WhatsApp',

  whatsappBooking: "Hello! I'd like to book an appointment.",
  whatsappBookingService: "Hello! I'd like to book: {service}.",
  whatsappOrder: "Hello! I'd like to order: {product}.",

  categories: { makeup: 'Makeup', skincare: 'Skincare' },
  fromPrice: 'From {price}',
  bookCategory: 'Book {category}',
  pricesSoon: 'Prices coming soon. Ask on WhatsApp.',
  servicesSoon: 'Services and prices are being added. Ask on WhatsApp in the meantime.',
  allServicesSoon: 'Full list and prices coming soon',

  before: 'Before',
  after: 'After',
  compare: 'Compare before and after',
  resultsSoon: 'Real results from the studio are coming soon.',

  swipe: 'Swipe',
  orderOnWhatsApp: 'Order on WhatsApp',
  outOfStock: 'Out of stock',
  shopSoon: 'The shop opens soon.',

  previousReview: 'Previous review',
  nextReview: 'Next review',
  reviewOf: 'Review {n} of {total}',
  stars: '{n} out of 5 stars',
  reviewsSoon: 'Reviews from clients are coming soon.',
  followInstagram: 'Follow on Instagram',

  directions: 'Get directions',
  byAppointment: 'By appointment',
  address: 'Address',
  hours: 'Opening hours',
  phone: 'Phone',
  instagram: 'Instagram',

  days: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },

  photoSoon: 'Photo coming soon',
  photoHints: {
    hero: 'Portrait of her in soft light',
    intro: 'Her at work with a client',
    makeup: 'A finished makeup look',
    skincare: 'A skincare treatment',
    result: 'Before and after, same light and angle',
    product: 'Product photo',
    studio: 'The studio',
  },

  footerRights: '© {year} {brand}',
  footerLinks: { services: 'Services', shop: 'Shop', visit: 'Visit' },
}

export type Dictionary = typeof en
