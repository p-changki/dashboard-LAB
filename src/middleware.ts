import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_LOCALHOST_PATHS = [
  "/api/system/",
  "/api/projects/env-map",
  "/api/meeting-hub/",
];

const PROTECTED_POST_PATHS = [
  "/api/file-manager/execute",
  "/api/file-manager/auto-organize",
  "/api/ai-skills/run",
  "/api/ai-skills/cancel",
  "/api/cs-helper/generate",
  "/api/cs-helper/regenerate",
  "/api/cs-helper/analyze",
  "/api/cs-helper/context/init",
  "/api/call-to-prd/upload",
  "/api/projects/clean-nm",
];

export function middleware(request: NextRequest) {
  if (!requiresOriginCheck(request.method, request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");

  // Origin 헤더 없으면 Referer로 보조 검증
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) {
      return NextResponse.json(
        { error: { code: "MISSING_ORIGIN", message: "Origin 또는 Referer 헤더가 필요합니다." } },
        { status: 403 },
      );
    }
    try {
      const refererUrl = new URL(referer);
      if (["127.0.0.1", "localhost"].includes(refererUrl.hostname)) {
        return NextResponse.next();
      }
    } catch { /* fall through to block */ }
    return NextResponse.json(
      { error: { code: "FORBIDDEN_ORIGIN", message: "localhost 요청만 허용됩니다." } },
      { status: 403 },
    );
  }

  try {
    const originUrl = new URL(origin);
    const isLocalhost = ["127.0.0.1", "localhost"].includes(originUrl.hostname);
    return isLocalhost
      ? NextResponse.next()
      : NextResponse.json(
          { error: { code: "FORBIDDEN_ORIGIN", message: "localhost 요청만 허용됩니다." } },
          { status: 403 },
        );
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_ORIGIN", message: "Origin 헤더 형식이 올바르지 않습니다." } },
      { status: 403 },
    );
  }
}

export const config = {
  matcher: "/api/:path*",
};

function requiresOriginCheck(method: string, pathname: string) {
  if (PROTECTED_LOCALHOST_PATHS.some((p) => pathname.startsWith(p))) {
    return true;
  }

  return method === "POST" && PROTECTED_POST_PATHS.some((p) => pathname.startsWith(p));
}
