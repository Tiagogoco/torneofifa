import { shuffle, chunk, groupCodes } from "./helpers.js";
import {
  sb,
  listPlayers,
  listGroups as _listGroups,
  listMatches as _listMatches,
} from "./supabase.js";
import { computeGroupStandings } from "./standings.js";

// Crea grupos + calendario round-robin
export async function generateGroupsAndFixtures(tournament) {
  const players = await listPlayers(tournament.id);
  if (players.length === 0) throw new Error("No hay jugadores.");
  if (players.length > 24) throw new Error("Máximo 24 jugadores.");

  // Limpiar datos previos
  const groupsPrev = await sb
    .from("groups")
    .select("id")
    .eq("tournament_id", tournament.id);
  if (groupsPrev.error) throw groupsPrev.error;

  if (groupsPrev.data?.length) {
    const gIds = groupsPrev.data.map((g) => g.id);
    await sb.from("group_memberships").delete().in("group_id", gIds);
    await sb.from("groups").delete().eq("tournament_id", tournament.id);
  }
  await sb.from("matches").delete().eq("tournament_id", tournament.id);

  // Particionar en grupos de 4
  const shuffled = shuffle(players);
  const chunks = chunk(shuffled, 4);
  const N = chunks.length;
  const codes = groupCodes(N);

  // Crear grupos
  const gIns = await sb
    .from("groups")
    .insert(codes.map((code) => ({ tournament_id: tournament.id, code })))
    .select("*");
  if (gIns.error) throw gIns.error;

  const codeToId = new Map(gIns.data.map((g) => [g.code, g.id]));

  // Membresías
  const memberships = [];
  chunks.forEach((grp, idx) => {
    const gId = codeToId.get(codes[idx]);
    grp.forEach((p) => memberships.push({ group_id: gId, player_id: p.id }));
  });
  const memIns = await sb
    .from("group_memberships")
    .insert(memberships)
    .select("*");
  if (memIns.error) throw memIns.error;

  // Calendario de grupos (RR simple)
  const base = new Date(tournament.start_at || Date.now());
  const slotMs = 45 * 60 * 1000;
  let cursor = base.getTime();

  const matchesPayload = [];
  for (const [idx, grp] of chunks.entries()) {
    const gId = codeToId.get(codes[idx]);
    for (let i = 0; i < grp.length; i++) {
      for (let j = i + 1; j < grp.length; j++) {
        matchesPayload.push({
          tournament_id: tournament.id,
          stage: "group",
          group_id: gId,
          home_player_id: grp[i].id,
          away_player_id: grp[j].id,
          start_at: new Date(cursor).toISOString(),
          status: "scheduled",
        });
        cursor += slotMs;
      }
    }
  }

  const insM = await sb.from("matches").insert(matchesPayload).select("*");
  if (insM.error) throw insM.error;

  return { groups: gIns.data, matches: insM.data };
}

// Calcula clasificados a cuartos (8) según # de grupos
function top8FromGroups(groups, allMatches) {
  const byCode = new Map(groups.map((g) => [g.code, g]));
  const codeToPlayers = new Map();

  for (const g of groups) {
    const players = (g.members || []).map((m) => m.player);
    codeToPlayers.set(g.code, players);
  }

  const matchesByGroupId = allMatches.reduce((acc, m) => {
    if (m.stage !== "group" || !m.group_id) return acc;
    acc[m.group_id] ||= [];
    acc[m.group_id].push(m);
    return acc;
  }, {});

  const standingsByGroup = new Map();
  for (const g of groups) {
    const players = codeToPlayers.get(g.code) || [];
    const matches = matchesByGroupId[g.id] || [];
    const standings = computeGroupStandings(players, matches);
    standingsByGroup.set(g.code, standings);
  }

  const G = groups.length;
  let qualified = [];

  if (G === 4) {
    for (const code of groupCodes(G)) {
      const s = standingsByGroup.get(code) || [];
      qualified.push(s[0]?.player, s[1]?.player);
    }
  } else if (G === 5 || G === 6) {
    const leaders = [];
    const seconds = [];
    for (const code of groupCodes(G)) {
      const s = standingsByGroup.get(code) || [];
      if (s[0]) leaders.push(s[0]);
      if (s[1]) seconds.push(s[1]);
    }
    leaders.sort(
      (a, b) =>
        b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || Math.random() - 0.5
    );
    seconds.sort(
      (a, b) =>
        b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || Math.random() - 0.5
    );
    qualified = leaders.map((x) => x.player);
    while (qualified.length < 8 && seconds.length)
      qualified.push(seconds.shift().player);
  } else if (G === 3) {
    const thirds = [];
    for (const code of groupCodes(G)) {
      const s = standingsByGroup.get(code) || [];
      qualified.push(s[0]?.player, s[1]?.player);
      if (s[2]) thirds.push(s[2]);
    }
    thirds.sort(
      (a, b) =>
        b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || Math.random() - 0.5
    );
    while (qualified.length < 8 && thirds.length)
      qualified.push(thirds.shift().player);
  } else if (G === 2) {
    for (const code of groupCodes(G)) {
      const s = standingsByGroup.get(code) || [];
      for (let i = 0; i < 4 && i < s.length; i++) qualified.push(s[i].player);
    }
  } else if (G === 1) {
    const s = standingsByGroup.get("A") || [];
    for (let i = 0; i < 8 && i < s.length; i++) qualified.push(s[i].player);
  }

  qualified = qualified.filter(Boolean).slice(0, 8);
  return { qualified, standingsByGroup };
}

