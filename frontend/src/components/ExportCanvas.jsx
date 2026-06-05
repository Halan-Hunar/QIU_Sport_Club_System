import { forwardRef, useMemo } from 'react';
import { Trophy, Target, ShieldCheck, Star, Shield } from 'lucide-react';

// "Vibrant Sky" palette — pulled directly from tailwind.config.js so
// exports feel like an extension of the website rather than a separate brand.
const COLORS = {
  bgGradient: 'linear-gradient(135deg, #06334e 0%, #00668a 55%, #029be6 100%)',
  bgSolid: '#06334e',
  card: '#ffffff',
  cardAlt: '#f7f9ff',
  border: 'rgba(0, 30, 48, 0.10)',
  borderStrong: '#bcc8d1',
  text: '#001e30',          // ink
  textSecondary: '#577b99', // ink-muted
  textVariant: '#3d4850',
  onDark: '#ffffff',
  onDarkSoft: 'rgba(255,255,255,0.78)',
  onDarkMuted: 'rgba(255,255,255,0.55)',
  accent: '#00668a',        // primary
  accentBright: '#00bdfe',  // primary-container
};

const ASPECT_DIMS = {
  '9:16': { w: 1080, h: 1920 },
  '3:4':  { w: 1080, h: 1440 },
  '1:1':  { w: 1080, h: 1080 },
};

const FONT_DISPLAY = "'DM Sans', system-ui, -apple-system, sans-serif";
const FONT_LABEL = "'Inter', system-ui, -apple-system, sans-serif";

function getDims(ratio) {
  return ASPECT_DIMS[ratio] ?? ASPECT_DIMS['9:16'];
}

function competitor(team, player) {
  if (team) {
    return {
      name: team.name,
      color: team.primary_color || '#00668a',
      colorAlt: team.secondary_color || '#06334e',
      initial: (team.name || '?').charAt(0).toUpperCase(),
    };
  }
  if (player) {
    return {
      name: player.name,
      color: '#00668a',
      colorAlt: '#06334e',
      initial: player.jersey_number != null
        ? String(player.jersey_number).padStart(2, '0')
        : (player.name || '?').charAt(0).toUpperCase(),
    };
  }
  return null;
}

function isHomeWinner(m) {
  if (m.status !== 'completed') return false;
  if (m.winner_id && m.winner_id === m.home_team_id) return true;
  if (m.winner_player_id && m.winner_player_id === m.home_player_id) return true;
  return false;
}

function isAwayWinner(m) {
  if (m.status !== 'completed') return false;
  if (m.winner_id && m.winner_id === m.away_team_id) return true;
  if (m.winner_player_id && m.winner_player_id === m.away_player_id) return true;
  return false;
}

function formatShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatExportDate() {
  return new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Header / Footer ────────────────────────────────────────────────
// `pillText` / `pillBg` let callers swap the default sport-type pill for
// something custom (e.g. a coloured "Squad" badge tinted to the team colour);
// `subtitle` adds a second display line under the title (e.g. "Group A").
function Header({ tournament, title, subtitle, pillText, pillBg }) {
  const resolvedTitle = title ?? tournament?.name ?? 'Tournament';
  const resolvedPill = pillText ?? (tournament?.sport_type || '').replace(/_/g, ' ');
  const resolvedBg = pillBg || 'rgba(255,255,255,0.18)';
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 64,
        color: COLORS.onDark,
        letterSpacing: '-0.02em',
        lineHeight: 1.05,
        textShadow: '0 2px 14px rgba(0,30,48,0.2)',
      }}>
        {resolvedTitle}
      </div>
      {subtitle && (
        <div style={{
          marginTop: 8,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 28,
          color: COLORS.onDarkSoft,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
        }}>
          {subtitle}
        </div>
      )}
      <div style={{
        display: 'inline-block',
        marginTop: 16,
        padding: '12px 24px',
        borderRadius: 999,
        background: resolvedBg,
        border: '1px solid rgba(255,255,255,0.35)',
        color: COLORS.onDark,
        fontFamily: FONT_LABEL,
        fontSize: 24,
        fontWeight: 700,
        textTransform: 'capitalize',
        letterSpacing: '0.05em',
        backdropFilter: 'blur(2px)',
      }}>
        {resolvedPill}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <>
      <div style={{
        position: 'absolute',
        left: 40,
        bottom: 32,
        fontFamily: FONT_LABEL,
        fontSize: 32,
        fontWeight: 700,
        color: COLORS.onDark,
        letterSpacing: '0.02em',
        lineHeight: 1,
      }}>
        {formatExportDate()}
      </div>
      <div style={{
        position: 'absolute',
        right: 40,
        bottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <img
          src="/export-assets/logo/QIU-Sports-Club-Logo.png"
          alt=""
          style={{
            height: '90px',
            width: 'auto',
            objectFit: 'contain',
            // The logo has dark navy text on a transparent backdrop, which
            // disappears on the dark gradient canvas — knock it to pure white
            // so it reads cleanly against any export background.
            filter: 'brightness(0) invert(1)',
          }}
        />
        <span style={{
          fontFamily: FONT_LABEL,
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.onDark,
          letterSpacing: '0.06em',
        }}>
          Sport Club
        </span>
      </div>
    </>
  );
}

