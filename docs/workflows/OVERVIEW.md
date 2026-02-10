# Workflow Overview

> This document tracks the status of n8n workflows and their migration to native code.

## Migration Status

| Workflow Name | Status | Type | Code Location |
|---|---|---|---|
| **NDE Compassionate Chatbot** | 🔄 Hybrid | Chat | `src/app/api/chat-compassionate` (Logic moved, maybe n8n used for backup?) |
| **NDE Research Chatbot** | ⬜ Not Started | Chat | - |
| **Search Logic** | ✅ Native | Search | `src/app/api/search3` (Integrated) |
| **NDE Video Verification** | ⬜ Not Started | Data Pipeline | - |
| **NDE Summary Creator** | ⬜ Not Started | Data Pipeline | - |
| **NDE Video Researcher 2** | ⬜ Not Started | Research | - |
| **Punctuate & Embed (Timestamped)** | ⬜ Not Started | Data Pipeline | - |
| **Vector Subtitles for Chatbot** | ⬜ Not Started | Data Pipeline | - |
| **Prepare Subtitles to be Vectorized** | ⬜ Not Started | Data Pipeline | - |

## Strategy
The goal is to migrate all logic from n8n into Next.js API routes or Supabase Edge Functions to reduce dependency on external automation platforms and improve version control/testing.

## Webhooks
- **Search:** `https://n8n.awetomatic.com/webhook/4e993b0f-a3be-42ba-925d-4c5f78b3381c`
