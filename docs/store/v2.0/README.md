# Store copy — v2.0.0

Finalized listing copy for the **v2.0.0** submission (iOS buildNumber 30 / Android versionCode 40).
All text verified accurate against the live model catalog and within each store's character limit.

| File | Where it goes | Limit | Count |
|------|---------------|-------|-------|
| `app-store-and-play-description.txt` | App Store **Description** AND Google Play **Full description** (same content) | 4000 | 3932 |
| `play-short-description.txt` | Google Play **Short description** (Play-only field) | 80 | 74 |
| `ios-whats-new.txt` | App Store **What's New in This Version** | 4000 | 1569 |
| `android-whats-new.txt` | Google Play **What's new** (release notes) | 500 | 477 |

## Notes / accuracy decisions

- **Web search** now spans **Claude, ChatGPT, Gemini, Grok, and Perplexity** (Claude + Grok added in 2.0). It is capability-driven per model — **no toggle** — so any "enable Web Search" wording was removed. Source: `src/config/modelConfigs.ts` (`supportsWebSearch: true`).
- **Create Studio** providers: images = ChatGPT, Gemini, Grok · video = Runway · audio = ElevenLabs. Source: `src/config/imageGenerationModels.ts`, `src/config/mediaProviders.ts`.
- **10 providers** = 8 chat (Claude, ChatGPT, Gemini, Grok, Perplexity, Mistral, Cohere, DeepSeek) + Runway + ElevenLabs.
- **Premium gating** in the description mirrors the prior live listing unchanged — revisit if 2.0 moved anything between free/premium.
- Debate ElevenLabs voices are backend-only in this release and were intentionally left out of the marketing copy.

Not covered here (unchanged from prior release; update in-console if desired): App Store **subtitle** (30 char) and **promotional text** (170 char).
