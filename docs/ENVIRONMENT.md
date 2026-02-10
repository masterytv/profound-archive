# Environment Variables

> This document lists all environment variables required to run the project.

## Required Variables

### Supabase (Client & Server)
| Variable | Description | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/Anon API Key | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Service Role Key (Admin Access) | ✅ Yes (for API routes) |

### OpenAI (AI Features)
| Variable | Description | Required? |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API Key (needs GPT-4/5 access) | ✅ Yes |

## Optional / Legacy Variables
| Variable | Description | Required? |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | For Genkit/Gemini integration | ❌ Optional |

## Development Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the values from your Supabase Dashboard and OpenAI Platform.
3. Restart the dev server (`npm run dev`) to apply changes.
