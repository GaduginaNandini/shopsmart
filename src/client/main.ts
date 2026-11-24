import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };

interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: number;
}

interface CartItemView {
  product_id: number;
  name: string;
  quantity: number;
  unit_price: string;
}

interface CartView {
  cart_id: number;
  coupon: string | null;
  items: CartItemView[];
  total: string;
}

interface OrderItemView {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
}

interface OrderView {
  id: number;
  email: string;
  status: string;
  total: string;
  coupon: string | null;
  paymentRef: string;
  createdAt: string;
  items: OrderItemView[];
}

interface SupportTicket {
  id: number;
  email: string | null;
  question: string;
  status: string;
  createdAt: string;
}

// Keep auth token strictly in memory (never localStorage/sessionStorage)
let authToken: string | null = null;
let currentUser: UserProfile | null = null;
let hasAdmin = true;
let cartId: number | null = null;

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function inputVal(id: string): string {
  return ($(id) as HTMLInputElement).value;
}

function setInputVal(id: string, value: string): void {
  ($(id) as HTMLInputElement).value = value;
}

async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const resp = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: T;
  if (resp.status === 204) {
    data = {} as T;
  } else {
    data = (await resp.json()) as T;
  }
  return { ok: resp.ok, status: resp.status, data };
}

function showAuthMessage(msg: string, isError = false): void {
  const el = $("auth-message");
  el.textContent = msg;
  el.className = isError ? "msg err" : "msg ok";
}

function showOrderResult(msg: string, isError = false): void {
  const el = $("order-result");
  el.textContent = msg;
  el.className = isError ? "err" : "ok";
}

function showAdminMessage(msg: string, isError = false): void {
  const el = $("admin-message");
  el.textContent = msg;
  el.className = isError ? "msg err" : "msg ok";
}

function setActiveTab(tab: "shop" | "orders" | "admin"): void {
  for (const id of ["tab-shop", "tab-orders", "tab-admin"]) {
    const btn = $(id);
    btn.classList.toggle("active", id === `tab-${tab}`);
  }
  $("view-shop").hidden = tab !== "shop";
  $("view-orders").hidden = tab !== "orders";
  $("view-admin").hidden = tab !== "admin";

  if (tab === "orders") {
    void loadOrderHistory();
  } else if (tab === "admin") {
    void loadAdminData();
  }
}

function renderAuthBar(): void {
  const guestBox = $("auth-guest");
  const userBox = $("auth-user");
  const claimBtn = $("claim-admin-btn");
  const adminTab = $("tab-admin");

  if (currentUser) {
    guestBox.hidden = true;
    userBox.hidden = false;
    $("user-badge").textContent = `${currentUser.name} (${currentUser.email}) — ${currentUser.role}`;
    if (!inputVal("email")) {
      setInputVal("email", currentUser.email);
    }
    claimBtn.hidden = hasAdmin || currentUser.role === "admin";
    adminTab.hidden = currentUser.role !== "admin";
  } else {
    guestBox.hidden = false;
    userBox.hidden = true;
    claimBtn.hidden = true;
    adminTab.hidden = true;
    if (!$("view-admin").hidden) {
      setActiveTab("shop");
    }
  }
}

async function refreshAuthStatus(): Promise<void> {
  const r = await api<{ hasAdmin: boolean }>("/api/auth/status");
  if (r.ok) {
    hasAdmin = r.data.hasAdmin;
    renderAuthBar();
  }
}

async function ensureCart(): Promise<number> {
  if (!cartId) {
    const r = await api<CartView>("/api/cart", "POST");
    cartId = r.data.cart_id;
  }
  return cartId;
}

