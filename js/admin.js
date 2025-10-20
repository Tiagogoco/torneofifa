import {
  sb,
  getTournamentBySlug,
  setTournamentStart,
  listPlayers,
  upsertPlayer,
  deletePlayer,
  listGroups,
  listMatches,
  saveMatchResult,
  updateMatchTime,
} from "./supabase.js";
import { fmtDT } from "./helpers.js";
import { generateGroupsAndFixtures, generateNextPhase } from "./generator.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authStatus = document.getElementById("authStatus");
const adminPanels = document.getElementById("adminPanels");

// UI refs
const tSlug = document.getElementById("tSlug");
const tName = document.getElementById("tName");
const tStart = document.getElementById("tStart");
const tMsg = document.getElementById("tMsg");
const btnSetStart = document.getElementById("btnSetStart");
const btnGenerateGroups = document.getElementById("btnGenerateGroups");
const btnNextPhase = document.getElementById("btnNextPhase");

const playerNickname = document.getElementById("playerNickname");
const btnAddPlayer = document.getElementById("btnAddPlayer");
const playersTable = document.getElementById("playersTable");
const playerMsg = document.getElementById("playerMsg");

const filterStage = document.getElementById("filterStage");
const filterDate = document.getElementById("filterDate");
const btnHoy = document.getElementById("btnHoy");
const btnClear = document.getElementById("btnClear");
const matchesTable = document.getElementById("matchesTable");

flatpickr.localize(flatpickr.l10ns.es);
flatpickr(tStart, { enableTime: true, dateFormat: "d-m-Y H:i" });
flatpickr(filterDate, { dateFormat: "d-m-Y" });

let TOURNAMENT = null;

// ---------- Auth ----------
async function updateAuthUI() {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) {
    authStatus.textContent = `Conectado como ${user.email}`;
    adminPanels.classList.remove("hidden");
  } else {
    authStatus.textContent = "No autenticado";
    adminPanels.classList.add("hidden");
  }
}

loginBtn.addEventListener("click", async () => {
  try {
    const { error } = await sb.auth.signInWithPassword({
      email: emailEl.value.trim(),
      password: passEl.value,
    });
    if (error) throw error;
    await updateAuthUI();
    await adminInit();
  } catch (e) {
    authStatus.textContent = `Error: ${e.message}`;
  }
});

logoutBtn.addEventListener("click", async () => {
  await sb.auth.signOut();
  await updateAuthUI();
});

// ---------- Init ----------
async function adminInit() {
  TOURNAMENT = await getTournamentBySlug(env.TOURNAMENT_SLUG);
  tSlug.value = TOURNAMENT.slug;
  tName.value = TOURNAMENT.name || "";
  if (TOURNAMENT.start_at) {
    const d = new Date(TOURNAMENT.start_at);
    tStart._flatpickr.setDate(d);
  }

  await renderPlayers();
  await renderMatches();
}

// ---------- Torneo ----------
btnSetStart.addEventListener("click", async () => {
  try {
    const d = tStart._flatpickr.selectedDates?.[0];
    if (!d) {
      tMsg.textContent = "Selecciona una fecha/hora.";
      return;
    }
    await setTournamentStart(TOURNAMENT.id, d.toISOString());
    tMsg.textContent = "Fecha base actualizada.";
  } catch (e) {
    tMsg.textContent = `Error: ${e.message}`;
  }
});

btnGenerateGroups.addEventListener("click", async () => {
  try {
    const res = await generateGroupsAndFixtures(TOURNAMENT);
    tMsg.textContent = `Generados ${res.groups.length} grupos y ${res.matches.length} partidos.`;
    await renderMatches();
  } catch (e) {
    tMsg.textContent = `Error: ${e.message}`;
  }
});

btnNextPhase.addEventListener("click", async () => {
  try {
    const res = await generateNextPhase(TOURNAMENT);
    tMsg.textContent = `Resultado: ${res.created}`;
    await renderMatches();
  } catch (e) {
    tMsg.textContent = `Error: ${e.message}`;
  }
});

