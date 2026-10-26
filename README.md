# Forma

A page-based Next.js business workspace with live ERP and inventory databases. Built with React, TypeScript, custom CSS, Lucide icons, and bundled fonts. No external font or image services are required.

## Run locally

Use Node.js 24 (the version in `.nvmrc`) and npm. The test runner uses Node 24’s test isolation option.

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
- Inventory classifies raw materials/inputs and finished products separately. Each SKU has a base unit: pcs, kg, g, l, ml, m, m², or m³. Measured quantities support up to six decimal places; pieces use whole numbers.
- Saved inventory views, filters by item type, sorting, visible properties, comfortable/compact density, table/grid layouts, multi-select, and CSV exports including item type and unit.
- Product inspection in a non-modal side panel, with editable properties and linked sales orders.
- Atomic bulk stock adjustments with a required reason and reservation protection; multi-product restocking from the selection toolbar.
- Multi-line sales orders, available-stock validation, reservations, shipping, delivery, cancellation, and payment tracking.
- Supplier records are distinct from customers. Purchase orders buy materials or components from suppliers; receiving adds stock once and updates its weighted average unit cost.
- Bills of materials define a finished output, recipe yield, input quantities, labor, and overhead. Recipes are versioned and circular assemblies are rejected.
- Production orders snapshot the recipe, reserve inputs when planned, and move through Planned → In progress → Completed. Completion consumes materials, adds finished stock, and captures actual batch cost. Cancellation releases reservations.
- Stock movements record opening balances and new purchases, production inputs/outputs, sales shipments, and quantity adjustments. Existing historical transactions are retained but their stock movements are not backfilled.
- Customer records support individuals, businesses/organizations, and other entities. Only a name is required; company, email, and phone are optional. Customers have order history and lifetime sales.
- Reports with product performance, gross sales, estimated gross profit, and CSV exports.
- A block-based page builder with slash commands, text, headings, checklists, lists, callouts, dividers, and embedded live inventory, sales-order, and production databases.
- Each linked database block keeps its own filter, search, and table/board layout. Page changes autosave and pending saves flush on navigation.
- Block insertion, movement, deletion, full-width pages, preview, and Markdown export. Existing plain-text pages remain editable and business records are preserved.
- Workspace settings, JSON backups, and confirmed demo reset.
- Global search with Ctrl/⌘ K or `/`, keyboard result navigation, accessible native dialogs, and responsive mobile navigation.

## Manufacturing walkthrough

1. Add the people or organizations you buy from in **Suppliers**.
2. In **Inventory → Raw materials**, add each input with its base unit, unit cost, and opening stock.
3. In **Inventory → Finished goods**, add the products you make. Use zero opening stock for a new product.
4. In **Production → Bills of materials**, define how much output a recipe makes and the quantities of each input it consumes. Labor and overhead are optional costs per recipe.
5. Create purchase orders for missing materials and **Receive shipment** when they arrive. All purchase quantities use the SKU’s base unit.
6. **Plan production** to check availability and reserve the inputs. **Start production**, then **Complete production** to consume those inputs and add the output to finished stock.
7. Add any kind of customer and create a sales order for finished goods. Shipping deducts finished stock.

Use `/production` or **Link production** on a workspace page to embed the live production database.

## Data and scope

This is a functional **local prototype**, seeded with a fictional homeware manufacturer and October 2026 records. Example inputs include clay, glaze, packaging, and timber; every item, unit, recipe, supplier, and customer is configurable. Business data is persisted under `forma.workspace.v1` in this browser’s localStorage. Display settings and saved inventory views use `forma.preferences.v2`. Existing records are retained after updating the app; there is no need to reset demo data. Older SKUs without a type/unit are treated as finished products in pcs. Legacy workspaces receive empty manufacturing collections rather than extra example materials or recipes. A SKU’s type and unit are protected once transactions or recipes reference it; use a new SKU for a different base unit. Legacy operations pages gain live database blocks while keeping their original text and checklist states. No account, server database, authentication, authorization, multi-user sync, actual payment processing, or external integration is connected. Export a JSON backup before clearing browser data. The JSON export is a backup artifact; a restore/import flow is not implemented.

Processing orders reserve inventory. Shipping reduces physical stock and releases the reservation. Cancelling an unpaid processing order releases its reservation. Receiving a purchase adds physical stock. Invalid transitions and repeated fulfillment/receiving are rejected in the shared domain layer.

Sales represent non-cancelled order value rather than recognized accounting revenue. Inventory valuation uses current unit cost. Profit reports estimate sales less current cost and exclude taxes, shipping, and operating expenses. Manufacturing currently completes the planned batch in full. Automatic unit conversion, partial completion, scrap, material substitution, lot/serial tracking, machine routing, and a full work-in-progress accounting ledger are not implemented. Multi-level assemblies can use other finished SKUs as inputs after those SKUs are stocked; production does not automatically explode and schedule dependent recipes. Purchasing is not a double-entry general ledger. A production rollout requires backend transactions, access controls, audit logging, backups, and appropriate accounting/tax rules.

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
