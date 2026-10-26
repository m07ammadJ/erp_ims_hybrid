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
  FolderOpen,
  Grid2X2,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Sprout,
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
import { Avatar, Badge, Modal, Toast } from "./ui";
import { Dashboard, Reports, type ViewProps } from "./dashboard";
import { Customers, Inventory, Orders, Purchasing } from "./records";
import { RecordDialog, type RecordModal } from "./forms";
import { Documents, HelpDialog, Settings } from "./pages";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
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
function getView(): View {
  const hash = window.location.hash.slice(1) as View;
  return views.includes(hash) ? hash : "overview";
}
function subscribeNavigation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function Workspace() {
  const { state, dispatch, resetDemo, storageWarning } = useWorkspace();
  const view = useSyncExternalStore(
    subscribeNavigation,
    getView,
    () => "overview" as View,
  );
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
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  const navigate = useCallback((next: View) => {
    window.location.hash = next;
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
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
      } catch (e) {
        notify(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
          true,
        );
        return false;
      }
    },
    [dispatch, notify],
  );
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
        (e.target as HTMLElement)?.isContentEditable;
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
        (!typing && e.key === "/")
      ) {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (!typing && e.key === "?") {
        e.preventDefault();
        setHelp(true);
      }
      if (e.key === "Escape") {
        setMobile(false);
        setNotifications(false);
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!notifications) return;
    function outside(e: PointerEvent) {
      if (!notificationRef.current?.contains(e.target as Node))
        setNotifications(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [notifications]);
  const props: ViewProps = { state, navigate, open, notify };
  const unread = state.activities.some((a) => a.at > readAt);
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
            updatedAt: new Date().toISOString(),
          },
        },
        "A new page, a new possibility.",
      )
    ) {
      setDocumentId(id);
      navigate("documents");
    }
  }
  return (
    <div className="app-shell">
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
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
        <a
          className="brand"
          href="#overview"
          onClick={() => setMobile(false)}
          aria-label="Forma home"
        >
          <span className="brand-symbol">
            f<span>✳</span>
          </span>
          <span>
            forma<span className="brand-dot">.</span>
          </span>
          <span className="brand-beta">BETA</span>
        </a>
        <button
          className="workspace-switcher"
          onClick={() => navigate("settings")}
        >
          <span className="workspace-logo">F</span>
          <span>
            <strong>{state.settings.name}</strong>
            <small>Business workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button className="sidebar-search" onClick={() => setSearch(true)}>
          <Search size={15} />
          <span>Find anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="primary-nav">
          {navigation.map((item) => {
            const count =
              item.id === "orders"
                ? state.orders.filter((o) => o.status === "Processing").length
                : item.id === "inventory"
                  ? state.products.filter((p) => p.stock <= p.reorderAt).length
                  : 0;
            return (
              <a
                key={item.id}
                aria-label={item.label}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.id);
                }}
                aria-current={view === item.id ? "page" : undefined}
                className={clsx("nav-item", view === item.id && "active")}
              >
                <item.icon size={18} strokeWidth={1.65} />
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className={clsx(
                      "nav-count",
                      item.id === "inventory" && "nav-count-amber",
                    )}
                  >
                    {count}
                  </span>
                )}
                {view === item.id && <span className="active-nav-dot" />}
              </a>
            );
          })}
        </nav>
        <div className="nav-divider" />
        <nav className="secondary-nav">
          <a
            href="#reports"
            aria-label="Reports & insights"
            className={clsx("nav-item", view === "reports" && "active")}
            aria-current={view === "reports" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate("reports");
            }}
          >
            <ChartNoAxesCombined size={18} strokeWidth={1.65} />
            <span>Reports & insights</span>
            <span className="new-tag">NEW</span>
          </a>
          <a
            href="#documents"
            className={clsx("nav-item", view === "documents" && "active")}
            aria-current={view === "documents" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate("documents");
            }}
          >
            <BookOpen size={18} strokeWidth={1.65} />
            <span>Workspace pages</span>
          </a>
        </nav>
        <div className="nav-section-label favorites-label">
          <span>PINNED PAGES</span>
          <button
            className="icon-button"
            aria-label="Add a workspace page"
            onClick={addPage}
          >
            <Plus size={14} />
          </button>
        </div>
        <nav className="favorite-pages">
          {state.documents.slice(0, 4).map((d) => (
            <a
              key={d.id}
              href="#documents"
              className={clsx(
                "favorite-item",
                view === "documents" && documentId === d.id && "active",
              )}
              onClick={(e) => {
                e.preventDefault();
                setDocumentId(d.id);
                navigate("documents");
              }}
            >
              <span>{d.icon}</span>
              <span>{d.title}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="grow-card">
            <span className="grow-illustration">
              <Sprout size={27} strokeWidth={1.2} />
            </span>
            <strong>Your space to grow.</strong>
            <p>
              A little structure.
              <br />
              Limitless possibilities.
            </p>
            <button onClick={() => navigate("settings")}>
              Make it yours
              <ArrowUpRight size={13} />
            </button>
          </div>
          <button className="nav-item help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} strokeWidth={1.6} />
            <span>A little help?</span>
            <kbd>?</kbd>
          </button>
          <button
            className={clsx("nav-item", view === "settings" && "active")}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={17} strokeWidth={1.6} />
            <span>Workspace settings</span>
          </button>
          <button
            className="sidebar-profile"
            onClick={() => navigate("settings")}
          >
            <Avatar name={state.settings.owner} color="#e6dacc" />
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
            <FolderOpen size={15} strokeWidth={1.6} />
            <button onClick={() => navigate("overview")}>Workspace</button>
            <ChevronRight size={13} />
            <span>{titles[view]}</span>
            {view === "documents" && (
              <>
                <ChevronRight size={13} />
                <span>
                  {state.documents.find((d) => d.id === documentId)?.title}
                </span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="sync-status">
              <span />
              Local demo
            </span>
            <span className="topbar-divider" />
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
                <Bell size={18} strokeWidth={1.6} />
                {unread && <i />}
              </button>
              {notifications && (
                <div className="notifications-popover">
                  <div>
                    <h3>Around your workspace</h3>
                    <Badge tone="green" dot={false}>
                      Activity
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
                      <ArrowUpRight size={13} />
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
              <Avatar name={state.settings.owner} color="#e4d8ca" small />
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
          {view === "overview" && <Dashboard {...props} />}
          {view === "inventory" && <Inventory {...props} />}
          {view === "orders" && <Orders {...props} />}
          {view === "purchasing" && <Purchasing {...props} />}
          {view === "customers" && <Customers {...props} />}
          {view === "finances" && <Orders key="finances" {...props} finance />}
          {view === "reports" && <Reports {...props} />}
          {view === "documents" && (
            <Documents
              {...props}
              onAction={onAction}
              documentId={documentId}
              onSelectDocument={setDocumentId}
            />
          )}
          {view === "settings" && (
            <Settings {...props} onAction={onAction} reset={resetDemo} />
          )}
        </main>
      </div>
      {modal && (
        <RecordDialog
          key={modal.type + ("id" in modal ? modal.id : "")}
          modal={modal}
          state={state}
          onClose={() => setModal(null)}
          onAction={onAction}
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
      {help && <HelpDialog onClose={() => setHelp(false)} />}
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
