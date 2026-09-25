import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { APIError, type PayloadRequest } from 'payload'

/**
 * Returns the Drizzle handle of the transaction Payload opened for this request.
 *
 * Payload wraps every create/update operation in a transaction and stores its id on
 * `req.transactionID`. Raw SQL that must be atomic with that operation (row locks,
 * conditional stock updates) has to run on this handle, not on `payload.db.drizzle`,
 * otherwise it would run in a separate connection outside the transaction.
 *
 * Throws instead of silently falling back, so a missing transaction can never
 * weaken the booking or stock guarantees.
 */
export const getTransactionDb = async (req: PayloadRequest) => {
  const adapter = req.payload.db as unknown as PostgresAdapter
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID !== undefined ? adapter.sessions?.[transactionID] : undefined

  if (!session) {
    throw new APIError('This operation must run inside a database transaction.', 500)
  }

  return session.db
}

/** Reads the id of a relationship value, whether it arrived populated or as a plain id. */
export const relationId = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') return Number(value)
  if (value && typeof value === 'object' && 'id' in value)
    return relationId((value as { id: unknown }).id)
  return undefined
}
