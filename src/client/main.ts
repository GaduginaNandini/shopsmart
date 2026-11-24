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

// Auth token kept strictly in JS memory
let authToken: string | null = null;
let currentUser: UserProfile | null = null;
let hasAdmin = true;
let cartId: number | null = null;
let allProducts: Product[] = [];
let activeProductDetail: Product | null = null;

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const PRODUCT_IMAGES: Record<string, string> = {
  notebook: "/images/product_notebook_1795544241906.jpg",
  "pen set": "/images/product_pen_set_1795544243133.jpg",
  "desk lamp": "/images/product_desk_lamp_1795544242050.jpg",
  backpack: "/images/product_backpack_1795544242796.jpg",
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  Stationery: "/images/product_notebook_1795544241906.jpg",
  Electronics: "/images/product_desk_lamp_1795544242050.jpg",
  Accessories: "/images/product_backpack_1795544242796.jpg",
  General: "/images/hero_workspace_showcase_1795544241481.jpg",
};

const HERO_IMAGE = "/images/hero_workspace_showcase_1795544241481.jpg";

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

function getProductImage(p: Product): string {
  const byName = PRODUCT_IMAGES[p.name.trim().toLowerCase()];
  if (byName) return byName;
  return CATEGORY_FALLBACK_IMAGES[p.category] ?? HERO_IMAGE;
}

function getProductDisplayMeta(p: Product): {
  rating: string;
  reviews: number;
  originalPrice: string;
  discountLabel: string;
} {
  const priceNum = Number(p.price) || 0;
  const original = (priceNum * 1.15).toFixed(2);
  const seed = p.id % 4;
  const ratings = ["4.9", "4.8", "4.7", "4.9"];
  const reviews = [142, 96, 214, 178];
  return {
    rating: ratings[seed],
    reviews: reviews[seed],
    originalPrice: original,
    discountLabel: "13% off MRP",
  };
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

function openAuthModal(): void {
  $("auth-modal").hidden = false;
}

function closeAuthModal(): void {
  $("auth-modal").hidden = true;
}

function openChatWindow(): void {
  $("chat-window").hidden = false;
  $("chat-fab").setAttribute("aria-expanded", "true");
  ($("chat-input") as HTMLInputElement).focus();
}

function closeChatWindow(): void {
  $("chat-window").hidden = true;
  $("chat-fab").setAttribute("aria-expanded", "false");
}

function setActiveTab(tab: "shop" | "orders" | "admin"): void {
  for (const id of ["tab-shop", "tab-orders", "tab-admin"]) {
    $(id).classList.toggle("active", id === `tab-${tab}`);
  }
  $("view-shop").hidden = tab !== "shop";
  $("view-orders").hidden = tab !== "orders";
  $("view-admin").hidden = tab !== "admin";
  $("mobile-drawer").hidden = true;
  $("mobile-menu-btn").setAttribute("aria-expanded", "false");

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
  const mobileAdminBtn = $("mobile-admin-btn");
  const accountBtn = $("account-toggle-btn");

  if (currentUser) {
    guestBox.hidden = true;
    userBox.hidden = false;
    $("user-badge").textContent = `${currentUser.name} (${currentUser.email})`;
    $("user-role-sub").textContent = `Account role: ${currentUser.role}`;
    accountBtn.textContent = currentUser.name.split(" ")[0] || "Account";
    if (!inputVal("email")) {
      setInputVal("email", currentUser.email);
    }
    claimBtn.hidden = hasAdmin || currentUser.role === "admin";
    const isAdmin = currentUser.role === "admin";
    adminTab.hidden = !isAdmin;
    mobileAdminBtn.hidden = !isAdmin;
  } else {
    guestBox.hidden = false;
    userBox.hidden = true;
    accountBtn.textContent = "Sign In";
    claimBtn.hidden = true;
    adminTab.hidden = true;
    mobileAdminBtn.hidden = true;
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

  const totalUnits = c.items.reduce((sum, item) => sum + item.quantity, 0);
  $("cart-count").textContent = String(totalUnits);

  if (c.items.length === 0) {
    const empty = document.createElement("li");
    empty.className = "muted";
    empty.style.fontSize = "13.5px";
    empty.textContent = "Your bag is empty. Add items from the catalogue.";
    ul.appendChild(empty);
  } else {
    c.items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "cart-row";

      const top = document.createElement("div");
      top.className = "cart-row-top";
      const nameEl = document.createElement("strong");
      nameEl.textContent = item.name;
      const priceEl = document.createElement("span");
      priceEl.className = "mono";
      priceEl.textContent = `INR ${item.unit_price} × ${item.quantity}`;
      top.append(nameEl, priceEl);

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
      removeBtn.className = "danger small";
      removeBtn.style.marginLeft = "auto";
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
      li.append(top, actions);
      ul.appendChild(li);
    });
  }

  $("cart-total").textContent = c.total;
  $("active-coupon").textContent = c.coupon ? `${c.coupon} applied` : "";
}

