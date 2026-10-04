import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';

async function browserHarness() {
  let clock=0;
  const store=() => { const values=new Map(); return { getItem:(key)=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:(key)=>values.delete(key) }; };
  const localStorage=store(), sessionStorage=store(), calls=[], intervals=new Map(), timeouts=new Map();
  const window=new EventTarget(), document=new EventTarget();
  document.visibilityState='visible'; document.hasFocus=()=>true; document.referrer='https://instagram.com/'; document.querySelector=()=>({ getBoundingClientRect:()=>({ top:0,height:1000 }) });
  window.innerHeight=800;
  const context={ localStorage,sessionStorage,window,document,navigator:{ userAgent:'Mobile',maxTouchPoints:1 },location:{ origin:'https://club.test' },crypto:{ randomUUID },URL,Event,
    Date:class extends Date { static now(){return clock;} },performance:{ now:()=>clock },
    fetch:(url,init)=>{ calls.push({ url,...init,body:JSON.parse(init.body) }); return Promise.resolve({ ok:true }); },
    setInterval:(fn)=>{const key=randomUUID();intervals.set(key,fn);return key;},clearInterval:(key)=>intervals.delete(key),
    setTimeout:(fn)=>{const key=randomUUID();timeouts.set(key,fn);return key;},clearTimeout:(key)=>timeouts.delete(key),
  };
  const code=(await readFile(new URL('../../frontend/src/lib/analytics.js',import.meta.url),'utf8')).replaceAll('export ','').replaceAll('import.meta.env.VITE_API_URL',"'https://api.test'");
  vm.runInNewContext(code,context);
  return { ...context,calls,advance(ms){clock+=ms;},first(){ for(const fn of timeouts.values())fn();timeouts.clear(); },pulse(){ for(const fn of intervals.values())fn(); } };
}
test('tracking requires fresh opt-in and stops after withdrawal, with no credentials or private metadata', async () => {
  const b=await browserHarness();
  b.localStorage.setItem('consent','accepted'); b.startView('/'); b.first(); assert.equal(b.calls.length,0);
  b.setAnalyticsConsent('granted'); const stop=b.startView('/events/20000000-0000-4000-8000-000000000002',true);
  b.advance(300); b.first(); assert.equal(b.calls.length,1); assert.equal(b.calls[0].credentials,'omit');
  b.advance(15000); b.pulse(); assert.equal(b.calls[1].body.event_id,b.calls[0].body.event_id); assert.equal(b.calls[1].body.active_seconds,15); assert.equal(b.calls[1].body.scroll_depth,80);
  assert.deepEqual(Object.keys(b.calls[1].body).sort(),['active_seconds','device','event_id','path','scroll_depth','session_id','source']);
  b.setAnalyticsConsent('denied'); b.pulse(); stop(); assert.equal(b.calls.length,2); assert.equal(b.sessionStorage.getItem('qiu-visit'),null);
});
test('admins, privacy signals and immediately disposed React effects send no view', async () => {
  const b=await browserHarness(); b.setAnalyticsConsent('granted');
  const dispose=b.startView('/'); dispose(); b.first(); assert.equal(b.calls.length,0);
  b.localStorage.setItem('token','admin-token'); b.startView('/'); b.first(); assert.equal(b.calls.length,0);
  b.localStorage.removeItem('token'); b.navigator.doNotTrack='1'; b.startView('/'); b.first(); assert.equal(b.calls.length,0);
});
test('reading time excludes idle and hidden tabs; page changes reuse a visit and inactivity renews it', async () => {
  const b=await browserHarness(); b.setAnalyticsConsent('granted');
  const stop=b.startView('/'); b.advance(300); b.first(); const session=b.calls[0].body.session_id;
  b.document.visibilityState='hidden'; b.advance(15000); b.pulse(); assert.equal(b.calls.at(-1).body.active_seconds,0);
  b.document.visibilityState='visible'; b.advance(61000); b.pulse(); assert.equal(b.calls.at(-1).body.active_seconds,0); stop();
  const stop2=b.startView('/events'); b.advance(300); b.first(); assert.equal(b.calls.at(-1).body.session_id,session); stop2();
  b.advance(31*60000); const stop3=b.startView('/'); b.advance(300); b.first(); assert.notEqual(b.calls.at(-1).body.session_id,session); stop3();
});
