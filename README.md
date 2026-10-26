# Forma

A page-based Next.js business workspace with live ERP and inventory databases. Built with React, TypeScript, custom CSS, Lucide icons, and bundled fonts. No external font or image services are required.

## Run locally

Use Node.js 24 (Node 20.9+ is supported by Next.js) and npm.

```sh
npm ci
npm run dev
```

The development server uses port 3000. The home page opens the page builder; use the sidebar to open full databases or the operations overview. For a production build:

```sh
npm run build
npm start
```

## What works

- Dashboard with sales totals, inventory valuation, real order history charts, stock health, and activity.
- Inventory with saved views, filter combinations, sorting, visible properties, comfortable/compact density, table/grid layouts, multi-select, and CSV exports of the current view.
- Product inspection in a non-modal side panel, with editable properties and linked sales orders.
- Atomic bulk stock adjustments with a required reason and reservation protection; multi-product restocking from the selection toolbar.
- Multi-line sales orders, available-stock validation, reservations, shipping, delivery, cancellation, and payment tracking.
- Purchase orders with suppliers and expected delivery dates; receiving adds all line quantities once.
- Customer directory with editing, search, order counts, and lifetime sales.
- Reports with product performance, gross sales, estimated gross profit, and CSV exports.
- A block-based page builder with slash commands, text, headings, checklists, lists, callouts, dividers, and embedded live inventory/order databases.
- Each linked database block keeps its own filter, search, and table/board layout. Page changes autosave and pending saves flush on navigation.
- Block insertion, movement, deletion, full-width pages, preview, and Markdown export. Existing plain-text pages remain editable and business records are preserved.
- Workspace settings, JSON backups, and confirmed demo reset.
- Global search with Ctrl/⌘ K or `/`, keyboard result navigation, accessible native dialogs, and responsive mobile navigation.

## Data and scope

This is a functional **local prototype**, seeded with a fictional Brooklyn homeware business and October 2026 records. Business data is persisted under `forma.workspace.v1` in this browser’s localStorage. Display settings and saved inventory views use `forma.preferences.v2`. Existing records are retained after updating the app; there is no need to reset demo data. Legacy operations pages gain live database blocks while keeping their original text and checklist states. No account, server database, authentication, authorization, multi-user sync, actual payment processing, or external integration is connected. Export a JSON backup before clearing browser data. The JSON export is a backup artifact; a restore/import flow is not implemented.

Processing orders reserve inventory. Shipping reduces physical stock and releases the reservation. Cancelling an unpaid processing order releases its reservation. Receiving a purchase adds physical stock. Invalid transitions and repeated fulfillment/receiving are rejected in the shared domain layer.

Sales represent non-cancelled order value rather than recognized accounting revenue. Inventory valuation uses current unit cost. Profit reports estimate sales less current cost and exclude taxes, shipping, and operating expenses. Purchasing is not a double-entry general ledger. A production rollout requires backend transactions, access controls, audit logging, backups, and appropriate accounting/tax rules.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Browser tests use `/usr/bin/chromium` when available. Otherwise install Playwright’s browser with `npx playwright install chromium`. Tests start a development server automatically, or use a server supplied by `PLAYWRIGHT_BASE_URL`. Each browser test uses an isolated context and tests real user interactions and persisted data.

Code is organized into `src/lib/domain.ts` (stock/transaction rules), `src/lib/store.ts` (local persistence), and `src/components/` (workspace shell, records, forms, reports, and pages).

Cloud tasks already run in an isolated checkout. Use the existing checkout; do not create a Git worktree unless explicitly requested.
