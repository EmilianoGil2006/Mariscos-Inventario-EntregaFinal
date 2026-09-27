const API_BASE = "/api";

const state = {
  token: sessionStorage.getItem("meg_token") || null,
  user: JSON.parse(sessionStorage.getItem("meg_user") || "null"),
  insumos: [],
  sucursalActiva: "todas",
};

// ---------- Elementos ----------
const viewLogin = document.getElementById("view-login");
const viewDashboard = document.getElementById("view-dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const branchFilter = document.getElementById("branch-filter");
const newInsumoBtn = document.getElementById("new-insumo-btn");
const insumosTbody = document.getElementById("insumos-tbody");
const emptyState = document.getElementById("empty-state");
const statTotal = document.getElementById("stat-total");
const statBajo = document.getElementById("stat-bajo");
const statCaduca = document.getElementById("stat-caduca");

const modalBackdrop = document.getElementById("modal-backdrop");
const insumoForm = document.getElementById("insumo-form");
const modalCancel = document.getElementById("modal-cancel");
const modalError = document.getElementById("modal-error");

const toast = document.getElementById("toast");

// ---------- Utilidades ----------
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3200);
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    // token invalido/expirado -> regresar al login
    if (path !== "/auth/login") {
      handleLogout();
      throw new Error("Sesión expirada, inicia sesión de nuevo.");
    }
  }

  let body = null;
  const text = await res.text();
  if (text) body = JSON.parse(text);

  if (!res.ok) {
    const message = (body && body.error) || "Ocurrió un error inesperado.";
    throw new Error(message);
  }
  return body;
}

function isStockBajo(insumo) {
  return Number(insumo.cantidad) <= Number(insumo.stockMinimo);
}

function isPorCaducar(insumo) {
  if (!insumo.caducidad) return false;
  const dias = (new Date(insumo.caducidad) - new Date()) / (1000 * 60 * 60 * 24);
  return dias >= 0 && dias <= 7;
}

function formatFecha(fechaStr) {
  if (!fechaStr) return "—";
  const [y, m, d] = fechaStr.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- Sesión ----------
function applySessionUI() {
  const isAdmin = state.user && state.user.role === "admin";
  newInsumoBtn.classList.toggle("hidden", !isAdmin);
  userInfo.textContent = state.user
    ? `${state.user.username} · ${state.user.role === "admin" ? "Administrador" : "Encargado " + (state.user.sucursal || "")}`
    : "";
}

function handleLoginSuccess(data) {
  state.token = data.token;
  state.user = data.user;
  sessionStorage.setItem("meg_token", data.token);
  sessionStorage.setItem("meg_user", JSON.stringify(data.user));
  viewLogin.classList.add("hidden");
  viewDashboard.classList.remove("hidden");
  applySessionUI();
  loadInsumos();
}

function handleLogout() {
  state.token = null;
  state.user = null;
  sessionStorage.removeItem("meg_token");
  sessionStorage.removeItem("meg_user");
  viewDashboard.classList.add("hidden");
  viewLogin.classList.remove("hidden");
  loginForm.reset();
  document.getElementById("login-username").value = "admin";
  document.getElementById("login-password").value = "admin123";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const formData = new FormData(loginForm);
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password"),
      }),
    });
    handleLoginSuccess(data);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", handleLogout);

// ---------- Filtro de sucursal ----------
branchFilter.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
  btn.classList.add("is-active");
  state.sucursalActiva = btn.dataset.sucursal;
  renderInsumos();
});

