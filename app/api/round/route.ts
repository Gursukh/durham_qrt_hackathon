import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Target to proxy to. Can be overridden with PROXY_TARGET env var for flexibility.
const TARGET = process.env.PROXY_TARGET ?? "https://coreen-unseduced-thomasine.ngrok-free.dev/plan";

// Debug flag: set the environment variable DEBUG=true (or DEBUG=1) to return sample.json
const DEBUG = false

const SAMPLE_PATH = path.join(process.cwd(), "sample.json");

async function proxy(request: Request) {
  try {
    // If DEBUG is enabled at module-level, short-circuit and return sample.json
    if (DEBUG) {
      try {
        const contents = await readFile(SAMPLE_PATH, "utf8");
        try {
          const json = JSON.parse(contents);
          return NextResponse.json(json);
        } catch (err) {
          // If sample.json isn't valid JSON, return raw text with JSON content-type
          return new NextResponse(contents, { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
        }
      } catch (err) {
        // If reading sample.json fails, return an error explaining the problem
        return NextResponse.json({ error: `DEBUG enabled but failed to read sample.json: ${String(err)}` }, { status: 500 });
      }
    }
    // Build fetch init from incoming request
    const init: RequestInit = {
      method: request.method,
      headers: {},
      // body will be attached below for non-GET/HEAD
    } as RequestInit;

    // Copy headers
    request.headers.forEach((value, key) => {
      // Skip host header to avoid host mismatches
      if (key.toLowerCase() === "host") return;
      (init.headers as Record<string, string>)[key] = value;
    });

    // Forward body for non-GET/HEAD methods
    if (request.method !== "GET" && request.method !== "HEAD") {
      // Use arrayBuffer to support binary payloads as well as text/json
      const buf = await request.arrayBuffer();
      if (buf && buf.byteLength > 0) init.body = buf;
    }

    // Make request to target
    const res = await fetch(TARGET, init);

    // Copy response headers, but omit hop-by-hop and length/encoding headers
    // which can be inaccurate after body processing and can cause "Content-Length
    // header larger than body" errors in clients. Allow other safe headers
    // (content-type, content-disposition, etc.) to pass through.
    const HOP_BY_HOP = new Set([
      "content-length",
      "transfer-encoding",
      "connection",
      "keep-alive",
      "proxy-connection",
      "upgrade",
      "content-encoding",
    ]);

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      const key = k.toLowerCase();
      if (HOP_BY_HOP.has(key)) return; // skip unsafe headers
      responseHeaders[k] = v;
    });

    const contentType = res.headers.get("content-type") || "";

    // If JSON, parse and return via NextResponse.json to preserve JSON content-type
    if (contentType.includes("application/json")) {
      const json = await res.json();
      console.log(json)
      return NextResponse.json(json, { status: res.status, headers: responseHeaders });
    }

    // For other content-types return raw body
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, { status: res.status, headers: responseHeaders });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return proxy(request);
}

export async function GET(request: Request) {
  return proxy(request);
}

export async function PUT(request: Request) {
  return proxy(request);
}

export async function DELETE(request: Request) {
  return proxy(request);
}

export async function OPTIONS(request: Request) {
  return proxy(request);
}
