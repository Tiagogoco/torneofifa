// frontend/app.js (reemplazo completo)
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
function isGroupStageComplete() {
  // true si NO existe ningún partido de grupos pendiente
  return !MATCHES_DB.some((m) => m.stage === "group" && m.status !== "played");
}

/* ================= Helpers ================= */
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
  const t = new Map(
    players.map((p) => [
      p.id,
      { player: p, PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, Pts: 0 },
    ])
  );
  for (const m of matches) {
    if (m.status !== "played") continue;
    const H = t.get(m.home_player_id),
      A = t.get(m.away_player_id);
    if (!H || !A) continue;
    H.PJ++;
    A.PJ++;
    H.GF += m.score_home ?? 0;
    H.GC += m.score_away ?? 0;
    H.DG = H.GF - H.GC;
    A.GF += m.score_away ?? 0;
    A.GC += m.score_home ?? 0;
    A.DG = A.GF - A.GC;
    if (m.score_home > m.score_away) {
      H.G++;
      H.Pts += 3;
      A.P++;
    } else if (m.score_home < m.score_away) {
      A.G++;
      A.Pts += 3;
      H.P++;
    } else {
      H.E++;
      A.E++;
      H.Pts++;
      A.Pts++;
    }
  }
  const rows = [...t.values()];
  rows.sort(
    (x, y) => y.Pts - x.Pts || y.DG - x.DG || y.GF - x.GF || Math.random() - 0.5
  );
  return rows;
}

/* ================== Carga de datos ================== */
let TOURNAMENT = null;
let GROUPS_DB = []; // [{id, code, members:[{player}]}]
let MATCHES_DB = []; // matches con embed

