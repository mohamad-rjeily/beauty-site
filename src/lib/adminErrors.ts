import type { AfterErrorHook } from 'payload'

type ValidationData = { collection?: string; errors?: { path: string; message: string }[] }

/**
 * Admin panel and REST API: when a save is refused for ONE field, the toast shows that
 * field's own message (e.g. "Can't confirm yet. This order needs 2 of ...") instead of Payload's
 * generic "The following field is invalid: status". The field error itself is unchanged.
 *
 * Keep ":" out of such messages: the toast reads "intro: a, b" as a list of field names.
 */
export const fieldMessageAfterError: AfterErrorHook = ({ error }) => {
  const { name, data } = error as { name?: string; data?: ValidationData }
  const errors = data?.errors
  if (name !== 'ValidationError' || errors?.length !== 1) return
  return {
    status: 400,
    response: { errors: [{ name: 'ValidationError', message: errors[0].message, data }] },
  }
}
