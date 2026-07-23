import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'public/**',
      'tmp-pg/**',
      'next-env.d.ts',
      // Generated artifacts
      'src/lib/supabase/database.types.ts',
      'scripts/**/*-compiled*.mjs',
      // Untracked root scratch files slated for deletion (see docs/IMPROVEMENT_PLAN.md D-8)
      'test_*.mjs',
      'test_supabase.js',
      'get_errors.js',
      'get_errs.py',
      'get_failures_fetch.mjs',
      'get_latest_failures.js',
    ],
  },
  ...nextCoreWebVitals,
  {
    // GoTrueClient self-deadlock guard (2026-07-23, docs/LEARNINGS.md §2):
    // auth-js AWAITS onAuthStateChange callbacks while holding its exclusive
    // navigator lock. An async callback that awaits any supabase call needs
    // that same lock for its access token — the client deadlocks itself
    // forever (spinners hang, logout dies). Callbacks must be synchronous;
    // run follow-up queries in a separate effect keyed on the user id.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='onAuthStateChange'] > ArrowFunctionExpression[async=true]",
          message:
            'onAuthStateChange callbacks must be synchronous — an async callback awaiting a supabase call deadlocks the auth client (docs/LEARNINGS.md §2, 2026-07-23). Set state from the session argument only; query in a separate effect.',
        },
        {
          selector:
            "CallExpression[callee.property.name='onAuthStateChange'] > FunctionExpression[async=true]",
          message:
            'onAuthStateChange callbacks must be synchronous — an async callback awaiting a supabase call deadlocks the auth client (docs/LEARNINGS.md §2, 2026-07-23). Set state from the session argument only; query in a separate effect.',
        },
      ],
    },
  },
];