function openProductDetails(p: Product): void {
  activeProductDetail = p;
  const imgUrl = getProductImage(p);
  const meta = getProductDisplayMeta(p);

  $("pdp-category").textContent = `${p.category} · Product #${p.id}`;
  $("pdp-title").textContent = p.name;
  $("pdp-desc").textContent =
    p.description || "Engineered workspace essential built for everyday reliability.";
  $("pdp-price").textContent = `INR ${p.price}`;
  $("pdp-was").textContent = `INR ${meta.originalPrice}`;
  $("pdp-discount").textContent = meta.discountLabel;
  $("pdp-stock").textContent =
    p.stock > 0 ? `${p.stock} units ready to ship` : "Currently out of stock";

  const ratingEl = $("pdp-rating");
  ratingEl.replaceChildren();
  const starSpan = document.createElement("span");
  starSpan.className = "star";
  starSpan.textContent = `★ ${meta.rating}`;
  const revSpan = document.createElement("span");
  revSpan.className = "num";
  revSpan.textContent = `(${meta.reviews} verified reviews)`;
  ratingEl.append(starSpan, revSpan);

  const mainImg = $("pdp-main-image") as HTMLImageElement;
  mainImg.src = imgUrl;
  mainImg.alt = p.name;

  const thumbs = $("pdp-thumbs");
  thumbs.replaceChildren();
  const galleryUrls = [imgUrl, HERO_IMAGE];
  galleryUrls.forEach((url, idx) => {
    const tBtn = document.createElement("button");
    tBtn.type = "button";
    tBtn.className = idx === 0 ? "pdp-thumb-btn active" : "pdp-thumb-btn";
    tBtn.setAttribute("aria-label", `View image ${idx + 1} for ${p.name}`);
    const tImg = document.createElement("img");
    tImg.src = url;
    tImg.alt = `${p.name} view ${idx + 1}`;
    tImg.referrerPolicy = "no-referrer";
    tBtn.appendChild(tImg);
    tBtn.onclick = () => {
      mainImg.src = url;
      thumbs.querySelectorAll(".pdp-thumb-btn").forEach((el, j) => {
        el.classList.toggle("active", j === idx);
      });
    };
    thumbs.appendChild(tBtn);
  });

  setInputVal("pdp-qty", "1");
  ($("pdp-add-btn") as HTMLButtonElement).disabled = p.stock <= 0;
  $("pdp-feedback").textContent = "";
  $("product-modal").hidden = false;
}

function closeProductDetails(): void {
  $("product-modal").hidden = true;
  activeProductDetail = null;
}

function updateCategoryCounts(products: Product[]): void {
  const counts: Record<string, number> = { All: products.length };
  products.forEach((p) => {
    counts[p.category] = (counts[p.category] ?? 0) + 1;
  });
  document.querySelectorAll<HTMLElement>("[data-cat-count]").forEach((el) => {
    const cat = el.dataset.catCount || "All";
    if (cat === "All") {
      el.textContent = `${counts.All ?? 0} curated items`;
    } else if (counts[cat] !== undefined) {
      el.textContent = `${counts[cat]} item${counts[cat] === 1 ? "" : "s"}`;
    }
  });
}

