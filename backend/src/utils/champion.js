export function championFromFinal(final) {
  if (!final || final.status !== 'completed' || final.round !== 'Final' || final.tournament?.status !== 'completed') return null;
  const winner = final.winner_team ?? final.winner_player;
  if (!winner) return null;
  return { name: winner.name, kind: final.winner_team ? 'team' : 'player',
    tournament_id: final.tournament.id, tournament_name: final.tournament.name };
}
