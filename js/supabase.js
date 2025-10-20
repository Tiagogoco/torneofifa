// public/js/supabase.js
export const sb = supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON);

/* ---------------------
   Tournaments
---------------------- */
export async function getTournamentBySlug(slug) {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export async function setTournamentStart(tournament_id, start_at_iso) {
  const { data, error } = await sb
    .from("tournaments")
    .update({ start_at: start_at_iso })
    .eq("id", tournament_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------------------
   Players
---------------------- */
export async function listPlayers(tournament_id) {
  const { data, error } = await sb
    .from("players")
    .select("*")
    .eq("tournament_id", tournament_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertPlayer(tournament_id, nickname) {
  const { data, error } = await sb
    .from("players")
    .insert({ tournament_id, nickname })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(player_id) {
  const { error } = await sb.from("players").delete().eq("id", player_id);
  if (error) throw error;
}

/* ---------------------
   Groups & Memberships
---------------------- */
export async function listGroups(tournament_id) {
  // Trae grupos + sus membresías + datos del jugador
  const { data, error } = await sb
    .from("groups")
    .select(
      `
      id, code, tournament_id, created_at,
      members:group_memberships(
        id,
        player:players(*)
      )
    `
    )
    .eq("tournament_id", tournament_id)
    .order("code", { ascending: true });
  if (error) throw error;
  return data;
}

/* ---------------------
   Matches
---------------------- */
export async function listMatches(tournament_id, stage = null) {
  // Incluye alias a jugadores por sus FKs
  // Asegúrate de que las constraints se llamen matches_home_player_id_fkey / matches_away_player_id_fkey (default)
  let query = sb
    .from("matches")
    .select(
      `
      id, tournament_id, stage, group_id, start_at, status, score_home, score_away, created_at,
      home:players!matches_home_player_id_fkey(id, nickname),
      away:players!matches_away_player_id_fkey(id, nickname)
    `
    )
    .eq("tournament_id", tournament_id)
    .order("start_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (stage) query = query.eq("stage", stage);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function saveMatchResult(match_id, score_home, score_away) {
  const { data, error } = await sb
    .from("matches")
    .update({
      score_home: Number(score_home),
      score_away: Number(score_away),
      status: "played",
    })
    .eq("id", match_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMatchTime(match_id, start_at_iso) {
  const { data, error } = await sb
    .from("matches")
    .update({ start_at: start_at_iso })
    .eq("id", match_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
