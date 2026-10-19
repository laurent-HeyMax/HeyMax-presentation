# First-release decisions

## Local first

This release runs on Node 22+ with native browser JavaScript and no package dependencies. A small serialised, atomic JSON store replaces the kit’s Postgres service for the laptop pilot. One Node process owns the data directory. Do not run multiple instances against the same store.

The API is localhost-only, checks Host and Origin, and requires JSON for writes. Uploaded files are limited to PNG/JPEG/WebP signatures; SVG uploads and arbitrary HTML slides are not supported. User-entered text is escaped before rendering. This is a local trust boundary, not a substitute for team authentication.

## Structured slides

The kit proposes bespoke HTML fragments. The pilot stores a recipe ID plus editable text, items, image references and notes. A shared renderer turns these into the HTML canvas and exports. This keeps authoring predictable, reduces accidental brand drift and avoids executing model- or author-supplied scripts.

This is a conscious format decision, not an implementation of the original kit’s arbitrary-HTML editing contract. A future assistant should write validated structured content through the same save functions. Freeform layout can be introduced separately, with explicit isolation and validation.

## Brand mapping

The external Figma design system is the primary reference for assets and palette. Older strategy documents and example decks supply context and layout patterns. Typography documentation inconsistencies are not copied: the presentation renderer uses explicit weights and a consistent Plus Jakarta Sans family.

The twelve recipes are new presentation compositions inspired by the supplied decks, not pixel-for-pixel copies of Figma documentation pages. Luggage shapes are campaign-specific. There are no reconstructed orbit background assets.

## Honest generation and source use

The brief builder uses the author’s own text and templates. It does not call a language model. It asks the author to review the outline and explicitly create the deck. It never invents metrics or confirmed partner terms. Placeholder examples are marked in source/qualification text.

Knowledge approval is a local author action. Full source text is preserved in speaker notes when inserted through a brief; long source text is not silently presented as a verified summary. Review dates gate which notes are offered. The local seed includes a documented paraphrase of the supplied brand guidelines.

## Export

HTML export embeds the local font and all referenced images. It preserves editable text in the browser, but is not the editable project backup format. JSON export is the portable project format and contains uploaded image bytes. Browser print provides a manual PDF route. Native PowerPoint and server-rendered PDF are future additions.

## Next milestones

1. Review the local layouts with the team; finalise presentation type sizes, source placement and image-safe areas.
2. Connect the chosen AI provider behind a server-side adapter, with validated structured output, cost limits, source provenance and explicit outline approval.
3. Add reliable knowledge ingestion and retrieval for approved HeyMax product and campaign material.
4. Push to the confirmed private internal repository; keep user data and secrets excluded.
5. For shared hosting, migrate persistence, introduce SSO and deck permissions, validate the hosting isolation model, and set up backup/restore before enabling access.

Security and access control must arrive with shared hosting, not as a later cosmetic pass.
