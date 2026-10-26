export type View =
  | "overview"
  | "inventory"
  | "orders"
  | "purchasing"
  | "customers"
  | "finances"
  | "reports"
  | "documents"
  | "settings";
export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Cancelled";
export type ProductKind =
  "lamp" | "chair" | "vase" | "shelf" | "stool" | "tray" | "clock" | "planter";
export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  reorderAt: number;
  location: string;
  kind: ProductKind;
  color: string;
}
export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  color: string;
}
export interface LineItem {
  productId: string;
  quantity: number;
  price: number;
}
export interface Order {
  id: string;
  number: string;
  customerId: string;
  items: LineItem[];
  status: OrderStatus;
  paid: boolean;
  createdAt: string;
}
export interface Purchase {
  id: string;
  number: string;
  supplier: string;
  items: LineItem[];
  status: "Ordered" | "Received";
  createdAt: string;
  expectedAt: string;
}
export interface Activity {
  id: string;
  text: string;
  detail: string;
  type: "order" | "stock" | "payment" | "workspace";
  at: string;
}
export interface Document {
  id: string;
  title: string;
  icon: string;
  content: string;
  updatedAt: string;
}
export interface AppState {
  version: 1;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  purchases: Purchase[];
  activities: Activity[];
  documents: Document[];
  settings: { name: string; owner: string; currency: "USD" };
}
export const uid = () => crypto.randomUUID();
export const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact || Number.isInteger(value) ? 0 : 2,
    ...(compact ? { notation: "compact" as const } : {}),
  }).format(value);
export const number = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);
export const total = (record: { items: LineItem[] }) =>
  Math.round(
    record.items.reduce((sum, item) => sum + item.price * item.quantity, 0) *
      100,
  ) / 100;
export const reserved = (state: AppState, productId: string) =>
  state.orders
    .filter((o) => o.status === "Processing")
    .reduce(
      (sum, order) =>
        sum +
        order.items
          .filter((item) => item.productId === productId)
          .reduce((n, item) => n + item.quantity, 0),
      0,
    );
