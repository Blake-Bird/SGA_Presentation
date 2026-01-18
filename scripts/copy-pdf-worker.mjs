import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const src = path.join(projectRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dstDir = path.join(projectRoot, "public");
const dst = path.join(dstDir, "pdf.worker.min.mjs");

try {
  if (!fs.existsSync(src)) {
    console.error("pdfjs worker not found at:", src);
    process.exit(0);
  }
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(src, dst);
  console.log("Copied pdfjs worker ->", dst);
} catch (e) {
  console.error("Failed copying pdfjs worker:", e);
  process.exit(0);
}
