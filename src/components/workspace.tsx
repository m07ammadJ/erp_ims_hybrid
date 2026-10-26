"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  CreditCard,
  FileText,
  Grid2X2,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Truck,
  Users,
  ChartNoAxesCombined,
} from "lucide-react";
import clsx from "clsx";
import {
  type Action,
  type AppState,
  type View,
  shortDate,
  stockStatus,
  uid,
} from "@/lib/domain";
import { useWorkspace } from "@/lib/store";
import { setPreferences, usePreferences } from "@/lib/preferences";
import { Avatar, Badge, Modal, Toast } from "./ui";
import { Dashboard, Reports, type ViewProps } from "./dashboard";
import { Customers, Orders, Purchasing } from "./records";
import { InventoryWorkspace } from "./inventory-workspace";
import { RecordDialog, type RecordModal } from "./forms";
import { HelpDialog, Settings } from "./pages";
import { PageBuilder } from "./page-builder";

const navigation = [
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "orders", label: "Sales orders", icon: ShoppingBag },
  { id: "purchasing", label: "Purchasing", icon: Truck },
  { id: "customers", label: "Customers", icon: Users },
  { id: "finances", label: "Payments", icon: CreditCard },
] as const;
const views: View[] = [
  "overview",
  "inventory",
  "orders",
  "purchasing",
  "customers",
  "finances",
  "reports",
  "documents",
  "settings",
];
const titles: Record<View, string> = {
  overview: "Overview",
  inventory: "Inventory",
  orders: "Sales orders",
  purchasing: "Purchasing",
  customers: "Customers",
  finances: "Payments",
  reports: "Reports & insights",
  documents: "Workspace pages",
  settings: "Workspace settings",
};
function getLocation() {
  return window.location.hash.slice(1) || "documents";
}
function subscribeNavigation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function Workspace() {
  const { state, dispatch, resetDemo, storageWarning } = useWorkspace();
  const preferences = usePreferences();
  const location = useSyncExternalStore(
    subscribeNavigation,
    getLocation,
    () => "documents",
  );
  const [route, query = ""] = location.split("?");
  const view: View = views.includes(route as View)
    ? (route as View)
    : "documents";
  const [modal, setModal] = useState<RecordModal | null>(null);
  const [search, setSearch] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [readAt, setReadAt] = useState("");
  const [documentId, setDocumentId] = useState("d1");
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeRecord = useCallback(() => setModal(null), []);
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  const navigate = useCallback(
    (next: View, parameters?: Record<string, string>) => {
      window.location.hash =
        next +
        (parameters ? "?" + new URLSearchParams(parameters).toString() : "");
      setMobile(false);
      contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    },
    [],
  );
  const open = useCallback((next: RecordModal) => {
    setModal(next);
    setMobile(false);
  }, []);
  const onAction = useCallback(
    (action: Action, message: string) => {
      try {
        dispatch(action);
        if (message) notify(message);
        return true;
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Unable to save changes.",
          true,
        );
        return false;
      }
    },
    [dispatch, notify],
  );
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const element = event.target as HTMLElement;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(element?.tagName) ||
        element?.isContentEditable;
      if (
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (!typing && event.key === "/")
      ) {
        event.preventDefault();
        setSearch((s) => !s);
      }
      if (!typing && event.key === "?") {
        event.preventDefault();
        setHelp(true);
      }
      if (event.key === "Escape") {
        setMobile(false);
        setNotifications(false);
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!notifications) return;
    function outside(event: PointerEvent) {
      if (!notificationRef.current?.contains(event.target as Node))
        setNotifications(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [notifications]);
  const props: ViewProps = { state, navigate, open, notify };
  const unread = state.activities.some((a) => a.at > readAt);
  const currentDoc =
    state.documents.find((d) => d.id === documentId) ?? state.documents[0];
  function addPage() {
    const id = uid();
    if (
      onAction(
        {
          type: "save-document",
          document: {
            id,
            title: "Untitled page",
            icon: "📄",
            content: "",
            blocks: [{ id: uid(), type: "text", text: "" }],
            updatedAt: new Date().toISOString(),
          },
        },
        "Page created.",
      )
    ) {
      setDocumentId(id);
      navigate("documents");
    }
  }
  return (
    <div
      className={clsx(
        "app-shell",
        preferences.collapsed && "sidebar-collapsed",
        modal?.type === "product" && modal.product && "has-inspector",
      )}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          contentRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={clsx("sidebar", mobile && "sidebar-open")}
        aria-label="Workspace navigation"
      >
        <div className="brand-row">
          <a className="brand" href="#documents" aria-label="Forma home">
            <span className="brand-symbol">
              <Grid2X2 size={21} strokeWidth={2.3} />
            </span>
            <span>
              forma<span className="brand-dot">.</span>
            </span>
            <span className="brand-beta">WORKSPACE</span>
          </a>
          <button
            className="icon-button collapse-nav"
            aria-label="Collapse sidebar"
            onClick={() => setPreferences({ collapsed: true })}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button
          className="workspace-switcher"
          onClick={() => navigate("settings")}
        >
          <span className="workspace-logo">{state.settings.name[0]}</span>
          <span>
            <strong>{state.settings.name}</strong>
            <small>Private workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={17} />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <a
          className={clsx("nav-item", view === "overview" && "active")}
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </a>
        <div className="nav-section-label favorites-label">
          <span>YOUR PAGES</span>
          <button
            className="icon-button"
            aria-label="Add a workspace page"
            onClick={addPage}
          >
            <Plus size={15} />
          </button>
        </div>
        <nav className="favorite-pages">
          {state.documents.map((d) => (
            <a
              key={d.id}
              href="#documents"
              className={clsx(
                "favorite-item",
                view === "documents" && currentDoc?.id === d.id && "active",
              )}
              onClick={(e) => {
                e.preventDefault();
                setDocumentId(d.id);
                navigate("documents");
              }}
            >
              <FileText size={17} />
              <span>{d.title}</span>
            </a>
          ))}
          <button className="favorite-item new-page-item" onClick={addPage}>
            <Plus size={17} />
            <span>New page</span>
          </button>
        </nav>
        <div className="nav-section-label">
          <span>DATABASES</span>
          <DatabaseIndicator />
        </div>
        <nav className="primary-nav">
          {navigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.label}
              aria-current={view === item.id ? "page" : undefined}
              className={clsx("nav-item", view === item.id && "active")}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.id);
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.id === "orders" && (
                <span className="nav-count">
                  {state.orders.filter((o) => o.status === "Processing").length}
                </span>
              )}
              {item.id === "inventory" &&
                state.products.some((p) => p.stock <= p.reorderAt) && (
                  <span className="attention-dot" />
                )}
            </a>
          ))}
        </nav>
        <div className="nav-divider" />
        <nav className="secondary-nav">
          <a
            href="#reports"
            aria-label="Reports & insights"
            className={clsx("nav-item", view === "reports" && "active")}
            onClick={(e) => {
              e.preventDefault();
              navigate("reports");
            }}
          >
            <ChartNoAxesCombined size={18} />
            <span>Reports & insights</span>
          </a>
          <a
            href="#documents"
            className={clsx(
              "nav-item pages-directory",
              view === "documents" && "active",
            )}
            onClick={(e) => {
              e.preventDefault();
              navigate("documents");
            }}
          >
            <BookOpen size={18} />
            <span>Workspace pages</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-storage">
            <span className="mini-dot" />
            <span>Local workspace</span>
            <button
              className="icon-button"
              aria-label="About local storage"
              onClick={() => navigate("settings")}
            >
              <CircleHelp size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => navigate("settings")}>
            <Settings2 size={17} />
            <span>Workspace settings</span>
          </button>
          <button className="nav-item help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            <span>Help & shortcuts</span>
            <kbd>?</kbd>
          </button>
          <button
            className="sidebar-profile"
            onClick={() => navigate("settings")}
          >
            <Avatar name={state.settings.owner} color="#e8e4fa" />
            <span>
              <strong>{state.settings.owner}</strong>
              <small>Workspace owner</small>
            </span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <button
              className="icon-button expand-nav"
              aria-label="Expand sidebar"
              onClick={() => setPreferences({ collapsed: false })}
            >
              <PanelLeftOpen size={19} />
            </button>
            <button
              className="breadcrumb-workspace"
              onClick={() => navigate("documents")}
            >
              Workspace
            </button>
            <ChevronRight size={14} />
            <span>
              {view === "documents" ? currentDoc?.title : titles[view]}
            </span>
            {view === "documents" && (
              <span className="private-badge">Private</span>
            )}
          </div>
          <div className="topbar-right">
            <button className="topbar-search" onClick={() => setSearch(true)}>
              <Search size={15} />
              <span>Search your workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="notification-anchor" ref={notificationRef}>
              <button
                className="icon-button notification-trigger"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => {
                  setNotifications(!notifications);
                  if (!notifications) setReadAt(new Date().toISOString());
                }}
              >
                <Bell size={18} />
                {unread && <i />}
              </button>
              {notifications && (
                <div className="notifications-popover">
                  <div>
                    <h3>Workspace activity</h3>
                    <Badge tone="green" dot={false}>
                      Live
                    </Badge>
                  </div>
                  {state.activities.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setNotifications(false);
                        navigate(
                          a.type === "order"
                            ? "orders"
                            : a.type === "stock"
                              ? "inventory"
                              : a.type === "payment"
                                ? "finances"
                                : "settings",
                        );
                      }}
                    >
                      <span className="notification-icon">
                        {a.type === "stock" ? (
                          <Package size={16} />
                        ) : a.type === "order" ? (
                          <ShoppingBag size={16} />
                        ) : (
                          <Check size={16} />
                        )}
                      </span>
                      <span>
                        <strong>{a.text}</strong>
                        <small>{a.detail}</small>
                        <em>{shortDate(a.at)}</em>
                      </span>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="avatar-button"
              aria-label="Open your workspace settings"
              onClick={() => navigate("settings")}
            >
              <Avatar name={state.settings.owner} color="#e8e4fa" small />
            </button>
          </div>
        </header>
        <main
          ref={contentRef}
          id="main-content"
          className="main-content"
          tabIndex={-1}
        >
          {storageWarning && (
            <div className="storage-warning" role="alert">
              {storageWarning}
            </div>
          )}
          {view === "documents" && (
            <PageBuilder
              {...props}
              documentId={documentId}
              onSelectDocument={setDocumentId}
              onAction={onAction}
            />
          )}{" "}
          {view === "overview" && <Dashboard {...props} />}{" "}
          {view === "inventory" && (
            <InventoryWorkspace
              key={query}
              {...props}
              onAction={onAction}
              initialStock={new URLSearchParams(query).get("stock") || "all"}
            />
          )}{" "}
          {view === "orders" && <Orders {...props} />}{" "}
          {view === "purchasing" && <Purchasing {...props} />}{" "}
          {view === "customers" && <Customers {...props} />}{" "}
          {view === "finances" && <Orders key="finances" {...props} finance />}{" "}
          {view === "reports" && <Reports {...props} />}{" "}
          {view === "settings" && (
            <Settings {...props} onAction={onAction} reset={resetDemo} />
          )}
        </main>
      </div>
      {modal && (
        <RecordDialog
          key={
            modal.type +
            ("id" in modal
              ? modal.id
              : modal.type === "product"
                ? modal.product?.id || "new"
                : "")
          }
          modal={
            modal.type === "product" && modal.product
              ? {
                  ...modal,
                  product:
                    state.products.find((p) => p.id === modal.product?.id) ??
                    modal.product,
                }
              : modal
          }
          state={state}
          onClose={closeRecord}
          onAction={onAction}
          onOpen={open}
        />
      )}
      {search && (
        <CommandPalette
          state={state}
          navigate={navigate}
          open={open}
          onClose={() => setSearch(false)}
        />
      )}
      {help && <HelpDialog onClose={() => setHelp(false)} />}{" "}
      {toast && (
        <Toast
          message={toast.message}
          error={toast.error}
          onClose={dismissToast}
          inDialog={Boolean(modal)}
        />
      )}
    </div>
  );
}
function DatabaseIndicator() {
  return <span className="database-count">5</span>;
}

