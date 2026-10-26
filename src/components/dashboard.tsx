"use client";

import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Box,
  CircleCheck,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  type AppState,
  type View,
  downloadCsv,
  money,
  number,
  reportingDate,
  shortDate,
  total,
} from "@/lib/domain";
import { Avatar, Badge, Metric, ProductArt, Select, Status } from "./ui";
import { InventoryHealth, RevenueChart } from "./charts";
import type { RecordModal } from "./forms";

export interface ViewProps {
  state: AppState;
  navigate: (view: View) => void;
  open: (modal: RecordModal) => void;
  notify: (message: string, error?: boolean) => void;
}

export function Dashboard({ state, navigate, open }: ViewProps) {
  const [period, setPeriod] = useState("month");
  const anchor = reportingDate(state);
  const startDate = new Date(anchor);
  startDate.setUTCMonth(
    startDate.getUTCMonth() - (period === "quarter" ? 3 : 0),
    1,
  );
  const start = period === "all" ? "2000-01-01" : startDate.toISOString();
  const monthLabel = anchor.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const orders = state.orders.filter(
    (o) => o.createdAt >= start && o.status !== "Cancelled",
  );
  const revenue = orders.reduce((n, o) => n + total(o), 0);
  const pending = state.orders.filter((o) => o.status === "Processing");
  const value = state.products.reduce((n, p) => n + p.cost * p.stock, 0);
  const low = state.products.filter((p) => p.stock <= p.reorderAt);
  const dailyOrders = Array.from({ length: 8 }, (_, i) => {
    const date = new Date(anchor);
    date.setUTCDate(date.getUTCDate() - 7 + i);
    return state.orders.filter(
      (o) =>
        o.status !== "Cancelled" &&
        o.createdAt.slice(0, 10) === date.toISOString().slice(0, 10),
    );
  });
  return (
    <div className="dashboard animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Sun size={14} />A fresh perspective,{" "}
            {state.settings.owner.split(" ")[0]}
          </div>
          <h1>
            Your business, in view<span className="heading-period">.</span>
          </h1>
          <p>A little more clarity. A lot more possibility.</p>
        </div>
        <div className="heading-actions">
          <Select
            label="Dashboard date range"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "month", label: monthLabel },
              { value: "quarter", label: "Last 4 months" },
              { value: "all", label: "All time" },
            ]}
          />
          <button
            className="button button-primary"
            onClick={() => open({ type: "order" })}
          >
            <Plus size={16} />
            New order
          </button>
        </div>
      </div>
      <div className="overview-banner">
        <div className="banner-symbol">
          <Sparkles size={21} strokeWidth={1.4} />
        </div>
        <div>
          <strong>Everything connected. Room to grow.</strong>
          <p>Your people, products, and progress. All in one happy place.</p>
        </div>
        <button onClick={() => navigate("documents")}>
          Explore your workspace
          <ArrowRight size={15} />
        </button>
        <div className="banner-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="section-caption">
        <span>THE BIG PICTURE</span>
        <span className="live-label">
          <i />
          Live from your workspace
        </span>
      </div>
      <div className="metrics-grid">
        <Metric
          title="Total sales"
          value={money(revenue)}
          description={
            period === "all" ? "across all sales orders" : "in this period"
          }
          spark={dailyOrders.map((orders) =>
            orders.reduce((n, o) => n + total(o), 0),
          )}
          onClick={() => navigate("reports")}
        />
        <Metric
          title="Orders to fulfill"
          value={String(pending.length).padStart(2, "0")}
          description={`${state.orders.filter((o) => o.status === "Shipped").length} more on their way`}
          spark={dailyOrders.map(
            (orders) => orders.filter((o) => o.status === "Processing").length,
          )}
          onClick={() => navigate("orders")}
        />
        <Metric
          title="Inventory value"
          value={money(value)}
          description={`${number(state.products.reduce((n, p) => n + p.stock, 0))} units, full of potential`}
          spark={state.products.map((p) => p.stock * p.cost)}
          onClick={() => navigate("inventory")}
        />
        <Metric
          title="Low-stock products"
          value={String(low.length).padStart(2, "0")}
          description="a little attention needed"
          accent
          onClick={() => navigate("inventory")}
        />
      </div>
      <div className="dashboard-middle">
        <RevenueChart state={state} />
        <InventoryHealth
          state={state}
          onInventory={() => navigate("inventory")}
          onReorder={(productId) => open({ type: "purchase", productId })}
        />
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-orders">
          <div className="panel-heading">
            <div>
              <h2>
                Recent orders{" "}
                <span className="count-pill">{state.orders.length}</span>
              </h2>
              <p>From a new connection to a happy doorstep.</p>
            </div>
            <button className="text-button" onClick={() => navigate("orders")}>
              View all orders
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="align-right">Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.orders.slice(0, 4).map((order) => {
                  const c = state.customers.find(
                    (c) => c.id === order.customerId,
                  )!;
                  return (
                    <tr
                      key={order.id}
                      onClick={() =>
                        open({ type: "order-detail", id: order.id })
                      }
                    >
                      <td>
                        <button className="record-link">{order.number}</button>
                        <span className="cell-subtitle">
                          {shortDate(order.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <Avatar name={c.name} color={c.color} small />
                          <span>{c.company}</span>
                        </div>
                      </td>
                      <td>
                        <Status status={order.status} />
                      </td>
                      <td className="align-right amount">
                        {money(total(order))}
                      </td>
                      <td>
                        <ArrowUpRight size={14} className="row-arrow" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Around your workspace</h2>
              <p>The small things moving you forward.</p>
            </div>
            <span className="activity-live">
              <i />
            </span>
          </div>
          <div className="activity-list">
            {state.activities.slice(0, 4).map((a, i) => {
              const Icon =
                a.type === "order"
                  ? ShoppingBag
                  : a.type === "stock"
                    ? Package
                    : a.type === "payment"
                      ? CircleCheck
                      : Clock3;
              return (
                <div className="activity-item" key={a.id}>
                  <span className={`activity-icon activity-${a.type}`}>
                    <Icon size={15} />
                  </span>
                  <div>
                    <strong>{a.text}</strong>
                    <p>{a.detail}</p>
                    <small>{i === 0 ? "Most recent" : shortDate(a.at)}</small>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="quick-links">
        <span>MAKE SPACE FOR WHAT’S NEXT</span>
        <button onClick={() => open({ type: "product" })}>
          <Box size={16} />
          Add a product
          <ArrowUpRight size={13} />
        </button>
        <button onClick={() => open({ type: "customer" })}>
          <Plus size={16} />
          Meet a new customer
          <ArrowUpRight size={13} />
        </button>
        <button onClick={() => navigate("reports")}>
          <TrendingUp size={16} />
          Find your next insight
          <ArrowUpRight size={13} />
        </button>
      </section>
      <footer className="page-footer">
        <span>
          <span className="forma-mini">f</span>A little structure. A lot of
          possibility.
        </span>
        <span>Made for the way you work.</span>
      </footer>
    </div>
  );
}

export function Reports({ state, navigate, open, notify }: ViewProps) {
  const [period, setPeriod] = useState("all");
  const anchor = reportingDate(state);
  const monthLabel = anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  anchor.setUTCDate(1);
  const orders = state.orders.filter(
    (o) =>
      o.status !== "Cancelled" &&
      (period === "all" || o.createdAt >= anchor.toISOString()),
  );
  const sales = orders.reduce((n, o) => n + total(o), 0);
  const costs = orders.reduce(
    (n, o) =>
      n +
      o.items.reduce(
        (sum, i) =>
          sum +
          (state.products.find((p) => p.id === i.productId)?.cost ?? 0) *
            i.quantity,
        0,
      ),
    0,
  );
  const products = state.products
    .map((p) => ({
      ...p,
      sold: orders.reduce(
        (n, o) =>
          n +
          o.items
            .filter((i) => i.productId === p.id)
            .reduce((s, i) => s + i.quantity, 0),
        0,
      ),
      revenue: orders.reduce(
        (n, o) =>
          n +
          o.items
            .filter((i) => i.productId === p.id)
            .reduce((s, i) => s + i.quantity * i.price, 0),
        0,
      ),
    }))
    .sort((a, b) => b.revenue - a.revenue);
  function exportReport() {
    downloadCsv("forma-product-performance.csv", [
      [
        "Product",
        "SKU",
        "Units ordered",
        "Sales",
        "Stock on hand",
        "Stock cost value",
      ],
      ...products.map((p) => [
        p.name,
        p.sku,
        p.sold,
        p.revenue,
        p.stock,
        p.stock * p.cost,
      ]),
    ]);
    notify("Your report is on its way to your downloads.");
  }
  return (
    <div className="animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <TrendingUp size={14} />A little perspective
          </div>
          <h1>
            Good things, in numbers<span className="heading-period">.</span>
          </h1>
          <p>Connect the dots. Find your next opportunity.</p>
        </div>
        <div className="heading-actions">
          <Select
            label="Report date range"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all", label: "All time" },
              { value: "month", label: monthLabel },
            ]}
          />
          <button className="button" onClick={exportReport}>
            <ArrowDownToLine size={15} />
            Export report
          </button>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          title="Gross sales"
          value={money(sales)}
          description="excluding cancelled orders"
          onClick={() => navigate("orders")}
        />
        <Metric
          title="Estimated gross profit"
          value={money(sales - costs)}
          description="sales less current product cost"
          onClick={() => navigate("finances")}
        />
        <Metric
          title="Average order value"
          value={money(orders.length ? sales / orders.length : 0)}
          description={`across ${orders.length} sales orders`}
          onClick={() => navigate("orders")}
        />
        <Metric
          title="Gross margin"
          value={`${sales ? (((sales - costs) / sales) * 100).toFixed(1) : 0}%`}
          description="based on current product costs"
          onClick={() => navigate("inventory")}
        />
      </div>
      <RevenueChart state={state} />
      <section className="panel report-products">
        <div className="panel-heading">
          <div>
            <h2>The products making a difference</h2>
            <p>Sales performance for your selected period.</p>
          </div>
          <Badge tone="green" dot={false}>
            {products.length} products
          </Badge>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th className="align-right">Units ordered</th>
                <th>Contribution</th>
                <th className="align-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => open({ type: "product", product: p })}
                >
                  <td>
                    <button className="product-cell record-link">
                      <ProductArt product={p} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.sku}</small>
                      </span>
                    </button>
                  </td>
                  <td>{p.category}</td>
                  <td className="align-right">{p.sold}</td>
                  <td>
                    <div className="contribution-track">
                      <span
                        style={{
                          width: `${sales ? (p.revenue / sales) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="align-right amount">{money(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="data-note">
        Sales include all non-cancelled orders. Gross profit estimates use
        current unit costs and exclude tax, shipping, and operating expenses.
      </p>
    </div>
  );
}
