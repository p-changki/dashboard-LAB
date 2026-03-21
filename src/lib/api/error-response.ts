export function jsonError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function isJsonParseError(error: unknown) {
  return error instanceof SyntaxError;
}
