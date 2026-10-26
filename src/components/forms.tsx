"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CircleAlert,
  Plus,
  Trash2,
  Truck,
} from "lucide-react";
import {
  type Action,
  type AppState,
  type Customer,
  type LineItem,
  type Product,
  available,
  downloadCsv,
  money,
  reserved,
  shortDate,
  stockStatus,
  total,
  uid,
  customerLabel,
} from "@/lib/domain";
import {
  typeOf,
  unitOf,
  units,
  type ItemType,
  type Unit,
} from "@/lib/manufacturing";
import { ManufacturingDialog } from "./manufacturing-forms";
import { Avatar, Modal, ProductArt, Status } from "./ui";

export type RecordModal =
  | { type: "product"; product?: Product; itemType?: ItemType }
  | { type: "order" }
  | {
      type: "purchase";
      productId?: string;
      productIds?: string[];
      supplierId?: string;
    }
  | { type: "bom"; bomId?: string }
  | { type: "production"; bomId?: string }
  | { type: "production-detail"; id: string }
  | { type: "supplier"; supplierId?: string }
  | { type: "customer"; customer?: Customer }
  | { type: "order-detail"; id: string }
  | { type: "purchase-detail"; id: string };
interface Props {
  modal: RecordModal;
  state: AppState;
  onClose: () => void;
  onAction: (action: Action, message: string) => boolean;
  onOpen?: (modal: RecordModal) => void;
}

export function RecordDialog(props: Props) {
  switch (props.modal.type) {
    case "product":
      return (
        <ProductForm
          {...props}
          product={props.modal.product}
          defaultType={props.modal.itemType}
        />
      );
    case "bom":
    case "production":
    case "production-detail":
    case "supplier":
      return <ManufacturingDialog {...props} />;
    case "order":
      return <TransactionForm {...props} purchase={false} />;
    case "purchase":
      return (
        <TransactionForm
          {...props}
          purchase
          productId={props.modal.productId}
          productIds={props.modal.productIds}
          supplierId={props.modal.supplierId}
        />
      );
    case "customer":
      return <CustomerForm {...props} customer={props.modal.customer} />;
    case "order-detail":
      return <OrderDetail {...props} id={props.modal.id} />;
    case "purchase-detail":
      return <PurchaseDetail {...props} id={props.modal.id} />;
  }
}

