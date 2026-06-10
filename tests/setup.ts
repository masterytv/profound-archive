// Global test environment. Every value is a dummy — characterization tests mock
// all I/O at the module boundary and must never reach a real Supabase project,
// OpenAI, or any other external service.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dummy-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'dummy-service-key';
process.env.OPENAI_API_KEY = 'sk-dummy-test-key';
process.env.CRON_SECRET = 'test-cron-secret';
delete process.env.IS_DEBUG_MODE;
