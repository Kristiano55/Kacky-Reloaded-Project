// Turns a video link into something the page can embed. Pure: pass the page's hostname for Twitch.
// Returns { kind: 'iframe' | 'video', src, thumb? } or null when the site isn't supported.

const seconds = (t) => (/^\d+$/.test(t) ? +t
  : (+(t.match(/(\d+)h/)?.[1] || 0)) * 3600 + (+(t.match(/(\d+)m/)?.[1] || 0)) * 60 + (+(t.match(/(\d+)s/)?.[1] || 0)));

export function embed(url, parent = 'localhost') {
  let u; try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.replace(/^www\.|^m\./, '');
  const t = u.searchParams.get('t') || u.searchParams.get('start');
  const start = t ? seconds(t) : 0;

  let yt = null;
  if (h === 'youtu.be') yt = u.pathname.slice(1);
  else if (h.endsWith('youtube.com')) yt = u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if (yt && /^[\w-]+$/.test(yt)) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}${start ? '?start=' + start : ''}`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };

  if (h === 'clips.twitch.tv') return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(u.pathname.slice(1))}&parent=${parent}&autoplay=false` };
  if (h === 'twitch.tv') {
    const clip = u.pathname.match(/\/clip\/([\w-]+)/)?.[1];
    if (clip) return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}&autoplay=false` };
    const vid = u.pathname.match(/\/videos\/(\d+)/)?.[1];
    if (vid) return { kind: 'iframe', src: `https://player.twitch.tv/?video=${vid}&parent=${parent}&autoplay=false${t ? '&time=' + encodeURIComponent(t) : ''}` };
  }
  if (h === 'medal.tv') {
    const id = u.pathname.match(/\/clips?\/([\w-]+)/)?.[1];
    const game = u.pathname.match(/\/games\/([\w-]+)/)?.[1] || 'trackmania';
    if (id) return { kind: 'iframe', src: `https://medal.tv/games/${game}/clip/${id}?autoplay=0&muted=0&loop=0` };
  }
  if (h === 'streamable.com') {
    const id = u.pathname.split('/').pop();
    if (/^\w+$/.test(id)) return { kind: 'iframe', src: `https://streamable.com/e/${id}` };
  }
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: 'video', src: url };
  return null;
}
