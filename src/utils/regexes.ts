/**
 * Shared validation patterns.
 *
 * Kept deliberately small: anything a Zod schema can express belongs in that
 * schema, not here. Once form validation moves to Zod, `z.email()` and friends
 * replace hand-rolled patterns entirely — a self-written email regex is strictly
 * worse than the library's.
 */
export const Regexes = {
  username: /^[a-zA-Z0-9._-]{3,20}$/,

  /**
   * Vietnamese mobile number: optional +84/84 or a leading 0, then a 3/5/7/8/9
   * prefix and 8 digits.
   *
   * Anchored on purpose — without `^...$` the pattern matches anywhere in the
   * string, so `abc0912345678` validated as a phone number. The prefix is
   * `[35789]`, not `[3|5|7|8|9]`: inside a character class `|` is a literal pipe,
   * which is why `0|12345678` used to pass.
   *
   * No `g` flag either — a global regex carries `lastIndex` between calls, so
   * `.test()` alternates true/false on the same input. antd's validator happens to
   * reset it, but any direct `.test()` call would hit the bug.
   */
  phone: /^(?:\+?84|0)[35789]\d{8}$/,
};
