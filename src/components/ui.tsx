"use client";

import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Inbox,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { Product } from "@/lib/domain";

export function Badge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "neutral";
  dot?: boolean;
}) {
  return (
    <span className={clsx("badge", `badge-${tone}`)}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  );
}
export function Status({ status }: { status: string }) {
  const tone = [
    "Delivered",
    "Received",
    "In stock",
    "Paid",
    "Completed",
    "Available",
  ].includes(status)
    ? "green"
    : ["Processing", "Low stock", "Ordered", "Unpaid", "In progress"].includes(
          status,
        )
      ? "amber"
      : ["Cancelled", "Out of stock", "Shortage"].includes(status)
        ? "red"
        : ["Shipped", "Planned"].includes(status)
          ? "blue"
          : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
export function Avatar({
  name,
  color = "#e9e4db",
  small = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
}) {
  return (
    <span
      className={clsx("avatar", small && "avatar-small")}
      style={{ background: color }}
    >
      {name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
export function Empty({
  title = "A little room for something new",
  text = "Try another search or add your first record.",
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={24} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function Metric({
  title,
  value,
  change,
  description,
  spark,
  accent = false,
  onClick,
}: {
  title: string;
  value: string;
  change?: string;
  description: string;
  spark?: number[];
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={clsx("metric-card", accent && "metric-accent")}
      onClick={onClick}
    >
      <div className="metric-label">
        {title}
        <ArrowUpRight size={15} />
      </div>
      <div className="metric-main">
        <strong>{value}</strong>
        {spark && <Sparkline values={spark} amber={accent} />}
      </div>
      <div className="metric-foot">
        {change && (
          <span className={clsx("metric-change", accent && "change-amber")}>
            {accent ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
            {change}
          </span>
        )}
        <span>{description}</span>
      </div>
    </button>
  );
}
export function Sparkline({
  values,
  amber,
}: {
  values: number[];
  amber?: boolean;
}) {
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * 95},${34 - ((v - min) / (max - min || 1)) * 29}`,
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 98 40" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={amber ? "#b59a66" : "#6c9c82"}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function ProductArt({
  product,
  large = false,
}: {
  product: Pick<Product, "kind" | "color" | "name">;
  large?: boolean;
}) {
  return (
    <span
      className={clsx("product-art", large && "product-art-large")}
      style={{ background: product.color }}
    >
      <svg viewBox="0 0 64 64" fill="none" role="img" aria-label={product.name}>
        <ellipse cx="32" cy="52" rx="20" ry="3" fill="#000" opacity=".055" />
        {product.kind === "lamp" && (
          <>
            <path d="M30 29h4v21h-4z" fill="#947e58" />
            <ellipse cx="32" cy="50" rx="12" ry="3" fill="#766545" />
            <path d="M19 13h26l7 20H12z" fill="#c3b294" />
            <path d="M19 13h26l-3 4H22z" fill="#e0d3b9" />
            <path d="M32 16v16" stroke="#b2a184" />
          </>
        )}
        {product.kind === "chair" && (
          <>
            <path
              d="m17 37-3 17m28-17 4 17m-21-15 1 14m23-21 2 17"
              stroke="#7e6341"
              strokeWidth="3"
            />
            <path d="M18 13c0-5 27-5 28 0l-2 22H20z" fill="#899279" />
            <path d="M16 30c5-4 29-4 33 1v10H16z" fill="#a6ad94" />
            <path d="M14 23v15m36-15v15" stroke="#7e6341" strokeWidth="3" />
            <path
              d="M12 23h11m20 0h10"
              stroke="#9b805c"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}
        {product.kind === "vase" && (
          <>
            <path
              d="M26 11h12v12c0 5 11 10 11 21 0 9-34 9-34 0 0-11 11-16 11-21z"
              fill="#be836a"
            />
            <ellipse cx="32" cy="11" rx="6" ry="2" fill="#95634e" />
            <path
              d="M26 30c-7 7-9 13-5 17"
              stroke="#d3a28b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
        {product.kind === "shelf" && (
          <>
            <path d="m9 29 34-9 13 8-36 12z" fill="#c7a475" />
            <path d="m9 29 11 7 36-8v5L20 45 9 37z" fill="#a78356" />
            <path d="m20 36 36-8" stroke="#e6c79c" />
            <path d="m22 39 1 10m22-16 1 10" stroke="#735d40" strokeWidth="2" />
          </>
        )}
        {product.kind === "stool" && (
          <>
            <path
              d="m20 28-4 24m28-24 4 24m-17-24 1 24"
              stroke="#b4aa96"
              strokeWidth="6"
            />
            <ellipse cx="32" cy="25" rx="22" ry="10" fill="#c8c1b2" />
            <path
              d="M10 25v5c3 12 41 12 44 0v-5c-2 12-42 12-44 0"
              fill="#afa796"
            />
          </>
        )}
        {product.kind === "tray" && (
          <>
            <path d="m8 32 32-13 17 13-31 17z" fill="#bd925c" />
            <path d="m12 31 27-10 13 11-27 13z" fill="#d8b684" />
            <path d="m8 32 18 12 31-12v6L26 54 8 39z" fill="#ab7e48" />
            <path d="m26 44 31-12" stroke="#ead0a7" />
          </>
        )}
        {product.kind === "clock" && (
          <>
            <circle cx="32" cy="31" r="22" fill="#88978d" />
            <circle cx="32" cy="31" r="19" fill="#f6f4eb" />
            <path
              d="M32 17v14l9 6"
              stroke="#4e5d52"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="32" cy="31" r="2" fill="#4e5d52" />
            <path d="M32 14v2m0 30v2M15 31h2m30 0h2" stroke="#a3a69b" />
          </>
        )}
        {product.kind === "planter" && (
          <>
            <path d="M20 28h24l-4 23H24z" fill="#b57f5d" />
            <ellipse cx="32" cy="28" rx="12" ry="4" fill="#835e43" />
            <path
              d="M32 29V12m0 11c-12 1-17-7-15-13 9 0 15 4 15 13m0-5c0-9 8-13 14-12 0 9-5 13-14 12"
              stroke="#6b8060"
              strokeWidth="2"
              fill="#7d9270"
            />
          </>
        )}
      </svg>
    </span>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  variant = "dialog",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  variant?: "dialog" | "inspector";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    const element = dialog.current;
    if (variant === "inspector") element?.show();
    else element?.showModal();
    const previous = document.body.style.overflow;
    if (variant !== "inspector") document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        variant === "inspector" &&
        !document.querySelector("dialog:modal")
      )
        close();
    };
    document.addEventListener("keydown", escape);
    return () => {
      element?.close();
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [variant]);
  return (
    <dialog
      ref={dialog}
      className={clsx(
        "modal",
        wide && "modal-wide",
        variant === "inspector" && "modal-inspector",
      )}
      aria-modal={variant !== "inspector"}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <span className="select-wrap">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </span>
  );
}
export function Toast({
  message,
  error = false,
  onClose,
  inDialog = false,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
  inDialog?: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  const dialogs =
    inDialog && typeof document !== "undefined"
      ? document.querySelectorAll("dialog[open]")
      : [];
  const target =
    (inDialog ? document.querySelector("dialog:modal") : null) ??
    dialogs[dialogs.length - 1] ??
    (typeof document !== "undefined" ? document.body : null);
  const element = (
    <div
      className={clsx("toast", error && "toast-error")}
      role={error ? "alert" : "status"}
    >
      <span className="toast-check">
        {error ? <X size={16} /> : <Check size={16} />}
      </span>
      {message}
      <button aria-label="Dismiss notification" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
  return target ? createPortal(element, target) : element;
}