function renderCart(c: CartView): void {
  const ul = $("cart-items");
  ul.replaceChildren();
  c.items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "cart-row";

    const label = document.createElement("span");
    label.textContent = `${item.name} x ${item.quantity} (INR ${item.unit_price})`;

    const actions = document.createElement("div");
    actions.className = "cart-actions";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "secondary small";
    minusBtn.textContent = "-";
    minusBtn.setAttribute("aria-label", `Decrease ${item.name} quantity`);
    minusBtn.onclick = async () => {
      const id = await ensureCart();
      const r = await api<CartView & { error?: string }>(
        `/api/cart/${id}/items/${item.product_id}`,
        "PATCH",
        { quantity: item.quantity - 1 }
      );
      if (r.ok) renderCart(r.data);
      else showOrderResult(r.data.error ?? "Failed to update cart", true);
    };

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "secondary small";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", `Increase ${item.name} quantity`);
    plusBtn.onclick = async () => {
      const id = await ensureCart();
      const r = await api<CartView & { error?: string }>(
        `/api/cart/${id}/items`,
        "POST",
        { product_id: item.product_id, quantity: 1 }
      );
      if (r.ok) renderCart(r.data);
      else showOrderResult(r.data.error ?? "Failed to update cart", true);
    };

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "secondary small";
    removeBtn.textContent = "Remove";
    removeBtn.id = `remove-${item.product_id}`;
    removeBtn.onclick = async () => {
      const id = await ensureCart();
      const r = await api<CartView>(
        `/api/cart/${id}/items/${item.product_id}`,
        "DELETE"
      );
      if (r.ok) renderCart(r.data);
    };

    actions.append(minusBtn, plusBtn, removeBtn);
    li.append(label, actions);
    ul.appendChild(li);
  });

  $("cart-total").textContent = c.total;
  const couponBadge = $("active-coupon");
  couponBadge.textContent = c.coupon ? `Coupon applied: ${c.coupon}` : "";
}

async function loadProducts(): Promise<void> {
  const q = inputVal("search-q").trim();
  const category = ($("category-filter") as HTMLSelectElement).value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category && category !== "All") params.set("category", category);

  const query = params.toString() ? `?${params.toString()}` : "";
  const r = await api<Product[]>(`/api/products${query}`);
  const box = $("products");
  box.replaceChildren();

  if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No matching products found.";
    box.appendChild(empty);
    return;
  }

  r.data.forEach((p) => {
    const row = document.createElement("div");
    row.className = "product";
    row.id = `product-${p.id}`;

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = p.name;
    const cat = document.createElement("span");
    cat.className = "tag";
    cat.textContent = p.category;
    const desc = document.createElement("div");
    desc.className = "muted";
    desc.textContent = p.description || "";
    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = `INR ${p.price} · ${p.stock} in stock`;
    info.append(title, " ", cat, desc, meta);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = `add-${p.id}`;
    btn.textContent = p.stock > 0 ? "Add to cart" : "Out of stock";
    btn.disabled = p.stock <= 0;
    btn.onclick = async () => {
      const id = await ensureCart();
      const res = await api<CartView & { error?: string }>(
        `/api/cart/${id}/items`,
        "POST",
        { product_id: p.id, quantity: 1 }
      );
      if (res.ok) {
        renderCart(res.data);
        showOrderResult("");
      } else {
        showOrderResult(res.data.error ?? "Unable to add item", true);
      }
    };

    row.append(info, btn);
    box.appendChild(row);
  });
}

