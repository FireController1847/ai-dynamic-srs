import { parseWorkspace, validateWorkspace } from "./workspace-validation.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DECOMPRESSED_SIZE = 20 * 1024 * 1024;
const GZIP_MAGIC = [0x1f, 0x8b];

function safeFileName(value) {
  const baseName = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return baseName || "untitled-dynamic-srs";
}

export async function readWorkspaceFile(file) {
  if (!file) {
    throw new Error("No workspace file was selected.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("The workspace file exceeds the 10 MB compressed-file limit.");
  }

  return parseWorkspace(await workspaceText(file));
}

export async function downloadWorkspace(workspace) {
  const validated = validateWorkspace(workspace);
  const serialized = JSON.stringify(validated);
  const source = new Blob([serialized], { type: "application/json" });

  if (source.size > MAX_DECOMPRESSED_SIZE) {
    throw new Error("The workspace JSON exceeds the 20 MB uncompressed limit.");
  }

  if (typeof CompressionStream !== "function") {
    throw new Error("This browser does not support gzip workspace downloads.");
  }

  const compressed = source.stream().pipeThrough(new CompressionStream("gzip"));
  const compressedBytes = await readStreamWithLimit(compressed, MAX_FILE_SIZE, "Compressed workspace");
  const blob = new Blob([compressedBytes], { type: "application/gzip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${safeFileName(validated.document.title)}.dsrs`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isGzip(header) {
  return header.length >= 2
    && header[0] === GZIP_MAGIC[0]
    && header[1] === GZIP_MAGIC[1];
}

async function readStreamWithLimit(stream, limit, label) {
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
      total += chunk.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error(`${label} exceeds the ${Math.round(limit / 1024 / 1024)} MB limit.`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

async function workspaceText(file) {
  const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (!isGzip(header)) {
    return file.text();
  }

  if (typeof DecompressionStream !== "function") {
    throw new Error("This browser cannot import gzip-compressed workspaces.");
  }

  try {
    const decompressed = file.stream().pipeThrough(new DecompressionStream("gzip"));
    const bytes = await readStreamWithLimit(decompressed, MAX_DECOMPRESSED_SIZE, "Decompressed workspace");
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    if (error.message?.includes("limit") || error.message?.includes("browser")) {
      throw error;
    }
    throw new Error("The compressed workspace is not a valid gzip-encoded UTF-8 JSON file.");
  }
}