function syncCategoryUI(selected: string): void {
  ($("category-filter") as HTMLSelectElement).value = selected;
  document.querySelectorAll<HTMLElement>("[data-cat-card]").forEach((card) => {
    card.classList.toggle("active", card.dataset.catCard === selected);
  });
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
    const empty = document.createElement("div");
    empty.className = "panel-card";
    empty.style.gridColumn = "1 / -1";
    empty.textContent = "No matching products found. Try clearing your filter or search query.";
    box.appendChild(empty);
    return;
  }

  if (!q && category === "All") {
    allProducts = r.data;
    updateCategoryCounts(allProducts);
  }

  r.data.forEach((p) => {
    const card = document.createElement("article");
    card.className = "product";
    card.id = `product-${p.id}`;

    const thumb = document.createElement("div");
    thumb.className = "product-thumb";
    thumb.onclick = () => openProductDetails(p);

    const img = document.createElement("img");
    img.src = getProductImage(p);
    img.alt = p.name;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      thumb.replaceChildren();
      const fb = document.createElement("div");
      fb.className = "product-fallback";
      fb.textContent = p.name;
      thumb.appendChild(fb);
    };
    thumb.appendChild(img);

    const body = document.createElement("div");
    body.className = "product-body";

    const metaLine = document.createElement("div");
    metaLine.className = "product-meta-line";
    metaLine.textContent = `${p.category} · ${p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}`;

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.className = "product-title-btn";
    titleBtn.textContent = p.name;
    titleBtn.onclick = () => openProductDetails(p);

    const desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = p.description || "Precision everyday workspace item.";

    const disp = getProductDisplayMeta(p);
    const ratingRow = document.createElement("div");
    ratingRow.className = "product-rating";
    const star = document.createElement("span");
    star.className = "star";
    star.textContent = `★ ${disp.rating}`;
    const rev = document.createElement("span");
    rev.className = "num";
    rev.textContent = `(${disp.reviews} reviews)`;
    ratingRow.append(star, rev);

    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";
    const priceGroup = document.createElement("div");
    priceGroup.className = "price-group";
    const now = document.createElement("span");
    now.className = "price-now mono";
    now.textContent = `INR ${p.price}`;
    const was = document.createElement("span");
    was.className = "price-was mono";
    was.textContent = `INR ${disp.originalPrice}`;
    priceGroup.append(now, was);

    const disc = document.createElement("span");
    disc.className = "discount-note";
    disc.textContent = disp.discountLabel;
    priceRow.append(priceGroup, disc);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "primary small";
    addBtn.id = `add-${p.id}`;
    addBtn.textContent = p.stock > 0 ? "Add to Cart" : "Out of Stock";
    addBtn.disabled = p.stock <= 0;
    addBtn.onclick = async () => {
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

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "secondary small";
    detailsBtn.textContent = "Details";
    detailsBtn.onclick = () => openProductDetails(p);

    actions.append(addBtn, detailsBtn);
    body.append(metaLine, titleBtn, desc, ratingRow, priceRow, actions);
    card.append(thumb, body);
    box.appendChild(card);
  });
}