async function loadOrderHistory(): Promise<void> {
  const listEl = $("orders-list");
  listEl.replaceChildren();

  if (!authToken || !currentUser) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent =
      "Sign in to view your full order history, or look up a specific order below by ID and email.";
    listEl.appendChild(p);
    return;
  }

  const r = await api<OrderView[] & { error?: string }>("/api/orders");
  if (!r.ok || !Array.isArray(r.data) || r.data.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "You have not placed any orders yet.";
    listEl.appendChild(p);
    return;
  }

  r.data.forEach((order) => {
    const card = document.createElement("div");
    card.className = "order-card";

    const head = document.createElement("div");
    head.className = "order-head";
    const strong = document.createElement("strong");
    strong.textContent = `Order #${order.id} — ${order.status}`;
    const total = document.createElement("span");
    total.textContent = `INR ${order.total}`;
    head.append(strong, total);

    const meta = document.createElement("div");
    meta.className = "muted";
    meta.textContent = `Placed ${new Date(order.createdAt).toLocaleString()} · Payment Ref: ${order.paymentRef}`;

    const itemsUl = document.createElement("ul");
    itemsUl.className = "order-items";
    order.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.productName} × ${item.quantity} @ INR ${item.unitPrice}`;
      itemsUl.appendChild(li);
    });

    card.append(head, meta, itemsUl);
    listEl.appendChild(card);
  });
}

async function loadAdminData(): Promise<void> {
  if (!currentUser || currentUser.role !== "admin") return;

  const [prodResp, ordResp, ticketResp] = await Promise.all([
    api<Product[]>("/api/products"),
    api<OrderView[]>("/api/orders"),
    api<SupportTicket[]>("/api/support/tickets"),
  ]);

  const prodBox = $("admin-products");
  prodBox.replaceChildren();
  if (prodResp.ok && Array.isArray(prodResp.data)) {
    prodResp.data.forEach((p) => {
      const row = document.createElement("div");
      row.className = "admin-row";

      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = `#${p.id} ${p.name} (${p.category})`;
      const stats = document.createElement("div");
      stats.className = "muted";
      stats.textContent = `INR ${p.price} · Stock: ${p.stock}`;
      info.append(name, stats);

      const controls = document.createElement("div");
      controls.className = "admin-controls";

      const stockInput = document.createElement("input");
      stockInput.type = "number";
      stockInput.min = "0";
      stockInput.value = String(p.stock);
      stockInput.className = "inline-input";
      stockInput.setAttribute("aria-label", `Stock for ${p.name}`);

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.step = "0.01";
      priceInput.min = "0";
      priceInput.value = p.price;
      priceInput.className = "inline-input";
      priceInput.setAttribute("aria-label", `Price for ${p.name}`);

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "secondary small";
      saveBtn.textContent = "Update";
      saveBtn.onclick = async () => {
        const res = await api<Product & { error?: string }>(
          `/api/products/${p.id}`,
          "PATCH",
          { price: priceInput.value, stock: Number(stockInput.value) }
        );
        if (res.ok) {
          showAdminMessage(`Updated ${p.name}.`);
          await loadAdminData();
          await loadProducts();
        } else {
          showAdminMessage(res.data.error ?? "Update failed", true);
        }
      };

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "secondary small danger";
      delBtn.textContent = "Delete";
      delBtn.onclick = async () => {
        const res = await api<{ error?: string }>(`/api/products/${p.id}`, "DELETE");
        if (res.ok) {
          showAdminMessage(`Deleted ${p.name}.`);
          await loadAdminData();
          await loadProducts();
        } else {
          showAdminMessage(res.data.error ?? "Delete failed", true);
        }
      };

      controls.append(priceInput, stockInput, saveBtn, delBtn);
      row.append(info, controls);
      prodBox.appendChild(row);
    });
  }

  const ordBox = $("admin-orders");
  ordBox.replaceChildren();
  if (ordResp.ok && Array.isArray(ordResp.data)) {
    ordResp.data.forEach((o) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `Order #${o.id} · ${o.email}`;
      const sub = document.createElement("div");
      sub.className = "muted";
      sub.textContent = `Total: INR ${o.total} · Status: ${o.status}`;
      info.append(title, sub);

      const controls = document.createElement("div");
      controls.className = "admin-controls";
      const select = document.createElement("select");
      ["PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"].forEach((st) => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        if (st === o.status) opt.selected = true;
        select.appendChild(opt);
      });
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "secondary small";
      saveBtn.textContent = "Set Status";
      saveBtn.onclick = async () => {
        const res = await api<{ error?: string }>(
          `/api/orders/${o.id}/status`,
          "PATCH",
          { status: select.value }
        );
        if (res.ok) {
          showAdminMessage(`Order #${o.id} status set to ${select.value}.`);
          await loadAdminData();
        } else {
          showAdminMessage(res.data.error ?? "Failed to update status", true);
        }
      };
      controls.append(select, saveBtn);
      row.append(info, controls);
      ordBox.appendChild(row);
    });
  }

  const ticketsBox = $("admin-tickets");
  ticketsBox.replaceChildren();
  if (ticketResp.ok && Array.isArray(ticketResp.data)) {
    if (ticketResp.data.length === 0) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No escalated support tickets.";
      ticketsBox.appendChild(p);
    } else {
      ticketResp.data.forEach((t) => {
        const row = document.createElement("div");
        row.className = "admin-row";
        const info = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `Ticket #${t.id} (${t.status})`;
        const q = document.createElement("div");
        q.textContent = t.question;
        const meta = document.createElement("div");
        meta.className = "muted";
        meta.textContent = `${t.email || "anonymous"} · ${new Date(t.createdAt).toLocaleString()}`;
        info.append(title, q, meta);
        row.appendChild(info);
        ticketsBox.appendChild(row);
      });
    }
  }
}

