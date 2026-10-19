# HeyMax Studio

A local-first, internal presentation studio using the HeyMax brand. Version 0.1 is a working single-user foundation, not the complete platform described in the rebuild kit.

## Run on your laptop

Install Node.js 22 or later, then open a terminal in this folder:

```sh
npm start
```

Open **http://127.0.0.1:4310**. There are no npm dependencies to install, accounts to create, or API keys to enter. Fonts, logos and the included photos are bundled; normal authoring works offline. Stop with Ctrl+C. Restart with the same command and your saved work returns.

On macOS you can also double-click `Start HeyMax Studio.command`. The launcher starts the server and opens the app in your browser. Keep its terminal window open while using the studio.

To use another port or data directory:

```sh
PORT=4311 DATA_DIR="$HOME/HeyMax Studio Data" npm start
```

The server deliberately listens only on `127.0.0.1`. This version has no authentication and must not be exposed as a shared internal service.

## What works

- Presentation library with search, favourites, duplicate, archive and restore.
- Eight-slide HeyMax starter deck and twelve reusable slide layouts.
- Guided brief → outline → explicit create flow. **This is template-based, not AI generation.**
- Editable slide text, colours, image replacement, image fit, content blocks and speaker notes.
- Double-click text on the canvas to edit it. Escape cancels; click away to save.
- Add, duplicate, delete and reorder slides; undo/redo during the editing session.
- Autosave with revision checks. Conflicts never overwrite the newer saved deck; download your edits or reload the saved version.
- Presentation view with arrow/space navigation and Escape to return.
- Self-contained HTML export with fonts and images embedded.
- Browser print layout for **Save as PDF** (landscape, background graphics enabled). This is not a server-side PDF renderer.
- Editable JSON backups containing uploaded images; imports always create a new deck.
- Knowledge notes with source links, draft/approved state and review dates. Approved, non-overdue sources are available in the brief builder.
- Read-only brand kit linked to the source Figma guideline.

## Local data and backups

All user data lives in `data/` unless `DATA_DIR` is set:

- `studio.json`: decks, slide content, speaker notes and knowledge notes.
- `studio.json.bak`: the previous successful store version.
- `uploads/`: uploaded image files, named by their content hash.

Writes use a temporary file and atomic rename. A damaged store fails closed rather than overwriting your work with sample content. Stop the server before restoring `studio.json.bak` to `studio.json`. Back up the **entire data directory**, including uploads, regularly; the previous-version backup is not a historical backup service. Use Export → Editable backup for a portable copy of one deck.

The data directory is excluded from Git. Do not commit real decks, uploaded images, credentials or personal working notes. Brand assets bundled under `public/assets` are part of the private source repository.

## GitHub handoff

The project is ready to push to a **private internal repository**. No remote has been assumed or created. After the intended organisation/repository is confirmed:

```sh
git remote add origin <your-internal-repository-url>
git push -u origin main
```

GitHub stores the code and runs the included checks; it does not host this Node application automatically. GitHub Pages cannot run the persistence server. For a team deployment, add authenticated access, workspace/deck permissions, managed durable storage, backups and HTTPS before putting it on your internal hosting platform.

## Development

```sh
npm run dev
npm run check
npm test
```

`dev` watches server files; reload the browser after editing frontend files. Tests create temporary, isolated stores and verify persistence, conflicting saves, untrusted text, request boundaries, image integrity, backup/import, exports and recovery. They never use your real `data/` directory.

Structure:

```text
server.mjs           Local HTTP API, asset serving, image uploads and downloads
src/store.mjs        Validation, serialised writes, revision checks and backup
src/seed.mjs         Illustrative starter content
src/export.mjs       Self-contained HTML export
public/app.js        Library, editor, brief builder, knowledge and presentation UI
public/slides.js     Shared layouts and safe slide rendering
public/slides.css    HeyMax presentation typography and layout styles
public/app.css       Workspace interface and responsive styles
public/assets/      Local brand files and font
tests/              Isolated integration tests
docs/               Architecture, sources and next stages
```

## Scope of the first release

The app uses structured, editable slide content rendered through approved templates. It intentionally does not accept arbitrary slide HTML. It uses an atomic local JSON store instead of Postgres so one laptop can run it with no database setup. These are documented first-release departures from the original rebuild kit.

Not yet included: AI model connection, semantic retrieval, free-positioned design elements, live collaboration, team authentication, private reader publishing, reader analytics, native PowerPoint import/export, Figma synchronisation or the external MCP connector. Image upload accepts PNG/JPEG/WebP up to 8 MB. Decks support up to 80 slides. Layouts have finite text capacity; the editor warns about dense content, but authors should visually check every slide before sharing.

See [the implementation decisions](docs/decisions.md) and [asset sources](docs/brand-sources.md).