async function loadOrderHistory(): Promise<void> {
  const listEl = $("orders-list");
  listEl.replaceChildren();

  if (!authToken || !currentUser) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent =
      "Sign in via the Account button to view your full order history, or look up an order below.";
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
    strong.className = "mono";
    strong.textContent = `Order #${order.id} · ${order.status}`;
    const total = document.createElement("span");
    total.className = "mono";
    total.textContent = `INR ${order.total}`;
    head.append(strong, total);

    const meta = document.createElement("div");
    meta.className = "muted";
    meta.style.fontSize = "13px";
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

function renderAdminCharts(products: Product[], orders: OrderView[]): void {
  const statusBox = $("chart-orders");
  statusBox.replaceChildren();
  const statuses = ["PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];
  const maxOrd = Math.max(orders.length, 1);

  statuses.forEach((st) => {
    const count = orders.filter((o) => o.status === st).length;
    const row = document.createElement("div");
    row.className = "bar-row";
    const lbl = document.createElement("span");
    lbl.textContent = st;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.round((count / maxOrd) * 100)}%`;
    track.appendChild(fill);
    const val = document.createElement("span");
    val.className = "mono";
    val.style.textAlign = "right";
    val.textContent = String(count);
    row.append(lbl, track, val);
    statusBox.appendChild(row);
  });

  const stockBox = $("chart-stock");
  stockBox.replaceChildren();
  const maxStock = Math.max(...products.map((p) => p.stock), 1);
  products.slice(0, 6).forEach((p) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    const lbl = document.createElement("span");
    lbl.textContent = p.name;
    lbl.style.overflow = "hidden";
    lbl.style.textOverflow = "ellipsis";
    lbl.style.whiteSpace = "nowrap";
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.round((p.stock / maxStock) * 100)}%`;
    track.appendChild(fill);
    const val = document.createElement("span");
    val.className = "mono";
    val.style.textAlign = "right";
    val.textContent = String(p.stock);
    row.append(lbl, track, val);
    stockBox.appendChild(row);
  });
}

async function loadAdminData(): Promise<void> {
  if (!currentUser || currentUser.role !== "admin") return;

  const [prodResp, ordResp, ticketResp] = await Promise.all([
    api<Product[]>("/api/products"),
    api<OrderView[]>("/api/orders"),
    api<SupportTicket[]>("/api/support/tickets"),
  ]);

  const prodList = prodResp.ok && Array.isArray(prodResp.data) ? prodResp.data : [];
  const ordList = ordResp.ok && Array.isArray(ordResp.data) ? ordResp.data : [];
  const ticketList =
    ticketResp.ok && Array.isArray(ticketResp.data) ? ticketResp.data : [];

  $("kpi-products").textContent = String(prodList.length);
  const lowStockCount = prodList.filter((p) => p.stock <= 10).length;
  $("kpi-low-stock").textContent = `${lowStockCount} low stock (≤10)`;

  const revenue = ordList
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  $("kpi-revenue").textContent = `INR ${revenue.toFixed(2)}`;
  $("kpi-orders").textContent = String(ordList.length);
  const deliveredCount = ordList.filter((o) => o.status === "DELIVERED").length;
  $("kpi-delivered").textContent = `${deliveredCount} delivered`;
  $("kpi-tickets").textContent = String(ticketList.length);

  renderAdminCharts(prodList, ordList);

  const prodBody = $("admin-products");
  prodBody.replaceChildren();
  prodList.forEach((p) => {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.className = "mono";
    tdId.textContent = `#${p.id}`;

    const tdName = document.createElement("td");
    tdName.textContent = p.name;

    const tdCat = document.createElement("td");
    tdCat.className = "muted";
    tdCat.textContent = p.category;

    const tdPrice = document.createElement("td");
    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.step = "0.01";
    priceInput.min = "0";
    priceInput.value = p.price;
    priceInput.className = "inline-input mono";
    priceInput.setAttribute("aria-label", `Price for ${p.name}`);
    tdPrice.appendChild(priceInput);

    const tdStock = document.createElement("td");
    const stockInput = document.createElement("input");
    stockInput.type = "number";
    stockInput.min = "0";
    stockInput.value = String(p.stock);
    stockInput.className = "inline-input mono";
    stockInput.setAttribute("aria-label", `Stock for ${p.name}`);
    tdStock.appendChild(stockInput);

    const tdAct = document.createElement("td");
    const actWrap = document.createElement("div");
    actWrap.style.display = "flex";
    actWrap.style.gap = "6px";

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
    delBtn.className = "danger small";
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

    actWrap.append(saveBtn, delBtn);
    tdAct.appendChild(actWrap);
    tr.append(tdId, tdName, tdCat, tdPrice, tdStock, tdAct);
    prodBody.appendChild(tr);
  });

  const ordBody = $("admin-orders");
  ordBody.replaceChildren();
  ordList.forEach((o) => {
    const tr = document.createElement("tr");

    const tdId = document.createElement("td");
    tdId.className = "mono";
    tdId.textContent = `#${o.id}`;

    const tdEmail = document.createElement("td");
    tdEmail.textContent = o.email;

    const tdTotal = document.createElement("td");
    tdTotal.className = "mono";
    tdTotal.textContent = `INR ${o.total}`;

    const tdStatus = document.createElement("td");
    const stSpan = document.createElement("span");
    stSpan.className = `status-text status-${o.status}`;
    stSpan.textContent = o.status;
    tdStatus.appendChild(stSpan);

    const tdUpd = document.createElement("td");
    const ctrlWrap = document.createElement("div");
    ctrlWrap.style.display = "flex";
    ctrlWrap.style.gap = "6px";
    const select = document.createElement("select");
    select.className = "inline-select";
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
    saveBtn.textContent = "Save";
    saveBtn.onclick = async () => {
      const res = await api<{ error?: string }>(
        `/api/orders/${o.id}/status`,
        "PATCH",
        { status: select.value }
      );
      if (res.ok) {
        showAdminMessage(`Order #${o.id} updated to ${select.value}.`);
        await loadAdminData();
      } else {
        showAdminMessage(res.data.error ?? "Failed to update status", true);
      }
    };
    ctrlWrap.append(select, saveBtn);
    tdUpd.appendChild(ctrlWrap);

    tr.append(tdId, tdEmail, tdTotal, tdStatus, tdUpd);
    ordBody.appendChild(tr);
  });

  const ticketBody = $("admin-tickets");
  ticketBody.replaceChildren();
  if (ticketList.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "muted";
    td.textContent = "No escalated support tickets.";
    tr.appendChild(td);
    ticketBody.appendChild(tr);
  } else {
    ticketList.forEach((t) => {
      const tr = document.createElement("tr");
      const tdId = document.createElement("td");
      tdId.className = "mono";
      tdId.textContent = `#${t.id}`;
      const tdQ = document.createElement("td");
      tdQ.textContent = t.question;
      const tdEmail = document.createElement("td");
      tdEmail.textContent = t.email || "anonymous";
      const tdSt = document.createElement("td");
      tdSt.className = `status-text status-${t.status}`;
      tdSt.textContent = t.status;
      const tdDate = document.createElement("td");
      tdDate.className = "muted";
      tdDate.textContent = new Date(t.createdAt).toLocaleString();
      tr.append(tdId, tdQ, tdEmail, tdSt, tdDate);
      ticketBody.appendChild(tr);
    });
  }
}

async function sendChatMessage(overrideMessage?: string): Promise<void> {
  const q = (overrideMessage ?? inputVal("chat-input")).trim();
  if (!q) return;

  const log = $("chat-log");
  const you = document.createElement("div");
  you.className = "chat-msg you";
  you.textContent = q;
  log.appendChild(you);
  if (!overrideMessage) setInputVal("chat-input", "");
  log.scrollTop = log.scrollHeight;

  const loader = $("chat-loading");
  loader.hidden = false;

  try {
    const r = await api<{ answer: string; source: string; escalated: boolean }>(
      "/api/chat",
      "POST",
      { message: q }
    );
    const bot = document.createElement("div");
    bot.className = r.data.escalated
      ? "chat-msg bot escalated"
      : "chat-msg bot";
    bot.textContent = r.data.answer;

    const src = document.createElement("span");
    src.className = "chat-source";
    src.textContent = r.data.escalated
      ? "Escalated to human support"
      : `Source: ${r.data.source}`;
    bot.appendChild(src);

    log.appendChild(bot);
    log.scrollTop = log.scrollHeight;
  } finally {
    loader.hidden = true;
  }
}

// --- Event Wiring ---

$("tab-shop").onclick = () => setActiveTab("shop");
$("tab-orders").onclick = () => setActiveTab("orders");
$("tab-admin").onclick = () => setActiveTab("admin");

document.querySelectorAll<HTMLElement>("[data-nav-cat]").forEach((btn) => {
  btn.onclick = () => {
    const cat = btn.dataset.navCat || "All";
    setActiveTab("shop");
    syncCategoryUI(cat);
    void loadProducts();
    $("catalogue-section").scrollIntoView({ behavior: "smooth" });
  };
});

document.querySelectorAll<HTMLElement>("[data-cat-card]").forEach((card) => {
  card.onclick = () => {
    const cat = card.dataset.catCard || "All";
    syncCategoryUI(cat);
    void loadProducts();
    $("catalogue-section").scrollIntoView({ behavior: "smooth" });
  };
});

document.querySelectorAll<HTMLElement>("[data-mobile-tab]").forEach((btn) => {
  btn.onclick = () => {
    const tab = btn.dataset.mobileTab as "shop" | "orders" | "admin";
    setActiveTab(tab);
  };
});

$("mobile-menu-btn").onclick = () => {
  const drawer = $("mobile-drawer");
  const isOpen = !drawer.hidden;
  drawer.hidden = isOpen;
  $("mobile-menu-btn").setAttribute("aria-expanded", String(!isOpen));
};

$("mobile-search-q").addEventListener("input", () => {
  setInputVal("search-q", inputVal("mobile-search-q"));
  void loadProducts();
});

$("search-btn").onclick = () => {
  setActiveTab("shop");
  void loadProducts();
  $("catalogue-section").scrollIntoView({ behavior: "smooth" });
};

$("search-q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("search-btn").click();
  }
});

