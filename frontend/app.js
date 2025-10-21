// app.js (ESM)
import {
  sb,
  getTournamentBySlug,
  listGroups,
  listMatches,
} from "../backend/js/supabase.js";

/* ================= NAV: cambiar vistas ================= */
document.querySelectorAll(".subnav-link").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const view = a.dataset.view;
    document
      .querySelectorAll(".subnav-link")
      .forEach((x) => x.classList.remove("active"));
    a.classList.add("active");

    document.getElementById("view-partidos").style.display =
      view === "partidos" ? "block" : "none";
    document.getElementById("view-groups").style.display =
      view === "groups" ? "block" : "none";
    document.getElementById("view-bracket").style.display =
      view === "bracket" ? "block" : "none";

    if (view === "bracket") scheduleRedraw();
  });
});

/* ================= Helpers mínimos ================= */
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function fmtDT(iso) {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${dd}-${mm}-${yyyy}`, time: `${hh}:${mi}` };
}
function computeGroupStandings(players, matches) {
  const table = new Map(
    players.map((p) => [
      p.id,
      { player: p, PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, Pts: 0 },
    ])
  );
  for (const m of matches) {
    if (m.status !== "played") continue;
    const h = table.get(m.home_player_id),
      a = table.get(m.away_player_id);
    if (!h || !a) continue;
    h.PJ++;
    a.PJ++;
    h.GF += m.score_home ?? 0;
    h.GC += m.score_away ?? 0;
    h.DG = h.GF - h.GC;
    a.GF += m.score_away ?? 0;
    a.GC += m.score_home ?? 0;
    a.DG = a.GF - a.GC;
    if (m.score_home > m.score_away) {
      h.G++;
      h.Pts += 3;
      a.P++;
    } else if (m.score_home < m.score_away) {
      a.G++;
      a.Pts += 3;
      h.P++;
    } else {
      h.E++;
      a.E++;
      h.Pts++;
      a.Pts++;
    }
  }
  const rows = [...table.values()];
  rows.sort(
    (x, y) => y.Pts - x.Pts || y.DG - x.DG || y.GF - x.GF || Math.random() - 0.5
  );
  return rows;
}

/* ================== Carga de datos desde Supabase ================== */
let TOURNAMENT = null;
let GROUPS_DB = []; // [{id, code, members:[{player}]}]
let MATCHES_DB = []; // select con embeds home/away

async function loadData() {
  TOURNAMENT = await getTournamentBySlug(env.TOURNAMENT_SLUG);
  console.log("TOURNAMENT", TOURNAMENT);

  GROUPS_DB = await listGroups(TOURNAMENT.id);
  MATCHES_DB = await listMatches(TOURNAMENT.id);

  console.log("GROUPS_DB", GROUPS_DB);
  console.log("MATCHES_DB (len)", MATCHES_DB.length, MATCHES_DB);
}

/* ================== PARTIDOS: lista + filtros ================== */
const matchesRoot = document.getElementById("matches-root");
const searchInput = document.getElementById("match-search");
const phaseSelect = document.getElementById("match-phase");
const groupSelect = document.getElementById("match-group");

const PHASE_ORDER = { groups: 1, r16: 2, qf: 3, sf: 4, final: 5 };
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F"];

function phaseLabel(phase) {
  return (
    {
      groups: "Fase de grupos",
      r16: "Octavos de final",
      qf: "Cuartos de final",
      sf: "Semifinal",
      final: "Final",
    }[phase] || phase
  );
}

function mapStageToPhase(stage) {
  // Backend: 'group' | 'quarter' | 'semi' | 'final'
  return stage === "group"
    ? "groups"
    : stage === "quarter"
    ? "qf"
    : stage === "semi"
    ? "sf"
    : stage === "final"
    ? "final"
    : stage;
}

function mapToUIMatches() {
  // Une datos de grupos para sacar letra por group_id
  const groupMap = new Map(GROUPS_DB.map((g) => [g.id, g.code]));
  return MATCHES_DB.map((m) => {
    const phase = mapStageToPhase(m.stage);
    const groupLetter = m.group_id ? groupMap.get(m.group_id) : null;
    const a = m.home?.nickname || "—";
    const b = m.away?.nickname || "—";
    const { date, time } = fmtDT(m.start_at);
    return {
      id: m.id,
      phase,
      group: groupLetter,
      a,
      b,
      sa: m.score_home ?? null,
      sb: m.score_away ?? null,
      date,
      time,
    };
  });
}

function sortMatches(list) {
  return list.slice().sort((a, b) => {
    const pa = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
    if (pa !== 0) return pa;
    if (a.phase === "groups" && b.phase === "groups") {
      return (
        GROUP_LETTERS.indexOf(a.group || "~") -
          GROUP_LETTERS.indexOf(b.group || "~") ||
        String(a.id).localeCompare(String(b.id))
      );
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

function matchCardListItem(m) {
  const wrap = el("div", "match-card");
  const head = el("div", "match-head");
  const left = el(
    "div",
    null,
    m.phase === "groups"
      ? `${phaseLabel(m.phase)} — Grupo ${m.group}`
      : `${phaseLabel(m.phase)}`
  );
  const right = el(
    "div",
    "match-score",
    m.sa != null && m.sb != null ? `${m.sa} - ${m.sb}` : "— - —"
  );
  head.appendChild(left);
  head.appendChild(right);

  const title = el("div", "match-title", `${m.a} vs ${m.b}`);
  const meta = el("div", "match-meta");
  meta.appendChild(el("div", null, `🗓 Fecha: ${m.date}`));
  meta.appendChild(el("div", null, `⏰ Hora: ${m.time}`));

  wrap.appendChild(head);
  wrap.appendChild(title);
  wrap.appendChild(meta);
  return wrap;
}

function renderMatchesList() {
  let list = mapToUIMatches();

  const phaseVal = phaseSelect.value; // all | groups | r16 | qf | sf | final
  if (phaseVal !== "all") list = list.filter((m) => m.phase === phaseVal);

  const showGroupsFilter = phaseVal === "groups";
  groupSelect.style.display = showGroupsFilter ? "" : "none";
  if (showGroupsFilter) {
    const gVal = groupSelect.value; // all | A..F
    if (gVal !== "all") list = list.filter((m) => m.group === gVal);
  }

  const q = (searchInput.value || "").trim().toLowerCase();
  if (q)
    list = list.filter(
      (m) =>
        (m.a || "").toLowerCase().includes(q) ||
        (m.b || "").toLowerCase().includes(q)
    );

  list = sortMatches(list);

  matchesRoot.innerHTML = "";
  if (!list.length) {
    matchesRoot.appendChild(
      el("div", null, "No hay partidos que coincidan con el filtro.")
    );
    return;
  }
  list.forEach((m) => matchesRoot.appendChild(matchCardListItem(m)));
}

searchInput.addEventListener("input", renderMatchesList);
phaseSelect.addEventListener("change", renderMatchesList);
groupSelect.addEventListener("change", renderMatchesList);

/* ================== GRUPOS: tabla de posiciones ================== */
const groupsRoot = document.getElementById("groups-root");

function renderGroupsStandings() {
  groupsRoot.innerHTML = "";
  // matches por grupo
  const byGroupId = MATCHES_DB.reduce((acc, m) => {
    if (m.stage !== "group" || !m.group_id) return acc;
    acc[m.group_id] ||= [];
    acc[m.group_id].push(m);
    return acc;
  }, {});

  // orden por código (A..F)
  const groupsSorted = [...GROUPS_DB].sort((a, b) =>
    a.code.localeCompare(b.code)
  );

  for (const g of groupsSorted) {
    const players = (g.members || []).map((x) => x.player);
    const matches = byGroupId[g.id] || [];
    const table = computeGroupStandings(players, matches);

    const card = document.createElement("article");
    card.className = "group-card";

    const head = document.createElement("div");
    head.className = "group-header";
    head.innerHTML = `<div class="group-rail"></div><div class="group-name">Grupo ${g.code}</div>`;

    const tableEl = document.createElement("table");
    tableEl.className = "table";
    tableEl.innerHTML = `
      <thead>
        <tr>
          <th>#</th><th>Jugador</th><th>PJ</th><th>G</th><th>E</th><th>P</th>
          <th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tableEl.querySelector("tbody");

    table.forEach((row, idx) => {
      const t = row;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><span class="badge"><span class="code">${
          t.player.nickname
        }</span></span></td>
        <td>${t.PJ}</td><td>${t.G}</td><td>${t.E}</td><td>${t.P}</td>
        <td>${t.GF}</td><td>${t.GC}</td>
        <td class="${t.DG >= 0 ? "dg-pos" : "dg-neg"}">${t.DG}</td>
        <td><strong>${t.Pts}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    card.appendChild(head);
    card.appendChild(tableEl);
    groupsRoot.appendChild(card);
  }
}

/* ================== BRACKET: construir desde matches ================== */
window.BRACKET_DATA = {
  // No generamos Octavos porque backend inicia en Cuartos (top8).
  octavos: [],
  cuartos: [{ id: "QF1" }, { id: "QF2" }, { id: "QF3" }, { id: "QF4" }],
  semifinal: [{ id: "SF1" }, { id: "SF2" }],
  final: [{ id: "F1" }],
  campeon: null,
};

function teamRow(data) {
  const name = data?.name || "Por definirse";
  const score = data?.score ?? data?.scoreA ?? null;
  const wrap = el("div", "team");
  const info = el("div", "info");
  info.appendChild(el("span", "name", name));
  const right = el("div", "score", score != null ? score : "—");
  wrap.appendChild(info);
  wrap.appendChild(right);
  return wrap;
}
function matchCard(m) {
  const card = el("div", "match");
  card.id = m.id;
  card.appendChild(teamRow({ name: m.teamA?.name, score: m.scoreA }));
  card.appendChild(teamRow({ name: m.teamB?.name, score: m.scoreB }));
  return card;
}

function renderBracket() {
  const root = document.getElementById("bracket");
  if (!root) return;
  const svg = root.querySelector(".bracket-svg");
  root.querySelectorAll(".bracket-grid").forEach((n) => n.remove());
  const grid = el("div", "bracket-grid");

  // Cuartos
  const qf = el("div", "round quarters");
  qf.id = "round-qf";
  qf.appendChild(el("div", "round-title", "Cuartos de final"));
  window.BRACKET_DATA.cuartos.forEach((m) => qf.appendChild(matchCard(m)));
  grid.appendChild(qf);

  // Semifinal
  const sf = el("div", "round semis");
  sf.id = "round-sf";
  sf.appendChild(el("div", "round-title", "Semifinal"));
  window.BRACKET_DATA.semifinal.forEach((m) => sf.appendChild(matchCard(m)));
  grid.appendChild(sf);

  // Final
  const fin = el("div", "round final");
  fin.id = "round-final";
  fin.appendChild(el("div", "round-title", "Final"));
  window.BRACKET_DATA.final.forEach((m) => fin.appendChild(matchCard(m)));
  const champ = el(
    "div",
    "champion",
    window.BRACKET_DATA.campeon
      ? `🏆 Campeón: ${window.BRACKET_DATA.campeon.name}`
      : "🏆 Campeón: por definirse"
  );
  fin.appendChild(champ);
  grid.appendChild(fin);

  root.appendChild(grid);
  scheduleRedraw();
}

// Posicionamiento/curvas (reuso tu lógica, sin octavos)
function centerYIn(el, colRect, container) {
  const r = el.getBoundingClientRect();
  const cy = (r.top + r.bottom) / 2;
  return cy - colRect.top + container.scrollTop;
}
function pathCurve(x1, y1, x2, y2) {
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}
function getCenterRight(el, container) {
  const r = el.getBoundingClientRect(),
    rc = container.getBoundingClientRect();
  return {
    x: r.right - rc.left + container.scrollLeft,
    y: (r.top + r.bottom) / 2 - rc.top + container.scrollTop,
  };
}
function getCenterLeft(el, container) {
  const r = el.getBoundingClientRect(),
    rc = container.getBoundingClientRect();
  return {
    x: r.left - rc.left + container.scrollLeft,
    y: (r.top + r.bottom) / 2 - rc.top + container.scrollTop,
  };
}

function positionRounds() {
  const container = document.getElementById("bracket");
  const roundQF = document.getElementById("round-qf");
  const roundSF = document.getElementById("round-sf");
  const roundFIN = document.getElementById("round-final");
  if (!container || !roundQF || !roundSF || !roundFIN) return;

  if (window.matchMedia("(max-width: 560px)").matches) {
    [roundQF, roundSF, roundFIN].forEach((col) => {
      col.style.minHeight = "";
      col.querySelectorAll(".match").forEach((m) => (m.style.top = ""));
    });
    return;
  }

  // Semis entre QF
  const rcSF = roundSF.getBoundingClientRect();
  const qfs = ["QF1", "QF2", "QF3", "QF4"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const sf1 = document.getElementById("SF1");
  const sf2 = document.getElementById("SF2");
  const placeBetween = (aEl, bEl, targetEl, colRect) => {
    const mid =
      (centerYIn(aEl, colRect, container) +
        centerYIn(bEl, colRect, container)) /
      2;
    const h = targetEl.getBoundingClientRect().height;
    targetEl.style.position = "absolute";
    targetEl.style.top = `${mid - h / 2}px`;
    return mid + h / 2;
  };
  const bottomsSF = [];
  if (qfs[0] && qfs[1] && sf1)
    bottomsSF.push(placeBetween(qfs[0], qfs[1], sf1, rcSF));
  if (qfs[2] && qfs[3] && sf2)
    bottomsSF.push(placeBetween(qfs[2], qfs[3], sf2, rcSF));
  if (bottomsSF.length)
    roundSF.style.minHeight = `${Math.max(...bottomsSF) + 16}px`;

  // Final entre Semis
  const rcFIN = roundFIN.getBoundingClientRect();
  const f1 = document.getElementById("F1");
  if (sf1 && sf2 && f1) {
    const mid =
      (centerYIn(sf1, rcFIN, container) + centerYIn(sf2, rcFIN, container)) / 2;
    const h = f1.getBoundingClientRect().height;
    f1.style.position = "absolute";
    f1.style.top = `${mid - h / 2}px`;
    const champ = roundFIN.querySelector(".champion");
    const champH = champ ? champ.getBoundingClientRect().height : 0;
    const finalBottom = mid + h / 2 + 12 + champH;
    roundFIN.style.minHeight = `${finalBottom + 16}px`;
  }
}

function scheduleRedraw() {
  requestAnimationFrame(() => {
    positionRounds();
    drawBracketConnections();
    setTimeout(() => {
      positionRounds();
      drawBracketConnections();
    }, 50);
  });
}
function drawBracketConnections() {
  const container = document.getElementById("bracket");
  if (!container) return;
  const grid = container.querySelector(".bracket-grid");
  const svg = container.querySelector(".bracket-svg");
  const w = Math.max(container.scrollWidth, grid?.scrollWidth || 0);
  const h = Math.max(container.scrollHeight, grid?.scrollHeight || 0);
  svg.setAttribute("width", w);
  svg.setAttribute("height", h);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const pairs = [
    { from: "QF1", to: "SF1" },
    { from: "QF2", to: "SF1" },
    { from: "QF3", to: "SF2" },
    { from: "QF4", to: "SF2" },
    { from: "SF1", to: "F1" },
    { from: "SF2", to: "F1" },
  ];

  pairs.forEach((p) => {
    const fromEl = document.getElementById(p.from);
    const toEl = document.getElementById(p.to);
    if (!fromEl || !toEl) return;
    const a = getCenterRight(fromEl, container);
    const b = getCenterLeft(toEl, container);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathCurve(a.x, a.y, b.x, b.y));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--wire)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
  });
}
window.addEventListener("resize", scheduleRedraw);
document.getElementById("bracket").addEventListener("scroll", () => {
  clearTimeout(window.__brk_t);
  window.__brk_t = setTimeout(scheduleRedraw, 50);
});
const mq = window.matchMedia("(max-width: 560px)");
if (mq.addEventListener) mq.addEventListener("change", scheduleRedraw);
else if (mq.addListener) mq.addListener(scheduleRedraw);

