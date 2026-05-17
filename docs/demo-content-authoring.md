# Demo Content Authoring Guide

This guide shows how to create the content used by Demo Mode.

## What you create
- One recording JSON per sample under `scripts/demo/recordings/`.
- A generated manifest at `src/assets/demo/recordingsManifest.ts` built by `scripts/demo/build-recordings-manifest.js`.
- Optional media under `src/assets/demo/media/` (WebP preferred)

## Quick start (manual authoring)
1) Add or duplicate a recording JSON in `scripts/demo/recordings/` and change:
- `id`, `title`
- `events`: build a sequence of `message` (full bubbles) and `stream` (chunked text) events.

Example chat events:
```
{
  "id": "chat_sql_cte",
  "title": "Explain SQL CTE with example",
  "events": [
    { "type": "message", "role": "user", "content": "Explain CTEs with a simple example." },
    { "type": "stream", "role": "assistant", "content": "CTEs are named subqueries that…" },
    { "type": "stream", "role": "assistant", "content": "\n\nHere’s a quick example:" },
    { "type": "stream", "role": "assistant", "content": "\n```sql\nWITH totals AS (SELECT …)\nSELECT … FROM totals;\n```" }
  ],
  "tags": ["sql", "sample"]
}
```

2) For images, add WebP files to `src/assets/demo/media/` and wire them:
- Add a key → require mapping in `src/services/demo/demoAssets.ts`:
```
export const demoAssets = {
  kyoto_map: require('@/assets/demo/media/kyoto-map.webp'),
};
```
- Reference it from an event using `asset:` prefix:
```
{ "type": "image-grid", "attachments": [ { "type": "image", "uri": "asset:kyoto_map", "alt": "Kyoto map" } ] }
```

3) Tools/citations: use `tool-start`/`tool-end` with lightweight arguments/results; add ‘Simulated’ in copy.

4) Debates/compares: author similar `events` arrays with alternating roles (assistant/user) or left/right columns.

## Recommended workflow (semi-automated)
- Use the dev-only recorder to capture real sessions (stream chunks, image/tool events, and delays).
- Save the recording JSON under `scripts/demo/recordings/`.
- Run `npm run demo:build-recordings` to regenerate `src/assets/demo/recordingsManifest.ts`.

## Authoring tips
- Keep sessions concise and believable; aim for 5–12 assistant chunks per answer.
- Prefer WebP images ≤ 200–300 KB each; keep total bundle ≤ 8 MB.
- Label simulated content truthfully in prose (e.g., “Simulated search”).
- Avoid real PII or claims; you can neutralize provider/model names if needed.

## Validation
- Static typecheck ensures the generated manifest imports valid JSON modules.
- Playback adapters use the manifest recordings as-is to render streaming and attachments.

## Where it’s used
- `DemoContentService` reads `recordingsManifest.ts`; playback adapters route chat, debate, and compare samples from those recordings.

## Next steps (we can build for you)
- Add a dev recorder and packer script (capture → curate → emit pack JSON + asset map).
- Add a “Demo Samples” list on Chat/Compare screens to pick and replay samples.