// ─── BRACKET layout ────────────────────────────────────────────────
function CompetitorLine({ c, score, isWinner, isLoser, big }) {
  const nameSize = big ? 20 : 18;
  const scoreSize = big ? 30 : 26;
  const avatarSize = big ? 36 : 32;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 0',
    }}>
      {c ? (
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${c.color}, ${c.colorAlt})`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_DISPLAY,
          fontSize: avatarSize * 0.46,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,30,48,0.15)',
        }}>
          {c.initial}
        </div>
      ) : (
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: 999,
          background: COLORS.cardAlt,
          border: `1px dashed ${COLORS.borderStrong}`,
          flexShrink: 0,
        }} />
      )}
      <span style={{
        flex: 1,
        fontFamily: FONT_LABEL,
        fontSize: c?.name && c.name.length > 14 ? Math.max(11, nameSize - (c.name.length - 14)) : nameSize,
        fontWeight: isWinner ? 700 : 500,
        color: isWinner ? COLORS.text : COLORS.textSecondary,
        textDecoration: isLoser ? 'line-through' : 'none',
        wordBreak: 'break-word',
        lineHeight: 1.2,
      }}>
        {c?.name || 'TBD'}
      </span>
      <span style={{
        fontFamily: FONT_DISPLAY,
        fontSize: scoreSize,
        fontWeight: 700,
        color: isWinner ? COLORS.accent : COLORS.textSecondary,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {score ?? 0}
      </span>
    </div>
  );
}

function BracketCard({ m, x, y, w, h, big }) {
  const home = competitor(m.home_team, m.home_player);
  const away = competitor(m.away_team, m.away_player);
  const homeWin = isHomeWinner(m);
  const awayWin = isAwayWinner(m);
  const isCompleted = m.status === 'completed';
  const homeLose = isCompleted && !homeWin && (home != null);
  const awayLose = isCompleted && !awayWin && (away != null);

  return (
    <div style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 14,
      padding: big ? 16 : 14,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 18px rgba(0, 30, 48, 0.18), 0 1px 3px rgba(0,30,48,0.08)',
    }}>
      <CompetitorLine c={home} score={m.home_score} isWinner={homeWin} isLoser={homeLose} big={big} />
      <CompetitorLine c={away} score={m.away_score} isWinner={awayWin} isLoser={awayLose} big={big} />
      <div style={{
        marginTop: 'auto',
        paddingTop: 10,
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: FONT_LABEL,
        fontSize: 11,
        fontWeight: 600,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        <span>{m.round}{m.match_number ? ` · #${m.match_number}` : ''}</span>
        <span>{m.scheduled_at ? formatShort(m.scheduled_at) : m.status}</span>
      </div>
    </div>
  );
}