/* ================== Armar datos del bracket desde MATCHES_DB ================== */
function fillBracketFromMatches() {
  // Construye equipos (nombre y score) para QF/SF/Final
  const byStage = {
    quarter: MATCHES_DB.filter((m) => m.stage === "quarter"),
    semi: MATCHES_DB.filter((m) => m.stage === "semi"),
    final: MATCHES_DB.filter((m) => m.stage === "final"),
  };

  const toCard = (m) => ({
    id: mapStageToCardId(m),
    teamA: { name: m.home?.nickname || "—" },
    teamB: { name: m.away?.nickname || "—" },
    scoreA: m.score_home ?? null,
    scoreB: m.score_away ?? null,
  });

  // Map: determinístico por creación/orden
  const quarters = byStage.quarter.slice(0, 4).map(toCard);
  const semis = byStage.semi.slice(0, 2).map(toCard);
  const final = byStage.final.slice(0, 1).map(toCard);

  // IDs amigables: QF1..4, SF1..2, F1
  function mapStageToCardId(m) {
    if (m.stage === "quarter") {
      const i = byStage.quarter.indexOf(m);
      return `QF${i + 1}`;
    }
    if (m.stage === "semi") {
      const i = byStage.semi.indexOf(m);
      return `SF${i + 1}`;
    }
    if (m.stage === "final") {
      return "F1";
    }
    return `M_${m.id}`;
  }

  window.BRACKET_DATA.cuartos = quarters;
  window.BRACKET_DATA.semifinal = semis;
  window.BRACKET_DATA.final = final;

  // Campeón (si la final está jugada y no hay empate)
  if (
    final[0] &&
    final[0].scoreA != null &&
    final[0].scoreB != null &&
    final[0].scoreA !== final[0].scoreB
  ) {
    window.BRACKET_DATA.campeon =
      final[0].scoreA > final[0].scoreB ? final[0].teamA : final[0].teamB;
  } else {
    window.BRACKET_DATA.campeon = null;
  }

  renderBracket();
}

/* ================== Boot ================== */
async function boot() {
  await loadData();
  renderMatchesList();
  renderGroupsStandings();
  fillBracketFromMatches();
}
boot();