export const available = (state: AppState, productId: string) => {
  const product = state.products.find((p) => p.id === productId);
  return product ? product.stock - reserved(state, productId) : 0;
};
export const stockStatus = (product: Product) =>
  product.stock === 0
    ? "Out of stock"
    : product.stock <= product.reorderAt
      ? "Low stock"
      : "In stock";
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
export const shortDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
export function reportingDate(state: AppState) {
  const date = new Date(
    Math.max(
      Date.parse("2026-10-26T00:00:00Z"),
      ...state.orders.map((o) => Date.parse(o.createdAt)),
    ),
  );
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function daysAgo(days: number) {
  const d = new Date("2026-10-26T09:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function createDemoState(): AppState {
  const products: Product[] = [
    {
      id: "p1",
      name: "Arc Table Lamp",
      sku: "FRM-LT-001",
      category: "Lighting",
      price: 185,
      cost: 74,
      stock: 48,
      reorderAt: 15,
      location: "Brooklyn · A-01",
      kind: "lamp",
      color: "#ebe6d8",
    },
    {
      id: "p2",
      name: "Forma Lounge Chair",
      sku: "FRM-FN-002",
      category: "Furniture",
      price: 495,
      cost: 220,
      stock: 8,
      reorderAt: 10,
      location: "Brooklyn · B-03",
      kind: "chair",
      color: "#e5e7da",
    },
    {
      id: "p3",
      name: "Everyday Ceramic Vase",
      sku: "FRM-DC-003",
      category: "Objects",
      price: 68,
      cost: 24,
      stock: 126,
      reorderAt: 25,
      location: "Brooklyn · C-02",
      kind: "vase",
      color: "#f0e0d6",
    },
    {
      id: "p4",
      name: "Oak Floating Shelf",
      sku: "FRM-FN-004",
      category: "Furniture",
      price: 120,
      cost: 48,
      stock: 34,
      reorderAt: 12,
      location: "Brooklyn · B-01",
      kind: "shelf",
      color: "#eae4dc",
    },
    {
      id: "p5",
      name: "Pebble Side Table",
      sku: "FRM-FN-005",
      category: "Furniture",
      price: 245,
      cost: 98,
      stock: 5,
      reorderAt: 8,
      location: "Brooklyn · B-04",
      kind: "stool",
      color: "#e4e6e4",
    },
    {
      id: "p6",
      name: "Studio Desk Tray",
      sku: "FRM-DC-006",
      category: "Objects",
      price: 42,
      cost: 16,
      stock: 82,
      reorderAt: 20,
      location: "Brooklyn · C-03",
      kind: "tray",
      color: "#efe3d1",
    },
    {
      id: "p7",
      name: "Quiet Wall Clock",
      sku: "FRM-DC-007",
      category: "Objects",
      price: 85,
      cost: 32,
      stock: 0,
      reorderAt: 10,
      location: "Brooklyn · C-04",
      kind: "clock",
      color: "#e0e8e7",
    },
    {
      id: "p8",
      name: "Terra Planter",
      sku: "FRM-DC-008",
      category: "Objects",
      price: 54,
      cost: 19,
      stock: 64,
      reorderAt: 15,
      location: "Brooklyn · C-01",
      kind: "planter",
      color: "#e9e1d7",
    },
  ];
  const customers: Customer[] = [
    {
      id: "c1",
      name: "Olivia Rhye",
      company: "The Modern House",
      email: "olivia@example.com",
      color: "#efe6d9",
    },
    {
      id: "c2",
      name: "Phoenix Baker",
      company: "Objects & Spaces",
      email: "phoenix@example.com",
      color: "#e4e9e1",
    },
    {
      id: "c3",
      name: "Lana Steiner",
      company: "Good Company",
      email: "lana@example.com",
      color: "#e9e3f0",
    },
    {
      id: "c4",
      name: "Demi Wilkinson",
      company: "Sunday Studio",
      email: "demi@example.com",
      color: "#f0e1dd",
    },
    {
      id: "c5",
      name: "Drew Cano",
      company: "The Local Project",
      email: "drew@example.com",
      color: "#dfe8ec",
    },
    {
      id: "c6",
      name: "Natali Craig",
      company: "Kinfolk Interiors",
      email: "natali@example.com",
      color: "#e9e7d8",
    },
  ];
  const orders: Order[] = Array.from({ length: 36 }, (_, i) => {
    const product = products[i % 6];
    return {
      id: `o${i + 1}`,
      number: `SO-${1048 - i}`,
      customerId: customers[i % 6].id,
      items: [
        {
          productId: product.id,
          quantity: i < 6 ? (i % 2) + 1 : 8 + (i % 5) * 3,
          price: product.price,
        },
      ],
      status: i < 4 ? "Processing" : i < 7 ? "Shipped" : "Delivered",
      paid: i > 2,
      createdAt: daysAgo(i < 10 ? Math.floor(i / 2) : 5 + (i - 10) * 5),
    };
  });
  return {
    version: 1,
    products,
    customers,
    orders,
    purchases: [
      {
        id: "po1",
        number: "PO-0086",
        supplier: "Nordic Form Co.",
        items: [
          { productId: "p2", quantity: 30, price: 220 },
          { productId: "p5", quantity: 20, price: 98 },
        ],
        status: "Ordered",
        createdAt: daysAgo(3),
        expectedAt: "2026-10-29",
      },
      {
        id: "po2",
        number: "PO-0085",
        supplier: "Studio Ceramics",
        items: [{ productId: "p3", quantity: 60, price: 24 }],
        status: "Received",
        createdAt: daysAgo(12),
        expectedAt: "2026-10-22",
      },
      {
        id: "po3",
        number: "PO-0084",
        supplier: "Everyday Objects",
        items: [{ productId: "p7", quantity: 40, price: 32 }],
        status: "Ordered",
        createdAt: daysAgo(4),
        expectedAt: "2026-10-30",
      },
    ],
    activities: [
      {
        id: "a1",
        text: "New order from The Modern House",
        detail: "SO-1048 · 1 item",
        type: "order",
        at: daysAgo(0),
      },
      {
        id: "a2",
        text: "Olivia updated inventory",
        detail: "Everyday Ceramic Vase · +60 units",
        type: "stock",
        at: daysAgo(0),
      },
      {
        id: "a3",
        text: "Payment received",
        detail: "Objects & Spaces · $990",
        type: "payment",
        at: daysAgo(1),
      },
      {
        id: "a4",
        text: "Purchase order created",
        detail: "Nordic Form Co. · PO-0086",
        type: "stock",
        at: daysAgo(3),
      },
    ],
    documents: [
      {
        id: "d1",
        title: "Operations hub",
        icon: "📋",
        content:
          "A little structure. A lot of room to grow.\n\nThis is our shared home for the way we work. Keep useful context here so everyone can move with clarity.\n\nTHIS WEEK’S PRIORITIES\n☐ Receive the Nordic Form shipment\n☐ Review low-stock items and create purchase orders\n☐ Fulfill open customer orders\n\nGOOD TO KNOW\nInventory is tracked at our Brooklyn warehouse. Processing sales orders reserve stock; shipping deducts it. Receive purchase orders to add stock.\n\nTEAM RITUALS\nMonday · Plan the week\nWednesday · Inventory review\nFriday · Celebrate the little wins",
        updatedAt: daysAgo(1),
      },
      {
        id: "d2",
        title: "Weekly planning",
        icon: "✦",
        content:
          "A fresh page for what matters.\n\nFOCUS\nWhat is the one thing that will make this week a good one?\n\nTO DO\n☐ Check new orders\n☐ Connect with our suppliers\n☐ Make space for the unexpected",
        updatedAt: daysAgo(2),
      },
    ],
    settings: { name: "Forma Studio", owner: "Alex Parker", currency: "USD" },
  };
}

export type Action =
  | { type: "save-product"; product: Product }
  | { type: "create-order"; customerId: string; items: LineItem[] }
  | {
      type: "ship-order" | "deliver-order" | "cancel-order" | "pay-order";
      id: string;
    }
  | {
      type: "create-purchase";
      supplier: string;
      items: LineItem[];
      expectedAt: string;
    }
  | { type: "receive-purchase"; id: string }
  | { type: "save-customer"; customer: Customer }
  | { type: "save-document"; document: Document }
  | { type: "settings"; name: string; owner: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function validItems(state: AppState, items: LineItem[]) {
  assert(items.length > 0, "Add at least one product.");
  const ids = new Set<string>();
  for (const item of items) {
    assert(
      state.products.some((p) => p.id === item.productId),
      "A selected product no longer exists.",
    );
    assert(
      !ids.has(item.productId),
      "Use one line per product and adjust its quantity.",
    );
    ids.add(item.productId);
    assert(
      Number.isSafeInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 1e9,
      "Quantities must be positive whole numbers up to one billion.",
    );
    assert(
      Number.isFinite(item.price) && item.price >= 0 && item.price < 1e9,
      "Enter a valid price.",
    );
  }
  assert(
    Number.isFinite(total({ items })) && total({ items }) < 1e12,
    "The total is too large.",
  );
}
function nextNumber(prefix: string, numbers: string[], start: number) {
  return `${prefix}-${String(Math.max(start, ...numbers.map((n) => Number(n.split("-")[1]) || 0)) + 1).padStart(4, "0")}`;
}

export function transition(state: AppState, action: Action): AppState {
  let next: AppState = { ...state };
  let activity: Omit<Activity, "id" | "at"> = {
    text: "Workspace updated",
    detail: "Changes saved",
    type: "workspace",
  };
  switch (action.type) {
    case "save-product": {
      const p = {
        ...action.product,
        name: action.product.name.trim(),
        sku: action.product.sku.trim().toUpperCase(),
      };
      assert(
        p.name && p.sku && p.category.trim() && p.location.trim(),
        "Name, SKU, category, and location are required.",
      );
      assert(
        !state.products.some(
          (item) =>
            item.id !== p.id && item.sku.toLowerCase() === p.sku.toLowerCase(),
        ),
        "This SKU already exists.",
      );
      assert(
        [p.price, p.cost].every((n) => Number.isFinite(n) && n >= 0 && n < 1e9),
        "Prices must be valid, non-negative amounts.",
      );
      assert(
        [p.stock, p.reorderAt].every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e9,
        ),
        "Stock and reorder levels must be non-negative whole numbers.",
      );
      assert(
        p.stock >= reserved(state, p.id),
        `This product has ${reserved(state, p.id)} reserved units. Stock cannot be lower.`,
      );
      next.products = state.products.some((item) => item.id === p.id)
        ? state.products.map((item) => (item.id === p.id ? p : item))
        : [...state.products, p];
      activity = {
        text: `Inventory updated`,
        detail: `${p.name} · ${p.stock} units on hand`,
        type: "stock",
      };
      break;
    }
    case "create-order": {
      validItems(state, action.items);
      assert(
        state.customers.some((c) => c.id === action.customerId),
        "Choose a customer.",
      );
      for (const item of action.items)
        assert(
          available(state, item.productId) >= item.quantity,
          `Not enough available stock for ${state.products.find((p) => p.id === item.productId)?.name}.`,
        );
      const order: Order = {
        id: uid(),
        number: nextNumber(
          "SO",
          state.orders.map((o) => o.number),
          1048,
        ),
        customerId: action.customerId,
        items: action.items.map((i) => ({ ...i })),
        status: "Processing",
        paid: false,
        createdAt: new Date().toISOString(),
      };
      next.orders = [order, ...state.orders];
      activity = {
        text: `New order from ${state.customers.find((c) => c.id === order.customerId)?.company}`,
        detail: `${order.number} · ${money(total(order))}`,
        type: "order",
      };
      break;
    }
    case "ship-order": {
      const order = state.orders.find((o) => o.id === action.id);
      assert(
        order?.status === "Processing",
        "Only processing orders can be shipped.",
      );
      for (const item of order.items)
        assert(
          (state.products.find((p) => p.id === item.productId)?.stock ?? 0) >=
            item.quantity,
          "Insufficient stock to ship this order.",
        );
      next.products = state.products.map((p) => ({
        ...p,
        stock:
          p.stock -
          (order.items.find((i) => i.productId === p.id)?.quantity ?? 0),
      }));
      next.orders = state.orders.map((o) =>
        o.id === action.id ? { ...o, status: "Shipped" } : o,
      );
      activity = {
        text: `${order.number} is on its way`,
        detail: "Order shipped · inventory updated",
        type: "order",
      };
      break;
    }
    case "deliver-order":
    case "cancel-order":
    case "pay-order": {
      const order = state.orders.find((o) => o.id === action.id);
      assert(order, "Order not found.");
      if (action.type === "deliver-order")
        assert(
          order.status === "Shipped",
          "Only shipped orders can be delivered.",
        );
      if (action.type === "cancel-order")
        assert(
          order.status === "Processing" && !order.paid,
          "Only unpaid, processing orders can be cancelled.",
        );
      if (action.type === "pay-order")
        assert(
          !order.paid && order.status !== "Cancelled",
          "This order cannot be marked as paid.",
        );
      next.orders = state.orders.map((o) =>
        o.id !== action.id
          ? o
          : {
              ...o,
              ...(action.type === "pay-order"
                ? { paid: true }
                : {
                    status:
                      action.type === "deliver-order"
                        ? "Delivered"
                        : "Cancelled",
                  }),
            },
      );
      activity = {
        text:
          action.type === "pay-order"
            ? `Payment recorded for ${order.number}`
            : `${order.number} ${action.type === "deliver-order" ? "delivered" : "cancelled"}`,
        detail:
          action.type === "cancel-order"
            ? "Reserved stock released"
            : money(total(order)),
        type: action.type === "pay-order" ? "payment" : "order",
      };
      break;
    }
    case "create-purchase": {
      validItems(state, action.items);
      assert(action.supplier.trim(), "Enter a supplier name.");
      assert(
        !Number.isNaN(Date.parse(action.expectedAt)),
        "Choose a valid expected delivery date.",
      );
      const purchase: Purchase = {
        id: uid(),
        number: nextNumber(
          "PO",
          state.purchases.map((p) => p.number),
          86,
        ),
        supplier: action.supplier.trim(),
        items: action.items.map((i) => ({ ...i })),
        status: "Ordered",
        createdAt: new Date().toISOString(),
        expectedAt: action.expectedAt,
      };
      next.purchases = [purchase, ...state.purchases];
      activity = {
        text: `Purchase order created`,
        detail: `${purchase.number} · ${purchase.supplier}`,
        type: "stock",
      };
      break;
    }
    case "receive-purchase": {
      const purchase = state.purchases.find((p) => p.id === action.id);
      assert(
        purchase?.status === "Ordered",
        "This purchase has already been received.",
      );
      for (const item of purchase.items)
        assert(
          (state.products.find((p) => p.id === item.productId)?.stock ?? 0) +
            item.quantity <=
            1e9,
          "Receiving this shipment would exceed the maximum stock level of one billion units.",
        );
      next.products = state.products.map((p) => ({
        ...p,
        stock:
          p.stock +
          (purchase.items.find((i) => i.productId === p.id)?.quantity ?? 0),
      }));
      next.purchases = state.purchases.map((p) =>
        p.id === action.id ? { ...p, status: "Received" } : p,
      );
      activity = {
        text: `${purchase.number} received`,
        detail: `${purchase.items.reduce((n, i) => n + i.quantity, 0)} units added to inventory`,
        type: "stock",
      };
      break;
    }
    case "save-customer": {
      const customer = {
        ...action.customer,
        name: action.customer.name.trim(),
        company: action.customer.company.trim(),
        email: action.customer.email.trim(),
      };
      assert(
        customer.name &&
          customer.company &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
        "Enter a name, company, and valid email address.",
      );
      assert(
        !state.customers.some(
          (c) =>
            c.id !== customer.id &&
            c.email.toLowerCase() === customer.email.toLowerCase(),
        ),
        "A customer with this email already exists.",
      );
      next.customers = state.customers.some((c) => c.id === customer.id)
        ? state.customers.map((c) => (c.id === customer.id ? customer : c))
        : [...state.customers, customer];
      activity = {
        text: "Customer saved",
        detail: customer.company,
        type: "workspace",
      };
      break;
    }
    case "save-document": {
      assert(action.document.title.trim(), "Give your page a title.");
      next.documents = state.documents.some((d) => d.id === action.document.id)
        ? state.documents.map((d) =>
            d.id === action.document.id ? action.document : d,
          )
        : [...state.documents, action.document];
      return next;
    }
    case "settings": {
      assert(
        action.name.trim() && action.owner.trim(),
        "Workspace and display names are required.",
      );
      next.settings = {
        ...state.settings,
        name: action.name.trim(),
        owner: action.owner.trim(),
      };
      break;
    }
  }
  next = {
    ...next,
    activities: [
      { ...activity, id: uid(), at: new Date().toISOString() },
      ...state.activities,
    ].slice(0, 60),
  };
  return next;
}

export function csv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          // Prevent spreadsheet formula execution when exporting user-entered text.
          const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + csv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