function BracketLayout({ matches, rounds, width, height }) {
  const layout = useMemo(() => {
    const headerH = 170;
    const footerH = 80;
    const sidePad = 40;
    const innerW = width - sidePad * 2;

    const selectedRounds = rounds && rounds.length > 0 ? rounds : [];
    const byRound = selectedRounds.map((r) => ({
      round: r,
      matches: matches
        .filter((m) => m.round === r)
        .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)),
    })).filter((g) => g.matches.length > 0);

    if (byRound.length === 0) {
      return { groups: [], positions: {}, headerH, footerH, labels: [], connectors: [] };
    }

    const numRounds = byRound.length;
    const bandTop = headerH + 20;
    const bandBot = height - footerH - 20;
    const bandH = bandBot - bandTop;
    const roundGap = bandH / numRounds;

    // Bigger cards now: target 320×170, shrink only if a row is too dense.
    const maxRow = Math.max(...byRound.map((g) => g.matches.length));
    const cardGap = 20;
    let cardW = Math.floor((innerW - (maxRow - 1) * cardGap) / maxRow);
    if (cardW > 320) cardW = 320;
    if (cardW < 200) cardW = 200;
    const big = cardW >= 260;
    const cardH = big ? 180 : 150;

    const positions = {};
    const labels = [];

    byRound.forEach((g, rIdx) => {
      const rowCenterY = bandTop + roundGap * rIdx + roundGap / 2;
      const labelY = rowCenterY - cardH / 2 - 32;
      labels.push({ round: g.round, y: labelY });
      const M = g.matches.length;
      const totalW = M * cardW + (M - 1) * cardGap;
      const startX = sidePad + (innerW - totalW) / 2;
      g.matches.forEach((m, mIdx) => {
        const x = startX + mIdx * (cardW + cardGap);
        const y = rowCenterY - cardH / 2;
        positions[m.id] = {
          x, y, w: cardW, h: cardH,
          cx: x + cardW / 2,
          topY: y,
          botY: y + cardH,
        };
      });
    });

    // Build connector list between adjacent visible rounds
    const connectors = [];
    byRound.forEach((g, rIdx) => {
      if (rIdx === byRound.length - 1) return;
      const nextGroup = byRound[rIdx + 1];
      const nextSet = new Set(nextGroup.matches.map((m) => m.id));
      const byNext = new Map();
      g.matches.forEach((m) => {
        if (!m.next_match_id || !nextSet.has(m.next_match_id)) return;
        if (!positions[m.next_match_id]) return;
        if (!byNext.has(m.next_match_id)) byNext.set(m.next_match_id, []);
        byNext.get(m.next_match_id).push(m.id);
      });
      byNext.forEach((feederIds, nextId) => {
        const next = positions[nextId];
        if (!next) return;
        const feeders = feederIds.map((id) => positions[id]).filter(Boolean);
        if (feeders.length === 0) return;
        feeders.sort((a, b) => a.cx - b.cx);
        connectors.push({ feeders, next });
      });
    });

    return { groups: byRound, positions, big, headerH, footerH, labels, connectors };
  }, [matches, rounds, width, height]);

  return (
    <>
      {(layout.labels || []).map((l) => (
        <div
          key={l.round}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: l.y,
            textAlign: 'center',
            fontFamily: FONT_LABEL,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: COLORS.onDarkSoft,
          }}
        >
          {l.round}
        </div>
      ))}

      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {(layout.connectors || []).map((c, i) => {
          const midY = (c.feeders[0].botY + c.next.topY) / 2;
          return (
            <g key={i} stroke="rgba(255,255,255,0.35)" strokeWidth={2} fill="none" strokeLinecap="round">
              {c.feeders.map((f, j) => (
                <line key={j} x1={f.cx} y1={f.botY} x2={f.cx} y2={midY} />
              ))}
              {c.feeders.length > 1 && (
                <line
                  x1={c.feeders[0].cx}
                  y1={midY}
                  x2={c.feeders[c.feeders.length - 1].cx}
                  y2={midY}
                />
              )}
              <line x1={c.next.cx} y1={midY} x2={c.next.cx} y2={c.next.topY} />
            </g>
          );
        })}
      </svg>

      {(layout.groups || []).flatMap((g) =>
        g.matches.map((m) => {
          const p = layout.positions[m.id];
          if (!p) return null;
          return (
            <BracketCard key={m.id} m={m} x={p.x} y={p.y} w={p.w} h={p.h} big={layout.big} />
          );
        }),
      )}
    </>
  );
}