function ProductForm({
  state,
  product,
  onClose,
  onAction,
  onOpen,
  defaultType,
}: Props & { product?: Product; defaultType?: ItemType }) {
  const [itemType, setItemType] = useState<ItemType>(
    product ? typeOf(product) : (defaultType ?? "finished"),
  );
  const [unit, setUnit] = useState<Unit>(product ? unitOf(product) : "pcs");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const next: Product = {
      id: product?.id ?? uid(),
      name: String(f.get("name")),
      sku: String(f.get("sku")),
      category: String(f.get("category")),
      price: itemType === "material" ? 0 : Number(f.get("price")),
      cost: Number(f.get("cost")),
      stock: Number(f.get("stock")),
      reorderAt: Number(f.get("reorderAt")),
      location: String(f.get("location")),
      kind: String(f.get("kind")) as Product["kind"],
      color: product?.color ?? "#e9e5db",
      itemType,
      unit,
    };
    if (
      onAction(
        { type: "save-product", product: next },
        product
          ? "Product updated. Everything is in sync."
          : "A new addition to your inventory.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={product ? product.name : "New inventory item"}
      subtitle={
        product
          ? `${product.sku} · Product record`
          : "Add a raw material, component, or finished product with its base unit."
      }
      onClose={onClose}
      variant={product ? "inspector" : "dialog"}
    >
      {product && (
        <div className="inspector-summary">
          <ProductArt product={product} />
          <div>
            <Status status={stockStatus(product)} />
            <span>
              {product.stock} {unitOf(product)} on hand ·{" "}
              {available(state, product.id)} available
            </span>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="record-form">
        <label>
          Item name
          <input
            name="name"
            placeholder="e.g. Steel sheet, cotton fabric, finished assembly…"
            defaultValue={product?.name}
            required
            maxLength={100}
            autoFocus
          />
        </label>
        <div className="form-grid">
          <label>
            Item type
            <select
              aria-label="Item type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
            >
              <option value="material">Raw material / input</option>
              <option value="finished">Finished product / assembly</option>
            </select>
          </label>
          <label>
            Base unit
            <select
              aria-label="Base unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
            >
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            SKU
            <input
              name="sku"
              placeholder="FRM-LT-009"
              defaultValue={product?.sku}
              required
              maxLength={50}
            />
          </label>
          <label>
            Category
            <input
              aria-label="Category"
              name="category"
              list="item-categories"
              defaultValue={
                product?.category ??
                (itemType === "material" ? "Raw materials" : "Finished goods")
              }
              required
              maxLength={80}
            />
            <datalist id="item-categories">
              {Array.from(new Set(state.products.map((p) => p.category))).map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </datalist>
          </label>
        </div>
        <div className="form-grid">
          <label hidden={itemType === "material"}>
            Sale price ($)
            <input
              name="price"
              type="number"
              min="0"
              max="999999999"
              step="0.01"
              defaultValue={
                product?.price ?? (itemType === "material" ? 0 : "")
              }
              required={itemType !== "material"}
              placeholder="0.00"
            />
          </label>
          <label>
            Unit cost ($)
            <input
              name="cost"
              type="number"
              min="0"
              max="999999999"
              step="0.01"
              defaultValue={product?.cost ?? ""}
              required
              placeholder="0.00"
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Stock on hand
            <input
              name="stock"
              type="number"
              min={product ? reserved(state, product.id) : 0}
              max="1000000000"
              step={unit === "pcs" ? "1" : "0.000001"}
              defaultValue={product?.stock ?? 0}
              required
            />
          </label>
          <label>
            Reorder point
            <input
              name="reorderAt"
              type="number"
              min="0"
              max="1000000000"
              step={unit === "pcs" ? "1" : "0.000001"}
              defaultValue={product?.reorderAt ?? 10}
              required
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Warehouse location
            <input
              name="location"
              defaultValue={product?.location ?? "Brooklyn · A-01"}
              required
              maxLength={80}
            />
          </label>
          <label>
            Product illustration
            <select
              aria-label="Product illustration"
              name="kind"
              defaultValue={product?.kind ?? "vase"}
            >
              {[
                "lamp",
                "chair",
                "vase",
                "shelf",
                "stool",
                "tray",
                "clock",
                "planter",
              ].map((k) => (
                <option key={k} value={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {product && reserved(state, product.id) > 0 && (
          <div className="form-note">
            <CircleAlert size={15} />
            {reserved(state, product.id)} units are reserved for open orders.
          </div>
        )}
        {product && onOpen && (
          <div className="record-connections">
            <h3>Linked sales orders</h3>
            {state.orders
              .filter((o) => o.items.some((i) => i.productId === product.id))
              .slice(0, 5)
              .map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => onOpen({ type: "order-detail", id: o.id })}
                >
                  <span>{o.number}</span>
                  <Status status={o.status} />
                  <ArrowRight size={14} />
                </button>
              ))}
          </div>
        )}
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            {product ? "Save changes" : "Create item"}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionForm({
  state,
  onClose,
  onAction,
  purchase,
  productId,
  productIds,
  supplierId,
}: Props & {
  purchase: boolean;
  productId?: string;
  productIds?: string[];
  supplierId?: string;
}) {
  const choices = state.products
    .filter((p) => purchase || typeOf(p) === "finished")
    .sort((a, b) =>
      purchase
        ? Number(typeOf(b) === "material") - Number(typeOf(a) === "material")
        : 0,
    );
  const first =
    choices.find((p) => p.id === productId) ??
    (purchase ? choices.find((p) => typeOf(p) === "material") : choices[0]) ??
    choices[0];
  const [items, setItems] = useState<LineItem[]>(
    purchase && productIds?.length
      ? state.products
          .filter((p) => productIds.includes(p.id))
          .map((p) => ({
            productId: p.id,
            quantity: Math.max(p.reorderAt * 2 - p.stock, 1),
            price: p.cost,
          }))
      : first
        ? [
            {
              productId: first.id,
              quantity: purchase ? Math.max(first.reorderAt * 2, 10) : 1,
              price: purchase ? first.cost : first.price,
            },
          ]
        : [],
  );
  const [customerId, setCustomerId] = useState(state.customers[0]?.id ?? "");
  function update(index: number, change: Partial<LineItem>) {
    setItems((old) =>
      old.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const action: Action = purchase
      ? {
          type: "create-purchase",
          supplier: String(f.get("supplier")),
          expectedAt: String(f.get("expectedAt")),
          items,
        }
      : { type: "create-order", customerId, items };
    if (
      onAction(
        action,
        purchase
          ? "Purchase order created. Good things are on their way."
          : "Order created. Stock has been reserved.",
      )
    )
      onClose();
  }
  const expected = new Date();
  expected.setDate(expected.getDate() + 7);
  return (
    <Modal
      title={purchase ? "Plan your next restock" : "Let’s make it an order"}
      subtitle={
        purchase
          ? "Keep good things on your shelves."
          : "Connect your customers, products, and possibilities."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="record-form">
        {purchase ? (
          <div className="form-grid">
            <label>
              Supplier
              <input
                aria-label="Supplier"
                name="supplier"
                defaultValue={
                  state.manufacturing.suppliers.find((s) => s.id === supplierId)
                    ?.name
                }
                list="suppliers"
                placeholder="Choose or enter a supplier"
                required
                maxLength={100}
                autoFocus
              />
              <datalist id="suppliers">
                {state.manufacturing.suppliers.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </datalist>
            </label>
            <label>
              Expected arrival
              <input
                name="expectedAt"
                type="date"
                defaultValue={expected.toISOString().slice(0, 10)}
                required
              />
            </label>
          </div>
        ) : (
          <label>
            Customer
            <select
              aria-label="Customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              autoFocus
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {customerLabel(c)}
                  {c.company && c.company !== c.name ? ` · ${c.name}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="line-items-heading">
          <span>{purchase ? "INPUT / ITEM" : "FINISHED PRODUCT"}</span>
          <span>QTY</span>
          <span>{purchase ? "COST" : "PRICE"}</span>
          <span />
        </div>
        <div className="line-items">
          {items.map((item, index) => (
            <div className="line-item" key={index}>
              <select
                aria-label={`Product ${index + 1}`}
                value={item.productId}
                onChange={(e) => {
                  const p = state.products.find(
                    (p) => p.id === e.target.value,
                  )!;
                  update(index, {
                    productId: p.id,
                    price: purchase ? p.cost : p.price,
                  });
                }}
              >
                {choices.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={items.some(
                      (item, i) => i !== index && item.productId === p.id,
                    )}
                  >
                    {p.name} · {unitOf(p)}
                    {!purchase ? ` (${available(state, p.id)} available)` : ""}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Quantity ${index + 1}`}
                type="number"
                min={
                  unitOf(
                    state.products.find((p) => p.id === item.productId)!,
                  ) === "pcs"
                    ? "1"
                    : "0.000001"
                }
                max="1000000"
                step={
                  unitOf(
                    state.products.find((p) => p.id === item.productId)!,
                  ) === "pcs"
                    ? "1"
                    : "0.000001"
                }
                required
                value={Number.isNaN(item.quantity) ? "" : item.quantity}
                onChange={(e) =>
                  update(index, {
                    quantity:
                      e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
              />
              <input
                aria-label={`Unit price ${index + 1}`}
                type="number"
                min="0"
                max="999999999"
                step="0.01"
                required
                value={Number.isNaN(item.price) ? "" : item.price}
                onChange={(e) =>
                  update(index, {
                    price: e.target.value === "" ? NaN : Number(e.target.value),
                  })
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove product ${index + 1}`}
                disabled={items.length === 1}
                onClick={() =>
                  setItems((old) => old.filter((_, i) => i !== index))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-button add-line"
          disabled={items.length === choices.length}
          onClick={() => {
            const p = choices.find(
              (p) => !items.some((i) => i.productId === p.id),
            );
            if (p)
              setItems([
                ...items,
                {
                  productId: p.id,
                  quantity: 1,
                  price: purchase ? p.cost : p.price,
                },
              ]);
          }}
        >
          <Plus size={15} />
          Add line item
        </button>
        <div className="order-form-total">
          <span>
            Order total <small>USD · before any applicable tax</small>
          </span>
          <strong>
            {money(Number.isFinite(total({ items })) ? total({ items }) : 0)}
          </strong>
        </div>
        <div className="form-note">
          <CircleAlert size={15} />
          {purchase
            ? "Stock is added when you mark this purchase as received."
            : "Stock is reserved now and deducted when you ship the order."}
        </div>
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button-primary">
            Create {purchase ? "purchase" : "order"}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerForm({
  customer,
  onClose,
  onAction,
}: Props & { customer?: Customer }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    if (
      onAction(
        {
          type: "save-customer",
          customer: {
            id: customer?.id ?? uid(),
            name: String(f.get("name")),
            company: String(f.get("company")),
            email: String(f.get("email")),
            color: customer?.color ?? "#e4e9e1",
            entityType: String(f.get("entityType")) as Customer["entityType"],
            phone: String(f.get("phone")),
          },
        },
        "Customer saved. A good connection.",
      )
    )
      onClose();
  }
  return (
    <Modal
      title={customer ? "Edit customer" : "A new connection"}
      subtitle="Customers can be individuals, businesses, organizations, or any other entity."
      onClose={onClose}
    >
      <form className="record-form" onSubmit={submit}>
        <label>
          Customer name
          <input
            name="name"
            defaultValue={customer?.name}
            placeholder="Person, business, organization, or other customer"
            required
            maxLength={100}
            autoFocus
          />
        </label>
        <label>
          Customer type
          <select
            name="entityType"
            aria-label="Customer type"
            defaultValue={customer?.entityType ?? "business"}
          >
            <option value="individual">Individual</option>
            <option value="business">Business / organization</option>
            <option value="other">Other entity</option>
          </select>
        </label>
        <label>
          Company / organization (optional)
          <input
            name="company"
            defaultValue={customer?.company}
            placeholder="e.g. The Modern House"
            maxLength={100}
          />
        </label>
        <label>
          Email address (optional)
          <input
            name="email"
            type="email"
            defaultValue={customer?.email}
            placeholder="hello@example.com"
            maxLength={160}
          />
        </label>
        <label>
          Phone (optional)
          <input name="phone" defaultValue={customer?.phone} maxLength={60} />
        </label>
        <div className="form-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary">
            {customer ? "Save customer" : "Add customer"}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OrderDetail({ state, id, onClose, onAction }: Props & { id: string }) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) return null;
  const customer = state.customers.find((c) => c.id === order.customerId)!;
  const doAction = (
    type: "ship-order" | "deliver-order" | "cancel-order" | "pay-order",
    message: string,
  ) => onAction({ type, id }, message);
  return (
    <Modal
      title={order.number}
      subtitle={`Sales order · Created ${shortDate(order.createdAt)}, ${new Date(order.createdAt).getFullYear()}`}
      onClose={onClose}
      wide
    >
      <div className="detail-content">
        <div className="detail-status">
          <Status status={order.status} />
          <Status status={order.paid ? "Paid" : "Unpaid"} />
          <button
            className="text-button"
            onClick={() =>
              downloadCsv(`${order.number}.csv`, [
                [
                  "Order",
                  "Customer",
                  "SKU",
                  "Product",
                  "Quantity",
                  "Unit price",
                  "Line total",
                  "Status",
                  "Payment",
                ],
                ...order.items.map((i) => {
                  const p = state.products.find((p) => p.id === i.productId)!;
                  return [
                    order.number,
                    customerLabel(customer),
                    p.sku,
                    p.name,
                    i.quantity,
                    i.price,
                    i.quantity * i.price,
                    order.status,
                    order.paid ? "Paid" : "Unpaid",
                  ];
                }),
              ])
            }
          >
            <ArrowDownToLine size={14} />
            Export CSV
          </button>
        </div>
        <div className="detail-customer">
          <Avatar name={customer.name} color={customer.color} />
          <div>
            <strong>{customerLabel(customer)}</strong>
            <span>
              {customer.name} · {customer.email}
            </span>
          </div>
        </div>
        <div className="detail-items">
          {order.items.map((i) => {
            const product = state.products.find((p) => p.id === i.productId)!;
            return (
              <div key={i.productId}>
                <ProductArt product={product} />
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {i.quantity} × {money(i.price)}
                  </small>
                </span>
                <b>{money(i.quantity * i.price)}</b>
              </div>
            );
          })}
        </div>
        <div className="detail-total">
          <span>Order total</span>
          <strong>{money(total(order))}</strong>
        </div>
        {order.status === "Processing" && (
          <div className="form-note">
            <CircleAlert size={15} />
            {order.items.reduce((n, i) => n + i.quantity, 0)} units reserved.
            Shipping deducts them from stock.
          </div>
        )}
        <div className="detail-actions">
          {order.status === "Processing" && !order.paid && (
            <button
              className="text-button danger-text"
              onClick={() =>
                doAction(
                  "cancel-order",
                  "Order cancelled. Reserved stock released.",
                )
              }
            >
              Cancel order
            </button>
          )}
          <div />
          {!order.paid && order.status !== "Cancelled" && (
            <button
              className="button"
              onClick={() => doAction("pay-order", "Payment recorded.")}
            >
              <Check size={15} />
              Record payment
            </button>
          )}
          {order.status === "Processing" && (
            <button
              className="button button-primary"
              onClick={() =>
                doAction("ship-order", "Order shipped. Inventory updated.")
              }
            >
              <Truck size={16} />
              Ship order
            </button>
          )}
          {order.status === "Shipped" && (
            <button
              className="button button-primary"
              onClick={() =>
                doAction(
                  "deliver-order",
                  "Order delivered. Another happy customer.",
                )
              }
            >
              <Check size={16} />
              Mark delivered
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function PurchaseDetail({
  state,
  id,
  onClose,
  onAction,
}: Props & { id: string }) {
  const purchase = state.purchases.find((p) => p.id === id);
  if (!purchase) return null;
  return (
    <Modal
      title={purchase.number}
      subtitle={`Purchase order · ${purchase.supplier}`}
      onClose={onClose}
      wide
    >
      <div className="detail-content">
        <div className="detail-status">
          <Status status={purchase.status} />
          <span className="muted">
            Expected {shortDate(purchase.expectedAt)}
          </span>
        </div>
        <div className="detail-items">
          {purchase.items.map((i) => {
            const p = state.products.find((p) => p.id === i.productId)!;
            return (
              <div key={i.productId}>
                <ProductArt product={p} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {i.quantity} × {money(i.price)}
                  </small>
                </span>
                <b>{money(i.quantity * i.price)}</b>
              </div>
            );
          })}
        </div>
        <div className="detail-total">
          <span>Purchase total</span>
          <strong>{money(total(purchase))}</strong>
        </div>
        <div className="form-note">
          <CircleAlert size={15} />
          {purchase.status === "Ordered"
            ? "Receiving this shipment adds all quantities to your on-hand inventory."
            : "This shipment has been received and inventory is up to date."}
        </div>
        <div className="form-footer">
          <button className="button" onClick={onClose}>
            Close
          </button>
          {purchase.status === "Ordered" && (
            <button
              className="button button-primary"
              onClick={() =>
                onAction(
                  { type: "receive-purchase", id },
                  "Shipment received. Your shelves are looking good.",
                )
              }
            >
              <Check size={16} />
              Receive shipment
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
