import type { ThemeConfig } from 'antd';

/**
 * antd theme overrides.
 *
 * Only the tokens whose stock values fail WCAG 2.1 AA are set here — antd's
 * defaults are tuned for looks, not contrast, and the e2e axe run caught both in a
 * real browser. jsdom cannot evaluate contrast at all, so this whole class of bug is
 * invisible to component tests.
 *
 * Both replacements are antd's own palette one step darker, so the design language
 * is unchanged.
 */
export const theme: ThemeConfig = {
  token: {
    /**
     * antd's default `#1677ff` renders white-on-blue at 4.10:1 — under the 4.5:1 AA
     * needs for normal text, so every default-size primary button failed. It only
     * passed on sign-in because that button is `size="large"`, where the large-text
     * threshold of 3:1 applies instead.
     *
     * blue-7 measures 6.16:1.
     */
    colorPrimary: '#0958d9',

    /** antd's default `#8c8c8c` on white is 3.36:1. gray-8 measures 7.00:1. */
    colorTextDescription: '#595959',
  },
};
