"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckSquare,
  Columns3,
  Database,
  FileText,
  GripVertical,
  Heading2,
  Info,
  LayoutList,
  List,
  Maximize2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Type,
} from "lucide-react";
import clsx from "clsx";
import {
  available,
  money,
  stockStatus,
  total,
  uid,
  type Action,
  type BlockType,
  type Document,
  type PageBlock,
} from "@/lib/domain";
import { setPreferences, usePreferences } from "@/lib/preferences";
import type { ViewProps } from "./dashboard";
import { Empty, ProductArt, Status } from "./ui";
import { downloadText } from "./pages";

const blockTypes: {
  type: BlockType;
  name: string;
  description: string;
  icon: typeof Type;
  command: string;
}[] = [
  {
    type: "text",
    name: "Text",
    description: "Start writing with plain text",
    icon: Type,
    command: "text",
  },
  {
    type: "heading",
    name: "Heading",
    description: "Give a section a clear title",
    icon: Heading2,
    command: "heading",
  },
  {
    type: "todo",
    name: "To-do list",
    description: "Track a task with a checkbox",
    icon: CheckSquare,
    command: "todo",
  },
  {
    type: "bullet",
    name: "Bulleted list",
    description: "Create a simple list",
    icon: List,
    command: "list",
  },
  {
    type: "inventory",
    name: "Linked inventory",
    description: "A live view of your product database",
    icon: Package,
    command: "inventory",
  },
  {
    type: "orders",
    name: "Linked orders",
    description: "Sales orders, connected to this page",
    icon: ShoppingBag,
    command: "orders",
  },
  {
    type: "callout",
    name: "Callout",
    description: "Highlight an important note",
    icon: Info,
    command: "callout",
  },
  {
    type: "divider",
    name: "Divider",
    description: "Separate sections with a line",
    icon: Minus,
    command: "divider",
  },
];
const subscribeHydration = () => () => {};

function parseLegacy(content: string): PageBlock[] {
  const blocks = content
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i): PageBlock => {
      const todo = /^(?:[☐☑□]|- \[[ x]\])\s*/.test(line);
      const heading =
        /^#{1,3} /.test(line) ||
        (line === line.toUpperCase() && /[A-Z]/.test(line));
      return {
        id: `legacy-${i}`,
        type: todo
          ? "todo"
          : heading
            ? "heading"
            : /^[•*-] /.test(line)
              ? "bullet"
              : "text",
        text: line.replace(/^(?:[☐☑□]\s*|- \[[ x]\]\s*|#{1,3} |[•*-] )/, ""),
        ...(todo ? { checked: /^(?:☑|- \[x\])/.test(line) } : {}),
      };
    });
  return blocks.length ? blocks : [{ id: "empty", type: "text", text: "" }];
}
export function blocksToMarkdown(blocks: PageBlock[]) {
  return blocks
    .map((b) =>
      b.type === "heading"
        ? `## ${b.text}`
        : b.type === "todo"
          ? `- [${b.checked ? "x" : " "}] ${b.text}`
          : b.type === "bullet"
            ? `- ${b.text}`
            : b.type === "divider"
              ? "---"
              : b.type === "inventory" || b.type === "orders"
                ? `> Linked ${b.type} database (live in Forma)`
                : b.type === "callout"
                  ? `> ${b.text}`
                  : b.text,
    )
    .join("\n\n");
}

function initialBlocks(doc: Document): PageBlock[] {
  if (doc.blocks?.length) return doc.blocks;
  const legacy = parseLegacy(doc.content);
  if (doc.id !== "d1") return legacy;
  return [
    {
      id: "migrated-inventory",
      type: "inventory",
      text: "Inventory",
      config: { layout: "table", filter: "all" },
    },
    {
      id: "migrated-orders",
      type: "orders",
      text: "Orders to fulfill",
      config: { layout: "table", filter: "Processing" },
    },
    { id: "migrated-notes", type: "heading", text: "Workspace notes" },
    ...legacy,
  ];
}