// ---------- Cargar y renderizar insumos ----------
async function loadInsumos() {
  try {
    state.insumos = await apiFetch("/insumos");
    renderInsumos();
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderInsumos() {
  const isAdmin = state.user && state.user.role === "admin";
  const filtrados =
    state.sucursalActiva === "todas"
      ? state.insumos
      : state.insumos.filter((i) => i.sucursal === state.sucursalActiva);

  insumosTbody.innerHTML = "";
  emptyState.hidden = filtrados.length !== 0;

  let bajoCount = 0;
  let caducaCount = 0;

  filtrados.forEach((insumo) => {
    const bajo = isStockBajo(insumo);
    const caduca = isPorCaducar(insumo);
    if (bajo) bajoCount++;
    if (caduca) caducaCount++;

    const tr = document.createElement("tr");
    tr.className = [bajo ? "is-bajo" : "", caduca ? "is-caduca" : ""].join(" ").trim();

    tr.innerHTML = `
      <td class="insumo-nombre">${insumo.nombre}</td>
      <td>${insumo.sucursal}</td>
      <td>
        <div class="stock-editor">
          <input type="number" min="0" step="0.5" value="${insumo.cantidad}" data-id="${insumo.id}" class="stock-input" />
          <span>${insumo.unidad}</span>
          <button class="btn btn-ghost btn-small save-stock-btn" data-id="${insumo.id}">Guardar</button>
        </div>
      </td>
      <td>${insumo.stockMinimo} ${insumo.unidad}</td>
      <td>${formatFecha(insumo.caducidad)}</td>
      <td>
        ${bajo ? '<span class="badge badge-bajo">Stock bajo</span>' : ""}
        ${caduca ? '<span class="badge badge-caduca">Caduca pronto</span>' : ""}
      </td>
      <td>
        ${isAdmin ? `<button class="btn btn-danger delete-btn" data-id="${insumo.id}">Eliminar</button>` : ""}
      </td>
    `;
    insumosTbody.appendChild(tr);
  });

  statTotal.textContent = filtrados.length;
  statBajo.textContent = bajoCount;
  statCaduca.textContent = caducaCount;
}

// Delegación de eventos para guardar stock / eliminar
insumosTbody.addEventListener("click", async (e) => {
  const saveBtn = e.target.closest(".save-stock-btn");
  const deleteBtn = e.target.closest(".delete-btn");

  if (saveBtn) {
    const id = saveBtn.dataset.id;
    const input = insumosTbody.querySelector(`.stock-input[data-id="${id}"]`);
    try {
      const data = await apiFetch(`/insumos/${id}/stock`, {
        method: "PUT",
        body: JSON.stringify({ cantidad: input.value }),
      });
      const idx = state.insumos.findIndex((i) => i.id === Number(id));
      state.insumos[idx] = data.insumo;
      renderInsumos();
      showToast(
        data.alerta === "STOCK_BAJO"
          ? `Stock actualizado — ${data.insumo.nombre} quedó en stock bajo`
          : "Stock actualizado"
      );
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (!confirm("¿Eliminar este insumo del catálogo?")) return;
    try {
      await apiFetch(`/insumos/${id}`, { method: "DELETE" });
      state.insumos = state.insumos.filter((i) => i.id !== Number(id));
      renderInsumos();
      showToast("Insumo eliminado");
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

// ---------- Modal: nuevo insumo ----------
newInsumoBtn.addEventListener("click", () => {
  insumoForm.reset();
  modalError.hidden = true;
  modalBackdrop.classList.remove("hidden");
});

modalCancel.addEventListener("click", () => modalBackdrop.classList.add("hidden"));
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add("hidden");
});

insumoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  modalError.hidden = true;
  const formData = new FormData(insumoForm);
  try {
    const nuevo = await apiFetch("/insumos", {
      method: "POST",
      body: JSON.stringify({
        nombre: formData.get("nombre"),
        sucursal: formData.get("sucursal"),
        cantidad: formData.get("cantidad"),
        unidad: formData.get("unidad"),
        stockMinimo: formData.get("stockMinimo"),
        caducidad: formData.get("caducidad") || null,
      }),
    });
    state.insumos.push(nuevo);
    renderInsumos();
    modalBackdrop.classList.add("hidden");
    showToast(`"${nuevo.nombre}" agregado al catálogo`);
  } catch (err) {
    modalError.textContent = err.message;
    modalError.hidden = false;
  }
});

// ---------- Arranque ----------
(function init() {
  if (state.token && state.user) {
    viewLogin.classList.add("hidden");
    viewDashboard.classList.remove("hidden");
    applySessionUI();
    loadInsumos();
  }
})();