// --- Event Wiring ---

$("tab-shop").onclick = () => setActiveTab("shop");
$("tab-orders").onclick = () => setActiveTab("orders");
$("tab-admin").onclick = () => setActiveTab("admin");

$("search-btn").onclick = () => void loadProducts();
$("category-filter").onchange = () => void loadProducts();

$("apply-coupon").onclick = async () => {
  const id = await ensureCart();
  const r = await api<CartView & { error?: string }>(
    `/api/cart/${id}/coupon`,
    "POST",
    { code: inputVal("coupon") }
  );
  if (r.ok) {
    renderCart(r.data);
    showOrderResult("");
  } else {
    showOrderResult(r.data.error ?? "Invalid coupon", true);
  }
};

$("checkout-btn").onclick = async () => {
  const id = await ensureCart();
  const r = await api<{
    order_id?: number;
    status?: string;
    total?: string;
    payment_ref?: string;
    error?: string;
  }>(`/api/cart/${id}/checkout`, "POST", {
    email: inputVal("email"),
    card_token: inputVal("card-token"),
  });
  if (r.ok) {
    showOrderResult(
      `Order #${r.data.order_id} placed. Status: ${r.data.status}. Total: ${r.data.total}`
    );
    renderCart({ cart_id: id, coupon: null, items: [], total: "0.00" });
    await loadProducts();
  } else {
    showOrderResult(r.data.error ?? "Checkout failed", true);
  }
};

$("chat-send").onclick = async () => {
  const q = inputVal("chat-input").trim();
  if (!q) return;
  const log = $("chat-log");
  const you = document.createElement("div");
  you.className = "you";
  you.textContent = `You: ${q}`;
  log.appendChild(you);

  const r = await api<{ answer: string; source: string; escalated: boolean }>(
    "/api/chat",
    "POST",
    { message: q }
  );
  const bot = document.createElement("div");
  bot.className = r.data.escalated ? "bot escalated" : "bot";
  bot.textContent = `Bot: ${r.data.answer}`;
  log.appendChild(bot);
  setInputVal("chat-input", "");
  log.scrollTop = log.scrollHeight;
};

$("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("chat-send").click();
  }
});

$("lookup-order-btn").onclick = async () => {
  const orderId = inputVal("lookup-order-id").trim();
  const email = inputVal("lookup-order-email").trim();
  const out = $("lookup-order-result");
  out.replaceChildren();
  if (!orderId || !email) {
    out.textContent = "Enter both Order ID and Email.";
    return;
  }
  const r = await api<{
    order_id?: number;
    status?: string;
    total?: string;
    payment_ref?: string;
    items?: Array<{ productName: string; quantity: number; unitPrice: string }>;
    error?: string;
  }>(`/api/orders/${encodeURIComponent(orderId)}?email=${encodeURIComponent(email)}`);
  if (!r.ok) {
    out.textContent = r.data.error ?? "Order not found";
    return;
  }
  const summary = document.createElement("p");
  summary.textContent = `Order #${r.data.order_id} · Status: ${r.data.status} · Total: INR ${r.data.total} · Payment Ref: ${r.data.payment_ref}`;
  out.appendChild(summary);
  if (r.data.items) {
    const ul = document.createElement("ul");
    r.data.items.forEach((i) => {
      const li = document.createElement("li");
      li.textContent = `${i.productName} × ${i.quantity} @ INR ${i.unitPrice}`;
      ul.appendChild(li);
    });
    out.appendChild(ul);
  }
};

