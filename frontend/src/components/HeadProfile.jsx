import { ordinal } from '../lib/ordinal';
import ArticleBody from './ArticleBody';

export function HeadAvatar({ profile }) {
  const words = profile.title.trim().split(/\s+/);
  const initials = [words[0]?.[0], words.length > 1 ? words.at(-1)[0] : ''].join('').toUpperCase();
  return <div className="head-avatar" style={{ borderColor: profile.accent_color, backgroundColor: `${profile.accent_color}18` }}>
    {profile.cover_url ? <img src={profile.cover_url} alt={profile.title} className="w-full h-full object-cover" /> : <span aria-hidden="true">{initials}</span>}
  </div>;
}

export function HeadStatus({ profile }) {
  return <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-ink-variant">
    <span>{profile.is_founder ? 'Founder of Club' : profile.is_current ? 'Current Head of Club' : 'Former Head of Club'}</span>
    {profile.head_number != null && <span>{ordinal(profile.head_number)} Head of Sport Club</span>}
  </p>;
}

export default function HeadProfile({ profile }) {
  return <article style={{ '--head-accent': profile.accent_color }} className="head-profile">
    <header className="max-w-3xl mx-auto py-8 sm:py-12">
      <div className="flex flex-wrap items-center gap-6">
        <HeadAvatar profile={profile} />
        <div><HeadStatus profile={profile} />
          <h1 className="text-3xl sm:text-5xl mt-2 break-words">{profile.title}</h1>
          <p className="mt-3 text-lg text-ink-variant">{profile.major}</p>
        </div>
      </div>
    </header>
    <ArticleBody body={profile.body} media={profile.media} />
  </article>;
}