export function PageBuilder(
  props: ViewProps & {
    documentId: string;
    onSelectDocument: (id: string) => void;
    onAction: (action: Action, message: string) => boolean;
  },
) {
  // Mount local editor state only after browser data has replaced the server demo snapshot.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const doc =
    props.state.documents.find((d) => d.id === props.documentId) ??
    props.state.documents[0];
  const addPage = () => {
    const id = uid();
    if (
      props.onAction(
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
    )
      props.onSelectDocument(id);
  };
  return (
    <div className="builder-workspace animate-in">
      <div className="builder-page-tabs">
        <div className="page-tab-list">
          {props.state.documents.map((d) => (
            <button
              key={d.id}
              className={clsx(doc?.id === d.id && "active")}
              onClick={() => props.onSelectDocument(d.id)}
            >
              <FileText size={14} />
              {d.title}
            </button>
          ))}
        </div>
        <button className="text-button" onClick={addPage}>
          <Plus size={15} />
          New page
        </button>
      </div>
      {doc && hydrated ? (
        <PageCanvas key={doc.id} {...props} doc={doc} />
      ) : (
        <div className="builder-loading" role="status">
          Loading your workspace…
        </div>
      )}
    </div>
  );
}

function PageCanvas({
  doc,
  state,
  open,
  navigate,
  onAction,
}: ViewProps & {
  doc: Document;
  onAction: (action: Action, message: string) => boolean;
}) {
  const [blocks, setBlocks] = useState<PageBlock[]>(() => initialBlocks(doc));
  const [title, setTitle] = useState(doc.title);
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify({
      title: doc.title,
      blocks: initialBlocks(doc),
    }),
  );
  const [menu, setMenu] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const preferences = usePreferences();
  const value = JSON.stringify({ title, blocks });
  const dirty = value !== baseline;
  const focusId = useRef<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const save = () => {
    if (!dirty) return;
    if (!title.trim()) {
      setSaveError(true);
      return;
    }
    if (
      onAction(
        {
          type: "save-document",
          document: {
            ...doc,
            title: title.trim(),
            blocks,
            content: blocksToMarkdown(blocks),
            updatedAt: new Date().toISOString(),
          },
        },
        "",
      )
    ) {
      setBaseline(value);
      setSaveError(false);
    } else setSaveError(true);
  };
  const flushSave = useEffectEvent(save);
  useEffect(() => () => flushSave(), []);
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(save, 650);
    return () => clearTimeout(timer);
  });
  useEffect(() => {
    if (focusId.current) {
      canvas.current
        ?.querySelector<HTMLTextAreaElement>(
          `[data-block-id="${focusId.current}"]`,
        )
        ?.focus();
      focusId.current = null;
    }
  }, [blocks]);
  function update(id: string, change: Partial<PageBlock>) {
    setBlocks((old) => old.map((b) => (b.id === id ? { ...b, ...change } : b)));
  }
  function insert(type: BlockType, after?: string, replace = false) {
    const block: PageBlock = {
      id: uid(),
      type,
      text:
        type === "inventory"
          ? "Inventory"
          : type === "orders"
            ? "Sales orders"
            : "",
      ...(type === "todo" ? { checked: false } : {}),
      ...(["inventory", "orders"].includes(type)
        ? { config: { layout: "table", filter: "all" } }
        : {}),
    };
    setBlocks((old) => {
      const index = after
        ? old.findIndex((b) => b.id === after)
        : old.length - 1;
      const next = [...old];
      next.splice(
        Math.max(0, index + (replace ? 0 : 1)),
        replace ? 1 : 0,
        block,
      );
      return next;
    });
    focusId.current = block.id;
    setMenu(null);
  }
  function move(id: string, direction: number) {
    setBlocks((old) => {
      const index = old.findIndex((b) => b.id === id),
        next = [...old],
        destination = index + direction;
      if (destination < 0 || destination >= old.length) return old;
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }
  function onKey(event: KeyboardEvent<HTMLTextAreaElement>, block: PageBlock) {
    if (event.key === "Escape") {
      setMenu(null);
      return;
    }
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !block.text.startsWith("/")
    ) {
      event.preventDefault();
      if (!block.text && ["todo", "bullet", "heading"].includes(block.type)) {
        update(block.id, { type: "text" });
        return;
      }
      const position = event.currentTarget.selectionStart;
      const next: PageBlock = {
        id: uid(),
        type: ["todo", "bullet"].includes(block.type) ? block.type : "text",
        text: block.text.slice(position),
        checked: false,
      };
      setBlocks((old) => {
        const index = old.findIndex((b) => b.id === block.id);
        const list = old.map((b) =>
          b.id === block.id ? { ...b, text: b.text.slice(0, position) } : b,
        );
        list.splice(index + 1, 0, next);
        return list;
      });
      focusId.current = next.id;
    }
    if (event.key === "Backspace" && !block.text && blocks.length > 1) {
      event.preventDefault();
      const index = blocks.findIndex((b) => b.id === block.id);
      focusId.current = blocks[Math.max(0, index - 1)].id;
      setBlocks((old) => old.filter((b) => b.id !== block.id));
    }
    if (event.key === "Enter" && block.text.startsWith("/")) {
      const choice = blockTypes.find((t) =>
        t.command.startsWith(block.text.slice(1).toLowerCase()),
      );
      if (choice) {
        event.preventDefault();
        insert(choice.type, block.id, true);
      }
    }
  }
  return (
    <div
      className={clsx("page-canvas", preferences.fullWidth && "page-wide")}
      ref={canvas}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          save();
        }
      }}
    >
      <div className="canvas-topline">
        <span>
          <span className="page-icon">{doc.icon}</span>WORKSPACE PAGE
        </span>
        <div>
          <span
            className={clsx(
              "save-status",
              dirty && "unsaved",
              saveError && "save-error",
            )}
          >
            {saveError ? (
              "Give this page a title to save"
            ) : dirty ? (
              "Saving…"
            ) : (
              <>
                <Check size={13} />
                Saved
              </>
            )}
          </span>
          <button
            className="button button-small"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Edit page" : "Preview"}
          </button>
          <button
            className="icon-button"
            aria-label="Toggle full width page"
            aria-pressed={preferences.fullWidth}
            onClick={() =>
              setPreferences({ fullWidth: !preferences.fullWidth })
            }
          >
            <Maximize2 size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Export page as Markdown"
            onClick={() =>
              downloadText(
                `${title || "page"}.md`,
                `# ${title}\n\n${blocksToMarkdown(blocks)}`,
              )
            }
          >
            <ArrowDownToLine size={16} />
          </button>
        </div>
      </div>
      <input
        className="document-title"
        aria-label="Page title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        placeholder="Untitled page"
        onBlur={save}
      />
      <div className="page-properties">
        <span>
          <FileText size={13} />
          Page
        </span>
        <span>
          <Database size={13} />
          {
            blocks.filter((b) => ["inventory", "orders"].includes(b.type))
              .length
          }{" "}
          linked databases
        </span>
        <span>Private workspace</span>
        <button className="text-button" onClick={save} disabled={!dirty}>
          <Check size={14} />
          Save page
        </button>
      </div>
      <div
        className={clsx("block-canvas", preview && "canvas-preview")}
        role="group"
        aria-label="Page content"
      >
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className={clsx("page-block", `block-${block.type}`)}
          >
            {!preview && (
              <div className="block-handle">
                <button
                  className="icon-button"
                  aria-label={`Insert block after ${index + 1}`}
                  onClick={() => setMenu(menu === block.id ? null : block.id)}
                >
                  <Plus size={15} />
                </button>
                <details>
                  <summary aria-label={`Options for block ${index + 1}`}>
                    <GripVertical size={16} />
                  </summary>
                  <div className="block-options">
                    <button
                      disabled={index === 0}
                      onClick={() => move(block.id, -1)}
                    >
                      <ArrowUp size={14} />
                      Move up
                    </button>
                    <button
                      disabled={index === blocks.length - 1}
                      onClick={() => move(block.id, 1)}
                    >
                      <ArrowDown size={14} />
                      Move down
                    </button>
                    <button
                      disabled={blocks.length === 1}
                      onClick={() =>
                        setBlocks((old) => old.filter((b) => b.id !== block.id))
                      }
                    >
                      <Trash2 size={14} />
                      Delete block
                    </button>
                  </div>
                </details>
              </div>
            )}
            {block.type === "divider" ? (
              <hr />
            ) : ["inventory", "orders"].includes(block.type) ? (
              <LinkedDatabase
                block={block}
                state={state}
                open={open}
                navigate={navigate}
                onChange={(change) => update(block.id, change)}
              />
            ) : (
              <div className="text-block-content">
                {block.type === "todo" && (
                  <input
                    type="checkbox"
                    aria-label={block.text || "Untitled task"}
                    checked={Boolean(block.checked)}
                    onChange={(e) =>
                      update(block.id, { checked: e.target.checked })
                    }
                  />
                )}
                {block.type === "bullet" && <span className="bullet-marker" />}
                {block.type === "callout" && <Info size={18} />}
                {preview ? (
                  <span className={clsx(block.checked && "checked-text")}>
                    {block.text || "\u00a0"}
                  </span>
                ) : (
                  <AutoText
                    dataId={block.id}
                    label={`Block ${index + 1} ${block.type}`}
                    value={block.text}
                    checked={block.checked}
                    placeholder={
                      block.type === "heading"
                        ? "Heading"
                        : "Write something, or type / for blocks…"
                    }
                    onChange={(text) => {
                      update(block.id, { text });
                      setMenu(text.startsWith("/") ? block.id : null);
                    }}
                    onKeyDown={(e) => onKey(e, block)}
                  />
                )}
              </div>
            )}
            {menu === block.id && !preview && (
              <div className="block-insert-menu">
                <div className="insert-label">
                  {block.text.startsWith("/")
                    ? "INSERT BLOCK"
                    : "ADD AFTER THIS BLOCK"}
                </div>
                {blockTypes
                  .filter(
                    (t) =>
                      !block.text.startsWith("/") ||
                      `${t.command} ${t.name}`
                        .toLowerCase()
                        .includes(block.text.slice(1).toLowerCase()),
                  )
                  .map((t) => (
                    <button
                      key={t.type}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        insert(t.type, block.id, block.text.startsWith("/"))
                      }
                    >
                      <span>
                        <t.icon size={20} />
                      </span>
                      <span>
                        <strong>{t.name}</strong>
                        <small>{t.description}</small>
                      </span>
                      <kbd>/{t.command}</kbd>
                    </button>
                  ))}
                <button
                  className="insert-dismiss"
                  onClick={() => setMenu(null)}
                >
                  Close menu
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!preview && (
        <div className="page-insert-footer">
          <button onClick={() => insert("text")}>
            <Plus size={16} />
            Text
          </button>
          <button onClick={() => insert("inventory")}>
            <Package size={16} />
            Link inventory
          </button>
          <button onClick={() => insert("orders")}>
            <ShoppingBag size={16} />
            Link orders
          </button>
          <button onClick={() => insert("todo")}>
            <CheckSquare size={16} />
            To-do
          </button>
          <span>Type / in any text block for more</span>
        </div>
      )}
    </div>
  );
}

