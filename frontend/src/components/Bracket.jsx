import { useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));
  }
  return [...map.entries()].sort(
    (a, b) => (a[1][0].match_number ?? 0) - (b[1][0].match_number ?? 0),
  );
}

// Build a list of feeder → next pairs for connector drawing.
function buildConnectorGroups(matches) {
  const groups = new Map(); // next_match_id → array of feeder ids
  for (const m of matches) {
    if (!m.next_match_id) continue;
    if (!groups.has(m.next_match_id)) groups.set(m.next_match_id, []);
    groups.get(m.next_match_id).push(m.id);
  }
  return groups;
}

export default function Bracket({ matches, isAdmin, onEditScore, onOpen }) {
  const rounds = useMemo(() => groupByRound(matches), [matches]);
  const connectorGroups = useMemo(() => buildConnectorGroups(matches), [matches]);

  // Inner content div — SVG is absolutely positioned over it so coordinates
  // are relative to this exact element (which includes the full scrollable width).
  const innerRef = useRef(null);
  // Refs to each MatchCard wrapper div, keyed by match id.
  const cardRefs = useRef(new Map());
  const setCardRef = (id) => (el) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  // Positions of each card relative to innerRef, in pixels.
  const [positions, setPositions] = useState({});
  // Size of the inner container so the SVG matches exactly.
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  // Measure on mount and whenever layout-affecting things change.
  useLayoutEffect(() => {
    const measure = () => {
      const container = innerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const next = {};
      cardRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        next[id] = {
          left:    r.left  - cRect.left,
          right:   r.right - cRect.left,
          top:     r.top   - cRect.top,
          bottom:  r.bottom - cRect.top,
          centerY: r.top   - cRect.top + r.height / 2,
        };
      });
      setPositions(next);
      setContainerSize({ w: cRect.width, h: cRect.height });
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    // Also observe each card; round columns can grow as their content loads.
    cardRefs.current.forEach((el) => ro.observe(el));
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [matches]);

  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6 pb-2">
      <div ref={innerRef} className="relative flex gap-6 min-w-fit">
        {rounds.map(([roundName, roundMatches], colIdx) => {
          // Vertical spacing doubles each round so feeders line up with the
          // next-round match centered between them.
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
                <div key={m.id} ref={setCardRef(m.id)}>
                  <MatchCard
                    match={m}
                    isAdmin={isAdmin}
                    onEditScore={onEditScore}
                    onOpen={onOpen}
                    compact
                  />
                </div>
              ))}
            </div>
          );
        })}

        {/* SVG overlay — drawn on top of the inner content, ignored by pointer events. */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={containerSize.w}
          height={containerSize.h}
          aria-hidden
        >
          <g
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
            fill="none"
          >
            {[...connectorGroups.entries()].map(([nextId, feederIds]) => {
              const nextPos = positions[nextId];
              if (!nextPos) return null;

              const feederPositions = feederIds
                .map((id) => positions[id])
                .filter(Boolean)
                .sort((a, b) => a.centerY - b.centerY);

              if (feederPositions.length === 0) return null;

              // Single feeder (e.g. round 1 BYE auto-advance) — draw one line.
              if (feederPositions.length === 1) {
                const f = feederPositions[0];
                return (
                  <line
                    key={nextId}
                    x1={f.right}
                    y1={f.centerY}
                    x2={nextPos.left}
                    y2={nextPos.centerY}
                  />
                );
              }

              // Pair (or more, treat extras as inside the top/bottom span).
              const topF = feederPositions[0];
              const botF = feederPositions[feederPositions.length - 1];
              const stubX = Math.max(topF.right, botF.right) + 24;
              const midY = (topF.centerY + botF.centerY) / 2;

              return (
                <g key={nextId}>
                  {/* Horizontal stubs from each feeder's right edge */}
                  {feederPositions.map((f, i) => (
                    <line
                      key={i}
                      x1={f.right}
                      y1={f.centerY}
                      x2={stubX}
                      y2={f.centerY}
                    />
                  ))}
                  {/* Vertical connector spanning top to bottom feeder */}
                  <line
                    x1={stubX}
                    y1={topF.centerY}
                    x2={stubX}
                    y2={botF.centerY}
                  />
                  {/* Horizontal from the midpoint of that vertical to the next card */}
                  <line
                    x1={stubX}
                    y1={midY}
                    x2={nextPos.left}
                    y2={midY}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