// ─── RESULTS layout ────────────────────────────────────────────────
function ResultsLayout({ matches, width, height }) {
  const sorted = useMemo(
    () => [...matches].sort((a, b) => {
      const ra = a.round || '';
      const rb = b.round || '';
      if (ra !== rb) return ra.localeCompare(rb);
      return (a.match_number ?? 0) - (b.match_number ?? 0);
    }),
    [matches],
  );

  const grouped = useMemo(() => {
    const map = new Map();
    sorted.forEach((m) => {
      const key = m.round || 'Round';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return [...map.entries()];
  }, [sorted]);

  // Card metrics scale with available vertical space, but cap at 1.5×
  // so a sparse layout doesn't blow up wider than the 1080-px canvas.
  // When there's leftover space, we vertically center the rows instead
  // of stretching them.
  const bodyH = Math.max(height - 280, 600);
  const matchCount = sorted.length || 1;
  const idealRowH = bodyH / (matchCount + grouped.length);
  const baseRowH = 110;
  const s = Math.min(1.5, Math.max(1, idealRowH / baseRowH));

  const sz = (v) => Math.round(v * s);

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: 40,
      right: 40,
      bottom: 80,
      overflow: 'hidden',
      fontFamily: FONT_LABEL,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {grouped.length === 0 && (
        <div style={{
          color: COLORS.onDarkSoft,
          fontSize: sz(20),
          textAlign: 'center',
          marginTop: 80,
        }}>
          No matches selected.
        </div>
      )}
      {grouped.map(([round, ms]) => (
        <div key={round} style={{ marginBottom: sz(28) }}>
          <div style={{
            fontSize: sz(14),
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: COLORS.onDark,
            padding: `${sz(8)}px ${sz(4)}px`,
            marginBottom: sz(12),
          }}>
            {round}
          </div>
          {ms.map((m) => {
            const home = competitor(m.home_team, m.home_player);
            const away = competitor(m.away_team, m.away_player);
            const homeWin = isHomeWinner(m);
            const awayWin = isAwayWinner(m);
            const isCompleted = m.status === 'completed';

            const avatarSize = sz(40);
            const nameSize = sz(24);
            const scoreSize = sz(44);
            const checkSize = sz(36);

            return (
              <div key={m.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: `${sz(24)}px ${sz(28)}px`,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: sz(16),
                marginBottom: sz(14),
                gap: sz(14),
                boxShadow: '0 4px 18px rgba(0, 30, 48, 0.16)',
              }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: sz(18),
                }}>
                  {/* Home */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: sz(14),
                    minWidth: 0,
                  }}>
                    {home && (
                      <div style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 999,
                        background: `linear-gradient(135deg, ${home.color}, ${home.colorAlt})`,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONT_DISPLAY,
                        fontSize: avatarSize * 0.45,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,30,48,0.18)',
                      }}>
                        {home.initial}
                      </div>
                    )}
                    <span style={{
                      fontSize: home?.name && home.name.length > 14
                        ? Math.max(sz(13), nameSize - sz(home.name.length - 14))
                        : nameSize,
                      fontWeight: homeWin ? 700 : 500,
                      color: homeWin ? COLORS.text : COLORS.textVariant,
                      lineHeight: 1.15,
                      wordBreak: 'break-word',
                    }}>
                      {home?.name || 'TBD'}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: scoreSize,
                    fontWeight: 700,
                    color: COLORS.text,
                    fontVariantNumeric: 'tabular-nums',
                    padding: `0 ${sz(18)}px`,
                    minWidth: sz(160),
                    textAlign: 'center',
                    lineHeight: 1,
                  }}>
                    <span style={{ color: homeWin ? COLORS.accent : COLORS.text }}>
                      {m.home_score ?? 0}
                    </span>
                    <span style={{ color: COLORS.textSecondary, padding: `0 ${sz(8)}px`, fontWeight: 500 }}>
                      :
                    </span>
                    <span style={{ color: awayWin ? COLORS.accent : COLORS.text }}>
                      {m.away_score ?? 0}
                    </span>
                  </div>

                  {/* Away */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: sz(14),
                    minWidth: 0,
                  }}>
                    <span style={{
                      fontSize: away?.name && away.name.length > 14
                        ? Math.max(sz(13), nameSize - sz(away.name.length - 14))
                        : nameSize,
                      fontWeight: awayWin ? 700 : 500,
                      color: awayWin ? COLORS.text : COLORS.textVariant,
                      lineHeight: 1.15,
                      wordBreak: 'break-word',
                      textAlign: 'right',
                    }}>
                      {away?.name || 'TBD'}
                    </span>
                    {away && (
                      <div style={{
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: 999,
                        background: `linear-gradient(135deg, ${away.color}, ${away.colorAlt})`,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: FONT_DISPLAY,
                        fontSize: avatarSize * 0.45,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,30,48,0.18)',
                      }}>
                        {away.initial}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ))}
      <span style={{ display: 'none' }}>{width}x{height}</span>
    </div>
  );
}

