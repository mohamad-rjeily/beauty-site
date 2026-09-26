/**
 * Interface labels only (buttons, states, accessibility text). Editorial copy lives in the
 * admin (the `home` global and the collections), never here.
 */
export const en = {
  skipToContent: 'Skip to content',
  switchLanguage: 'عربي',
  switchLanguageLabel: 'اقرئي الموقع بالعربية',
  quickActions: 'Quick actions',
  menu: 'Menu',

  book: 'Book now',
  bookBadgeRing: 'BOOK YOUR DATE · BOOK NOW · ',
  bookBadgeLabel: 'Book your date',
  shop: 'Shop',
  whatsapp: 'WhatsApp',
  chatOnWhatsApp: 'Chat on WhatsApp',

  whatsappBooking: "Hello! I'd like to book an appointment.",
  whatsappBookingService: "Hello! I'd like to book: {service}.",
  whatsappOrder: "Hello! I'd like to order: {product}.",
  whatsappRequest: "Hello! I'd like to send a request for: {service}. My date: ",

  categories: { makeup: 'Makeup', skincare: 'Skincare' },
  fromPrice: 'From {price}',
  bookCategory: 'Book {category}',
  pricesSoon: 'Prices coming soon. Ask on WhatsApp.',
  pricesSoonNoContact: 'Prices coming soon.',
  servicesSoon: 'Services and prices are being added. Ask on WhatsApp in the meantime.',
  servicesSoonNoContact: 'Services and prices are being added.',
  allServicesSoon: 'Full list and prices coming soon',

  before: 'Before',
  after: 'After',
  compare: 'Compare before and after',
  resultsSoon: 'Real results from the studio are coming soon.',
  resultsEmptyHeading: 'Before & after',

  swipe: 'Swipe',
  orderOnWhatsApp: 'Order on WhatsApp',
  outOfStock: 'Out of stock',
  shopSoon: 'The shop opens soon.',
  previousProduct: 'Previous product',
  nextProduct: 'Next product',
  productOf: 'Product {n} of {total}',

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
    studio: ['The entrance', 'The treatment room', 'A detail of the studio'],
  },

  footerRights: '© {year} {brand}',
  nav: {
    services: 'Services',
    gallery: 'Gallery',
    about: 'About',
    contact: 'Contact',
    shop: 'Shop',
  },
  mainNav: 'Main',

  // Services page
  sendRequest: 'Send a request',
  byRequest: 'By request',
  duration: 'Duration',
  minutes: '{m} min',
  hoursOnly: '{h} h',
  hoursMinutes: '{h} h {m} min',
  jumpTo: 'Jump to a category',
  askOnWhatsApp: 'Ask on WhatsApp',
  categoryEmpty: 'Services in this category are being added.',

  // Gallery page
  all: 'All',
  filterByStyle: 'Filter by style',
  choosePair: 'Choose a pair',
  styles: { bridal: 'Bridal', soiree: 'Soirée', everyday: 'Everyday', skin: 'Skin' },
  galleryEmpty: 'Photos of her work are coming soon.',
  photos: 'Photos',

  // About page
  seeServices: 'See services and prices',
  certifications: 'Certifications',

  // Contact page
  today: 'Today',
  closed: 'Closed',
  openMap: 'Open the map',
  anotherQuestion: 'Another question?',
  weekdays: {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
  },

  pageHints: {
    portrait: 'Her, waist up, in the studio window light',
    hands: 'Her hands at work',
    story: ['Her studio, the chair and window', 'Her tools, or a training moment'],
    map: "A map of the studio's street, entrance marked",
    gallery: 'A photo of her work',
  },
}

export type Dictionary = typeof en
