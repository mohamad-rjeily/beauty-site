/**
 * "Two crafts, one *hand.*" -> [{ text: 'Two crafts, one ', em: false }, { text: 'hand.', em: true }].
 * Headings from the admin mark their italic emphasis with stars.
 */
export const splitEmphasis = (text: string): { text: string; em: boolean }[] =>
  text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.length > 2 && part.startsWith('*') && part.endsWith('*')
        ? { text: part.slice(1, -1), em: true }
        : { text: part, em: false },
    )

/** "[FIRST_NAME]." keeps its brackets in order inside Arabic text when isolated in <bdi>. */
export const hasPlaceholder = (word: string) => /\[[^\]]+\]/.test(word)
