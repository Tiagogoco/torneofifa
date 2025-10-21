// Tabla de posiciones y desempates para fase de grupos
// Criterios: Pts > DG > GF > sorteo
export function computeGroupStandings(players, matchesByGroup) {
  const table = new Map(
    players.map((p) => [
      p.id,
      { player: p, Pts: 0, PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0 },
    ])
  );

  for (const m of matchesByGroup) {
    if (m.status !== "played") continue;
    const h = table.get(m.home_player_id);
    const a = table.get(m.away_player_id);
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
      h.Pts += 1;
      a.Pts += 1;
    }
  }

  const rows = [...table.values()];
  rows.sort(
    (x, y) => y.Pts - x.Pts || y.DG - x.DG || y.GF - x.GF || Math.random() - 0.5
  );

  return rows;
}
