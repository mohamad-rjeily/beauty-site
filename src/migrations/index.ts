import * as migration_20260925_190515_initial from './20260925_190515_initial'
import * as migration_20260925_190555_booking_constraints from './20260925_190555_booking_constraints'
import * as migration_20260925_195710_home_page_and_featured_products from './20260925_195710_home_page_and_featured_products'

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
]
