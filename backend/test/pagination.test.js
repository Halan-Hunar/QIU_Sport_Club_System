import test from 'node:test';
import assert from 'node:assert/strict';
import { readAllRows } from '../src/utils/readAllRows.js';

test('sport statistics read all pages instead of stopping at the API row cap', async () => {
  const records = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const ranges = [];
  const query = { order(key) { assert.equal(key,'id'); }, async range(from,to) { ranges.push([from,to]); return { data:records.slice(from,to+1),error:null }; } };
  assert.equal((await readAllRows(query)).data.length,1201);
  assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
});
test('aggregate reads fail on partial data errors and explicit row budgets', async () => {
  await assert.rejects(readAllRows({ order(){},async range(){return { error:new Error('offline') };} }),/offline/);
  await assert.rejects(readAllRows({ order(){},async range(){return { data:[{},{}] };} },{ pageSize:2,maxRows:2 }),/exceeds/);
});
