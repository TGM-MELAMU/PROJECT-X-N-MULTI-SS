/* Automated accessibility check (axe-core, WCAG 2.1 A/AA) of the public pages and the forms.
 * Needs a running server. Works without a database when the server was started with USE_MOCK_DATA=true.
 * Usage: BASE=http://localhost:3000 npm run a11y            (add PAGES=/,/shop to choose pages)
 * Exits with code 1 when any violation is found. Automated tools catch about a third of accessibility
 * problems, so this complements (does not replace) a keyboard and screen-reader pass. */
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");
const axeSource = require("node:fs").readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = process.env.BASE || "http://localhost:3000";
const PAGES = (process.env.PAGES || "/,/shop,/categories,/login,/register,/forgot-password,/about,/contact,/delivery,/returns,/terms,/privacy").split(",");
const EXTRA = process.env.PRODUCT_PATH; // e.g. /product/some-slug

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ baseURL: BASE, bypassCSP: true });
  let bad = 0;
  for (const path of EXTRA ? [...PAGES, EXTRA] : PAGES) {
    for (const size of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await ctx.newPage();
      await page.setViewportSize(size);
      await page.goto(path, { waitUntil: "networkidle" });
      await page.evaluate(axeSource);
      const res = await page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
      const label = `${path} @${size.width}`;
      if (res.violations.length === 0) console.log(`ok   ${label}`);
      for (const v of res.violations) {
        bad++;
        console.log(`FAIL ${label}  [${v.impact}] ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`       ${n.target.join(" ")}  ${(n.failureSummary || "").split("\n")[1] || ""}`);
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(bad ? `\n${bad} violation(s)` : "\nNo violations found by axe.");
  process.exit(bad ? 1 : 0);
})();
