import * as migration_20260925_190515_initial from './20260925_190515_initial';
import * as migration_20260925_190555_booking_constraints from './20260925_190555_booking_constraints';
import * as migration_20260925_195710_home_page_and_featured_products from './20260925_195710_home_page_and_featured_products';
import * as migration_20260925_205310_home_accent_lines from './20260925_205310_home_accent_lines';
import * as migration_20260926_142749_pages_about_gallery_style from './20260926_142749_pages_about_gallery_style';
import * as migration_20260926_204058_service_slug from './20260926_204058_service_slug';
import * as migration_20260926_204750_booking_rate_limits from './20260926_204750_booking_rate_limits';
import * as migration_20260927_214509_shop from './20260927_214509_shop';
import * as migration_20260927_214521_shop_drop_address from './20260927_214521_shop_drop_address';
import * as migration_20260927_222744_shop_page_texts from './20260927_222744_shop_page_texts';

export const migrations = [
  {
    up: migration_20260925_190515_initial.up,
    down: migration_20260925_190515_initial.down,
    name: '20260925_190515_initial',
  },
  {
    up: migration_20260925_190555_booking_constraints.up,
    down: migration_20260925_190555_booking_constraints.down,
    name: '20260925_190555_booking_constraints',
  },
  {
    up: migration_20260925_195710_home_page_and_featured_products.up,
    down: migration_20260925_195710_home_page_and_featured_products.down,
    name: '20260925_195710_home_page_and_featured_products',
  },
  {
    up: migration_20260925_205310_home_accent_lines.up,
    down: migration_20260925_205310_home_accent_lines.down,
    name: '20260925_205310_home_accent_lines',
  },
  {
    up: migration_20260926_142749_pages_about_gallery_style.up,
    down: migration_20260926_142749_pages_about_gallery_style.down,
    name: '20260926_142749_pages_about_gallery_style',
  },
  {
    up: migration_20260926_204058_service_slug.up,
    down: migration_20260926_204058_service_slug.down,
    name: '20260926_204058_service_slug',
  },
  {
    up: migration_20260926_204750_booking_rate_limits.up,
    down: migration_20260926_204750_booking_rate_limits.down,
    name: '20260926_204750_booking_rate_limits',
  },
  {
    up: migration_20260927_214509_shop.up,
    down: migration_20260927_214509_shop.down,
    name: '20260927_214509_shop',
  },
  {
    up: migration_20260927_214521_shop_drop_address.up,
    down: migration_20260927_214521_shop_drop_address.down,
    name: '20260927_214521_shop_drop_address',
  },
  {
    up: migration_20260927_222744_shop_page_texts.up,
    down: migration_20260927_222744_shop_page_texts.down,
    name: '20260927_222744_shop_page_texts'
  },
];