// ─── STANDINGS layout ────────────────────────────────────────────────
// `advanceAccent`: when true, top-2 rows get a green left border (used by the
// group_standings export to telegraph who advances to the knockout stage).
function StandingsLayout({ standings, width, height, advanceAccent }) {
  const rows = standings || [];
  // Tertiary-container green from the design system — matches the ADV pill.
  const ADVANCE_GREEN = '#15803d';

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: 40,
      right: 40,
      bottom: 80,
      overflow: 'hidden',
      fontFamily: FONT_LABEL,
      // Group standings tables are short — center them in the body area so
      // there's no awkward gap of empty canvas under the table.
      ...(advanceAccent ? {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      } : null),
    }}>
      <div style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 28px rgba(0, 30, 48, 0.22)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 60px 60px 60px 60px 70px 70px 70px 80px',
          alignItems: 'center',
          padding: '18px 20px',
          background: COLORS.cardAlt,
          borderBottom: `1px solid ${COLORS.border}`,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: COLORS.textSecondary,
        }}>
          <span>#</span>
          <span>Team</span>
          <span style={{ textAlign: 'center' }}>P</span>
          <span style={{ textAlign: 'center' }}>W</span>
          <span style={{ textAlign: 'center' }}>D</span>
          <span style={{ textAlign: 'center' }}>L</span>
          <span style={{ textAlign: 'center' }}>GF</span>
          <span style={{ textAlign: 'center' }}>GA</span>
          <span style={{ textAlign: 'center' }}>GD</span>
          <span style={{ textAlign: 'center', color: COLORS.accent }}>Pts</span>
        </div>

        {rows.length === 0 && (
          <div style={{
            padding: 48,
            textAlign: 'center',
            color: COLORS.textSecondary,
            fontSize: 18,
          }}>
            No standings available.
          </div>
        )}

        {rows.map((r, idx) => {
          const advances = advanceAccent && idx < 2;
          const leftBorder = advances
            ? `5px solid ${ADVANCE_GREEN}`
            : (!advanceAccent && idx === 0 ? `5px solid ${COLORS.accent}` : '5px solid transparent');
          const rankColor = advances
            ? ADVANCE_GREEN
            : (!advanceAccent && idx === 0 ? COLORS.accent : COLORS.text);
          return (
          <div key={r.team_id || idx} style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 60px 60px 60px 60px 70px 70px 70px 80px',
            alignItems: 'center',
            padding: '18px 20px',
            background: idx % 2 === 0 ? COLORS.card : COLORS.cardAlt,
            borderLeft: leftBorder,
            fontSize: 18,
            color: COLORS.textVariant,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{
              fontWeight: 700,
              fontSize: 18,
              color: rankColor,
            }}>
              {idx + 1}
            </span>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: COLORS.text,
              fontWeight: 600,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}>
              <span style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: r.primary_color || COLORS.accent,
                flexShrink: 0,
              }} />
              {r.team_name}
            </span>
            <span style={{ textAlign: 'center' }}>{r.played ?? 0}</span>
            <span style={{ textAlign: 'center' }}>{r.won ?? 0}</span>
            <span style={{ textAlign: 'center' }}>{r.drawn ?? 0}</span>
            <span style={{ textAlign: 'center' }}>{r.lost ?? 0}</span>
            <span style={{ textAlign: 'center' }}>{r.goals_for ?? 0}</span>
            <span style={{ textAlign: 'center' }}>{r.goals_against ?? 0}</span>
            <span style={{ textAlign: 'center' }}>
              {r.goal_diff > 0 ? `+${r.goal_diff}` : (r.goal_diff ?? 0)}
            </span>
            <span style={{
              textAlign: 'center',
              fontWeight: 800,
              color: COLORS.accent,
              fontSize: 22,
              fontFamily: FONT_DISPLAY,
            }}>
              {r.points ?? 0}
            </span>
          </div>
          );
        })}
      </div>
      <span style={{ display: 'none' }}>{width}x{height}</span>
    </div>
  );
}

