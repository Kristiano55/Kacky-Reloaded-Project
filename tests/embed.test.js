import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embed } from '../js/embed.js';

const src = (u) => embed(u, 'site.example')?.src;

test('YouTube links (watch, short link, shorts, start time)', () => {
  assert.equal(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90');
  assert.equal(src('https://youtu.be/abc123XYZ_-?t=42'), 'https://www.youtube-nocookie.com/embed/abc123XYZ_-?start=42');
  assert.equal(src('https://youtu.be/k-Zc9GsZCH4?si=Zt5wOoUvnadX5DCt'), 'https://www.youtube-nocookie.com/embed/k-Zc9GsZCH4');
  assert.equal(src('https://youtube.com/shorts/Zx9'), 'https://www.youtube-nocookie.com/embed/Zx9');
});

test('Twitch VODs and clips carry the parent domain', () => {
  assert.equal(src('https://www.twitch.tv/videos/123456?t=1h2m3s'), 'https://player.twitch.tv/?video=123456&parent=site.example&autoplay=false&time=1h2m3s');
  assert.equal(src('https://clips.twitch.tv/FunnyClipSlug'), 'https://clips.twitch.tv/embed?clip=FunnyClipSlug&parent=site.example&autoplay=false');
  assert.equal(src('https://www.twitch.tv/someone/clip/SlugABC'), 'https://clips.twitch.tv/embed?clip=SlugABC&parent=site.example&autoplay=false');
});

test('Medal, Streamable and direct files', () => {
  assert.equal(src('https://medal.tv/games/trackmania/clips/nYgfixotyRIkB_91V?invite=cr-x'), 'https://medal.tv/games/trackmania/clip/nYgfixotyRIkB_91V?autoplay=0&muted=0&loop=0');
  assert.equal(src('https://streamable.com/mc2bkb'), 'https://streamable.com/e/mc2bkb');
  assert.deepEqual(embed('https://cdn.example.com/run.mp4'), { kind: 'video', src: 'https://cdn.example.com/run.mp4' });
});

test('anything else, or anything unsafe, is not embedded', () => {
  assert.equal(embed('https://example.com/page'), null);
  assert.equal(embed('not a url'), null);
  assert.equal(embed('javascript:alert(1)'), null);
  assert.equal(embed('https://youtube.com/watch?v=a"b'), null);
});
