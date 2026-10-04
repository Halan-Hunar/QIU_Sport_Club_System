import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, BookOpen, Clock3, Eye, Monitor, RefreshCw, Smartphone, Tablet, Trophy, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import './analytics.css';

const number = (n = 0) => new Intl.NumberFormat().format(n);
const duration = (n = 0) => `${Math.floor(n / 60)}m ${Math.round(n % 60)}s`;
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const colors = ['#0867d2', '#4f52ba', '#15847a', '#b56a20', '#62758f', '#a54574'];
const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const shift = (date, days) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
const preset = (days) => ({ from: shift(today(), 1 - days), to: today() });
function Change({ value = 0, previous = 0 }) {
  if (!previous) return <span className="analytics-change neutral">{value ? 'No previous baseline' : 'No change'}</span>;
  const delta = (value - previous) / previous * 100;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`analytics-change ${delta >= 0 ? 'up' : 'down'}`}><Icon size={15} />{Math.abs(delta).toFixed(1)}% <span>vs previous period</span></span>;
}
function Panel({ title, note, children, className = '', icon: Icon }) {
  return <section className={`analytics-panel ${className}`}><header className="analytics-panel-heading"><div><h2>{Icon && <Icon size={19} aria-hidden />}{title}</h2>{note && <p>{note}</p>}</div></header>{children}</section>;
}
function Ranking({ rows = [], total, matches = false }) {
  if (!rows.length) return <p className="analytics-empty-small">No recorded views in this period.</p>;
  const max = Math.max(...rows.map((r) => Number(r.views)), 1);
  return <ol className="analytics-ranking">{rows.map((row, index) => <li key={row.path}>
    <span className="analytics-rank">{index + 1}</span><div className="analytics-rank-content">
      <div><Link to={matches ? `/tournaments/${row.match_tournament_id}?match=${row.resource_id}` : row.path}>{row.title}</Link><strong>{number(row.views)}</strong></div>
      <div className="analytics-track"><span style={{ width: `${row.views / max * 100}%` }} /></div>
      {total > 0 && <small>{(row.views / total * 100).toFixed(1)}% of page views</small>}
    </div></li>)}</ol>;
}
function TrafficChart({ daily, previous }) {
  const [group, setGroup] = useState('day');
  const [metric, setMetric] = useState('views');
  const [selected, setSelected] = useState(null);
  const rows = useMemo(() => {
    const buckets = new Map();
    daily.forEach((row) => {
      const date = new Date(`${row.date}T12:00:00Z`);
      const key = group === 'month' ? row.date.slice(0, 7) : group === 'week' ? shift(row.date, -((date.getUTCDay() + 6) % 7)) : row.date;
      const current = buckets.get(key) || { date: key, views: 0, visits: 0 };
      current.views += Number(row.views); current.visits += Number(row.visits); buckets.set(key, current);
    });
    return [...buckets.values()];
  }, [daily, group]);
  const max = Math.max(...rows.map((r) => r[metric]), 1);
  const points = rows.map((r, i) => [52 + i * (824 / Math.max(1, rows.length - 1)), 202 - r[metric] / max * 164]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const focus = rows[Math.min(selected ?? rows.length - 1, rows.length - 1)];
  return <Panel title="The club's audience, over time" note="Each point has an exact count. Today is still in progress." icon={Activity} className="analytics-traffic">
    <div className="analytics-chart-tools"><div className="analytics-segment" aria-label="Traffic metric">{['views', 'visits'].map((m) => <button key={m} aria-pressed={metric === m} onClick={() => setMetric(m)}>{m === 'views' ? 'Page views' : 'Visits'}</button>)}</div>
      <div className="analytics-segment" aria-label="Chart interval">{['day','week','month'].map((g) => <button key={g} aria-pressed={group === g} onClick={() => { setGroup(g); setSelected(null); }}>{g}</button>)}</div></div>
    <div className="analytics-chart-readout" aria-live="polite"><span>{focus?.date}</span><strong>{number(focus?.[metric])}</strong><span>{metric === 'views' ? 'page views' : group === 'day' ? 'visits' : 'daily visits summed'}</span></div>
    <svg className="analytics-line-chart" viewBox="0 0 920 240" role="img" aria-label={`${metric} by ${group}; exact values in the table below`}>
      <defs><linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#159cff" stopOpacity=".28" /><stop offset="100%" stopColor="#159cff" stopOpacity=".02" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1="52" x2="884" y1={202-fraction*164} y2={202-fraction*164} stroke="#dce6f2" strokeDasharray="4 5" /><text x="42" y={207-fraction*164} textAnchor="end">{number(Math.round(max*fraction))}</text></g>)}
      {!!points.length && <><path d={`${line} L${points.at(-1)[0]},202 L52,202 Z`} fill="url(#traffic-fill)" /><path d={line} fill="none" stroke="#0867d2" strokeWidth="3" strokeLinejoin="round" />{points.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={selected === i ? 6 : 4} fill="#0867d2" stroke="white" strokeWidth="2" onMouseEnter={() => setSelected(i)}><title>{rows[i].date}: {number(rows[i][metric])} {metric}</title></circle>)}</>}
      <text x="52" y="230">{rows[0]?.date}</text><text x="884" y="230" textAnchor="end">{rows.at(-1)?.date}</text>
    </svg>
    <input className="analytics-chart-slider" aria-label="Inspect chart point" type="range" min="0" max={Math.max(0, rows.length-1)} value={Math.min(selected ?? rows.length-1, rows.length-1)} onChange={(e) => setSelected(Number(e.target.value))} />
    <div className="analytics-chart-footer"><span>Previous period: <strong>{number(previous[metric])}</strong> {metric}</span><span>Asia/Baghdad · UTC+3</span></div>
    <details className="analytics-details"><summary>View chart data</summary><div className="analytics-table-wrap"><table><thead><tr><th>Period starting</th><th>Page views</th><th>{group === 'day' ? 'Visits' : 'Daily visits summed'}</th></tr></thead><tbody>{rows.map((r) => <tr key={r.date}><td>{r.date}</td><td>{number(r.views)}</td><td>{number(r.visits)}</td></tr>)}</tbody></table></div></details>
  </Panel>;
}
function Devices({ rows }) {
  const total = rows.reduce((sum, r) => sum + Number(r.views), 0);
  let offset = 0;
  const icons = { Desktop: Monitor, Mobile: Smartphone, Tablet };
  return <Panel title="How people browse" note="Device share of recorded page views" icon={Monitor}>
    <div className="analytics-device-layout"><div className="analytics-donut"><svg viewBox="0 0 140 140" role="img" aria-label="Device distribution"><circle cx="70" cy="70" r="54" fill="none" stroke="#e4efff" strokeWidth="18" />{rows.map((r, i) => {
      const percent = total ? r.views / total * 100 : 0; const start = offset; offset += percent;
      return <circle key={r.label} cx="70" cy="70" r="54" pathLength="100" fill="none" stroke={colors[i]} strokeWidth="18" strokeDasharray={`${percent} ${100-percent}`} strokeDashoffset={-start} transform="rotate(-90 70 70)"><title>{r.label}: {percent.toFixed(1)}%</title></circle>;
    })}</svg><div><strong>{total ? `${Math.round(rows[0].views / total * 100)}%` : '—'}</strong><span>{rows[0]?.label || 'No data'}</span></div></div>
    <ul className="analytics-legend">{rows.map((r, i) => { const Icon = icons[r.label] || Monitor; return <li key={r.label}><i style={{ background: colors[i] }} /><Icon size={17} /><span>{r.label}<small>{number(r.views)} views</small></span><strong>{(r.views / total * 100).toFixed(1)}%</strong></li>; })}</ul></div>
  </Panel>;
}
function Heatmap({ rows }) {
  const max = Math.max(...rows.map((r) => Number(r.views)), 1);
  const peak = [...rows].sort((a,b) => b.views-a.views)[0];
  const [focused, setFocused] = useState(null);
  return <Panel title="When the crowd arrives" note={peak ? `Busiest: ${dayNames[peak.day-1]}, ${String(peak.hour).padStart(2,'0')}:00–${String(peak.hour).padStart(2,'0')}:59 · Baghdad time` : 'Visiting patterns by day and hour · Baghdad time'} icon={Clock3} className="analytics-heat-panel">
    <div className="analytics-heat-scroll"><div className="analytics-heatmap"><span />{Array.from({ length: 24 }, (_, hour) => <small key={hour}>{hour % 3 === 0 ? String(hour).padStart(2,'0') : ''}</small>)}
      {dayNames.map((day, index) => <div className="analytics-heat-row" key={day}><span>{day}</span>{Array.from({ length: 24 }, (_, hour) => { const views = Number(rows.find((r) => r.day === index+1 && r.hour === hour)?.views || 0); const label = `${day} ${String(hour).padStart(2,'0')}:00: ${number(views)} views`; return <button key={hour} aria-label={label} title={label} onFocus={() => setFocused(label)} onMouseEnter={() => setFocused(label)} style={{ background: views ? `rgba(8,103,210,${.2+.8*views/max})` : '#edf3fa' }} />; })}</div>)}
    </div></div><div className="analytics-heat-footer"><span aria-live="polite">{focused || 'Hover or focus a cell for its count.'}</span><span>Less <i /> More</span></div>
  </Panel>;
}

