import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { headsRequest } from '../lib/news';
import { useAuthStore } from '../store/authStore';
import HeadProfile, { HeadAvatar, HeadStatus } from '../components/HeadProfile';

export default function Heads({ manage = false }) {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('desc');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    const load = () => headsRequest(id ? `/${id}` : `${manage ? '/admin' : ''}?page=${page}&direction=${direction}&role=${role}`).then((result) => {
      if (active) { setData(result); setError(''); }
    }).catch((e) => { if (active) setError(e.message); });
    load();
    const timer = setInterval(load, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [id, manage, page, attempt, direction, role]);
  return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
      {id ? <Link className="text-primary underline" to="/club/heads">All club heads</Link> : <div><h1 className="text-headline-lg">Heads of the Club</h1><p className="text-ink-variant mt-2">The people who have led QIU Sports Club.</p></div>}
      {user?.role === 'admin' && <Link className="sc-btn-primary" to={manage ? '/admin/heads/new' : id ? `/admin/heads/${id}` : '/admin/heads'}>{manage ? 'Create profile' : id ? 'Edit profile' : 'Manage profiles'}</Link>}
      {manage && <Link className="text-primary underline" to="/club/heads">View public profiles</Link>}
    </header>
    {!id && <div className="flex flex-wrap gap-4 mb-6">
      <label className="flex items-center gap-3 text-sm">Sort by
        <select className="sc-input !w-auto" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(1); }}>
          <option value="desc">Latest to first head</option><option value="asc">First to latest head</option>
        </select>
      </label>
      <label className="flex items-center gap-3 text-sm">Show
        <select className="sc-input !w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="all">All heads</option><option value="current">Current head</option><option value="former">Former heads</option>
        </select>
      </label>
    </div>}
    {error ? <div role="alert"><p>{error}</p><button className="sc-btn-secondary mt-4" onClick={() => setAttempt((n) => n + 1)}>Try again</button></div> : !data ? <p role="status">Loading profiles…</p> : id ? <HeadProfile profile={data.article} /> : <>
      {!data.articles.length && <p className="sc-card p-8">{role !== 'all' ? 'No profiles match this filter. Choose All heads to see the full list.' : manage ? 'Create the first club head profile to get started.' : 'Club head profiles will appear here once published.'}</p>}
      <div className="grid sm:grid-cols-2 gap-6">{data.articles.map((profile) => <Link key={profile.id} to={manage ? `/admin/heads/${profile.id}` : `/club/heads/${profile.id}`} className="sc-card p-6 hover:shadow-md transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <div className="flex items-center gap-5"><HeadAvatar profile={profile} /><div className="min-w-0"><HeadStatus profile={profile} />{manage && <p className="text-xs text-ink-variant mt-1">{profile.status}</p>}<h2 className="text-headline-md mt-1 break-words">{profile.title}</h2><p className="text-sm text-ink-variant mt-2 break-words">{profile.major}</p></div></div>
        <p className="text-ink-variant text-sm mt-5 leading-relaxed line-clamp-3">{profile.excerpt}</p>
      </Link>)}</div>
      {data.total > 12 && <nav aria-label="Profile pages" className="flex items-center justify-center gap-4 mt-8"><button className="sc-btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="sc-btn-secondary" disabled={page * 12 >= data.total} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </>}
  </div>;
}
