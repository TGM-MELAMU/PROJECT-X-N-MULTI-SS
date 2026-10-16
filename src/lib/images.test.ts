import { test } from "node:test";
import assert from "node:assert/strict";
import { canOptimise, parseImageHosts } from "./images";

test("host list parsing", () => {
  assert.deepEqual(parseImageHosts(undefined), []);
  assert.deepEqual(parseImageHosts(""), []);
  assert.deepEqual(parseImageHosts(" CDN.multiss.co.za , **.cloudfront.net,, "), ["cdn.multiss.co.za", "**.cloudfront.net"]);
});

test("files in /public are optimised", () => {
  assert.equal(canOptimise("/pictures/hero-banner.jpg", []), true);
  assert.equal(canOptimise("//evil.example/x.jpg", []), false); // protocol-relative is another host
});

test("remote images are optimised only for listed hosts, only over https", () => {
  const hosts = ["cdn.multiss.co.za", "**.cloudfront.net"];
  assert.equal(canOptimise("https://cdn.multiss.co.za/a.jpg", hosts), true);
  assert.equal(canOptimise("https://d111.cloudfront.net/a.jpg", hosts), true);
  assert.equal(canOptimise("https://cloudfront.net/a.jpg", hosts), false); // ** needs a subdomain
  assert.equal(canOptimise("https://evilcloudfront.net/a.jpg", hosts), false);
  assert.equal(canOptimise("https://other.example/a.jpg", hosts), false);
  assert.equal(canOptimise("http://cdn.multiss.co.za/a.jpg", hosts), false);
  assert.equal(canOptimise("not a url", hosts), false);
});
