"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutList,
  Mail,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import clsx from "clsx";
import {
  type Order,
  downloadCsv,
  money,
  number,
  shortDate,
  total,
} from "@/lib/domain";
import { Avatar, Empty, Metric, Status } from "./ui";
import type { ViewProps } from "./dashboard";

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="table-search">
      <Search size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          ×
        </button>
      )}
    </div>
  );
}

export function Orders({
  state,
  open,
  notify,
  finance = false,
}: ViewProps & { finance?: boolean }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All orders");
  const [board, setBoard] = useState(false);
  const [page, setPage] = useState(0);
  const orders = state.orders.filter((o) => {
    const customer = state.customers.find((c) => c.id === o.customerId)!;
    return (
      `${o.number} ${customer.company} ${customer.name}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (tab === "All orders" ||
        (tab === "Paid"
          ? o.paid && o.status !== "Cancelled"
          : tab === "Unpaid"
            ? !o.paid && o.status !== "Cancelled"
            : o.status === tab))
    );
  });
  const pages = Math.max(1, Math.ceil(orders.length / 10));
  const current = Math.min(page, pages - 1);
  const tabs = finance
    ? ["All orders", "Paid", "Unpaid"]
    : ["All orders", "Processing", "Shipped", "Delivered", "Cancelled"];
  const sales = state.orders.filter((o) => o.status !== "Cancelled");
  const amount = (paid: boolean) =>
    sales.filter((o) => o.paid === paid).reduce((n, o) => n + total(o), 0);
  function exportOrders() {
    downloadCsv(finance ? "forma-payments.csv" : "forma-orders.csv", [
      ["Order", "Customer", "Date", "Status", "Payment", "Total"],
      ...orders.map((o) => [
        o.number,
        state.customers.find((c) => c.id === o.customerId)!.company,
        o.createdAt.slice(0, 10),
        o.status,
        o.paid ? "Paid" : "Unpaid",
        total(o),
      ]),
    ]);
    notify(`${orders.length} orders exported.`);
  }
  const openOrder = (order: Order) =>
    open({ type: "order-detail", id: order.id });
  return (
    <div className="animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {finance ? (
              <ArrowDownToLine size={14} />
            ) : (
              <ShoppingBag size={14} />
            )}
            {finance
              ? "Keep your cash flow in focus"
              : "Every order, a new possibility"}
          </div>
          <h1>
            {finance ? "Payments" : "Sales orders"}
            <span className="heading-period">.</span>
          </h1>
          <p>
            {finance
              ? "Track order payments and see where things stand."
              : "Track, fulfill, and manage your customer orders."}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={exportOrders}>
            <ArrowDownToLine size={15} />
            Export
          </button>
          <button
            className="button button-primary"
            onClick={() => open({ type: "order" })}
          >
            <Plus size={16} />
            New order
          </button>
        </div>
      </div>
      {finance && (
        <>
          <div className="metrics-grid three-metrics">
            <Metric
              title="Total order value"
              value={money(amount(true) + amount(false))}
              description="across non-cancelled orders"
              onClick={() => setTab("All orders")}
            />
            <Metric
              title="Payments received"
              value={money(amount(true))}
              description="marked paid in your workspace"
              onClick={() => setTab("Paid")}
            />
            <Metric
              title="Awaiting payment"
              value={money(amount(false))}
              description={`${sales.filter((o) => !o.paid).length} unpaid orders`}
              onClick={() => setTab("Unpaid")}
            />
          </div>
          <div className="notice-inline">
            Payment tracking for your workspace. This version does not process
            payments or calculate tax.
          </div>
        </>
      )}
      <section className="panel database-panel">
        <div className="database-tabs">
          <div className="tabs">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setPage(0);
                }}
                className={clsx(tab === t && "active")}
              >
                {t}
                <span>
                  {t === "All orders"
                    ? state.orders.length
                    : state.orders.filter((o) =>
                        t === "Paid"
                          ? o.paid && o.status !== "Cancelled"
                          : t === "Unpaid"
                            ? !o.paid && o.status !== "Cancelled"
                            : o.status === t,
                      ).length}
                </span>
              </button>
            ))}
          </div>
          {!finance && (
            <div className="view-toggle">
              <button
                aria-label="Orders table view"
                aria-pressed={!board}
                className={clsx(!board && "active")}
                onClick={() => setBoard(false)}
              >
                <LayoutList size={16} />
              </button>
              <button
                aria-label="Orders board view"
                aria-pressed={board}
                className={clsx(board && "active")}
                onClick={() => setBoard(true)}
              >
                <Columns3 size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="database-toolbar">
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
            placeholder="Search orders or customers…"
          />
          <span className="toolbar-note">{orders.length} orders in view</span>
        </div>
        {orders.length ? (
          board && !finance ? (
            <div className="orders-board">
              {["Processing", "Shipped", "Delivered", "Cancelled"].map(
                (status) => (
                  <section key={status}>
                    <div className="board-heading">
                      <Status status={status} />
                      <span>
                        {orders.filter((o) => o.status === status).length}
                      </span>
                    </div>
                    {orders
                      .filter((o) => o.status === status)
                      .map((o) => {
                        const c = state.customers.find(
                          (c) => c.id === o.customerId,
                        )!;
                        return (
                          <button
                            key={o.id}
                            className="board-card"
                            onClick={() => openOrder(o)}
                          >
                            <span>
                              {o.number}
                              <ArrowUpRight size={13} />
                            </span>
                            <strong>{c.company}</strong>
                            <small>
                              {o.items.reduce((n, i) => n + i.quantity, 0)}{" "}
                              units · {shortDate(o.createdAt)}
                            </small>
                            <div>
                              <Avatar name={c.name} color={c.color} small />
                              <b>{money(total(o))}</b>
                            </div>
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
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th className="align-right">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(current * 10, current * 10 + 10).map((o) => {
                    const c = state.customers.find(
                      (c) => c.id === o.customerId,
                    )!;
                    return (
                      <tr key={o.id} onClick={() => openOrder(o)}>
                        <td>
                          <button className="record-link">{o.number}</button>
                        </td>
                        <td>
                          <div className="customer-cell">
                            <Avatar name={c.name} color={c.color} small />
                            <div>
                              <strong>{c.company}</strong>
                              <span className="cell-subtitle">{c.name}</span>
                            </div>
                          </div>
                        </td>
                        <td>{shortDate(o.createdAt)}</td>
                        <td>
                          <Status status={o.status} />
                        </td>
                        <td>
                          <Status
                            status={
                              o.status === "Cancelled"
                                ? "—"
                                : o.paid
                                  ? "Paid"
                                  : "Unpaid"
                            }
                          />
                        </td>
                        <td className="align-right amount">
                          {money(total(o))}
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
          )
        ) : (
          <Empty
            title="A clean slate"
            text="No orders match this view. Try another search or create a new order."
          />
        )}
        <div className="table-footer">
          <span>
            {orders.length
              ? board
                ? `${orders.length} orders in this view`
                : `${current * 10 + 1}–${Math.min(current * 10 + 10, orders.length)} of ${orders.length} orders`
              : "0 orders"}
          </span>
          {!board && (
            <div className="pagination">
              <button
                className="button button-small"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span>
                {current + 1} / {pages}
              </span>
              <button
                className="button button-small"
                disabled={current >= pages - 1}
                onClick={() => setPage(current + 1)}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function Purchasing({ state, open, notify }: ViewProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All purchases");
  const purchases = state.purchases.filter(
    (p) =>
      `${p.number} ${p.supplier}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (tab === "All purchases" || p.status === tab),
  );
  return (
    <div className="animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Truck size={14} />
            Keep the good things coming
          </div>
          <h1>
            Purchasing<span className="heading-period">.</span>
          </h1>
          <p>Manage suppliers, incoming shipments, and replenishment.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button"
            onClick={() => {
              downloadCsv("forma-purchases.csv", [
                ["Purchase order", "Supplier", "Status", "Expected", "Total"],
                ...purchases.map((p) => [
                  p.number,
                  p.supplier,
                  p.status,
                  p.expectedAt,
                  total(p),
                ]),
              ]);
              notify("Purchase orders exported.");
            }}
          >
            <ArrowDownToLine size={15} />
            Export
          </button>
          <button
            className="button button-primary"
            onClick={() => open({ type: "purchase" })}
          >
            <Plus size={16} />
            New purchase
          </button>
        </div>
      </div>
      <div className="metrics-grid three-metrics">
        <Metric
          title="On the way"
          value={String(
            state.purchases.filter((p) => p.status === "Ordered").length,
          ).padStart(2, "0")}
          description="purchase orders awaiting arrival"
          onClick={() => setTab("Ordered")}
        />
        <Metric
          title="Incoming units"
          value={number(
            state.purchases
              .filter((p) => p.status === "Ordered")
              .reduce(
                (n, p) => n + p.items.reduce((s, i) => s + i.quantity, 0),
                0,
              ),
          )}
          description="a little more room to grow"
          onClick={() => setTab("Ordered")}
        />
        <Metric
          title="Open purchasing value"
          value={money(
            state.purchases
              .filter((p) => p.status === "Ordered")
              .reduce((n, p) => n + total(p), 0),
          )}
          description="committed to incoming inventory"
          onClick={() => setTab("All purchases")}
        />
      </div>
      <section className="panel database-panel">
        <div className="database-tabs">
          <div className="tabs">
            {["All purchases", "Ordered", "Received"].map((t) => (
              <button
                key={t}
                className={clsx(tab === t && "active")}
                onClick={() => setTab(t)}
              >
                {t}
                <span>
                  {
                    state.purchases.filter(
                      (p) => t === "All purchases" || p.status === t,
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="database-toolbar">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search purchase orders or suppliers…"
          />
        </div>
        {purchases.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Purchase order</th>
                  <th>Supplier</th>
                  <th>Expected arrival</th>
                  <th>Status</th>
                  <th className="align-right">Units</th>
                  <th className="align-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => open({ type: "purchase-detail", id: p.id })}
                  >
                    <td>
                      <button className="record-link">{p.number}</button>
                      <span className="cell-subtitle">
                        {shortDate(p.createdAt)}
                      </span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <span className="supplier-avatar">
                          <Truck size={15} />
                        </span>
                        <strong>{p.supplier}</strong>
                      </div>
                    </td>
                    <td>{shortDate(p.expectedAt)}</td>
                    <td>
                      <Status status={p.status} />
                    </td>
                    <td className="align-right">
                      {p.items.reduce((n, i) => n + i.quantity, 0)}
                    </td>
                    <td className="align-right amount">{money(total(p))}</td>
                    <td>
                      <ArrowUpRight className="row-arrow" size={14} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Nothing on the way just yet"
            text="Create a purchase order to plan your next restock."
          />
        )}
        <div className="table-footer">
          <span>{purchases.length} purchase orders</span>
          <span>
            <Package size={13} />
            Receive a shipment to update stock automatically
          </span>
        </div>
      </section>
    </div>
  );
}

export function Customers({ state, open, notify }: ViewProps) {
  const [search, setSearch] = useState("");
  const customers = state.customers.filter((c) =>
    `${c.name} ${c.company} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="animate-in">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Users size={14} />
            Good people. Great possibilities.
          </div>
          <h1>
            Customers<span className="heading-period">.</span>
          </h1>
          <p>Your customer records and their order history.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button"
            onClick={() => {
              downloadCsv("forma-customers.csv", [
                ["Name", "Company", "Email", "Orders", "Lifetime sales"],
                ...customers.map((c) => {
                  const orders = state.orders.filter(
                    (o) => o.customerId === c.id && o.status !== "Cancelled",
                  );
                  return [
                    c.name,
                    c.company,
                    c.email,
                    orders.length,
                    orders.reduce((n, o) => n + total(o), 0),
                  ];
                }),
              ]);
              notify("Your customer directory is exported.");
            }}
          >
            <ArrowDownToLine size={15} />
            Export
          </button>
          <button
            className="button button-primary"
            onClick={() => open({ type: "customer" })}
          >
            <Plus size={16} />
            Add customer
          </button>
        </div>
      </div>
      <div className="customer-directory-head">
        <h2>
          Your people{" "}
          <span className="count-pill">{state.customers.length}</span>
        </h2>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Find a person or company…"
        />
      </div>
      {customers.length ? (
        <div className="customer-grid">
          {customers.map((c) => {
            const orders = state.orders.filter(
              (o) => o.customerId === c.id && o.status !== "Cancelled",
            );
            return (
              <button
                key={c.id}
                className="customer-card"
                onClick={() => open({ type: "customer", customer: c })}
              >
                <div className="customer-card-top">
                  <Avatar name={c.name} color={c.color} />
                  <ArrowUpRight size={16} />
                </div>
                <h3>{c.company}</h3>
                <p>{c.name}</p>
                <span className="customer-email">
                  <Mail size={13} />
                  {c.email}
                </span>
                <div className="customer-card-bottom">
                  <span>
                    <small>Orders</small>
                    <strong>{orders.length}</strong>
                  </span>
                  <span>
                    <small>Lifetime sales</small>
                    <strong>
                      {money(orders.reduce((n, o) => n + total(o), 0))}
                    </strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Still looking for your people?"
          text="Try a different name, company, or email address."
        />
      )}
      <div className="people-note">
        <Users size={17} />
        <span>Behind every order is a good connection. Keep yours close.</span>
      </div>
    </div>
  );
}
