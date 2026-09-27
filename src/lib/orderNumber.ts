/**
 * Order numbers the owner and the customer can read aloud on WhatsApp: 6 characters from
 * letters and digits that can't be mistaken for each other (no 0/O, 1/I/L). Random, so they
 * can't be guessed and don't reveal how many orders the shop gets. 31^6 ≈ 887 million codes.
 */
export const ORDER_NUMBER_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ORDER_NUMBER_LENGTH = 6

export const generateOrderNumber = (): string => {
  const bytes = new Uint8Array(ORDER_NUMBER_LENGTH * 2)
  let code = ''
  while (code.length < ORDER_NUMBER_LENGTH) {
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      // Reject the top of the byte range so every character is equally likely.
      if (byte >= 248) continue
      code += ORDER_NUMBER_ALPHABET[byte % ORDER_NUMBER_ALPHABET.length]
      if (code.length === ORDER_NUMBER_LENGTH) break
    }
  }
  return code
}

export const isOrderNumber = (value: string): boolean =>
  new RegExp(`^[${ORDER_NUMBER_ALPHABET}]{${ORDER_NUMBER_LENGTH}}$`).test(value)
