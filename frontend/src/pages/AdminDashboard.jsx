import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Activity, Users, Shield, CircleDot, Square, ArrowLeftRight,
  ChevronRight,
} from 'lucide-react';
import { useStatsStore } from '../store/statsStore';

const eventIconMap = {
  goal:         { Icon: CircleDot,      className: 'text-primary' },
  own_goal:     { Icon: CircleDot,      className: 'text-danger' },
  yellow_card:  { Icon: Square,         className: 'fill-yellow-400 text-yellow-500' },
  red_card:     { Icon: Square,         className: 'fill-danger text-danger' },
  substitution: { Icon: ArrowLeftRight, className: 'text-tertiary' },
};

const eventVerb = {
  goal:         'scored for',
  own_goal:     'scored an own goal for',
  yellow_card:  'received a yellow card for',
  red_card:     'received a red card for',
  substitution: 'was substituted for',
};

function KpiTile({ label, value, Icon, tone = 'text-primary', loading }) {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
      <div className={`w-10 h-10 rounded-full bg-surface-low flex items-center justify-center
                       ${tone} mb-3`}>
        <Icon size={20} strokeWidth={2} aria-hidden />
      </div>
      <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-16 bg-surface-low rounded animate-pulse mt-1" />
      ) : (
        <p className="font-display text-display-lg text-ink leading-none mt-1 tabular-nums">
          {value ?? 0}
        </p>
      )}
    </div>
  );
}

function ActivityRow({ entry }) {
  const meta = eventIconMap[entry.event_type] ?? {
    Icon: CircleDot,
    className: 'text-ink-variant',
  };
  const Icon = meta.Icon;
  const verb = eventVerb[entry.event_type] ?? 'logged an event for';
  const minute = entry.minute != null ? `${entry.minute}'` : '—';

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-sm hover:bg-surface-low
                    transition-colors">
      <div className={`w-8 h-8 rounded-full bg-surface-low flex items-center justify-center
                       flex-shrink-0 ${meta.className}`}>
        <Icon size={16} strokeWidth={2.25} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">
          <span className="font-semibold">{entry.player_name ?? 'Unknown'}</span>{' '}
          <span className="text-ink-variant">{verb}</span>{' '}
          <span className="font-semibold">{entry.team_name ?? 'Unknown'}</span>
          {entry.match_round && (
            <>
              <span className="text-ink-variant"> in </span>
              <span className="font-medium">{entry.match_round}</span>
            </>
          )}
        </p>
        {entry.tournament_name && (
          <p className="text-xs text-ink-variant truncate">
            {entry.tournament_name}
          </p>
        )}
      </div>
      <span className="font-display text-sm text-ink-variant tabular-nums flex-shrink-0">
        {minute}
      </span>
    </div>
  );
}

function QuickLink({ to, label, Icon, tone }) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-md border border-outline-variant/30 shadow-card
                 hover:shadow-card-hover transition-all p-5 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-full bg-surface-low flex items-center justify-center
                       ${tone}`}>
        <Icon size={22} strokeWidth={2} aria-hidden />
      </div>
      <div className="flex-1">
        <p className="font-display text-headline-md text-ink group-hover:text-primary
                       transition-colors">
          {label}
        </p>
      </div>
      <ChevronRight size={18} strokeWidth={2.25}
                    className="text-ink-variant group-hover:text-primary
                               group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default function AdminDashboard() {
  const { totals, recentActivity, loading, error, fetchStats } = useStatsStore();

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
          Admin Dashboard
        </h1>
        <p className="text-ink-variant mt-2 max-w-xl">
          Operational snapshot — live matches, recent activity, and quick access to the
          management surfaces you need most.
        </p>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <KpiTile
          label="Active Tournaments"
          value={totals?.active_tournaments}
          Icon={Trophy}
          tone="text-primary"
          loading={loading && !totals}
        />
        <KpiTile
          label="Live Matches"
          value={totals?.live_matches}
          Icon={Activity}
          tone="text-danger"
          loading={loading && !totals}
        />
        <KpiTile
          label="Total Teams"
          value={totals?.teams}
          Icon={Shield}
          tone="text-secondary"
          loading={loading && !totals}
        />
        <KpiTile
          label="Total Players"
          value={totals?.players}
          Icon={Users}
          tone="text-tertiary"
          loading={loading && !totals}
        />
      </div>

      {/* Two-column: activity + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-white rounded-md border border-outline-variant/30
                            shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <h2 className="font-display text-headline-md text-ink">Recent Activity</h2>
          </div>
          {loading && recentActivity.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-surface-low rounded-sm animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="bg-surface-low rounded-sm py-12 text-center">
              <p className="text-ink-variant text-sm">
                No events logged yet — admin actions will appear here.
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto pr-1 space-y-0.5 -mx-1">
              {recentActivity.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-headline-md text-ink mb-3">Quick Links</h2>
          <div className="space-y-3">
            <QuickLink to="/teams"       label="Teams"       Icon={Shield}  tone="text-primary" />
            <QuickLink to="/tournaments" label="Tournaments" Icon={Trophy}  tone="text-secondary" />
            <QuickLink to="/players"     label="Players"     Icon={Users}   tone="text-tertiary" />
            <QuickLink to="/stats"       label="Statistics"  Icon={Activity} tone="text-primary" />
          </div>
        </section>
      </div>
    </motion.div>
  );
}
