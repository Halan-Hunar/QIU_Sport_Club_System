import { useMemo } from 'react';
import MatchCard from './MatchCard';

// Group matches into ordered columns by their round name.
// Order follows match_number (which we assign sequentially when generating).
function groupByRound(matches) {
  const map = new Map();
  for (const m of matches) {
    const key = m.round ?? 'Round';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  // Sort each round by match_number for stable order
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));
  }
  // Sort columns by the smallest match_number in each round
  return [...map.entries()].sort(
    (a, b) => (a[1][0].match_number ?? 0) - (b[1][0].match_number ?? 0),
  );
}

export default function Bracket({ matches, isAdmin, onEditScore, onOpen }) {
  const rounds = useMemo(() => groupByRound(matches), [matches]);

  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6 pb-2">
      <div className="flex gap-6 min-w-fit">
        {rounds.map(([roundName, roundMatches], colIdx) => {
          // Vertical spacing doubles each round so feeder matches line up with
          // the next-round match centered between them.
          const verticalGap = colIdx === 0 ? 16 : 16 * 2 ** colIdx + (colIdx * 8);
          return (
            <div
              key={roundName}
              className="flex flex-col justify-around min-w-[280px]"
              style={{ rowGap: `${verticalGap}px` }}
            >
              <div className="font-label text-label-md uppercase tracking-wider
                              text-ink-variant text-center">
                {roundName}
              </div>
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  isAdmin={isAdmin}
                  onEditScore={onEditScore}
                  onOpen={onOpen}
                  compact
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