$("category-filter").onchange = () => {
  const val = ($("category-filter") as HTMLSelectElement).value;
  syncCategoryUI(val);
  void loadProducts();
};

$("hero-shop-btn").onclick = () => {
  $("catalogue-section").scrollIntoView({ behavior: "smooth" });
};
$("hero-chat-btn").onclick = openChatWindow;

$("cart-toggle-btn").onclick = () => {
  setActiveTab("shop");
  $("cart-panel").scrollIntoView({ behavior: "smooth" });
};

$("account-toggle-btn").onclick = openAuthModal;
$("auth-close-btn").onclick = closeAuthModal;
$("auth-modal").addEventListener("click", (e) => {
  if (e.target === $("auth-modal")) closeAuthModal();
});

$("pdp-close-btn").onclick = closeProductDetails;
$("product-modal").addEventListener("click", (e) => {
  if (e.target === $("product-modal")) closeProductDetails();
});

$("pdp-qty-dec").onclick = () => {
  const cur = Math.max(1, Number.parseInt(inputVal("pdp-qty"), 10) || 1);
  setInputVal("pdp-qty", String(Math.max(1, cur - 1)));
};

$("pdp-qty-inc").onclick = () => {
  const cur = Math.max(1, Number.parseInt(inputVal("pdp-qty"), 10) || 1);
  const max = activeProductDetail ? Math.max(1, activeProductDetail.stock) : 99;
  setInputVal("pdp-qty", String(Math.min(max, cur + 1)));
};