async function loadData() {
  TOURNAMENT = await getTournamentBySlug(env.TOURNAMENT_SLUG);
  GROUPS_DB = await listGroups(TOURNAMENT.id);
  MATCHES_DB = await listMatches(TOURNAMENT.id);
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

  const phaseVal = phaseSelect.value;
  if (phaseVal !== "all") list = list.filter((m) => m.phase === phaseVal);

  const showGroups = phaseVal === "groups";
  groupSelect.style.display = showGroups ? "" : "none";
  if (showGroups) {
    const gVal = groupSelect.value;
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

/* ================== GRUPOS: tabla ================== */
const groupsRoot = document.getElementById("groups-root");
function renderGroupsStandings() {
  if (!groupsRoot) return;
  groupsRoot.innerHTML = "";

  // Agrupa partidos por group_id (solo fase de grupos)
  const byGroupId = MATCHES_DB.reduce((acc, m) => {
    if (m.stage !== "group" || !m.group_id) return acc;
    (acc[m.group_id] ||= []).push(m);
    return acc;
  }, {});

  // Ordenar grupos por código (A..F)
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
    head.innerHTML = `
      <div class="group-rail"></div>
      <div class="group-name">Grupo ${g.code}</div>
    `;

    const tableEl = document.createElement("table");
    tableEl.className = "table";
    tableEl.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>PJ</th><th>G</th><th>E</th><th>P</th>
          <th>GF</th><th>GC</th>
          <th>DG</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = tableEl.querySelector("tbody");

    table.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><span class="badge"><span class="code">${
          row.player.nickname
        }</span></span></td>
        <td>${row.PJ}</td>
        <td>${row.G}</td>
        <td>${row.E}</td>
        <td>${row.P}</td>
        <td>${row.GF}</td>
        <td>${row.GC}</td>
        <td class="${row.DG >= 0 ? "dg-pos" : "dg-neg"}">${row.DG}</td>
        <td><strong>${row.Pts}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    // ⬇️ Wrapper scrolleable para móvil
    const scroller = document.createElement("div");
    scroller.className = "table-wrap";
    scroller.appendChild(tableEl);

    card.appendChild(head);
    card.appendChild(scroller);
    groupsRoot.appendChild(card);
  }
}

/* ================== LLAVES: construir desde matches o grupos ================== */
window.BRACKET_DATA = {
  seeds: [],
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
function sortStandingRows(a, b) {
  return b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || Math.random() - 0.5;
}
function computeTop8Seeds() {
  const byGroupId = MATCHES_DB.reduce((acc, m) => {
    if (m.stage !== "group" || !m.group_id) return acc;
    acc[m.group_id] ||= [];
    acc[m.group_id].push(m);
    return acc;
  }, {});
  const groupsSorted = [...GROUPS_DB].sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  const winners = [],
    seconds = [],
    thirds = [];
  for (const g of groupsSorted) {
    const players = (g.members || []).map((x) => x.player);
    const matches = byGroupId[g.id] || [];
    const rows = computeGroupStandings(players, matches);
    if (rows[0]) winners.push({ group: g.code, ...rows[0] });
    if (rows[1]) seconds.push({ group: g.code, ...rows[1] });
    if (rows[2]) thirds.push({ group: g.code, ...rows[2] });
  }
  winners.sort(sortStandingRows);
  seconds.sort(sortStandingRows);
  thirds.sort(sortStandingRows);
  const seeds = [];
  winners.forEach((w) => seeds.push(w.player));
  seconds.forEach((s) => {
    if (seeds.length < 8) seeds.push(s.player);
  });
  thirds.forEach((t) => {
    if (seeds.length < 8) seeds.push(t.player);
  });
  return seeds.slice(0, 8);
}

let quartersSource = [],
  semisSource = [];

function toCard(m) {
  return {
    id: mapStageToCardId(m),
    teamA: { name: m.home?.nickname || "—" },
    teamB: { name: m.away?.nickname || "—" },
    scoreA: m.score_home ?? null,
    scoreB: m.score_away ?? null,
  };
}

function mapStageToCardId(m) {
  if (m.stage === "quarter") {
    const i = quartersSource.indexOf(m);
    return `QF${i + 1}`;
  }
  if (m.stage === "semi") {
    const i = semisSource.indexOf(m);
    return `SF${i + 1}`;
  }
  if (m.stage === "final") {
    return "F1";
  }
  return `M_${m.id}`;
}

function fillBracketFromMatches() {
  quartersSource = MATCHES_DB.filter((m) => m.stage === "quarter").sort(
    (a, b) => (a.start_at || "").localeCompare(b.start_at || "")
  );
  semisSource = MATCHES_DB.filter((m) => m.stage === "semi").sort((a, b) =>
    (a.start_at || "").localeCompare(b.start_at || "")
  );
  const finalBd = MATCHES_DB.filter((m) => m.stage === "final").sort((a, b) =>
    (a.start_at || "").localeCompare(b.start_at || "")
  );

  const groupsDone = isGroupStageComplete();

  // ---- CUARTOS ----
  let quarters = quartersSource.map(toCard);

  if (quarters.length < 4) {
    // Si los grupos NO están completos, NO sembramos desde grupos.
    if (!groupsDone) {
      window.BRACKET_DATA.seeds = []; // oculta “Desde Grupos”
      // Solo placeholders
      for (let i = quarters.length; i < 4; i++) {
        quarters.push({
          id: `QF${i + 1}`,
          teamA: { name: "Por definirse" },
          teamB: { name: "Por definirse" },
          scoreA: null,
          scoreB: null,
        });
      }
    } else {
      // Grupos completos ⇒ sembrar desde standings (top 8)
      const seeds = computeTop8Seeds(); // ya la tienes
      window.BRACKET_DATA.seeds = seeds.map((p, i) => ({
        pos: i + 1,
        name: p?.nickname || "—",
      }));
      if (seeds.length === 8) {
        const pairing = [
          [0, 7],
          [3, 4],
          [1, 6],
          [2, 5],
        ]; // 1v8,4v5,2v7,3v6
        const placeholders = pairing.map(([i, j], idx) => ({
          id: `QF${idx + 1}`,
          teamA: { name: seeds[i]?.nickname || "—" },
          teamB: { name: seeds[j]?.nickname || "—" },
          scoreA: null,
          scoreB: null,
        }));
        const mapById = new Map(quarters.map((q) => [q.id, q]));
        quarters = placeholders.map((ph) => mapById.get(ph.id) || ph);
      } else {
        // Por si faltaran jugadores válidos, rellena
        for (let i = quarters.length; i < 4; i++) {
          quarters.push({
            id: `QF${i + 1}`,
            teamA: { name: "Por definirse" },
            teamB: { name: "Por definirse" },
            scoreA: null,
            scoreB: null,
          });
        }
      }
    }
  } else {
    // Si hay 4 desde BD, fija IDs
    quarters = quarters
      .slice(0, 4)
      .map((q, idx) => ({ ...q, id: `QF${idx + 1}` }));
    // En este caso puedes mantener/mostrar seeds como referencia o vaciar:
    window.BRACKET_DATA.seeds = [];
  }

  // ---- SEMIS ----
  let semis = semisSource.map(toCard);
  for (let i = semis.length; i < 2; i++) {
    semis.push({
      id: `SF${i + 1}`,
      teamA: { name: "Por definirse" },
      teamB: { name: "Por definirse" },
      scoreA: null,
      scoreB: null,
    });
  }
  semis = semis.slice(0, 2).map((s, idx) => ({ ...s, id: `SF${idx + 1}` }));

  // ---- FINAL ----
  let final = finalBd.map(toCard);
  if (!final.length)
    final = [
      {
        id: "F1",
        teamA: { name: "Por definirse" },
        teamB: { name: "Por definirse" },
        scoreA: null,
        scoreB: null,
      },
    ];
  else final = [{ ...final[0], id: "F1" }];

  // ---- Campeón ----
  const F = final[0];
  if (F && F.scoreA != null && F.scoreB != null && F.scoreA !== F.scoreB) {
    window.BRACKET_DATA.campeon = F.scoreA > F.scoreB ? F.teamA : F.teamB;
  } else window.BRACKET_DATA.campeon = null;

  window.BRACKET_DATA.cuartos = quarters;
  window.BRACKET_DATA.semifinal = semis;
  window.BRACKET_DATA.final = final;

  renderBracket();
}

/* Render/posicionado */
function renderBracket() {
  const root = document.getElementById("bracket");
  if (!root) return;
  const svg = root.querySelector(".bracket-svg");
  root.querySelectorAll(".bracket-grid").forEach((n) => n.remove());
  const grid = el("div", "bracket-grid");

  // Columna Seeds (opcional)
  const seeds = window.BRACKET_DATA.seeds || [];
  if (seeds.length) {
    const colSeeds = el("div", "round seeds");
    colSeeds.id = "round-seeds";
    colSeeds.appendChild(el("div", "round-title", "Desde Grupos"));
    const ul = el("ul", "seeds-list");
    seeds.forEach((s) => ul.appendChild(el("li", null, `${s.pos}. ${s.name}`)));
    colSeeds.appendChild(ul);
    grid.appendChild(colSeeds);
  }
  const colSeeds = el("div", "round seeds");
  colSeeds.id = "round-seeds";

  colSeeds.appendChild(el("div", "round-title", "Desde Grupos"));
  if (seeds.length) {
    const ul = el("ul", "seeds-list");
    seeds.forEach((s) => ul.appendChild(el("li", null, `${s.pos}. ${s.name}`)));
    colSeeds.appendChild(ul);
  } else {
    colSeeds.appendChild(
      el("div", "muted", "A la espera de resultados de grupos")
    );
  }
  grid.appendChild(colSeeds);

  // QF
  const qf = el("div", "round quarters");
  qf.id = "round-qf";
  qf.appendChild(el("div", "round-title", "Cuartos de final"));
  window.BRACKET_DATA.cuartos.forEach((m) => qf.appendChild(matchCard(m)));
  grid.appendChild(qf);

  // SF
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
  const isMobile = window.matchMedia("(max-width: 560px)").matches;
  if (isMobile) return;
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
  const isMobile = window.matchMedia("(max-width: 560px)").matches;
  if (isMobile) {
    // en móvil no dibujamos cables
    const svg = document.querySelector(".bracket-svg");
    if (svg) {
      svg.setAttribute("width", 0);
      svg.setAttribute("height", 0);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    }
    return;
  }
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

/* ================== Boot ================== */
async function boot() {
  await loadData();
  renderMatchesList();
  renderGroupsStandings();
  fillBracketFromMatches();
}
boot();
