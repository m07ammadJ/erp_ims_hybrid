"use client";

import { useSyncExternalStore } from "react";

export interface InventoryView {
  id: string;
  name: string;
  stock: string;
  category: string;
  sort: string;
  columns: string[];
  layout: "table" | "grid";
}
interface Preferences {
  collapsed: boolean;
  density: "comfortable" | "compact";
  fullWidth: boolean;
  columns: string[];
  savedViews: InventoryView[];
}
const initial: Preferences = {
  collapsed: false,
  density: "comfortable",
  fullWidth: true,
  columns: ["category", "status", "stock", "available", "price", "location"],
  savedViews: [],
};
let snapshot = initial,
  loaded = false;
const listeners = new Set<() => void>();
const key = "forma.preferences.v2";
function getSnapshot() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      if (
        raw &&
        typeof raw.collapsed === "boolean" &&
        ["comfortable", "compact"].includes(raw.density) &&
        typeof raw.fullWidth === "boolean" &&
        Array.isArray(raw.columns) &&
        raw.columns.every((v: unknown) => typeof v === "string") &&
        Array.isArray(raw.savedViews)
      ) {
        snapshot = {
          ...initial,
          ...raw,
          savedViews: raw.savedViews.filter(
            (v: InventoryView) =>
              v &&
              typeof v.id === "string" &&
              typeof v.name === "string" &&
              Array.isArray(v.columns) &&
              typeof v.stock === "string" &&
              typeof v.category === "string" &&
              typeof v.sort === "string" &&
              ["table", "grid"].includes(v.layout),
          ),
        };
      }
    } catch {
      /* Preferences are optional; business data lives in the separate workspace store. */
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
export function setPreferences(change: Partial<Preferences>) {
  snapshot = { ...getSnapshot(), ...change };
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* Keep preferences for this session when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}
export function usePreferences() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}
