"use client";

import { useSyncExternalStore } from "react";
import {
  type AppState,
  createDemoState,
  transition,
  type Action,
} from "./domain";
import {
  typeOf,
  unitOf,
  units,
  validManufacturing,
  validQuantity,
  upgradeManufacturing,
} from "./manufacturing";

const KEY = "forma.workspace.v1";
const initial = createDemoState();
let snapshot = initial;
let loaded = false;
let storageWarning = "";
const listeners = new Set<() => void>();

function validState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const s = value as AppState;
  if (
    s.version !== 1 ||
    !s.settings ||
    typeof s.settings.name !== "string" ||
    typeof s.settings.owner !== "string"
  )
    return false;
  if (
    ![
      s.products,
      s.orders,
      s.customers,
      s.purchases,
      s.documents,
      s.activities,
    ].every(Array.isArray)
  )
    return false;
  return (
    s.products.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.sku === "string" &&
        typeof p.category === "string" &&
        typeof p.location === "string" &&
        typeof p.kind === "string" &&
        typeof p.color === "string" &&
        [p.price, p.cost, p.stock, p.reorderAt].every(
          (n) => Number.isFinite(n) && n >= 0,
        ) &&
        units.includes(unitOf(p)) &&
        ["material", "finished"].includes(typeOf(p)) &&
        validQuantity(p.stock, p, true) &&
        validQuantity(p.reorderAt, p, true),
    ) &&
    s.customers.every((c) =>
      [c.id, c.name, c.company, c.email, c.color].every(
        (v) => typeof v === "string",
      ),
    ) &&
    [...s.orders, ...s.purchases].every(
      (o) =>
        typeof o.id === "string" &&
        typeof o.number === "string" &&
        typeof o.createdAt === "string" &&
        Array.isArray(o.items) &&
        o.items.every(
          (i) =>
            s.products.some((p) => p.id === i.productId) &&
            validQuantity(
              i.quantity,
              s.products.find((p) => p.id === i.productId)!,
            ) &&
            Number.isFinite(i.price) &&
            i.price >= 0,
        ),
    ) &&
    s.orders.every(
      (o) =>
        ["Processing", "Shipped", "Delivered", "Cancelled"].includes(
          o.status,
        ) &&
        typeof o.paid === "boolean" &&
        s.customers.some((c) => c.id === o.customerId),
    ) &&
    s.purchases.every(
      (p) =>
        ["Ordered", "Received"].includes(p.status) &&
        typeof p.supplier === "string" &&
        typeof p.expectedAt === "string",
    ) &&
    s.documents.every(
      (d) =>
        [d.id, d.title, d.content, d.icon, d.updatedAt].every(
          (v) => typeof v === "string",
        ) &&
        (d.blocks === undefined ||
          (Array.isArray(d.blocks) &&
            d.blocks.every(
              (b) =>
                b &&
                typeof b.id === "string" &&
                typeof b.text === "string" &&
                [
                  "text",
                  "heading",
                  "todo",
                  "bullet",
                  "callout",
                  "divider",
                  "inventory",
                  "orders",
                  "production",
                ].includes(b.type) &&
                (b.checked === undefined || typeof b.checked === "boolean") &&
                (b.config === undefined ||
                  (b.config &&
                    typeof b.config === "object" &&
                    (b.config.search === undefined ||
                      typeof b.config.search === "string") &&
                    (b.config.filter === undefined ||
                      typeof b.config.filter === "string") &&
                    (b.config.layout === undefined ||
                      ["table", "board"].includes(b.config.layout)))),
            ))),
    ) &&
    validManufacturing(s.manufacturing, s.products) &&
    s.activities.every((a) =>
      [a.id, a.text, a.detail, a.type, a.at].every(
        (v) => typeof v === "string",
      ),
    )
  );
}
function getSnapshot() {
  if (typeof window !== "undefined" && !loaded) {
    loaded = true;
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed: unknown = upgradeManufacturing(JSON.parse(stored));
        if (validState(parsed)) snapshot = parsed;
        else
          storageWarning =
            "Saved data could not be read. Demo data is shown; export a backup before resetting.";
      }
    } catch {
      storageWarning =
        "Browser storage is unavailable. Changes will last for this session only.";
    }
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function persist(next: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    storageWarning =
      "Browser storage is full or unavailable. Changes will last for this session only.";
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export function dispatch(action: Action) {
  persist(transition(getSnapshot(), action));
}
export function resetDemo() {
  storageWarning = "";
  persist(createDemoState());
}
export function useWorkspace() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => initial);
  return { state, dispatch, resetDemo, storageWarning };
}
