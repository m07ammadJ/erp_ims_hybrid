"use client";

import { useId, useState } from "react";
import { money, reportingDate, type AppState } from "@/lib/domain";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import clsx from "clsx";

export function RevenueChart({ state }: { state: AppState }) {
  const [period, setPeriod] = useState("6 months");
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId().replace(/:/g, "");
  const anchor = reportingDate(state);
  const buckets = Array.from(
    { length: period === "6 months" ? 6 : period === "30 days" ? 6 : 7 },
    (_, i) => {
      const date = new Date(anchor);
      if (period === "6 months")
        date.setUTCMonth(date.getUTCMonth() - 5 + i, 1);
      else
        date.setUTCDate(
          date.getUTCDate() - (period === "30 days" ? 29 - i * 5 : 6 - i),
        );
      const end = new Date(date);
      if (period === "6 months") end.setUTCMonth(end.getUTCMonth() + 1);
      else end.setUTCDate(end.getUTCDate() + (period === "30 days" ? 5 : 1));
      const value = state.orders
        .filter(
          (o) =>
            o.status !== "Cancelled" &&
            new Date(o.createdAt) >= date &&
            new Date(o.createdAt) < end,
        )
        .reduce(
          (n, o) =>
            n + o.items.reduce((s, item) => s + item.quantity * item.price, 0),
          0,
        );
      return {
        label: date.toLocaleDateString(
          "en-US",
          period === "6 months"
            ? { month: "short", timeZone: "UTC" }
            : { month: "short", day: "numeric", timeZone: "UTC" },
        ),
        value,
      };
    },
  );
  const max = Math.max(...buckets.map((b) => b.value), 1000) * 1.2;
  const points = buckets.map((b, i) => [
    55 + (i / (buckets.length - 1)) * 640,
    186 - (b.value / max) * 160,
  ]);
  const path = points
    .map(([x, y], i) =>
      i === 0
        ? `M ${x} ${y}`
        : `C ${points[i - 1][0] + 43} ${points[i - 1][1]}, ${x - 43} ${y}, ${x} ${y}`,
    )
    .join(" ");
  const sum = buckets.reduce((n, b) => n + b.value, 0);
  return (
    <section className="panel revenue-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Revenue overview <ArrowUpRight className="subtle-dot" size={12} />
          </h2>
          <p>A little perspective on your progress.</p>
        </div>
        <div className="chart-tabs">
          {["6 months", "30 days", "7 days"].map((p) => (
            <button
              key={p}
              className={clsx(period === p && "active")}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="revenue-summary">
        <strong>{money(sum)}</strong>
        <span className="revenue-caption">in sales orders</span>
        <span className="chart-key">
          <i />
          Revenue
        </span>
      </div>
      <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
        <svg
          viewBox="0 0 720 225"
          role="img"
          aria-label={`Revenue over ${period}: ${buckets.map((b) => `${b.label} ${money(b.value)}`).join(", ")}`}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9cbda5" stopOpacity=".30" />
              <stop offset="100%" stopColor="#dce9dd" stopOpacity=".06" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="55"
                x2="698"
                y1={26 + i * 40}
                y2={26 + i * 40}
                stroke="#eeefea"
                strokeDasharray="3 4"
              />
              <text
                x="40"
                y={30 + i * 40}
                textAnchor="end"
                className="chart-label"
              >
                {money(max * (1 - i / 4), true)}
              </text>
            </g>
          ))}
          <path d={`${path} L 695 186 L 55 186 Z`} fill={`url(#${gradient})`} />
          <path
            d={path}
            stroke="#43785b"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {points.map(([x, y], i) => (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect
                x={x - 35}
                y="0"
                width="70"
                height="197"
                fill="transparent"
              />
              <text x={x} y="216" textAnchor="middle" className="chart-label">
                {buckets[i].label}
              </text>
              {hover === i && (
                <>
                  <line
                    x1={x}
                    x2={x}
                    y1="15"
                    y2="186"
                    stroke="#a9bdb0"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    stroke="white"
                    strokeWidth="2"
                    fill="#43785b"
                  />
                  <g
                    transform={`translate(${Math.min(618, Math.max(60, x - 39))},${Math.max(2, y - 34)})`}
                  >
                    <rect width="80" height="25" rx="5" fill="#254e40" />
                    <text
                      x="40"
                      y="17"
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                    >
                      {money(buckets[i].value)}
                    </text>
                  </g>
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="panel-footer">
        <span>
          <span className="mini-dot" />
          Every order is a step forward.
        </span>
        <span>
          {buckets[0].label} – {buckets[buckets.length - 1].label},{" "}
          {anchor.getUTCFullYear()}
          <ChevronDown size={12} />
        </span>
      </div>
    </section>
  );
}
export function InventoryHealth({
  state,
  onInventory,
  onReorder,
}: {
  state: AppState;
  onInventory: () => void;
  onReorder: (id: string) => void;
}) {
  const healthy = state.products.filter((p) => p.stock > p.reorderAt).length;
  const low = state.products.filter(
    (p) => p.stock > 0 && p.stock <= p.reorderAt,
  ).length;
  const out = state.products.filter((p) => p.stock === 0).length;
  const count = state.products.length || 1;
  return (
    <section className="panel health-panel">
      <div className="panel-heading">
        <div>
          <h2>Inventory health</h2>
          <p>The right stock. The right balance.</p>
        </div>
        <button
          className="icon-button"
          onClick={onInventory}
          aria-label="View inventory"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="health-visual">
        <div
          className="donut"
          style={{
            background: `conic-gradient(#5e8066 0% ${(healthy / count) * 100}%, #d7b780 ${(healthy / count) * 100}% ${((healthy + low) / count) * 100}%, #dba397 ${((healthy + low) / count) * 100}% 100%)`,
          }}
        >
          <div>
            <strong>
              {Math.round((healthy / count) * 100)}
              <small>%</small>
            </strong>
            <span>healthy stock</span>
          </div>
        </div>
        <div className="health-legend">
          {[
            ["In stock", healthy, "#5e8066"],
            ["Low stock", low, "#d7b780"],
            ["Out of stock", out, "#dba397"],
          ].map(([label, value, color]) => (
            <div key={label}>
              <i style={{ background: String(color) }} />
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="stock-alert">
        <span className="stock-alert-icon">!</span>
        <span>
          <strong>{low + out} products need a little attention</strong>
          <small>Stay one step ahead of low stock.</small>
        </span>
        <button
          aria-label="Reorder low stock"
          onClick={() =>
            onReorder(
              state.products.find((p) => p.stock <= p.reorderAt)?.id ?? "",
            )
          }
          disabled={!low && !out}
        >
          <ArrowUpRight size={17} />
        </button>
      </div>
    </section>
  );
}
