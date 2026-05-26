import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

function StatPill({ label, value }) {
  return (
    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm
                    border border-white/20 rounded-full px-4 py-2">
      <span className="font-display text-stats text-white">{value}</span>
      <span className="font-label text-label-md uppercase tracking-wider text-white/80">
        {label}
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12">
      {/* Hero */}
      <motion.section
        {...fadeUp}
        className="relative overflow-hidden rounded-lg bg-hero-deep p-8 sm:p-12
                   shadow-card text-white"
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full
                        bg-primary-container/30 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="sc-chip bg-live/20 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-dot" />
            Live Now
          </span>
          <h1 className="font-display text-headline-lg sm:text-display-lg mt-4 leading-tight">
            Inter-Faculty Championship
          </h1>
          <p className="text-white/80 mt-3 max-w-2xl">
            Real-time scores, rosters, and standings for every competition —
            built for the players, coaches, and the crowd.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <StatPill label="Teams" value="24" />
            <StatPill label="Matches" value="64" />
            <StatPill label="Goals" value="248" />
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/teams" className="sc-btn-primary bg-primary-container text-primary-on-container hover:bg-white">
              View Teams
            </Link>
            <Link to="/tournaments" className="sc-btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">
              Tournaments
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Feature grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-primary-container/15 text-primary
                          flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-display text-headline-md text-ink">Team Rosters</h3>
          <p className="text-sm text-ink-variant mt-1">
            Browse every team, jersey numbers, positions, and captains across all disciplines.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-tertiary-container/40 text-tertiary
                          flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 21V10M12 21V4M18 21v-7" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-display text-headline-md text-ink">Live Standings</h3>
          <p className="text-sm text-ink-variant mt-1">
            Up-to-the-minute league tables, top scorers, and performance trends.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-secondary-container/30 text-secondary
                          flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 21h8M12 17v4M5 4h14v8a7 7 0 01-14 0V4z" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-display text-headline-md text-ink">Tournaments</h3>
          <p className="text-sm text-ink-variant mt-1">
            Brackets, fixtures and results for every inter-faculty championship.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
