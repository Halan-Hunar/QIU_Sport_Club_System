import test from 'node:test';
import assert from 'node:assert/strict';
import { createDisplayLogin, normalizeLoginName } from '../src/utils/displayLogin.js';

function fixture({ role = 'admin', known = true, passwordValid = true } = {}) {
  let resolvedName, suppliedEmail, signedOut = false;
  const profile = { id: 'known-id', display_name: 'Halan Hunar', role };
  const db = {
    from: () => ({ select: () => ({ eq: (key, value) => {
      if (key === 'login_name') resolvedName = value;
      return { maybeSingle: async () => ({ data: known ? profile : null, error: null }) };
    } }) }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'private@example.test' } }, error: null }) } },
  };
  const createAuth = () => ({
    signInWithPassword: async ({ email }) => {
      suppliedEmail = email;
      return passwordValid ? { data: { user: { id: 'known-id', email }, session: { access_token: 'token', refresh_token: 'refresh' } }, error: null }
        : { data: null, error: new Error('Bad credentials') };
    },
    signOut: async () => { signedOut = true; },
  });
  const handler = createDisplayLogin({ db, createAuth, log: { error() {} } });
  return { async run(body) {
    let status = 200, payload;
    const res = { set() {}, status(value) { status = value; return res; }, json(value) { payload = value; return res; } };
    await handler({ body }, res);
    return { status, payload, resolvedName, suppliedEmail, signedOut };
  } };
}
test('display-name login resolves email privately and still requires a password', async () => {
  const result = await fixture().run({ display_name: ' HALAN   HUNAR ', password: 'test-password' });
  assert.equal(result.status, 200); assert.equal(result.resolvedName, 'halan hunar');
  assert.equal(result.suppliedEmail, 'private@example.test');
  assert.equal(result.payload.user.display_name, 'Halan Hunar');
  assert.equal(normalizeLoginName(' Dyako Abubakr '), 'dyako abubakr');
});
test('unknown names, wrong passwords and non-admin names give the same denial', async () => {
  for (const options of [{ known: false }, { passwordValid: false }, { role: 'user' }]) {
    const result = await fixture(options).run({ display_name: 'Halan Hunar', password: 'test-password' });
    assert.equal(result.status, 401);
    assert.deepEqual(result.payload, { error: 'Invalid sign-in details.' });
  }
});
test('email compatibility cannot bypass the club admin role', async () => {
  const result = await fixture({ role: 'user' }).run({ email: 'private@example.test', password: 'test-password' });
  assert.equal(result.status, 401); assert.equal(result.signedOut, true);
});
test('invalid input is rejected without querying authentication', async () => {
  for (const body of [{}, { display_name: 'Halan', password: '123' }, { display_name: 'Halan', email: 'x@example.test', password: 'test-password' }]) {
    const result = await fixture().run(body);
    assert.equal(result.status, 400); assert.equal(result.suppliedEmail, undefined);
  }
});
