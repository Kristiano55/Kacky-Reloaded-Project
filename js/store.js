// Shared app state for the browser. Views read from here; main.js fills it on load.

export const TMTAS = 'https://tmtas.exchange';
export const ED_COL = ['', 'var(--ed1)', 'var(--ed2)', 'var(--ed3)', 'var(--ed4)', 'var(--ed5)', 'var(--ed6)', 'var(--ed7)'];
export const edColor = (e) => ED_COL[e] || 'var(--acc)';

/** What the visitor is looking at; mirrored in the URL (?ed=&view=&f=&sort=&q=). */
export const state = { ed: 0, q: '', filter: 'all', sort: 'id', view: 'maps' };

/** Loaded data. `maps` comes from model.buildMaps(). */
export const store = { maps: [], videos: [], dates: {}, updated: null };

export const $ = (s) => document.querySelector(s);
export const mapById = (id) => store.maps.find((m) => m.id === id);
export const SITE = location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
export const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
