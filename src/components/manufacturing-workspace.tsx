"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Factory,
  Layers3,
  Plus,
  Search,
  Truck,
} from "lucide-react";
import clsx from "clsx";
import {
  downloadCsv,
  money,
  shortDate,
  total,
  type PageBlock,
} from "@/lib/domain";
import { typeOf, unitOf } from "@/lib/manufacturing";
import type { ViewProps } from "./dashboard";
import { Empty, Metric, ProductArt, Select, Status } from "./ui";

export function ProductionBlock({
  state,
  open,
  navigate,
  block,
  onChange,
}: Pick<ViewProps, "state" | "open" | "navigate"> & {
  block: PageBlock;
  onChange: (change: Partial<PageBlock>) => void;
}) {
  const config = block.config ?? {};
  const active = config.filter !== "all";
  const jobs = state.manufacturing.jobs.filter(
    (j) => !active || ["Planned", "In progress"].includes(j.status),
  );
  const board = config.layout === "board";
  return (
    <section
      className="linked-database"
      aria-label="Linked Production database"
    >
      <div className="linked-database-title">
        <span className="linked-database-icon">
          <Factory size={20} />
        </span>
        <div>
          <h2>{block.text || "Production"}</h2>
          <span>Linked database · {jobs.length} orders</span>
        </div>
        <button
          className="text-button"
          onClick={() => navigate("manufacturing")}
        >
          Open database
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="linked-toolbar">
        <div className="linked-view-tabs">
          <button
            className={clsx(!active && "active")}
            onClick={() => onChange({ config: { ...config, filter: "all" } })}
          >
            All production
          </button>
          <button
            className={clsx(active && "active")}
            onClick={() =>
              onChange({ config: { ...config, filter: "active" } })
            }
          >
            Active jobs
          </button>
        </div>
        <div className="linked-controls">
          <button
            className="button button-small"
            onClick={() =>
              onChange({
                config: { ...config, layout: board ? "table" : "board" },
              })
            }
          >
            {board ? "Table" : "Board"} view
          </button>
          <button
            className="button button-primary button-small"
            onClick={() => open({ type: "production" })}
          >
            <Plus size={14} />
            Plan production
          </button>
        </div>
      </div>
      {jobs.length ? (
        board ? (
          <div className="linked-board">
            {["Planned", "In progress", "Completed", "Cancelled"].map(
              (status) => (
                <section key={status}>
                  <Status status={status} />
                  {jobs
                    .filter((j) => j.status === status)
                    .map((j) => {
                      const p = state.products.find(
                        (p) => p.id === j.productId,
                      )!;
                      return (
                        <button
                          key={j.id}
                          onClick={() =>
                            open({ type: "production-detail", id: j.id })
                          }
                        >
                          <small>{j.number}</small>
                          <strong>{p.name}</strong>
                          <small>
                            {j.quantity} {unitOf(p)}
                          </small>
                        </button>
                      );
                    })}
                </section>
              ),
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Output product</th>
                  <th className="align-right">Quantity</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map((j) => {
                  const p = state.products.find((p) => p.id === j.productId)!;
                  return (
                    <tr
                      key={j.id}
                      onClick={() =>
                        open({ type: "production-detail", id: j.id })
                      }
                    >
                      <td>
                        <button className="record-link">{j.number}</button>
                      </td>
                      <td>{p.name}</td>
                      <td className="align-right">
                        {j.quantity} {unitOf(p)}
                      </td>
                      <td>
                        <Status status={j.status} />
                      </td>
                      <td>{shortDate(j.dueAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <Empty
          title="No production in this view"
          text="Plan a batch to reserve inputs, then start and complete it to create finished stock."
        />
      )}
    </section>
  );
}

export function ManufacturingWorkspace({
  state,
  open,
  navigate,
  notify,
}: ViewProps) {
  const [tab, setTab] = useState("jobs");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const m = state.manufacturing;
  const jobs = m.jobs.filter(
    (j) =>
      `${j.number} ${j.bomName} ${state.products.find((p) => p.id === j.productId)?.name}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || j.status === status),
  );
  const boms = m.boms.filter((b) =>
    `${b.name} ${state.products.find((p) => p.id === b.productId)?.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const movements = m.movements.filter((mv) =>
    `${mv.reference} ${mv.kind} ${state.products.find((p) => p.id === mv.productId)?.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  function exportData() {
    if (tab === "movements")
      downloadCsv("forma-stock-movements.csv", [
        [
          "Reference",
          "Date",
          "Item",
          "Base unit",
          "Movement",
          "Quantity",
          "Unit cost",
          "Note",
        ],
        ...movements.map((mv) => {
          const p = state.products.find((p) => p.id === mv.productId)!;
          return [
            mv.reference,
            mv.at,
            p.name,
            unitOf(p),
            mv.kind,
            mv.quantity,
            mv.unitCost,
            mv.note,
          ];
        }),
      ]);
    else if (tab === "boms")
      downloadCsv("forma-bills-of-materials.csv", [
        [
          "Recipe",
          "Revision",
          "Output",
          "Output quantity",
          "Output unit",
          "Input",
          "Input quantity",
          "Input unit",
          "Labor per recipe",
          "Overhead per recipe",
        ],
        ...boms.flatMap((b) =>
          b.components.map((c) => {
            const output = state.products.find((p) => p.id === b.productId)!;
            const input = state.products.find((p) => p.id === c.productId)!;
            return [
              b.name,
              b.revision,
              output.name,
              b.outputQuantity,
              unitOf(output),
              input.name,
              c.quantity,
              unitOf(input),
              b.laborCost,
              b.overheadCost,
            ];
          }),
        ),
      ]);
    else
      downloadCsv("forma-production-orders.csv", [
        [
          "Order",
          "Product",
          "Quantity",
          "Unit",
          "Status",
          "Recipe revision",
          "Due date",
          "Actual material cost",
          "Labor",
          "Overhead",
          "Actual unit cost",
        ],
        ...jobs.map((j) => {
          const p = state.products.find((p) => p.id === j.productId)!;
          return [
            j.number,
            p.name,
            j.quantity,
            unitOf(p),
            j.status,
            j.revision,
            j.dueAt,
            j.materialCost ?? "",
            j.laborCost,
            j.overheadCost,
            j.unitCost ?? "",
          ];
        }),
      ]);
    notify("Manufacturing data exported.");
  }
  return (
    <div className="manufacturing-workspace animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Factory size={15} />
            MANUFACTURING
          </div>
          <h1>Production</h1>
          <p>
            Turn purchased materials into finished products, with every input
            accounted for.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={exportData}>
            <ArrowDownToLine size={15} />
            Export
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              open(tab === "boms" ? { type: "bom" } : { type: "production" })
            }
          >
            <Plus size={16} />
            {tab === "boms" ? "New bill of materials" : "New production order"}
          </button>
        </div>
      </div>
      <div className="manufacturing-flow">
        <button onClick={() => navigate("suppliers")}>
          <Truck size={18} />
          <span>
            <strong>1. Source</strong>
            <small>Buy from suppliers</small>
          </span>
        </button>
        <ArrowRight size={15} />
        <button onClick={() => navigate("inventory", { type: "material" })}>
          <Layers3 size={18} />
          <span>
            <strong>2. Materials</strong>
            <small>Receive & hold inputs</small>
          </span>
        </button>
        <ArrowRight size={15} />
        <button className="active" onClick={() => setTab("jobs")}>
          <Factory size={18} />
          <span>
            <strong>3. Make</strong>
            <small>Consume inputs, create output</small>
          </span>
        </button>
        <ArrowRight size={15} />
        <button onClick={() => navigate("orders")}>
          <ClipboardList size={18} />
          <span>
            <strong>4. Sell</strong>
            <small>Deliver to any customer</small>
          </span>
        </button>
      </div>
      <div className="metrics-grid three-metrics">
        <Metric
          title="Active production"
          value={String(
            m.jobs.filter((j) => ["Planned", "In progress"].includes(j.status))
              .length,
          )}
          description="planned and in-progress jobs"
          onClick={() => {
            setTab("jobs");
            setStatus("all");
          }}
        />
        <Metric
          title="Manufacturing recipes"
          value={String(m.boms.length)}
          description="versioned bills of materials"
          onClick={() => setTab("boms")}
        />
        <Metric
          title="Material inventory value"
          value={money(
            state.products
              .filter((p) => typeOf(p) === "material")
              .reduce((n, p) => n + p.stock * p.cost, 0),
          )}
          description="physical input stock at average cost"
          onClick={() => navigate("inventory", { type: "material" })}
        />
      </div>
      <section className="panel database-panel">
        <div className="database-tabs">
          <div className="tabs">
            {[
              ["jobs", "Production orders", m.jobs.length],
              ["boms", "Bills of materials", m.boms.length],
              ["movements", "Stock movements", m.movements.length],
            ].map(([id, label, count]) => (
              <button
                key={id}
                className={clsx(tab === id && "active")}
                onClick={() => {
                  setTab(String(id));
                  setSearch("");
                  setStatus("all");
                }}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="database-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              aria-label="Search manufacturing"
              placeholder="Search products, recipes, or references…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === "jobs" && (
            <Select
              label="Production status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                ...["Planned", "In progress", "Completed", "Cancelled"].map(
                  (v) => ({ value: v, label: v }),
                ),
              ]}
            />
          )}
        </div>
        {tab === "jobs" ? (
          jobs.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Production order</th>
                    <th>Output product</th>
                    <th className="align-right">Quantity to make</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Recipe</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const p = state.products.find((p) => p.id === j.productId)!;
                    return (
                      <tr
                        key={j.id}
                        onClick={() =>
                          open({ type: "production-detail", id: j.id })
                        }
                      >
                        <td>
                          <button className="record-link">{j.number}</button>
                          <span className="cell-subtitle">
                            {shortDate(j.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div className="product-cell">
                            <ProductArt product={p} />
                            <strong>{p.name}</strong>
                          </div>
                        </td>
                        <td className="align-right amount">
                          {j.quantity} {unitOf(p)}
                        </td>
                        <td>
                          <Status status={j.status} />
                        </td>
                        <td>{shortDate(j.dueAt)}</td>
                        <td>Rev {j.revision}</td>
                        <td>
                          <ArrowUpRight className="row-arrow" size={14} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Plan your first production run"
              text="Define the inputs with a bill of materials, then reserve stock for the quantity you want to make."
              action={
                <div className="empty-actions">
                  <button
                    className="button"
                    onClick={() => open({ type: "bom" })}
                  >
                    <Plus size={15} />
                    Define a recipe
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => open({ type: "production" })}
                  >
                    Plan production
                    <ArrowRight size={15} />
                  </button>
                </div>
              }
            />
          )
        ) : tab === "boms" ? (
          boms.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bill of materials</th>
                    <th>Output</th>
                    <th>Inputs</th>
                    <th className="align-right">Estimated cost / recipe</th>
                    <th>Revision</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {boms.map((b) => {
                    const p = state.products.find((p) => p.id === b.productId)!;
                    const cost =
                      b.components.reduce(
                        (n, c) =>
                          n +
                          c.quantity *
                            state.products.find((p) => p.id === c.productId)!
                              .cost,
                        0,
                      ) +
                      b.laborCost +
                      b.overheadCost;
                    return (
                      <tr
                        key={b.id}
                        onClick={() => open({ type: "bom", bomId: b.id })}
                      >
                        <td>
                          <button className="record-link">{b.name}</button>
                        </td>
                        <td>
                          {b.outputQuantity} {unitOf(p)} {p.name}
                        </td>
                        <td>{b.components.length} input items</td>
                        <td className="align-right amount">{money(cost)}</td>
                        <td>Rev {b.revision}</td>
                        <td>
                          <button
                            className="button button-small"
                            aria-label={`Plan ${b.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              open({ type: "production", bomId: b.id });
                            }}
                          >
                            Make this
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="How do you make your products?"
              text="Create a bill of materials with input quantities and optional labor and overhead costs."
              action={
                <button
                  className="button button-primary"
                  onClick={() => open({ type: "bom" })}
                >
                  <Plus size={15} />
                  New bill of materials
                </button>
              }
            />
          )
        ) : movements.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Item</th>
                  <th>Movement</th>
                  <th className="align-right">Quantity</th>
                  <th className="align-right">Captured unit cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 100).map((mv) => {
                  const p = state.products.find((p) => p.id === mv.productId)!;
                  return (
                    <tr
                      key={mv.id}
                      onClick={() => open({ type: "product", product: p })}
                    >
                      <td>
                        <button className="record-link">{mv.reference}</button>
                        <span className="cell-subtitle">{mv.note}</span>
                      </td>
                      <td>{p.name}</td>
                      <td>
                        <span className="category-label">{mv.kind}</span>
                      </td>
                      <td
                        className={clsx(
                          "align-right amount",
                          mv.quantity < 0 ? "quantity-out" : "quantity-in",
                        )}
                      >
                        {mv.quantity > 0 ? "+" : ""}
                        {mv.quantity} {unitOf(p)}
                      </td>
                      <td className="align-right amount">
                        {money(mv.unitCost)} / {unitOf(p)}
                      </td>
                      <td>{shortDate(mv.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your stock trail starts here"
            text="Purchases, production, sales shipments, and stock adjustments create movement entries."
          />
        )}
        <div className="table-footer">
          <span>
            {tab === "movements"
              ? `Latest ${Math.min(movements.length, 100)} of ${movements.length} movements · export includes all`
              : tab === "boms"
                ? `${boms.length} recipes`
                : `${jobs.length} production orders`}
          </span>
          <span>
            <span className="mini-dot" />
            Inputs are reserved at planning and consumed on completion
          </span>
        </div>
      </section>
      <p className="data-note">
        Quantities use each item’s base unit; unit conversion is not automatic.
        Costs include materials, labor, and overhead. This flow completes the
        planned batch in full; partial completion, scrap, routing, and full
        ledger accounting are not implemented.
      </p>
    </div>
  );
}

export function Suppliers({ state, open }: ViewProps) {
  const [search, setSearch] = useState("");
  const suppliers = state.manufacturing.suppliers.filter((s) =>
    `${s.name} ${s.contact} ${s.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Truck size={15} />
            UPSTREAM · WE BUY FROM THEM
          </div>
          <h1>Suppliers</h1>
          <p>
            The people and organizations supplying your raw materials, inputs,
            and components.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button button-primary"
            onClick={() => open({ type: "supplier" })}
          >
            <Plus size={16} />
            Add supplier
          </button>
        </div>
      </div>
      <div className="customer-directory-head">
        <h2>
          Supplier directory{" "}
          <span className="count-pill">
            {state.manufacturing.suppliers.length}
          </span>
        </h2>
        <div className="table-search">
          <Search size={16} />
          <input
            aria-label="Search suppliers"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {suppliers.length ? (
        <div className="customer-grid">
          {suppliers.map((s) => {
            const purchases = state.purchases.filter(
              (p) =>
                p.supplierId === s.id ||
                p.supplier.toLowerCase() === s.name.toLowerCase(),
            );
            return (
              <article className="customer-card supplier-card" key={s.id}>
                <div className="customer-card-top">
                  <span className="supplier-avatar">
                    <Truck size={21} />
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => open({ type: "supplier", supplierId: s.id })}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <h3>
                  <button
                    className="record-link"
                    onClick={() => open({ type: "supplier", supplierId: s.id })}
                  >
                    {s.name}
                  </button>
                </h3>
                <p>{s.contact || "No contact person set"}</p>
                <span className="customer-email">
                  {s.email || s.phone || "Contact details optional"}
                </span>
                <div className="customer-card-bottom">
                  <span>
                    <small>Open purchases</small>
                    <strong>
                      {purchases.filter((p) => p.status === "Ordered").length}
                    </strong>
                  </span>
                  <span>
                    <small>Total purchased</small>
                    <strong>
                      {money(purchases.reduce((n, p) => n + total(p), 0))}
                    </strong>
                  </span>
                </div>
                <button
                  className="button supplier-purchase"
                  onClick={() => open({ type: "purchase", supplierId: s.id })}
                >
                  <Plus size={14} />
                  Purchase materials
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Add the suppliers you buy from"
          text="Supplier and customer records are separate. Suppliers provide inputs; customers buy your output."
          action={
            <button
              className="button"
              onClick={() => open({ type: "supplier" })}
            >
              Add supplier
            </button>
          }
        />
      )}
    </div>
  );
}
