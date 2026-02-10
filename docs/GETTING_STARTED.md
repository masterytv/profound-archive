# Getting Started

> Welcome to Project Profound! This guide will help you set up the development environment.

## Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm
- A Supabase Project
- An OpenAI API Key

## Installation

1. **Clone the repository**
   ```bash
   git clone [repo-url]
   cd profound-archive
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment**
   - Copy the example environment file:
     ```bash
     cp .env.example .env.local
     ```
   - Edit `.env.local` and add your API keys (see [ENVIRONMENT.md](./ENVIRONMENT.md)).

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup
1. Ensure your Supabase project is set up.
2. Run migrations (if you have the Supabase CLI linked):
   ```bash
   supabase db reset
   ```
   Or apply the schema SQL manually in the Supabase Dashboard.

## Running Tests
(If tests exist)
```bash
npm run test
```

## Common Issues
- **Missing API Keys:** If the chatbot fails, check `OPENAI_API_KEY`.
- **Auth Errors:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY` are correct.
