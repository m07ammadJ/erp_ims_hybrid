"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowDownUp,
  ArrowUpRight,
  Check,
  Columns3,
  Grid2X2,
  LayoutList,
  ListFilter,
  Package,
  Plus,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  available,
  downloadCsv,
  money,
  reserved,
  stockStatus,
  type Action,
} from "@/lib/domain";
import {
  setPreferences,
  usePreferences,
  type InventoryView,
} from "@/lib/preferences";
import type { ViewProps } from "./dashboard";
import { Empty, Modal, ProductArt, Select, Status } from "./ui";
import { typeOf, unitOf, type ItemType } from "@/lib/manufacturing";

const columnOptions = [
  ["itemType", "Item type"],
  ["unit", "Unit"],
  ["category", "Category"],
  ["status", "Status"],
  ["stock", "On hand"],
  ["reserved", "Reserved"],
  ["available", "Available"],
  ["price", "Sale price"],
  ["cost", "Unit cost"],
  ["margin", "Margin"],
  ["location", "Location"],
];

export function InventoryWorkspace({
  state,
  open,
  notify,
  onAction,
  initialStock = "all",
  initialType = "all",
}: ViewProps & {
  onAction: (action: Action, message: string) => boolean;
  initialStock?: string;
  initialType?: "all" | ItemType;
}) {
  const preferences = usePreferences();
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState(initialStock);
  const [itemType, setItemType] = useState<"all" | ItemType>(initialType);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("manual");
  const [layout, setLayout] = useState<"table" | "grid">("table");
  const [selected, setSelected] = useState<string[]>([]);
  const [panel, setPanel] = useState<"filters" | "properties" | null>(null);
  const [saveView, setSaveView] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [activeView, setActiveView] = useState("");
  const categories = [...new Set(state.products.map((p) => p.category))];
  const products = state.products
    .filter((p) => {
      const matchesStock =
        stock === "all" ||
        (stock === "low"
          ? p.stock > 0 && p.stock <= p.reorderAt
          : stock === "out"
            ? p.stock === 0
            : stock === "attention"
              ? p.stock <= p.reorderAt
              : p.stock > p.reorderAt);
      return (
        matchesStock &&
        (itemType === "all" || typeOf(p) === itemType) &&
        (category === "all" || p.category === category) &&
        `${p.name} ${p.sku} ${p.location}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "stock-asc"
          ? a.stock - b.stock
          : sort === "stock-desc"
            ? b.stock - a.stock
            : sort === "value"
              ? b.stock * b.cost - a.stock * a.cost
              : 0,
    );
  const selectedProducts = state.products.filter((p) =>
    selected.includes(p.id),
  );
  const columns = preferences.columns;
  const attention = state.products.filter((p) => p.stock <= p.reorderAt).length;
  const clearSelection = () => setSelected([]);
  function exportProducts() {
    const exportColumns = columns.filter(
      (c) => c !== "itemType" && c !== "unit",
    );
    const records = selected.length ? selectedProducts : products;
    downloadCsv("forma-inventory.csv", [
      [
        "Item",
        "SKU",
        "Item type",
        "Base unit",
        ...exportColumns.map(
          (c) => columnOptions.find(([id]) => id === c)?.[1] ?? c,
        ),
      ],
      ...records.map((p) => [
        p.name,
        p.sku,
        typeOf(p),
        unitOf(p),
        ...exportColumns.map((c) =>
          c === "itemType"
            ? typeOf(p)
            : c === "unit"
              ? unitOf(p)
              : c === "available"
                ? available(state, p.id)
                : c === "reserved"
                  ? reserved(state, p.id)
                  : c === "status"
                    ? stockStatus(p)
                    : c === "margin"
                      ? p.price
                        ? `${(((p.price - p.cost) / p.price) * 100).toFixed(1)}%`
                        : "0%"
                      : (p[c as keyof typeof p] ?? ""),
        ),
      ]),
    ]);
    notify(`${records.length} products exported.`);
  }
  function applyView(view: InventoryView) {
    setStock(view.stock);
    setCategory(view.category);
    setSort(view.sort);
    setLayout(view.layout);
    setItemType(view.itemType ?? "all");
    setPreferences({ columns: view.columns });
    setSearch("");
    clearSelection();
    setActiveView(view.id);
  }
  const changeStock = (value: string) => {
    setStock(value);
    setActiveView("");
    clearSelection();
  };
  const counts = {
    all: state.products.length,
    attention,
    healthy: state.products.length - attention,
    out: state.products.filter((p) => p.stock === 0).length,
  };
  return (
    <div className="inventory-workspace animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Package size={15} />
            DATABASE
          </div>
          <h1>Inventory</h1>
          <p>
            Raw materials, components, and finished goods in their own base
            units.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={exportProducts}>
            <ArrowDownToLine size={15} />
            Export
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              open({
                type: "product",
                itemType: itemType === "material" ? "material" : "finished",
              })
            }
          >
            <Plus size={16} />
            Add item
          </button>
        </div>
      </div>
      <div className="database-summary">
        <span>
          <b>{state.products.length}</b> inventory items
        </span>
        <span>
          <b>{state.products.filter((p) => typeOf(p) === "material").length}</b>{" "}
          material SKUs ·{" "}
          <b>{state.products.filter((p) => typeOf(p) === "finished").length}</b>{" "}
          finished SKUs
        </span>
        <span>
          <b>
            {money(state.products.reduce((n, p) => n + p.stock * p.cost, 0))}
          </b>{" "}
          cost value
        </span>
        <button
          onClick={() => changeStock("attention")}
          className={clsx(attention > 0 && "attention-link")}
        >
          <span className="status-dot" />
          {attention} need attention
          <ArrowUpRight size={13} />
        </button>
      </div>
      <section className="panel database-panel">
        <div className="database-tabs">
          <div className="tabs">
            <button
              className={clsx(itemType === "material" && "active")}
              onClick={() => {
                setItemType("material");
                setStock("all");
                setActiveView("");
                clearSelection();
              }}
            >
              Raw materials
              <span>
                {state.products.filter((p) => typeOf(p) === "material").length}
              </span>
            </button>
            <button
              className={clsx(itemType === "finished" && "active")}
              onClick={() => {
                setItemType("finished");
                setStock("all");
                setActiveView("");
                clearSelection();
              }}
            >
              Finished goods
              <span>
                {state.products.filter((p) => typeOf(p) === "finished").length}
              </span>
            </button>
            {[
              ["all", "All items"],
              ["attention", "Needs attention"],
              ["out", "Out of stock"],
            ].map(([id, name]) => (
              <button
                key={id}
                className={clsx(
                  !activeView && itemType === "all" && stock === id && "active",
                )}
                onClick={() => {
                  setItemType("all");
                  changeStock(id);
                }}
              >
                <LayoutList size={14} />
                {name}
                <span>{counts[id as keyof typeof counts]}</span>
              </button>
            ))}
            {preferences.savedViews.map((view) => (
              <button
                key={view.id}
                className={clsx(activeView === view.id && "active")}
                onClick={() => applyView(view)}
              >
                <Columns3 size={14} />
                {view.name}
              </button>
            ))}
            <button
              className="add-view"
              onClick={() => setSaveView(true)}
              aria-label="Save current view"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <div className="database-toolbar">
          <div className="table-search">
            <Search size={16} />
            <input
              placeholder="Search products or SKU…"
              aria-label="Search products"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                clearSelection();
              }}
            />
          </div>
          <div className="database-controls">
            <button
              className={clsx(
                "button button-small",
                panel === "filters" && "button-selected",
              )}
              onClick={() => setPanel(panel === "filters" ? null : "filters")}
            >
              <ListFilter size={15} />
              Filter
              {(stock !== "all" || category !== "all") && (
                <span className="filter-count">
                  {Number(stock !== "all") + Number(category !== "all")}
                </span>
              )}
            </button>
            <Select
              label="Sort products"
              value={sort}
              onChange={setSort}
              options={[
                { value: "manual", label: "Sort" },
                { value: "name", label: "Name A–Z" },
                { value: "stock-asc", label: "Stock: low to high" },
                { value: "stock-desc", label: "Stock: high to low" },
                { value: "value", label: "Highest stock value" },
              ]}
            />
            <button
              className={clsx(
                "button button-small",
                panel === "properties" && "button-selected",
              )}
              onClick={() =>
                setPanel(panel === "properties" ? null : "properties")
              }
            >
              <SlidersHorizontal size={15} />
              Display
            </button>
            <div className="view-toggle">
              <button
                aria-label="Table view"
                aria-pressed={layout === "table"}
                className={clsx(layout === "table" && "active")}
                onClick={() => setLayout("table")}
              >
                <LayoutList size={16} />
              </button>
              <button
                aria-label="Grid view"
                aria-pressed={layout === "grid"}
                className={clsx(layout === "grid" && "active")}
                onClick={() => setLayout("grid")}
              >
                <Grid2X2 size={16} />
              </button>
            </div>
          </div>
        </div>
        {panel === "filters" && (
          <div className="filter-row">
            <span>Where</span>
            <Select
              label="Filter category"
              value={category}
              onChange={(value) => {
                setCategory(value);
                clearSelection();
              }}
              options={[
                { value: "all", label: "All categories" },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <span>and stock is</span>
            <Select
              label="Filter stock status"
              value={stock}
              onChange={changeStock}
              options={[
                { value: "all", label: "Any status" },
                { value: "healthy", label: "In stock" },
                { value: "low", label: "Low stock" },
                { value: "out", label: "Out of stock" },
                { value: "attention", label: "Needs attention" },
              ]}
            />
            <button
              className="text-button"
              onClick={() => {
                setCategory("all");
                changeStock("all");
                setSearch("");
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        {panel === "properties" && (
          <div className="display-settings">
            <div>
              <strong>Visible properties</strong>
              <span>Choose what matters in this view.</span>
            </div>
            <div className="property-options">
              {columnOptions.map(([id, label]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={columns.includes(id)}
                    onChange={(e) =>
                      setPreferences({
                        columns: e.target.checked
                          ? columnOptions
                              .map(([key]) => key)
                              .filter(
                                (key) => key === id || columns.includes(key),
                              )
                          : columns.filter((c) => c !== id),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="density-control">
              <span>Row density</span>
              <button
                className={clsx(
                  preferences.density === "comfortable" && "active",
                )}
                onClick={() => setPreferences({ density: "comfortable" })}
              >
                Comfortable
              </button>
              <button
                className={clsx(preferences.density === "compact" && "active")}
                onClick={() => setPreferences({ density: "compact" })}
              >
                Compact
              </button>
            </div>
          </div>
        )}
        {selected.length > 0 && (
          <div className="bulk-toolbar">
            <button
              className="icon-button"
              aria-label="Clear selection"
              onClick={clearSelection}
            >
              <X size={15} />
            </button>
            <strong>{selected.length} selected</strong>
            <span />
            <button onClick={() => setAdjust(true)}>
              <Settings2 size={15} />
              Adjust stock
            </button>
            <button
              onClick={() => open({ type: "purchase", productIds: selected })}
            >
              <Truck size={15} />
              Restock
            </button>
            <button onClick={exportProducts}>
              <ArrowDownToLine size={15} />
              Export
            </button>
          </div>
        )}
        {products.length === 0 ? (
          <Empty
            title="No products match this view"
            text="Change your filters or add a product."
            action={
              <button
                className="button"
                onClick={() => {
                  setSearch("");
                  setStock("all");
                  setCategory("all");
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : layout === "grid" ? (
          <div className="product-grid">
            {products.map((p) => (
              <button
                className="product-grid-card"
                key={p.id}
                onClick={() => open({ type: "product", product: p })}
              >
                <ProductArt product={p} large />
                <div>
                  <span className="product-grid-category">{p.category}</span>
                  <strong>{p.name}</strong>
                  <small>
                    {p.sku} · {unitOf(p)}
                  </small>
                  <div className="product-grid-foot">
                    <span>
                      {typeOf(p) === "material"
                        ? `${money(p.cost)} / ${unitOf(p)}`
                        : money(p.price)}
                    </span>
                    <Status status={stockStatus(p)} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div
            className={clsx(
              "table-scroll",
              preferences.density === "compact" && "compact-table",
            )}
          >
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      aria-label="Select all visible products"
                      checked={
                        products.length > 0 &&
                        products.every((p) => selected.includes(p.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? products.map((p) => p.id) : [],
                        )
                      }
                    />
                  </th>
                  <th>
                    <button
                      className="column-sort"
                      onClick={() =>
                        setSort(sort === "name" ? "manual" : "name")
                      }
                    >
                      Item name
                      <ArrowDownUp size={12} />
                    </button>
                  </th>
                  {columnOptions
                    .filter(([id]) => columns.includes(id))
                    .map(([id, label]) => (
                      <th
                        key={id}
                        className={
                          [
                            "stock",
                            "price",
                            "cost",
                            "available",
                            "reserved",
                            "margin",
                          ].includes(id)
                            ? "align-right"
                            : undefined
                        }
                      >
                        {id === "stock" ? (
                          <button
                            className="column-sort"
                            onClick={() =>
                              setSort(
                                sort === "stock-asc"
                                  ? "stock-desc"
                                  : "stock-asc",
                              )
                            }
                          >
                            {label}
                            <ArrowDownUp size={12} />
                          </button>
                        ) : (
                          label
                        )}
                      </th>
                    ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className={clsx(selected.includes(p.id) && "selected-row")}
                    onClick={() => open({ type: "product", product: p })}
                  >
                    <td
                      className="checkbox-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        checked={selected.includes(p.id)}
                        onChange={(e) =>
                          setSelected((old) =>
                            e.target.checked
                              ? [...old, p.id]
                              : old.filter((id) => id !== p.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button className="product-cell record-link">
                        <ProductArt product={p} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {p.sku} · {unitOf(p)}
                          </small>
                        </span>
                      </button>
                    </td>
                    {columnOptions
                      .filter(([id]) => columns.includes(id))
                      .map(([id]) => (
                        <td
                          key={id}
                          className={
                            [
                              "stock",
                              "price",
                              "cost",
                              "available",
                              "reserved",
                              "margin",
                            ].includes(id)
                              ? "align-right amount"
                              : undefined
                          }
                        >
                          {id === "itemType" ? (
                            <span className="category-label">
                              {typeOf(p) === "material"
                                ? "Raw material"
                                : "Finished good"}
                            </span>
                          ) : id === "unit" ? (
                            unitOf(p)
                          ) : id === "status" ? (
                            <Status status={stockStatus(p)} />
                          ) : id === "category" ? (
                            <span className="category-label">{p.category}</span>
                          ) : id === "available" ? (
                            available(state, p.id)
                          ) : id === "reserved" ? (
                            reserved(state, p.id)
                          ) : id === "price" ? (
                            typeOf(p) === "material" ? (
                              "—"
                            ) : (
                              money(p.price)
                            )
                          ) : id === "cost" ? (
                            money(p.cost)
                          ) : id === "margin" ? (
                            `${p.price ? (((p.price - p.cost) / p.price) * 100).toFixed(1) : 0}%`
                          ) : (
                            p[id as "stock" | "location"]
                          )}
                        </td>
                      ))}
                    <td>
                      <ArrowUpRight size={14} className="row-arrow" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>
            {products.length} of {state.products.length} products
            {category !== "all" && ` · ${category}`}
          </span>
          <span>
            <span className="mini-dot" />
            Live database · USD
            <button className="text-button" onClick={() => setSaveView(true)}>
              <Save size={13} />
              Save view
            </button>
          </span>
        </div>
      </section>
      <div className="database-tip">
        <Columns3 size={16} />
        <span>
          Your views, your rules. Filter, sort, and choose properties, then save
          the view to use it again.
        </span>
      </div>
      {saveView && (
        <Modal
          title="Save this view"
          subtitle="Keep its filters, sort order, layout, and visible properties."
          onClose={() => setSaveView(false)}
        >
          <form
            className="record-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get("name"),
              ).trim();
              if (!name) return;
              const id = crypto.randomUUID();
              const view: InventoryView = {
                id,
                name,
                stock,
                category,
                sort,
                columns: [...columns],
                layout,
                itemType,
              };
              setPreferences({ savedViews: [...preferences.savedViews, view] });
              setActiveView(id);
              setSaveView(false);
              notify("View saved.");
            }}
          >
            <label>
              View name
              <input
                name="name"
                placeholder="e.g. Furniture to reorder"
                maxLength={50}
                required
                autoFocus
              />
            </label>
            {activeView && (
              <button
                type="button"
                className="text-button danger-text"
                onClick={() => {
                  setPreferences({
                    savedViews: preferences.savedViews.filter(
                      (v) => v.id !== activeView,
                    ),
                  });
                  setActiveView("");
                  setSaveView(false);
                  notify("Saved view removed.");
                }}
              >
                <Trash2 size={14} />
                Remove current saved view
              </button>
            )}
            <div className="form-footer">
              <button
                type="button"
                className="button"
                onClick={() => setSaveView(false)}
              >
                Cancel
              </button>
              <button className="button button-primary">
                <Save size={15} />
                Save view
              </button>
            </div>
          </form>
        </Modal>
      )}
      {adjust && (
        <StockAdjustment
          state={state}
          productIds={selected}
          onClose={() => setAdjust(false)}
          onAction={onAction}
        />
      )}
    </div>
  );
}

export function StockAdjustment({
  state,
  productIds,
  onClose,
  onAction,
}: Pick<ViewProps, "state"> & {
  productIds: string[];
  onClose: () => void;
  onAction: (action: Action, message: string) => boolean;
}) {
  const products = state.products.filter((p) => productIds.includes(p.id));
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const changes = products.map((p) => ({
      productId: p.id,
      stock: Number(f.get(p.id)),
    }));
    if (
      onAction(
        { type: "adjust-stock", changes, reason: String(f.get("reason")) },
        "Stock adjusted. All linked views are updated.",
      )
    )
      onClose();
    else
      setError(
        "Adjustment was not applied. Check reserved units and the error message.",
      );
  }
  return (
    <Modal
      title="Adjust stock"
      subtitle="Set physical on-hand quantities. Reserved units are protected."
      onClose={onClose}
      wide
    >
      <form className="record-form" onSubmit={submit}>
        <div className="adjustment-heading">
          <span>Product</span>
          <span>Reserved</span>
          <span>New on hand</span>
        </div>
        {products.map((p) => (
          <div className="adjustment-row" key={p.id}>
            <span>
              <ProductArt product={p} />
              <strong>{p.name}</strong>
            </span>
            <span>{reserved(state, p.id)}</span>
            <input
              aria-label={`New stock for ${p.name}`}
              name={p.id}
              defaultValue={p.stock}
              min={reserved(state, p.id)}
              max={1e9}
              step={unitOf(p) === "pcs" ? 1 : 0.000001}
              type="number"
              required
            />
          </div>
        ))}
        <label className="adjustment-reason">
          Reason for adjustment
          <input
            name="reason"
            placeholder="e.g. Physical stock count, damaged units…"
            required
            maxLength={300}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary">
            <Check size={15} />
            Apply adjustment
          </button>
        </div>
      </form>
    </Modal>
  );
}
