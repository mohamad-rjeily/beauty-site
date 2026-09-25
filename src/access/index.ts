import type { Access, FieldAccess } from 'payload'

/** Only logged-in admin users (the owner and the developer). */
export const authenticated: Access = ({ req }) => Boolean(req.user)

export const authenticatedField: FieldAccess = ({ req }) => Boolean(req.user)

export const anyone: Access = () => true

/**
 * Public visitors only see documents switched on in the admin; admins see everything.
 * Returning a query object (instead of true/false) makes Payload filter the results.
 */
export const publishedOrAuthenticated =
  (flag: 'active' | 'published'): Access =>
  ({ req }) =>
    req.user ? true : { [flag]: { equals: true } }

/** Used on fields that the server calculates and nobody may edit afterwards. */
export const never: FieldAccess = () => false
