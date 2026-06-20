import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let app;

async function loadApp() {
  if (!app) {
    const module = await import(join(__dirname, "../../.output/server/index.mjs"));
    app = module.default;
  }
  return app;
}

export const handler = async (event, context) => {
  try {
    const serverApp = await loadApp();

    const url = new URL(
      event.rawPath + (event.rawQueryString ? `?${event.rawQueryString}` : ""),
      `https://${event.headers.host}`
    );

    const request = new Request(url, {
      method: event.requestContext.http.method,
      headers: new Headers(event.headers),
      body: event.body ? Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8") : null,
    });

    const response = await serverApp.fetch(request);
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers),
      body,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