$("pdp-add-btn").onclick = async () => {
  if (!activeProductDetail) return;
  const qty = Math.max(1, Number.parseInt(inputVal("pdp-qty"), 10) || 1);
  const id = await ensureCart();
  const res = await api<CartView & { error?: string }>(
    `/api/cart/${id}/items`,
    "POST",
    { product_id: activeProductDetail.id, quantity: qty }
  );
  const fb = $("pdp-feedback");
  if (res.ok) {
    renderCart(res.data);
    fb.className = "msg ok";
    fb.textContent = `Added ${qty} × ${activeProductDetail.name} to your bag.`;
  } else {
    fb.className = "msg err";
    fb.textContent = res.data.error ?? "Unable to add item";
  }
};

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
      `Order #${r.data.order_id} placed. Status: ${r.data.status}. Total: INR ${r.data.total}`
    );
    renderCart({ cart_id: id, coupon: null, items: [], total: "0.00" });
    await loadProducts();
  } else {
    showOrderResult(r.data.error ?? "Checkout failed", true);
  }
};

$("chat-fab").onclick = () => {
  if ($("chat-window").hidden) openChatWindow();
  else closeChatWindow();
};
$("chat-close-btn").onclick = closeChatWindow;
$("chat-send").onclick = () => void sendChatMessage();
$("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    void sendChatMessage();
  }
});
document.querySelectorAll<HTMLElement>("[data-prompt]").forEach((btn) => {
  btn.onclick = () => {
    const prompt = btn.dataset.prompt;
    if (prompt) void sendChatMessage(prompt);
  };
});

$("footer-orders-btn").onclick = () => setActiveTab("orders");
$("footer-chat-btn").onclick = openChatWindow;
$("footer-account-btn").onclick = openAuthModal;

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
  summary.className = "mono";
  summary.textContent = `Order #${r.data.order_id} · Status: ${r.data.status} · Total: INR ${r.data.total} · Payment Ref: ${r.data.payment_ref}`;
  out.appendChild(summary);
  if (r.data.items) {
    const ul = document.createElement("ul");
    ul.className = "order-items";
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

renderCart({ cart_id: 0, coupon: null, items: [], total: "0.00" });
void loadProducts();
void refreshAuthStatus();