export async function generateNextPhase(tournament) {
  const groupsQ = await sb
    .from("groups")
    .select("*, members:group_memberships(*, player:players(*))")
    .eq("tournament_id", tournament.id);
  if (groupsQ.error) throw groupsQ.error;
  const groups = groupsQ.data;

  const allMatches = await _listMatches(tournament.id);
  const quarters = allMatches.filter((m) => m.stage === "quarter");
  const semis = allMatches.filter((m) => m.stage === "semi");
  const finals = allMatches.filter((m) => m.stage === "final");

  if (quarters.length === 0) {
    const { qualified } = top8FromGroups(groups, allMatches);
    if (qualified.length < 8)
      throw new Error("Aún no hay 8 clasificados definidos.");

    const seeds = shuffle(qualified);
    const pairings = [
      [seeds[0], seeds[7]],
      [seeds[3], seeds[4]],
      [seeds[1], seeds[6]],
      [seeds[2], seeds[5]],
    ];

    const base = new Date(tournament.start_at || Date.now());
    let cursor = base.getTime() + 24 * 60 * 60 * 1000;
    const slotMs = 60 * 60 * 1000;

    const payload = pairings.map(([h, a]) => ({
      tournament_id: tournament.id,
      stage: "quarter",
      home_player_id: h.id,
      away_player_id: a.id,
      start_at: new Date((cursor += slotMs)).toISOString(),
      status: "scheduled",
    }));

    const ins = await sb.from("matches").insert(payload).select("*");
    if (ins.error) throw ins.error;
    return { created: "quarters", matches: ins.data };
  }

  if (semis.length === 0) {
    const played = quarters.filter((m) => m.status === "played");
    if (played.length < 4) throw new Error("Aún faltan resultados en cuartos.");
    const winners = played.map((m) =>
      (m.score_home ?? 0) > (m.score_away ?? 0)
        ? m.home_player_id
        : m.away_player_id
    );

    const payload = [
      { home: winners[0], away: winners[1] },
      { home: winners[2], away: winners[3] },
    ].map((p, i) => ({
      tournament_id: tournament.id,
      stage: "semi",
      home_player_id: p.home,
      away_player_id: p.away,
      start_at: new Date(Date.now() + (i + 1) * 90 * 60 * 1000).toISOString(),
      status: "scheduled",
    }));

    const ins = await sb.from("matches").insert(payload).select("*");
    if (ins.error) throw ins.error;
    return { created: "semis", matches: ins.data };
  }

  if (finals.length === 0) {
    const played = semis.filter((m) => m.status === "played");
    if (played.length < 2)
      throw new Error("Aún faltan resultados en semifinales.");
    const winners = played.map((m) =>
      (m.score_home ?? 0) > (m.score_away ?? 0)
        ? m.home_player_id
        : m.away_player_id
    );

    const payload = [
      {
        tournament_id: tournament.id,
        stage: "final",
        home_player_id: winners[0],
        away_player_id: winners[1],
        start_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        status: "scheduled",
      },
    ];

    const ins = await sb.from("matches").insert(payload).select("*");
    if (ins.error) throw ins.error;
    return { created: "final", matches: ins.data };
  }

  return { created: "none", message: "Todas las fases ya existen." };
}