$("register-btn").onclick = async () => {
  const r = await api<{ user?: UserProfile; token?: string; error?: string }>(
    "/api/auth/register",
    "POST",
    {
      name: inputVal("auth-name"),
      email: inputVal("auth-email"),
      password: inputVal("auth-password"),
    }
  );
  if (r.ok && r.data.user && r.data.token) {
    authToken = r.data.token;
    currentUser = r.data.user;
    showAuthMessage(`Registered and signed in as ${currentUser.email}`);
    await refreshAuthStatus();
  } else {
    showAuthMessage(r.data.error ?? "Registration failed", true);
  }
};

$("login-btn").onclick = async () => {
  const r = await api<{ user?: UserProfile; token?: string; error?: string }>(
    "/api/auth/login",
    "POST",
    {
      email: inputVal("auth-email"),
      password: inputVal("auth-password"),
    }
  );
  if (r.ok && r.data.user && r.data.token) {
    authToken = r.data.token;
    currentUser = r.data.user;
    showAuthMessage(`Signed in as ${currentUser.email}`);
    await refreshAuthStatus();
  } else {
    showAuthMessage(r.data.error ?? "Sign-in failed", true);
  }
};

$("google-signin-btn").onclick = async () => {
  try {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await result.user.getIdToken();
    authToken = idToken;
    const r = await api<{ user?: UserProfile; error?: string }>(
      "/api/auth/firebase",
      "POST"
    );
    if (r.ok && r.data.user) {
      currentUser = r.data.user;
      showAuthMessage(`Signed in with Google as ${currentUser.email}`);
      await refreshAuthStatus();
    } else {
      authToken = null;
      showAuthMessage(r.data.error ?? "Google sign-in failed", true);
    }
  } catch (err) {
    showAuthMessage(
      err instanceof Error ? err.message : "Google sign-in cancelled",
      true
    );
  }
};

$("claim-admin-btn").onclick = async () => {
  const r = await api<{ user?: UserProfile; token?: string; error?: string }>(
    "/api/auth/claim-admin",
    "POST"
  );
  if (r.ok && r.data.user) {
    currentUser = r.data.user;
    if (r.data.token) authToken = r.data.token;
    hasAdmin = true;
    showAuthMessage("Admin access claimed for this account.");
    renderAuthBar();
  } else {
    showAuthMessage(r.data.error ?? "Could not claim admin access", true);
  }
};

$("logout-btn").onclick = async () => {
  try {
    await signOut(firebaseAuth);
  } catch {
    // ignore if local session
  }
  authToken = null;
  currentUser = null;
  showAuthMessage("Signed out.");
  renderAuthBar();
};

$("admin-create-product-btn").onclick = async () => {
  const r = await api<Product & { error?: string }>("/api/products", "POST", {
    name: inputVal("admin-prod-name"),
    category: inputVal("admin-prod-category") || "General",
    description: inputVal("admin-prod-desc"),
    price: inputVal("admin-prod-price"),
    stock: Number(inputVal("admin-prod-stock") || "0"),
  });
  if (r.ok) {
    showAdminMessage(`Created product "${r.data.name}".`);
    setInputVal("admin-prod-name", "");
    setInputVal("admin-prod-desc", "");
    setInputVal("admin-prod-price", "");
    setInputVal("admin-prod-stock", "");
    await loadAdminData();
    await loadProducts();
  } else {
    showAdminMessage(r.data.error ?? "Failed to create product", true);
  }
};

void loadProducts();
void refreshAuthStatus();
