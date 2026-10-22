import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticServer, generatePosterPdf } from "./scripts/generate-poster-pdf.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const PDF_NAME = "legal-studies-command-terms-poster.pdf";
const PDF_PATH = path.join(ROOT, "assets", PDF_NAME);
const SOURCE_FILES = ["poster.html", "css/styles.css"];

let inFlight = null;

function isPdfStale() {
  if (!fs.existsSync(PDF_PATH)) return true;
  const pdfTime = fs.statSync(PDF_PATH).mtimeMs;
  return SOURCE_FILES.some((relative) => {
    const file = path.join(ROOT, relative);
    return fs.existsSync(file) && fs.statSync(file).mtimeMs > pdfTime;
  });
}

async function getPosterPdf(origin) {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    if (!isPdfStale()) return fs.readFileSync(PDF_PATH);
    await generatePosterPdf({ origin, outPath: PDF_PATH });
    return fs.readFileSync(PDF_PATH);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

const hosted = await createStaticServer(PORT);
const server = hosted.server;
const origin = hosted.origin;
const listeners = server.listeners("request");
server.removeAllListeners("request");
server.on("request", async (req, res) => {
  const url = new URL(req.url || "/", origin);
  if (url.pathname === "/api/poster.pdf") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    try {
      const pdf = await getPosterPdf(origin);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${PDF_NAME}"`,
        "Content-Length": pdf.length,
        "Cache-Control": "no-store",
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(pdf);
    } catch (error) {
      console.error("Poster PDF generation failed:", error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Poster PDF could not be generated.");
    }
    return;
  }
  listeners[0](req, res);
});

console.log(`Legal Studies Hub: ${origin}`);
console.log(`Poster PDF endpoint: ${origin}/api/poster.pdf`);
