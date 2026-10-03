import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 4173;

const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
});

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function fileForRequest(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  const requestedPath = resolve(projectRoot, `.${pathname}`);
  const rootPrefix = projectRoot.endsWith(sep) ? projectRoot : `${projectRoot}${sep}`;

  return requestedPath.startsWith(rootPrefix) ? requestedPath : null;
}

const server = createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(302, { Location: "/src/html/index.html" });
    response.end();
    return;
  }

  let filePath;
  try {
    filePath = fileForRequest(request.url);
  } catch {
    sendText(response, 400, "Invalid request path.");
    return;
  }

  if (!filePath) {
    sendText(response, 403, "Access denied.");
    return;
  }

  try {
    if (!statSync(filePath).isFile()) {
      sendText(response, 404, "Not found.");
      return;
    }
  } catch {
    sendText(response, 404, "Not found.");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath)
    .on("error", () => {
      if (!response.headersSent) {
        sendText(response, 500, "Could not read the requested file.");
      } else {
        response.destroy();
      }
    })
    .pipe(response);
});

server.listen(port, host, () => {
  console.log(`Dynamic SRS is available at http://${host}:${port}`);
});
