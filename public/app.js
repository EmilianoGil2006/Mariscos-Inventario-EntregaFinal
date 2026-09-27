const API_BASE = "/api";

const CATEGORIA_LABEL = { proteinas: "Proteínas", verduras: "Verduras", bebidas: "Bebidas" };
const ESTADO_SOLICITUD_LABEL = { pendiente: "Pendiente", atendida: "Atendida", rechazada: "Rechazada" };

const state = {
  token: sessionStorage.getItem("meg_token") || null,
  user: JSON.parse(sessionStorage.getItem("meg_user") || "null"),
  insumos: [],
  solicitudes: [],
  transferencias: [],
  sucursalActiva: "todas",
};

// ---------- Elementos ----------
const viewLogin = document.getElementById("view-login");
const viewDashboard = document.getElementById("view-dashboard");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

const tabs = document.getElementById("tabs");
const panels = {
  inventario: document.getElementById("panel-inventario"),
  solicitudes: document.getElementById("panel-solicitudes"),
  transferencias: document.getElementById("panel-transferencias"),
};

const branchFilterWrap = document.getElementById("branch-filter");
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

const solicitudFormCard = document.getElementById("solicitud-form-card");
const solicitudForm = document.getElementById("solicitud-form");
const solicitudError = document.getElementById("solicitud-error");
const solicitudesTbody = document.getElementById("solicitudes-tbody");
const solicitudesEmpty = document.getElementById("solicitudes-empty");

const transferenciaFormCard = document.getElementById("transferencia-form-card");
const transferenciaForm = document.getElementById("transferencia-form");
const transferenciaError = document.getElementById("transferencia-error");
const transferenciasTbody = document.getElementById("transferencias-tbody");
const transferenciasEmpty = document.getElementById("transferencias-empty");

const toast = document.getElementById("toast");

// ---------- Utilidades ----------
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3400);
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if ((res.status === 401 || res.status === 403) && path !== "/auth/login") {
    // Solo forzamos logout si el token es el problema (401). Un 403 puede ser
    // simplemente "no tienes permiso para esta accion" y no debe cerrar sesion.
    if (res.status === 401) {
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
  return Number(insumo.cantidadKg) <= Number(insumo.stockMinimo);
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

function formatFechaHora(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

// ---------- Sesión ----------
function isAdmin() {
  return state.user && state.user.role === "admin";
}

function applySessionUI() {
  const admin = isAdmin();

  newInsumoBtn.classList.toggle("hidden", !admin);
  branchFilterWrap.classList.toggle("hidden", !admin);

  solicitudFormCard.classList.toggle("hidden", admin); // solo encargados piden a CEDIS
  transferenciaFormCard.classList.toggle("hidden", !admin); // solo admin transfiere directo

  document.querySelectorAll(".col-admin-only").forEach((el) => {
    el.classList.toggle("is-hidden-col", !admin);
  });

  userInfo.textContent = state.user
    ? `${state.user.username} · ${admin ? "Administración (CEDIS + todas)" : "Encargado " + (state.user.sucursal || "")}`
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
  loadAll();
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
      body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") }),
    });
    handleLoginSuccess(data);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

logoutBtn.addEventListener("click", handleLogout);

// ---------- Tabs ----------
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
  Object.values(panels).forEach((p) => p.classList.remove("is-active"));
  btn.classList.add("is-active");
  panels[btn.dataset.tab].classList.add("is-active");
});

// ---------- Carga de datos ----------
async function loadAll() {
  await Promise.all([loadInsumos(), loadSolicitudes(), loadTransferencias()]);
}

