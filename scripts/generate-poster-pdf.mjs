import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_NAME = "legal-studies-command-terms-poster.pdf";
const OUTPUT_PATH = path.join(ROOT, "assets", OUTPUT_NAME);
const POSTER_WIDTH_PX = 980;
const PAGE_PAD_PX = 8;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function createStaticServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    let filePath = path.join(ROOT, decodeURIComponent(url.pathname));
    if (url.pathname === "/") filePath = path.join(ROOT, "index.html");
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function waitForPosterReady(page) {
  await page.waitForSelector("#command-poster");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForFunction(() => {
    const icons = [...document.querySelectorAll("#command-poster iconify-icon")];
    return icons.length > 0 && icons.every((icon) => icon.shadowRoot?.querySelector("svg"));
  }, { timeout: 15000 });
}

async function isolatePoster(page) {
  await page.evaluate(({ width }) => {
    const poster = document.querySelector("#command-poster");
    if (!poster) throw new Error("Poster container #command-poster was not found.");
    poster.style.transform = "none";
    document.documentElement.style.background = "#ffffff";
    document.body.replaceChildren(poster);
    document.body.className = "poster-pdf-export";
    document.body.style.cssText = "margin:0;padding:8px;background:#ffffff;";
    poster.style.margin = "0";
    poster.style.maxWidth = "none";
    poster.style.width = `${width}px`;
    poster.style.transform = "none";
    poster.style.cursor = "default";
    const levels = poster.querySelector(".poster-levels");
    if (levels) levels.style.gridTemplateColumns = "repeat(3, 1fr)";
  }, { width: POSTER_WIDTH_PX });
}

export async function generatePosterPdf({ origin, outPath = OUTPUT_PATH } = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--font-render-hinting=none"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1600 },
      deviceScaleFactor: 1,
    });
    await page.emulateMedia({ media: "screen" });
    await page.goto(`${origin}/poster.html`, { waitUntil: "networkidle", timeout: 30000 });
    await waitForPosterReady(page);
    await isolatePoster(page);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const size = await page.evaluate((pad) => {
      const poster = document.querySelector("#command-poster");
      const rect = poster.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width + pad * 2),
        height: Math.ceil(rect.height + pad * 2),
      };
    }, PAGE_PAD_PX);

    await page.setViewportSize({
      width: Math.max(size.width, 400),
      height: Math.max(size.height, 400),
    });

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: false,
      width: `${size.width}px`,
      height: `${size.height}px`,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      pageRanges: "1",
    });

    return {
      outPath,
      width: size.width,
      height: size.height,
    };
  } finally {
    await browser.close();
  }
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  const hosted = await createStaticServer();
  try {
    const result = await generatePosterPdf({ origin: hosted.origin, outPath: OUTPUT_PATH });
    console.log(`Wrote ${result.outPath} (${result.width}x${result.height}px)`);
  } finally {
    await hosted.close();
  }
}
