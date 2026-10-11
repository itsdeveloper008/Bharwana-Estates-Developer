import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractYouTubeId, getEmbedUrl, getThumbnailUrl, getWatchUrl } from "./youtube.ts";

const ID = "dQw4w9WgXcQ";

describe("extractYouTubeId", () => {
  it("accepts bare 11-char IDs", () => {
    assert.equal(extractYouTubeId(ID), ID);
    assert.equal(extractYouTubeId(`  ${ID}  `), ID);
  });

  it("accepts watch URLs with extra params", () => {
    assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=30s&list=PLxx`), ID);
    assert.equal(extractYouTubeId(`youtube.com/watch?v=${ID}`), ID);
    assert.equal(extractYouTubeId(`https://m.youtube.com/watch?v=${ID}`), ID);
    assert.equal(extractYouTubeId(`https://music.youtube.com/watch?v=${ID}`), ID);
  });

  it("accepts short, embed, shorts, and live URLs", () => {
    assert.equal(extractYouTubeId(`https://youtu.be/${ID}`), ID);
    assert.equal(extractYouTubeId(`youtu.be/${ID}?t=12`), ID);
    assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${ID}`), ID);
    assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${ID}`), ID);
    assert.equal(extractYouTubeId(`https://www.youtube.com/live/${ID}`), ID);
    assert.equal(extractYouTubeId(`https://www.youtube-nocookie.com/embed/${ID}`), ID);
  });

  it("rejects bad inputs", () => {
    assert.equal(extractYouTubeId(""), null);
    assert.equal(extractYouTubeId("   "), null);
    assert.equal(extractYouTubeId("dQw4w9WgXc"), null); // 10 chars
    assert.equal(extractYouTubeId("https://example.com/watch?v=" + ID), null);
    assert.equal(extractYouTubeId("javascript:alert(1)"), null);
    assert.equal(extractYouTubeId("https://vimeo.com/123456"), null);
    assert.equal(extractYouTubeId("not a url"), null);
  });
});

describe("url helpers", () => {
  it("builds thumbnail, watch, and embed URLs", () => {
    assert.equal(getThumbnailUrl(ID), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    assert.equal(getWatchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
    assert.equal(
      getEmbedUrl(ID),
      `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
    );
  });
});