async function loadInsumos() {
  try {
    state.insumos = await apiFetch("/insumos");
    renderInsumos();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadSolicitudes() {
  try {
    state.solicitudes = await apiFetch("/solicitudes");
    renderSolicitudes();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function loadTransferencias() {
  try {
    state.transferencias = await apiFetch("/transferencias");
    renderTransferencias();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ---------- INVENTARIO ----------
branchFilterWrap.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
  btn.classList.add("is-active");
  state.sucursalActiva = btn.dataset.sucursal;
  renderInsumos();
});

function renderInsumos() {
  const admin = isAdmin();
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
      <td>${CATEGORIA_LABEL[insumo.categoria] || insumo.categoria}</td>
      <td>${insumo.sucursal}</td>
      <td>
        <div class="stock-editor">
          <input type="number" min="0" step="0.5" value="${insumo.cantidadKg}" data-id="${insumo.id}" class="stock-input" />
          <span>kg</span>
          <button class="btn btn-ghost btn-small save-stock-btn" data-id="${insumo.id}">Guardar</button>
        </div>
      </td>
      <td>${insumo.stockMinimo} kg</td>
      <td>${formatFecha(insumo.caducidad)}</td>
      <td>
        ${bajo ? '<span class="badge badge-bajo">Stock bajo</span>' : ""}
        ${caduca ? '<span class="badge badge-caduca">Caduca pronto</span>' : ""}
      </td>
      <td>
        ${admin ? `<button class="btn btn-danger delete-btn" data-id="${insumo.id}">Eliminar</button>` : ""}
      </td>
    `;
    insumosTbody.appendChild(tr);
  });

  statTotal.textContent = filtrados.length;
  statBajo.textContent = bajoCount;
  statCaduca.textContent = caducaCount;
}

insumosTbody.addEventListener("click", async (e) => {
  const saveBtn = e.target.closest(".save-stock-btn");
  const deleteBtn = e.target.closest(".delete-btn");

  if (saveBtn) {
    const id = saveBtn.dataset.id;
    const input = insumosTbody.querySelector(`.stock-input[data-id="${id}"]`);
    try {
      const data = await apiFetch(`/insumos/${id}/stock`, {
        method: "PUT",
        body: JSON.stringify({ cantidadKg: input.value }),
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
        categoria: formData.get("categoria"),
        sucursal: formData.get("sucursal"),
        cantidadKg: formData.get("cantidadKg"),
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

// ---------- SOLICITUDES ----------
solicitudForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  solicitudError.hidden = true;
  const formData = new FormData(solicitudForm);
  try {
    const nueva = await apiFetch("/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        categoria: formData.get("categoria"),
        nombre: formData.get("nombre"),
        cantidadKg: formData.get("cantidadKg"),
      }),
    });
    state.solicitudes.unshift(nueva);
    renderSolicitudes();
    solicitudForm.reset();
    showToast(`Solicitud enviada a CEDIS: ${nueva.cantidadKg} kg de ${nueva.nombre}`);
  } catch (err) {
    solicitudError.textContent = err.message;
    solicitudError.hidden = false;
  }
});

function renderSolicitudes() {
  const admin = isAdmin();
  solicitudesTbody.innerHTML = "";
  solicitudesEmpty.hidden = state.solicitudes.length !== 0;

  state.solicitudes
    .slice()
    .sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud))
    .forEach((s) => {
      const tr = document.createElement("tr");
      const pendiente = s.estado === "pendiente";

      let acciones = "";
      if (admin && pendiente) {
        acciones = `
          <div class="row-actions">
            <input type="number" min="0.5" step="0.5" value="${s.cantidadKg}" class="inline-qty atender-qty" data-id="${s.id}" />
            <button class="btn btn-primary btn-small atender-btn" data-id="${s.id}">Atender</button>
            <button class="btn btn-danger btn-small rechazar-btn" data-id="${s.id}">Rechazar</button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td class="col-admin-only${admin ? "" : " is-hidden-col"}">${s.sucursal}</td>
        <td>${CATEGORIA_LABEL[s.categoria] || s.categoria}</td>
        <td>${s.nombre}</td>
        <td>${s.cantidadKg} kg</td>
        <td><span class="badge badge-${s.estado}">${ESTADO_SOLICITUD_LABEL[s.estado] || s.estado}</span></td>
        <td>${formatFechaHora(s.fechaSolicitud)}</td>
        <td>${acciones}</td>
      `;
      solicitudesTbody.appendChild(tr);
    });
}

solicitudesTbody.addEventListener("click", async (e) => {
  const atenderBtn = e.target.closest(".atender-btn");
  const rechazarBtn = e.target.closest(".rechazar-btn");

  if (atenderBtn) {
    const id = atenderBtn.dataset.id;
    const qtyInput = solicitudesTbody.querySelector(`.atender-qty[data-id="${id}"]`);
    try {
      const data = await apiFetch(`/solicitudes/${id}/atender`, {
        method: "PUT",
        body: JSON.stringify({ cantidadKg: qtyInput.value }),
      });
      const idx = state.solicitudes.findIndex((s) => s.id === Number(id));
      state.solicitudes[idx] = data.solicitud;
      state.transferencias.unshift(data.transferencia);
      renderSolicitudes();
      renderTransferencias();
      await loadInsumos(); // el stock de CEDIS y de la sucursal cambiaron
      showToast(`Solicitud atendida: se transfirieron ${data.transferencia.cantidadKg} kg`);
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (rechazarBtn) {
    const id = rechazarBtn.dataset.id;
    try {
      const actualizada = await apiFetch(`/solicitudes/${id}/rechazar`, { method: "PUT" });
      const idx = state.solicitudes.findIndex((s) => s.id === Number(id));
      state.solicitudes[idx] = actualizada;
      renderSolicitudes();
      showToast("Solicitud rechazada");
    } catch (err) {
      showToast(err.message, true);
    }
  }
});

// ---------- TRANSFERENCIAS ----------
transferenciaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  transferenciaError.hidden = true;
  const formData = new FormData(transferenciaForm);
  try {
    const nueva = await apiFetch("/transferencias", {
      method: "POST",
      body: JSON.stringify({
        categoria: formData.get("categoria"),
        nombre: formData.get("nombre"),
        cantidadKg: formData.get("cantidadKg"),
        destino: formData.get("destino"),
      }),
    });
    state.transferencias.unshift(nueva);
    renderTransferencias();
    await loadInsumos(); // refleja la resta en CEDIS y la suma en la sucursal destino
    transferenciaForm.reset();
    showToast(`Se transfirieron ${nueva.cantidadKg} kg de ${nueva.nombre} a ${nueva.destino}`);
  } catch (err) {
    transferenciaError.textContent = err.message;
    transferenciaError.hidden = false;
  }
});

function renderTransferencias() {
  transferenciasTbody.innerHTML = "";
  transferenciasEmpty.hidden = state.transferencias.length !== 0;

  state.transferencias
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="insumo-nombre">${t.nombre}</td>
        <td>${CATEGORIA_LABEL[t.categoria] || t.categoria}</td>
        <td>${t.cantidadKg} kg</td>
        <td>${t.destino}</td>
        <td>${formatFechaHora(t.fecha)}</td>
        <td>${t.realizadaPor}</td>
      `;
      transferenciasTbody.appendChild(tr);
    });
}

// ---------- Arranque ----------
(function init() {
  if (state.token && state.user) {
    viewLogin.classList.add("hidden");
    viewDashboard.classList.remove("hidden");
    applySessionUI();
    loadAll();
  }
})();