// ---------- Jugadores ----------
async function renderPlayers() {
  const rows = await listPlayers(TOURNAMENT.id);
  playersTable.innerHTML = rows
    .map(
      (p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${p.nickname}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-error" data-del="${
            p.id
          }">Eliminar</button>
        </td>
      </tr>`
    )
    .join("");

  playersTable.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar jugador?")) return;
      try {
        await deletePlayer(btn.dataset.del);
        await renderPlayers();
      } catch (e) {
        playerMsg.textContent = `Error: ${e.message}`;
      }
    });
  });
}

btnAddPlayer.addEventListener("click", async () => {
  try {
    const nickname = playerNickname.value.trim();
    if (!nickname) {
      playerMsg.textContent = "Escribe un apodo.";
      return;
    }
    const current = await listPlayers(TOURNAMENT.id);
    if (current.length >= 24) {
      playerMsg.textContent = "Máximo 24 jugadores.";
      return;
    }
    await upsertPlayer(TOURNAMENT.id, nickname);
    playerNickname.value = "";
    playerMsg.textContent = "Jugador agregado.";
    await renderPlayers();
  } catch (e) {
    playerMsg.textContent = `Error: ${e.message}`;
  }
});

// ---------- Partidos ----------
function parseDDMMYYYY(str) {
  const [dd, mm, yyyy] = str.split("-").map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

async function renderMatches() {
  let rows = await listMatches(TOURNAMENT.id);

  // filtros
  const stg = filterStage.value.trim().toLowerCase();
  const fDate = filterDate.value.trim();

  if (stg)
    rows = rows.filter((m) => String(m.stage).toLowerCase().includes(stg));
  if (fDate) {
    const d0 = parseDDMMYYYY(fDate);
    if (d0) {
      rows = rows.filter((m) => {
        const d = new Date(m.start_at);
        return (
          d &&
          d.getDate() === d0.getDate() &&
          d.getMonth() === d0.getMonth() &&
          d.getFullYear() === d0.getFullYear()
        );
      });
    }
  }

  matchesTable.innerHTML = rows
    .map((m) => {
      const homeName = m.home?.nickname || "—";
      const awayName = m.away?.nickname || "—";
      return `
        <tr>
          <td class="uppercase">${m.stage}</td>
          <td>${
            m.group_id
              ? "<span data-group='" + m.group_id + "'>...</span>"
              : "-"
          }</td>
          <td>${homeName}</td>
          <td>${awayName}</td>
          <td>
            <input class="input input-bordered input-xs w-40" data-dt="${
              m.id
            }" value="${fmtDT(m.start_at)}" />
          </td>
          <td>${m.status}</td>
          <td class="whitespace-nowrap">
            <input class="input input-bordered input-xs w-14 text-center" data-sh="${
              m.id
            }" value="${m.score_home ?? ""}" placeholder="L" />
            <span class="px-1">-</span>
            <input class="input input-bordered input-xs w-14 text-center" data-sa="${
              m.id
            }" value="${m.score_away ?? ""}" placeholder="V" />
          </td>
          <td class="text-right">
            <div class="flex gap-2 justify-end">
              <button class="btn btn-xs" data-save="${
                m.id
              }">Guardar score</button>
              <button class="btn btn-xs btn-ghost" data-time="${
                m.id
              }">Guardar fecha</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  // lookups de grupos
  const groups = await listGroups(TOURNAMENT.id);
  const gmap = new Map(groups.map((g) => [g.id, g.code]));
  matchesTable.querySelectorAll("[data-group]").forEach((el) => {
    const id = el.getAttribute("data-group");
    el.textContent = gmap.get(id) || "-";
  });

  // Bind score
  matchesTable.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const sh = matchesTable.querySelector(`[data-sh="${id}"]`).value;
      const sa = matchesTable.querySelector(`[data-sa="${id}"]`).value;
      try {
        await saveMatchResult(id, Number(sh), Number(sa));
        await renderMatches();
      } catch (e) {
        tMsg.textContent = `Error: ${e.message}`;
      }
    });
  });

  // Bind fecha/hora
  matchesTable.querySelectorAll("[data-time]").forEach((btn) => {
    const id = btn.getAttribute("data-time");
    const input = matchesTable.querySelector(`[data-dt="${id}"]`);
    if (!input._flatpickr)
      flatpickr(input, { enableTime: true, dateFormat: "d-m-Y H:i" });

    btn.addEventListener("click", async () => {
      const d = input._flatpickr.selectedDates?.[0];
      if (!d) return;
      try {
        await updateMatchTime(id, d.toISOString());
        await renderMatches();
      } catch (e) {
        tMsg.textContent = `Error: ${e.message}`;
      }
    });
  });
}

// Filtros
btnHoy.addEventListener("click", () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  filterDate.value = `${dd}-${mm}-${yy}`;
  renderMatches();
});
btnClear.addEventListener("click", () => {
  filterStage.value = "";
  filterDate.value = "";
  renderMatches();
});

// Boot
(async () => {
  await updateAuthUI();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) await adminInit();
})();
