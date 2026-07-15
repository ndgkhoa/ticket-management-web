/**
 * Conventional commits, enforced on commit-msg.
 *
 * The `scope-enum` is intentionally omitted: feature scopes are still moving
 * (Phases 03–06 reshape them), and a stale enum would reject valid commits.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'docs',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'style',
      ],
    ],
    // Long subjects are usually two commits wearing a trenchcoat.
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 100],
  },
};
