import { test } from 'node:test';
import assert from 'node:assert/strict';
import getRadarResponse from '../api/point/proxy.cjs';
import azureHandler from '../api/point/index.js';

const params = { lat: '52.15', lon: '5.3', radius: '150' };

test('proxies valid coordinates and returns the aircraft data', async () => {
  const data = { ac: [{ hex: 'abc123' }] };
  const result = await getRadarResponse(params, async (url, options) => {
    assert.equal(url, 'https://api.adsb.lol/v2/point/52.15/5.3/150');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => data };
  });
  assert.deepEqual(result, { status: 200, body: data });
});

test('rejects invalid coordinates and radii before contacting the provider', async () => {
  for (const invalid of [
    { ...params, lat: '91' }, { ...params, lon: '-181' },
    { ...params, radius: '0' }, { ...params, radius: '251' }, { ...params, lat: 'NaN' },
  ]) {
    const result = await getRadarResponse(invalid, () => assert.fail('Unexpected provider request'));
    assert.equal(result.status, 400);
  }
});

test('reports provider errors and network failures', async () => {
  assert.deepEqual(await getRadarResponse(params, async () => ({ ok: false, status: 429 })), {
    status: 429, body: { error: 'Aircraft data provider is unavailable.' },
  });
  const errors = [];
  const failure = new Error('offline');
  const result = await getRadarResponse(params, async () => { throw failure; }, { error: (...args) => errors.push(args) });
  assert.equal(result.status, 502);
  assert.equal(errors[0][1], failure);
});

test('Azure function exposes the same validation response', async () => {
  const context = { log: console };
  await azureHandler(context, { params: { ...params, radius: '251' } });
  assert.deepEqual(context.res, { status: 400, body: { error: 'Invalid radar coordinates or radius.' } });
});