export default function Analytics() {
  const [range, setRange] = useState(() => preset(30));
  const [draft, setDraft] = useState(range);
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    apiFetch(`/api/analytics/report?${new URLSearchParams(range)}`, { signal: controller.signal }).then(async (res) => {
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Could not load analytics.');
      if (!controller.signal.aborted) setData(result);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, attempt]);
  const current = data?.current || {}, previous = data?.previous || {};
  const cards = [
    ['Visitor visits', 'visits', Users, 'A visit ends after 30 minutes of inactivity.'],
    ['Page views', 'views', Eye, 'Includes repeat views; excludes match opens.'],
    ['Article views', 'article_views', BookOpen, 'Published club stories read by visitors.'],
    ['Match opens', 'match_opens', Trophy, 'Interest in individual match details.'],
  ];
  return <div className="analytics-page">
    <header className="analytics-header"><div><Link className="analytics-back" to="/admin">Admin panel</Link><h1>Club audience</h1><p>See what brings people to QIU Sports Club — and what keeps them reading.</p></div><button className="sc-btn-secondary" onClick={() => setAttempt((n) => n+1)} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button></header>
    <div className="analytics-filters"><div className="analytics-segment" aria-label="Date presets">{[7,30,90].map((days) => <button key={days} aria-pressed={range.from === preset(days).from && range.to === today()} onClick={() => { const value = preset(days); setRange(value); setDraft(value); }}>Last {days} days</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); setRange({ ...draft }); }}><label>From<input type="date" min={shift(today(),-89)} max={draft.to} required value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label><label>To<input type="date" min={draft.from} max={today()} required value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label><button className="sc-btn-secondary" type="submit">Apply</button></form></div>
    {loading ? <div role="status" className="analytics-loading"><BarChart3 size={40} /><h2>Loading the audience report…</h2><p>Gathering traffic, stories, and match interest.</p></div>
      : error ? <div className="analytics-message" role="alert"><h2>Report unavailable</h2><p>{error}</p><button className="sc-btn-primary" onClick={() => setAttempt((n) => n+1)}>Try again</button></div>
      : data && <>
        <div className="analytics-context"><span><i />Recorded visitor activity</span><span>{range.from} — {range.to} · Updated {new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        {!current.views && <div className="analytics-message"><h2>Your audience story starts here</h2><p>No views were recorded in this period. Counts begin after setup and only include visitors who allow analytics. Admin browsing is excluded.</p></div>}
        <div className="analytics-kpis">{cards.map(([label,key,Icon,note]) => <section className="analytics-kpi" key={key}><div><span>{label}</span><Icon size={20} /></div><strong>{number(current[key])}</strong><Change value={current[key]} previous={previous[key]} /><p>{note}</p></section>)}</div>
        <TrafficChart daily={data.daily} previous={previous} />
        <div className="analytics-grid"><Panel title="Where visits come from" note="Source retained for the visit; bars count page views" icon={BarChart3}><div className="analytics-sources">{data.sources.length ? data.sources.map((r,i) => <div key={r.label}><div><span><i style={{ background: colors[i] }} />{r.label}</span><strong>{number(r.views)} <small>{(r.views / current.views * 100).toFixed(1)}%</small></strong></div><div className="analytics-track"><span style={{ width: `${r.views / current.views * 100}%`, background: colors[i] }} /></div></div>) : <p className="analytics-empty-small">No source data yet.</p>}</div><p className="analytics-footnote">Apps and browsers can hide referrals. These appear as Direct / unknown.</p></Panel><Devices rows={data.devices} /></div>
        <Panel title="Stories that hold attention" note="Top 20 articles by views in the selected period" icon={BookOpen}>
          <div className="analytics-reading"><div><span>Average active reading</span><strong>{duration(current.reading_seconds)}</strong><Change value={current.reading_seconds} previous={previous.reading_seconds} /></div><div><span>Average scroll depth</span><strong>{current.scroll_depth || 0}%</strong></div><div><span>Reached 90% of the article</span><strong>{current.completion_rate || 0}%</strong></div></div>
          <div className="analytics-table-wrap"><table><thead><tr><th>Article</th><th>Views</th><th>Active reading</th><th>Scroll depth</th><th>Reached 90%</th></tr></thead><tbody>{data.articles.map((r) => <tr key={r.path}><td><Link to={r.path}>{r.title}</Link></td><td><strong>{number(r.views)}</strong></td><td>{duration(r.reading_seconds)}</td><td><span className="analytics-inline-meter"><i style={{ width: `${r.scroll_depth}%` }} /></span>{r.scroll_depth}%</td><td>{r.completion_rate}%</td></tr>)}</tbody></table>{!data.articles.length && <p className="analytics-empty-small">No article reads recorded yet.</p>}</div><p className="analytics-footnote">Active time pauses in hidden, unfocused, or idle tabs and is capped at 30 minutes per view. Scroll depth is an estimate, not proof of reading.</p>
        </Panel>
        <div className="analytics-grid"><Panel title="Most popular pages" note="Top 10 pages across the club" icon={Eye}><Ranking rows={data.pages} total={current.views} /></Panel><Panel title="Tournament interest" note="Tournament pages and their statistics combined" icon={Trophy}><Ranking rows={data.tournaments} /></Panel></div>
        <div className="analytics-grid analytics-final-grid"><Heatmap rows={data.heatmap} /><Panel title="Matches in the spotlight" note="Top 10 matches by detail opens" icon={Trophy}><Ranking rows={data.matches} matches /></Panel></div>
        <details className="analytics-method"><summary>How to read this report</summary><p>Visits are browser-tab sessions, not unique people. Daily visit totals can count a session on both sides of midnight. Reopening a page counts another view; heartbeat updates do not. Match opens are separate from page views. Only visitors who opt in are measured; browser privacy signals and known bots are excluded. Automated or fabricated events can still affect these estimates.</p><p>Comparisons use the immediately preceding period with the same number of calendar days. Today is incomplete. A zero baseline has no percentage change. Retained history starts {data.first_recorded_at ? new Date(data.first_recorded_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Baghdad' }) : 'when the first visit is recorded'}; earlier periods may have incomplete coverage. Raw analytics are retained for up to 180 days, with daily cleanup while the backend is running.</p></details>
      </>}
  </div>;
}
