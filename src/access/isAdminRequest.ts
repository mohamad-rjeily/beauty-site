import type { PayloadRequest } from 'payload'

/**
 * True only when the request comes from a logged-in admin (a document in `users`).
 *
 * Several business rules relax for admins: the owner decides when she works, so she may
 * book a 5 am bridal appointment or a date the website would refuse. The decision is made
 * from `req.user` alone, on purpose:
 * - the public booking and checkout code (phases 4 and 5) calls Payload's Local API
 *   WITHOUT a user, so it always gets the full rules;
 * - `overrideAccess: true` does NOT grant the exemption. It only skips access control,
 *   so server code can't become "admin" by accident.
 *
 * Never pass `user` into Local API calls made on behalf of a customer.
 */
export const isAdminRequest = (req: Pick<PayloadRequest, 'user'>): boolean =>
  Boolean(req.user && req.user.collection === 'users')