function CommandPalette({
  state,
  navigate,
  open,
  onClose,
}: {
  state: AppState;
  navigate: ViewProps["navigate"];
  open: ViewProps["open"];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const actions = [
    ...views.map((view) => ({
      id: view,
      label: titles[view],
      detail: "Go to page",
      icon: Grid2X2,
      run: () => navigate(view),
    })),
    {
      id: "new-product",
      label: "Add a product",
      detail: "Quick action",
      icon: Plus,
      run: () => open({ type: "product" }),
    },
    {
      id: "new-order",
      label: "Create a sales order",
      detail: "Quick action",
      icon: Plus,
      run: () => open({ type: "order" }),
    },
    {
      id: "new-purchase",
      label: "Create a purchase order",
      detail: "Quick action",
      icon: Plus,
      run: () => open({ type: "purchase" }),
    },
    ...state.products.map((p) => ({
      id: p.id,
      label: p.name,
      detail: `${p.sku} · ${stockStatus(p)}`,
      icon: Package,
      run: () => open({ type: "product", product: p }),
    })),
    ...state.orders.map((o) => ({
      id: o.id,
      label: o.number,
      detail:
        state.customers.find((c) => c.id === o.customerId)?.company ??
        "Sales order",
      icon: ShoppingBag,
      run: () => open({ type: "order-detail", id: o.id }),
    })),
    ...state.customers.map((c) => ({
      id: c.id,
      label: c.company,
      detail: `${c.name} · ${c.email}`,
      icon: Users,
      run: () => open({ type: "customer", customer: c }),
    })),
  ];
  const results = actions
    .filter((a) =>
      `${a.label} ${a.detail}`.toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, query ? 16 : 8);
  function choose(i: number) {
    if (results[i]) {
      onClose();
      results[i].run();
    }
  }
  function move(next: number) {
    setIndex(next);
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
  }
  return (
    <Modal title="Find your next move" onClose={onClose}>
      <div className="command-search">
        <Search size={20} />
        <input
          autoFocus
          aria-label="Search workspace"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            results[index] ? `result-${results[index].id}` : undefined
          }
          value={query}
          placeholder="Search pages, products, orders, people…"
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(Math.min(index + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              move(Math.max(0, index - 1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              choose(index);
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        ref={listRef}
      >
        {results.length ? (
          results.map((result, i) => (
            <button
              role="option"
              aria-selected={i === index}
              id={`result-${result.id}`}
              key={result.id}
              className={clsx(i === index && "active")}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(i)}
            >
              <span className="command-icon">
                <result.icon size={17} />
              </span>
              <span>
                <strong>{result.label}</strong>
                <small>{result.detail}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))
        ) : (
          <div className="command-empty">
            <Search size={24} />
            <strong>No connections found</strong>
            <p>Try a product name, order number, or person.</p>
          </div>
        )}
      </div>
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>to explore
        </span>
        <span>
          <kbd>↵</kbd>to open
        </span>
        <span>
          <Command size={12} />
          Your whole workspace, a few keys away
        </span>
      </div>
    </Modal>
  );
}