// ─── STATS — shared Leaderboard ─────────────────────────────────────
function Leaderboard({ title, Icon, rows, columns, emptyText }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 6px 22px rgba(0, 30, 48, 0.18)',
      marginBottom: 20,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '18px 22px',
        borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.cardAlt,
      }}>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 999,
            background: 'rgba(0,189,254,0.12)',
            color: COLORS.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
        <h3 style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          color: COLORS.text,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>
      </div>

      {(!rows || rows.length === 0) ? (
        <div style={{
          padding: 36,
          textAlign: 'center',
          color: COLORS.textSecondary,
          fontSize: 16,
        }}>
          {emptyText || 'No data yet.'}
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `60px ${columns.map((c) => c.width || '1fr').join(' ')}`,
            alignItems: 'center',
            padding: '14px 22px',
            borderBottom: `1px solid ${COLORS.border}`,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: COLORS.textSecondary,
          }}>
            <span>#</span>
            {columns.map((c) => (
              <span key={c.key} style={{
                textAlign: c.align === 'right' ? 'right' : 'left',
                color: c.accent ? COLORS.accent : COLORS.textSecondary,
              }}>
                {c.label}
              </span>
            ))}
          </div>
          {/* Rows */}
          {rows.map((r, idx) => (
            <div key={r._key || idx} style={{
              display: 'grid',
              gridTemplateColumns: `60px ${columns.map((c) => c.width || '1fr').join(' ')}`,
              alignItems: 'center',
              padding: '16px 22px',
              background: idx === 0
                ? 'linear-gradient(90deg, rgba(255,193,7,0.10), transparent)'
                : (idx % 2 === 0 ? COLORS.card : COLORS.cardAlt),
              borderLeft: idx === 0 ? '5px solid #f59e0b' : '5px solid transparent',
              fontSize: 18,
              color: COLORS.text,
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span style={{
                fontWeight: 800,
                fontFamily: FONT_DISPLAY,
                fontSize: 20,
                color: idx === 0 ? '#b45309' : COLORS.textSecondary,
              }}>
                {idx + 1}
              </span>
              {columns.map((c) => (
                <span key={c.key} style={{
                  textAlign: c.align === 'right' ? 'right' : 'left',
                  fontWeight: c.accent ? 800 : 500,
                  color: c.accent ? COLORS.accent : COLORS.text,
                  fontSize: c.accent ? 24 : 18,
                  fontFamily: c.accent ? FONT_DISPLAY : FONT_LABEL,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}>
                  {c.render(r)}
                </span>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ColorDot({ color }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 12, height: 12, borderRadius: 999,
      background: color || COLORS.accent,
      marginRight: 10,
      verticalAlign: 'middle',
    }} />
  );
}

function NameWithDot({ name, color, badge }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
      {color && <ColorDot color={color} />}
      <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {name || '—'}
      </span>
      {badge != null && (
        <span style={{
          marginLeft: 10,
          color: COLORS.textSecondary,
          fontSize: 15,
          fontWeight: 500,
        }}>
          #{badge}
        </span>
      )}
    </span>
  );
}

function topScorerColumns() {
  return [
    {
      key: 'player', label: 'Player', width: '1.4fr',
      render: (r) => (
        <span>
          {r.player_name ?? '—'}
          {r.jersey_number != null && (
            <span style={{ color: COLORS.textSecondary, marginLeft: 8 }}>#{r.jersey_number}</span>
          )}
        </span>
      ),
    },
    {
      key: 'team', label: 'Team', width: '1fr',
      render: (r) => r.team_name
        ? <NameWithDot name={r.team_name} color={r.team_color} />
        : <span style={{ color: COLORS.textSecondary }}>—</span>,
    },
    { key: 'goals', label: 'Goals', align: 'right', accent: true, width: '90px',
      render: (r) => r.goal_count },
  ];
}

function cleanSheetColumns() {
  return [
    {
      key: 'team', label: 'Team', width: '1fr',
      render: (r) => <NameWithDot name={r.team_name} color={r.team_color} />,
    },
    { key: 'count', label: 'Clean Sheets', align: 'right', accent: true, width: '160px',
      render: (r) => r.clean_sheet_count },
  ];
}

// ─── STATS — single leaderboard layout ──────────────────────────────
function SingleLeaderboardLayout({ stats, kind, width, height }) {
  if (!stats) return null;
  let title, Icon, rows, columns, emptyText;

  if (kind === 'top_scorers') {
    title = 'Top Scorers';
    Icon = Target;
    rows = (stats.top_scorers || []).map((r) => ({ ...r, _key: r.player_id }));
    columns = topScorerColumns();
    emptyText = 'No goals logged yet.';
  } else if (kind === 'clean_sheets') {
    title = 'Clean Sheets';
    Icon = ShieldCheck;
    rows = (stats.clean_sheets || []).map((r) => ({ ...r, _key: r.team_id }));
    columns = cleanSheetColumns();
    emptyText = 'No clean sheets recorded yet.';
  } else {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: 40,
      right: 40,
      bottom: 80,
      overflow: 'hidden',
      fontFamily: FONT_LABEL,
    }}>
      <Leaderboard
        title={title}
        Icon={Icon}
        rows={rows}
        columns={columns}
        emptyText={emptyText}
      />
      <span style={{ display: 'none' }}>{width}x{height}</span>
    </div>
  );
}

// ─── STATS — overview layout (champion + all applicable leaderboards) ─
function StatsOverviewLayout({ stats, width, height }) {
  if (!stats) return null;
  const applicable = stats.applicable || [];

  const champion = stats.champion;
  const topScorer = stats.top_scorers?.[0];
  const cleanSheet = stats.clean_sheets?.[0];
  const bestPlayer = stats.best_player;
  const bestGk = stats.best_gk;

  // Build headline cards based on applicable
  const headlines = [];
  if (applicable.includes('champion')) {
    headlines.push({
      key: 'champion', Icon: Trophy, label: 'Champion',
      value: champion?.name, sub: champion ? (champion.kind === 'player' ? 'Player' : 'Team') : null,
    });
  }
  if (bestPlayer) {
    headlines.push({
      key: 'best_player', Icon: Star, label: 'Best Player',
      value: bestPlayer.player_name,
      sub: bestPlayer.goal_count > 0
        ? `${bestPlayer.goal_count} ${bestPlayer.goal_count === 1 ? 'goal' : 'goals'} · ${bestPlayer.team_name}`
        : bestPlayer.team_name,
    });
  }
  if (applicable.includes('top_scorer')) {
    headlines.push({
      key: 'top_scorer', Icon: Target, label: 'Top Scorer',
      value: topScorer?.player_name,
      sub: topScorer ? `${topScorer.goal_count} ${topScorer.goal_count === 1 ? 'goal' : 'goals'}` : null,
    });
  }
  if (bestGk) {
    headlines.push({
      key: 'best_gk', Icon: Shield, label: 'Best Goalkeeper',
      value: bestGk.player_name,
      sub: `${bestGk.clean_sheet_count} clean sheet${bestGk.clean_sheet_count !== 1 ? 's' : ''} · ${bestGk.team_name}`,
    });
  }
  if (applicable.includes('clean_sheet')) {
    headlines.push({
      key: 'clean_sheet', Icon: ShieldCheck, label: 'Clean Sheets',
      value: cleanSheet?.team_name,
      sub: cleanSheet ? `${cleanSheet.clean_sheet_count} ${cleanSheet.clean_sheet_count === 1 ? 'match' : 'matches'}` : null,
    });
  }

  return (
    <div style={{
      position: 'absolute',
      top: 200,
      left: 40,
      right: 40,
      bottom: 80,
      overflow: 'hidden',
      fontFamily: FONT_LABEL,
    }}>
      {/* Headline cards — 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 24,
      }}>
        {headlines.map((h) => (
          <div key={h.key} style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 4px 18px rgba(0, 30, 48, 0.16)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: 'rgba(0,189,254,0.12)',
                color: COLORS.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <h.Icon size={22} strokeWidth={2.25} />
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: COLORS.textSecondary,
              }}>
                {h.label}
              </span>
            </div>
            <div style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700, fontSize: 26,
              color: COLORS.text,
              lineHeight: 1.15,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}>
              {h.value || 'Not yet decided.'}
            </div>
            {h.sub && (
              <div style={{ fontSize: 14, color: COLORS.textSecondary }}>
                {h.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compact leaderboards — top 3 each */}
      {applicable.includes('top_scorer') && (
        <Leaderboard
          title="Top Scorers"
          Icon={Target}
          rows={(stats.top_scorers || []).slice(0, 3).map((r) => ({ ...r, _key: r.player_id }))}
          columns={topScorerColumns()}
          emptyText="No goals logged yet."
        />
      )}
      {applicable.includes('clean_sheet') && (
        <Leaderboard
          title="Clean Sheets"
          Icon={ShieldCheck}
          rows={(stats.clean_sheets || []).slice(0, 3).map((r) => ({ ...r, _key: r.team_id }))}
          columns={cleanSheetColumns()}
          emptyText="No clean sheets recorded yet."
        />
      )}

      <span style={{ display: 'none' }}>{width}x{height}</span>
    </div>
  );
}

// ─── SQUAD layout ───────────────────────────────────────────────────
// Owns its own header (huge team name + "Squad" subtitle + divider) — the
// root canvas skips its standard Header for type='squad'. Aesthetic is the
// Liverpool lineup graphic: bold uppercase names on the gradient, no cards.
function SquadLayout({ team, players, captains, width, height }) {
  const roster = players || [];
  const generalCaptainId = (captains || [])
    .find((c) => c.tournament_id === null || c.tournament_id === undefined)?.player_id;
  const accent = team?.primary_color || COLORS.accentBright;

  // 9:16 (1080×1920) is the design baseline; scale proportionally by height
  // for other aspect ratios so the type still feels punchy on a square crop.
  const r = Math.max(0.7, height / 1920);

  const useTwoCols = roster.length > 14;
  const columns = useTwoCols
    ? [roster.slice(0, Math.ceil(roster.length / 2)), roster.slice(Math.ceil(roster.length / 2))]
    : [roster];
  const longestCol = Math.max(...columns.map((c) => c.length), 1);

  // Extra shrink only kicks in when a column would otherwise overflow the
  // body area — keeps small squads at the full hero-sized text.
  const baseNameSize = 38 * r;
  const baseLineHeight = 1.6;
  const headerBlockH = 96 * r + 48 * r + 24 + 24 + 12; // title + squad + spacing + divider
  const bodyH = height - 40 /* top pad */ - headerBlockH - 96 /* footer space */;
  const desiredRowH = baseNameSize * baseLineHeight;
  const fit = Math.min(1, bodyH / (desiredRowH * longestCol));
  const nameSize = Math.max(18, Math.round(baseNameSize * fit));
  const titleSize = Math.round(96 * r);
  const subtitleSize = Math.round(48 * r);
  const badgeFont = Math.max(11, Math.round(14 * r));
  const starSize = Math.max(20, Math.round(nameSize * 0.85));

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      padding: '40px 40px 80px 40px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header — explicit, NOT the shared Header component */}
      <div style={{ paddingLeft: 40, paddingRight: 40 }}>
        <div style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: titleSize,
          color: COLORS.onDark,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          textShadow: '0 4px 24px rgba(0,30,48,0.35)',
        }}>
          {team?.name || 'Team'}
        </div>
        <div style={{
          marginTop: 8,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: subtitleSize,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          Squad
        </div>
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          width: '100%',
          margin: '24px 0',
        }} />
      </div>

      {/* Body — player names list */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: useTwoCols ? '1fr 1fr' : '1fr',
        gap: useTwoCols ? 32 : 0,
      }}>
        {roster.length === 0 ? (
          <div style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 22,
            textAlign: 'center',
            paddingLeft: 40,
            paddingTop: 40,
          }}>
            No players on the roster yet.
          </div>
        ) : (
          columns.map((col, ci) => (
            <div key={ci} style={{
              display: 'flex',
              flexDirection: 'column',
              paddingLeft: 40,
            }}>
              {col.map((p) => {
                const isCaptain = p.id === generalCaptainId;
                const isGK = p.position === 'Goalkeeper';
                return (
                  <div key={p.id} style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: nameSize,
                    fontWeight: 700,
                    color: COLORS.onDark,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: baseLineHeight,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}>
                      {p.name}
                    </span>
                    {isGK && (
                      <span style={{
                        flexShrink: 0,
                        padding: '2px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.5)',
                        background: 'transparent',
                        color: COLORS.onDark,
                        fontFamily: FONT_LABEL,
                        fontSize: badgeFont,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                      }}>
                        GK
                      </span>
                    )}
                    {isCaptain && (
                      <span style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: starSize * 1.35,
                        height: starSize * 1.35,
                        borderRadius: 999,
                        background: `linear-gradient(135deg, ${accent} 0%, ${team?.secondary_color || accent} 100%)`,
                        color: '#ffffff',
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 900,
                        fontSize: starSize * 0.78,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        boxShadow: `0 0 0 2px rgba(255,255,255,0.85),
                                    0 0 18px ${accent}88,
                                    0 2px 8px rgba(0,0,0,0.35)`,
                        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                        transform: 'translateY(-1px)',
                      }}>
                        C
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <span style={{ display: 'none' }}>{width}x{height}</span>
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────
const ExportCanvas = forwardRef(function ExportCanvas(
  { type, tournament, matches, standings, stats, rounds, aspectRatio,
    team, players, captains, groupName },
  ref,
) {
  const { w, h } = getDims(aspectRatio);
  const isSquad = type === 'squad';
  const isFootball = tournament?.sport_type === 'football';
  const headerSubtitle = type === 'group_standings' && groupName
    ? `Group ${groupName}`
    : null;

  return (
    <div
      ref={ref}
      style={{
        width: w,
        height: h,
        background: COLORS.bgGradient,
        backgroundColor: COLORS.bgSolid,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT_LABEL,
        color: COLORS.onDark,
        boxSizing: 'border-box',
      }}
    >
      {/* Soft decorative blur (matches hero on TournamentDetail) */}
      <div style={{
        position: 'absolute',
        right: -120,
        bottom: -120,
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.10)',
        filter: 'blur(50px)',
      }} />
      <div style={{
        position: 'absolute',
        left: -160,
        top: -160,
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'rgba(0,189,254,0.16)',
        filter: 'blur(60px)',
      }} />

      {/* Football tournaments get a subtle pitch backdrop layered over the
          gradient. objectFit:cover handles 9:16 / 3:4 / 1:1 crops without
          stretching the image. */}
      {isFootball && (
        <img
          src="/export-assets/background/football-background.jpeg"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center bottom',
            opacity: 0.18,
            pointerEvents: 'none',
          }}
          alt=""
        />
      )}

      {/* Header — SquadLayout draws its own, so skip the shared Header for it */}
      {!isSquad && (
        <div style={{
          position: 'absolute',
          top: 150,
          left: 40,
          right: 40,
        }}>
          <Header tournament={tournament} subtitle={headerSubtitle} />
        </div>
      )}

      {/* Body */}
      {type === 'bracket' && (
        <BracketLayout
          tournament={tournament}
          matches={matches}
          rounds={rounds}
          width={w}
          height={h}
        />
      )}
      {type === 'results' && (
        <ResultsLayout matches={matches} width={w} height={h} />
      )}
      {type === 'standings' && (
        <StandingsLayout standings={standings} width={w} height={h} />
      )}
      {type === 'group_standings' && (
        <StandingsLayout standings={standings} width={w} height={h} advanceAccent />
      )}
      {type === 'stats_overview' && (
        <StatsOverviewLayout stats={stats} width={w} height={h} />
      )}
      {(type === 'top_scorers' || type === 'clean_sheets' || type === 'most_wins') && (
        <SingleLeaderboardLayout stats={stats} kind={type} width={w} height={h} />
      )}
      {type === 'squad' && (
        <SquadLayout team={team} players={players} captains={captains} width={w} height={h} />
      )}

      <Footer />
    </div>
  );
});

export default ExportCanvas;
