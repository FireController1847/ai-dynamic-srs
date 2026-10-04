import { asDataModel } from "../schema/data-models.ts";
import { errorMessage } from "../formatting/errors.ts";
import type { DataModel, SchemaNode } from '../schema/schema-types.ts';
export const DIAGRAM_FILE_ACCEPT = ".drawio,.xml,.png,.jpg,.jpeg,image/png,image/jpeg,application/xml,text/xml";
export const MAX_DIAGRAM_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_DIAGRAM_COLLECTION_BYTES = 3 * 1024 * 1024;

const DRAWIO_EXTENSIONS = ["drawio", "xml"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

function extensionOf(filename = "") {
  const parts = String(filename).toLowerCase().split(".");
  return parts.length > 1 ? (parts.pop() || "") : "";
}

function titleFromFilename(filename = "") {
  return String(filename)
    .replace(/\.(drawio(?:\.xml)?|xml|png|jpe?g)$/i, "")
    .replaceAll(/[_-]+/g, " ")
    .trim();
}

function imageMediaType(extension: string) {
  return extension === "png" ? "image/png" : "image/jpeg";
}

export function validateDrawioXml(xml: string) {
  if (/<!doctype|<!entity/i.test(xml)) {
    throw new Error("DrawIO files containing document type or entity declarations are not supported.");
  }

  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  if (parsed.querySelector("parsererror")) {
    throw new Error("The DrawIO file is not valid XML.");
  }

  const rootName = parsed.documentElement?.localName || "";
  if (!["mxfile", "mxGraphModel"].includes(rootName)) {
    throw new Error("The XML file is not a DrawIO mxfile or mxGraphModel document.");
  }
}

async function validateImage(file: File, extension: string) {
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPng = signature.length >= 8
    && signature[0] === 0x89
    && signature[1] === 0x50
    && signature[2] === 0x4e
    && signature[3] === 0x47
    && signature[4] === 0x0d
    && signature[5] === 0x0a
    && signature[6] === 0x1a
    && signature[7] === 0x0a;
  const isJpeg = signature.length >= 3
    && signature[0] === 0xff
    && signature[1] === 0xd8
    && signature[2] === 0xff;

  if ((extension === "png" && !isPng) || (extension !== "png" && !isJpeg)) {
    throw new Error("The image contents do not match the selected PNG or JPEG file type.");
  }
}

function readAsDataUrl(file: File, mediaType: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const encoded = String(reader.result || "");
      const payload = encoded.includes(",") ? encoded.slice(encoded.indexOf(",") + 1) : "";
      resolve(`data:${mediaType};base64,${payload}`);
    });
    reader.addEventListener("error", () => reject(new Error(`Could not read ${file.name}.`)));
    reader.readAsDataURL(file);
  });
}

export function diagramCollectionSize(records: DataModel[] = [], excludedId: unknown = null) {
  return records.reduce((total, record) => (
    Number(record.id) === Number(excludedId) ? total : total + (Number(record.sizeBytes) || 0)
  ), 0);
}

export function assertDiagramCollectionLimit(files: DataModel[], replacing: DataModel | null, pending: DataModel[]): void {
  const bytes = [...files.filter(file => file !== replacing), ...pending]
    .reduce((total, file) => total + (Number(file.sizeBytes) || 0), 0);
  if (bytes > MAX_DIAGRAM_COLLECTION_BYTES) throw new Error('The shared diagram register has a 3 MB total file limit, including retired figures.');
}

export function diagramFileSummary(file: unknown) {
  return asDataModel(file).sourceFileName
    ? `${asDataModel(file).sourceFileName} (${asDataModel(file).artifactKind || "Diagram"}; ${Number(asDataModel(file).sizeBytes) || 0} bytes). File contents omitted.`
    : "No diagram file attached.";
}

export function diagramPayloadError(file: unknown) {
  const data = asDataModel(file);
  if (typeof data.content !== "string") return "No valid diagram file is attached.";
  if (data.artifactKind === "DrawIO source") {
    try { validateDrawioXml(data.content); return ""; }
    catch (error) { return errorMessage(error); }
  }
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/\s]+=*$/.test(data.content)
    ? "" : "The attached file is not a supported PNG or JPEG image.";
}

export async function readDiagramArtifact(file: File | undefined) {
  if (!file) {
    throw new Error("No diagram file was selected.");
  }

  if (file.size > MAX_DIAGRAM_FILE_BYTES) {
    throw new Error(`${file.name} exceeds the 2 MB per-file workspace limit.`);
  }

  const extension = extensionOf(file.name);
  const now = new Date().toISOString();

  if (DRAWIO_EXTENSIONS.includes(extension)) {
    const content = await file.text();
    validateDrawioXml(content);
    return {
      title: titleFromFilename(file.name),
      artifactKind: "DrawIO source",
      sourceFileName: file.name,
      mediaType: "application/vnd.jgraph.mxfile",
      sizeBytes: file.size,
      lastModified: file.lastModified || 0,
      uploadedAt: now,
      retired: false,
      retiredAt: "",
      content
    };
  }

  if (IMAGE_EXTENSIONS.includes(extension)) {
    await validateImage(file, extension);
    const mediaType = imageMediaType(extension);
    return {
      title: titleFromFilename(file.name),
      artifactKind: extension === "png" ? "PNG image" : "JPEG image",
      sourceFileName: file.name,
      mediaType,
      sizeBytes: file.size,
      lastModified: file.lastModified || 0,
      uploadedAt: now,
      retired: false,
      retiredAt: "",
      content: await readAsDataUrl(file, mediaType)
    };
  }

  throw new Error(`${file.name} is not a supported DrawIO, PNG, or JPEG diagram file.`);
}
