// Videos view: every clip from the tracker sheet, filtered by edition.
import { $, store, state, edColor, mapById } from '../store.js';
import { videoCard } from '../html.js';

export function renderVideos() {
  const list = store.videos.filter((v) => !state.ed || mapById(v.map)?.ed === state.ed);
  $('#videosView').innerHTML = list.length
    ? `<div class="scope" style="--c:${edColor(state.ed)}">${state.ed ? 'KR' + state.ed + ' videos' : 'Videos'} · ${list.length}</div><div class="vgrid">${list.map(videoCard).join('')}</div>`
    : `<div class="panel"><h3>Videos</h3><p class="muted">No videos ${state.ed ? 'for KR' + state.ed + ' ' : ''}yet. Add a YouTube, Twitch, Medal, Streamable or .mp4 link in the tracker sheet's <b>Video link</b> column and it shows up here.</p></div>`;
}
