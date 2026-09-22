import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { newsRequest, uploadNewsImage } from '../lib/news';
import NewsArticle from '../components/NewsArticle';
import EventBodyEditor from '../components/EventBodyEditor';
import { ORGANISERS, CO_ORGANISERS } from '../constants/organisers';

function emptyArticle() {
  const now = new Date();
  return { title: '', author: '', article_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    cover_path: null, cover_alt: '', body: '', status: 'draft', organiser: null, co_organiser: null };
}
function fields(article) {
  return Object.fromEntries(['title','author','article_date','cover_path','cover_alt','body','status','organiser','co_organiser'].map((key) => [key, article[key] ?? (['cover_path','organiser','co_organiser'].includes(key) ? null : '')]));
}

export default function NewsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyArticle);
  const [record, setRecord] = useState(null);
  const [saved, setSaved] = useState(() => JSON.stringify(emptyArticle()));
  const [media, setMedia] = useState({});
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const bodyRef = useRef(null);
  const imageRef = useRef(null);
  const dirty = JSON.stringify(form) !== saved;

  useEffect(() => {
    if (!id) return;
    let active = true; setLoading(true); setError('');
    newsRequest(`/admin/${id}`).then(({ article }) => {
      if (!active) return;
      setRecord(article); setForm(fields(article)); setSaved(JSON.stringify(fields(article))); setMedia(article.media);
    }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })); setMessage(''); }
  async function upload(file, cover) {
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const uploaded = await uploadNewsImage(file);
      setMedia((previous) => ({ ...previous, [uploaded.path]: uploaded.url }));
      if (cover) change('cover_path', uploaded.path);
      else {
        bodyRef.current?.insertPhoto(uploaded.path, imageDescription.trim());
        setImageDescription('');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function showPreview() {
    setBusy(true); setError('');
    try {
      const { article } = await newsRequest('/admin/preview', { method: 'POST', body: JSON.stringify({ ...form, title: form.title || 'Untitled article' }) });
      setMedia(article.media); setPreview(article); window.scrollTo(0, 0);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function save(status) {
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...form, status };
      const { article } = await newsRequest(record ? `/admin/${record.id}` : '/admin', {
        method: record ? 'PUT' : 'POST',
        body: JSON.stringify({ ...payload, ...(record ? { expected_updated_at: record.updated_at } : {}) }),
      });
      setRecord(article); setForm(fields(article)); setSaved(JSON.stringify(fields(article))); setMedia(article.media);
      setPreview(null); setMessage(status === 'published' ? 'Article published.' : 'Draft saved. Only admins can see it.');
      if (!id) navigate(`/admin/events/${article.id}`, { replace: true });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const leave = () => { if (!dirty || window.confirm('Leave without saving your changes?')) navigate('/admin/events'); };
  if (loading) return <p role="status" className="max-w-5xl mx-auto p-8">Loading editor…</p>;
  if (id && !record) return <div className="max-w-5xl mx-auto p-8"><p role="alert">{error || 'Article unavailable.'}</p><button className="sc-btn-secondary mt-4" onClick={leave}>Back to articles</button></div>;

  return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
    <button onClick={leave} className="text-primary underline underline-offset-4" disabled={busy}>Back to articles</button>
    <header className="flex flex-wrap justify-between items-start gap-4 mt-6 mb-6">
      <div><h1 className="text-headline-lg">{preview ? 'Article preview' : record ? 'Edit article' : 'Write an article'}</h1>
        <p className="text-ink-variant mt-2">{record?.status === 'published' ? 'Published' : 'Private draft'}{dirty ? ' · Unsaved changes' : ''}</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="sc-btn-secondary" disabled={busy} onClick={() => preview ? setPreview(null) : showPreview()}>{preview ? 'Back to editor' : 'Preview'}</button>
        {record?.status !== 'published' && <button className="sc-btn-secondary" disabled={busy} onClick={() => save('draft')}>Save draft</button>}
        <button className="sc-btn-primary" disabled={busy} onClick={() => save('published')}>{record?.status === 'published' ? 'Save changes' : 'Publish'}</button>
      </div>
    </header>
    {error && <p role="alert" className="bg-danger-container text-danger-on-container p-4 rounded mb-5">{error}</p>}
    <p role="status" className="text-primary mb-4">{busy ? 'Working…' : message}</p>
    {preview ? <NewsArticle article={preview} /> : <fieldset disabled={busy} className="space-y-6 min-w-0">
      <div className="sc-card p-5 sm:p-7 space-y-5">
        <label className="block"><span className="sc-label">Title</span><input className="sc-input" maxLength={180} value={form.title} onChange={(e) => change('title', e.target.value)} placeholder="Give your story a title" /></label>
        <label className="block"><span className="sc-label">Subtitle / article description (optional)</span><input className="sc-input" maxLength={240} value={form.cover_alt} onChange={(e) => change('cover_alt', e.target.value)} placeholder="A short introduction shown below the title" /></label>
        <div className="grid sm:grid-cols-2 gap-5">
          <label><span className="sc-label">Organiser / club head</span><select className="sc-input" value={form.organiser || ''} onChange={(e) => change('organiser', e.target.value || null)}>
            <option value="">Select the organiser</option>{ORGANISERS.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}
          </select></label>
          <label><span className="sc-label">Co-organiser (optional)</span><select className="sc-input" value={form.co_organiser || ''} onChange={(e) => change('co_organiser', e.target.value || null)}>
            <option value="">None</option>{CO_ORGANISERS.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}
          </select></label>
          <label><span className="sc-label">Author</span><input className="sc-input" maxLength={100} value={form.author} onChange={(e) => change('author', e.target.value)} /></label>
          <label><span className="sc-label">Article date</span><input type="date" className="sc-input" value={form.article_date} onChange={(e) => change('article_date', e.target.value)} /></label>
        </div>
      </div>
      <section className="sc-card p-5 sm:p-7 space-y-4" aria-labelledby="cover-label">
        <h2 id="cover-label" className="text-headline-md">Cover image</h2>
        <p className="text-sm text-ink-variant">Shown on the article card and at the top of the article. JPEG, PNG, or WebP, up to 6 MB.</p>
        {media[form.cover_path] && <img src={media[form.cover_path]} alt={form.cover_alt || 'Cover preview'} className="w-full max-h-64 object-cover rounded" />}
        <label className="block"><span className="sc-label">Upload cover</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { upload(e.target.files[0], true); e.target.value = ''; }} className="max-w-full" /></label>
      </section>
      <section className="sc-card p-5 sm:p-7 space-y-4" aria-labelledby="body-label">
        <h2 id="body-label" className="text-headline-md">Article body</h2>
        <p className="text-sm text-ink-variant">Highlight text and choose Bold or Italic. Place the cursor between paragraphs to insert a photo.</p>
        <EventBodyEditor ref={bodyRef} value={form.body} onChange={(value) => change('body', value)} media={media} disabled={busy} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[180px]"><span className="sc-label">Photo description (optional)</span><input className="sc-input" maxLength={240} value={imageDescription} onChange={(e) => setImageDescription(e.target.value)} placeholder="Describe the photo to insert" /></label>
          <button className="sc-btn-secondary" onClick={() => { bodyRef.current?.rememberPhotoPosition(); imageRef.current.click(); }}>Insert photo</button>
          <input ref={imageRef} type="file" aria-label="Body photo" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(e.target.files[0], false); e.target.value = ''; }} />
        </div>
      </section>
      {record?.status === 'published' && <div className="flex flex-wrap justify-between items-center gap-4 p-5 border border-outline-variant rounded-md">
        <p className="text-sm text-ink-variant">Unpublishing moves this article back to a private draft.</p>
        <button className="sc-btn-secondary" onClick={() => { if (window.confirm('Unpublish this article? It will no longer be listed for visitors.')) save('draft'); }}>Unpublish</button>
      </div>}
    </fieldset>}
  </div>;
}