function AutoText({
  value,
  onChange,
  onKeyDown,
  label,
  dataId,
  placeholder,
  checked,
}: {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  label: string;
  dataId: string;
  placeholder: string;
  checked?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.style.height = "0px";
      ref.current.style.height = `${Math.max(28, ref.current.scrollHeight)}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      data-block-id={dataId}
      aria-label={label}
      rows={1}
      className={clsx("block-input", checked && "checked-text")}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

function LinkedDatabase({
  block,
  state,
  open,
  navigate,
  onChange,
}: Pick<ViewProps, "state" | "open" | "navigate"> & {
  block: PageBlock;
  onChange: (change: Partial<PageBlock>) => void;
}) {
  const config = block.config ?? {};
  const inventory = block.type === "inventory";
  const title = inventory ? "Inventory" : "Sales orders";
  const filter = config.filter ?? "all",
    layout = config.layout ?? "table",
    search = config.search ?? "";
  const update = (next: Partial<NonNullable<PageBlock["config"]>>) =>
    onChange({ config: { ...config, ...next } });
  const products = state.products.filter(
    (p) =>
      `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" || p.stock <= p.reorderAt),
  );
  const orders = state.orders.filter(
    (o) =>
      `${o.number} ${state.customers.find((c) => c.id === o.customerId)?.company}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || o.status === filter),
  );
  const count = inventory ? products.length : orders.length;
  return (
    <section
      className="linked-database"
      aria-label={`Linked ${title} database`}
    >
      <div className="linked-database-title">
        <span className="linked-database-icon">
          {inventory ? <Package size={20} /> : <ShoppingBag size={20} />}
        </span>
        <div>
          <h2>{block.text || title}</h2>
          <span>Linked database · {count} records</span>
        </div>
        <button
          className="text-button"
          onClick={() => navigate(inventory ? "inventory" : "orders")}
          aria-label={`Open ${title} database`}
        >
          Open database
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="linked-toolbar">
        <div className="linked-view-tabs">
          <button
            className={clsx(filter === "all" && "active")}
            onClick={() => update({ filter: "all" })}
          >
            <LayoutList size={14} />
            {inventory ? "All products" : "All orders"}
          </button>
          <button
            className={clsx(filter !== "all" && "active")}
            onClick={() =>
              update({ filter: inventory ? "attention" : "Processing" })
            }
          >
            {inventory ? "Needs attention" : "To fulfill"}
            <span>
              {inventory
                ? state.products.filter((p) => p.stock <= p.reorderAt).length
                : state.orders.filter((o) => o.status === "Processing").length}
            </span>
          </button>
        </div>
        <div className="linked-controls">
          <div className="linked-search">
            <Search size={14} />
            <input
              aria-label={`Search linked ${title}`}
              placeholder="Search…"
              value={search}
              onChange={(e) => update({ search: e.target.value })}
            />
          </div>
          <div className="view-toggle">
            <button
              aria-label={`${title} table view`}
              aria-pressed={layout === "table"}
              className={clsx(layout === "table" && "active")}
              onClick={() => update({ layout: "table" })}
            >
              <LayoutList size={15} />
            </button>
            <button
              aria-label={`${title} board view`}
              aria-pressed={layout === "board"}
              className={clsx(layout === "board" && "active")}
              onClick={() => update({ layout: "board" })}
            >
              <Columns3 size={15} />
            </button>
          </div>
          <button
            className="button button-small button-primary"
            onClick={() => open({ type: inventory ? "product" : "order" })}
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>
      {count === 0 ? (
        <Empty
          title="No matching records"
          text="Change the view or search to see your records."
        />
      ) : layout === "board" ? (
        <div className="linked-board">
          {(inventory
            ? ["In stock", "Low stock", "Out of stock"]
            : ["Processing", "Shipped", "Delivered"]
          ).map((status) => (
            <section key={status}>
              <Status status={status} />
              {inventory
                ? products
                    .filter((p) => stockStatus(p) === status)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => open({ type: "product", product: p })}
                      >
                        <ProductArt product={p} />
                        <strong>{p.name}</strong>
                        <small>
                          {available(state, p.id)} available · {money(p.price)}
                        </small>
                      </button>
                    ))
                : orders
                    .filter((o) => o.status === status)
                    .slice(0, 4)
                    .map((o) => (
                      <button
                        key={o.id}
                        onClick={() => open({ type: "order-detail", id: o.id })}
                      >
                        <small>{o.number}</small>
                        <strong>
                          {
                            state.customers.find((c) => c.id === o.customerId)
                              ?.company
                          }
                        </strong>
                        <small>{money(total(o))}</small>
                      </button>
                    ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{inventory ? "Product" : "Order"}</th>
                <th>{inventory ? "Category" : "Customer"}</th>
                <th>Status</th>
                <th className="align-right">
                  {inventory ? "Available" : "Payment"}
                </th>
                <th className="align-right">{inventory ? "Price" : "Total"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {inventory
                ? products.slice(0, 5).map((p) => (
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
                      <td>
                        <span className="category-label">{p.category}</span>
                      </td>
                      <td>
                        <Status status={stockStatus(p)} />
                      </td>
                      <td className="align-right amount">
                        {available(state, p.id)}
                      </td>
                      <td className="align-right amount">{money(p.price)}</td>
                      <td>
                        <ArrowUpRight size={14} className="row-arrow" />
                      </td>
                    </tr>
                  ))
                : orders.slice(0, 5).map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => open({ type: "order-detail", id: o.id })}
                    >
                      <td>
                        <button className="record-link">{o.number}</button>
                      </td>
                      <td>
                        {
                          state.customers.find((c) => c.id === o.customerId)
                            ?.company
                        }
                      </td>
                      <td>
                        <Status status={o.status} />
                      </td>
                      <td className="align-right">
                        <Status status={o.paid ? "Paid" : "Unpaid"} />
                      </td>
                      <td className="align-right amount">{money(total(o))}</td>
                      <td>
                        <ArrowUpRight size={14} className="row-arrow" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="linked-footer">
        <span>
          <Database size={12} />
          Connected to {title.toLowerCase()} · changes sync across your
          workspace
        </span>
        <button onClick={() => navigate(inventory ? "inventory" : "orders")}>
          View all {count}
          <ArrowUpRight size={12} />
        </button>
      </div>
    </section>
  );
}
