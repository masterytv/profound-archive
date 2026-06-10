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
];
