// Preloaded with `node --import` in script tests: answers fetch() from files instead of the network.
// MOCK_FETCH='{"gid=0":"/path/maps.csv","gid=20":"/path/comp.csv"}'  (first key found in the URL wins)
import { readFileSync } from 'node:fs';
const routes = JSON.parse(process.env.MOCK_FETCH || '{}');
globalThis.fetch = async (url) => {
  const key = Object.keys(routes).find((k) => String(url).includes(k));
  if (!key) return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) };
  const body = readFileSync(routes[key], 'utf8');
  return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
};
