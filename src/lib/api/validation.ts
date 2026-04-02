import { z, ZodError, type ZodType } from "zod";

export async function parseJsonBody<TSchema extends ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const payload = await request.json();
  return schema.parse(payload);
}

export function parseSearchParams<TSchema extends ZodType>(
  request: Request | string,
  schema: TSchema,
): z.infer<TSchema> {
  const url = new URL(typeof request === "string" ? request : request.url);
  const payload = new Map<string, string | string[]>();

  url.searchParams.forEach((_, key) => {
    const values = url.searchParams.getAll(key);
    payload.set(key, values.length <= 1 ? (values[0] ?? "") : values);
  });

  return schema.parse(Object.fromEntries(payload));
}

export async function parseRouteParams<TSchema extends ZodType>(
  params: Promise<unknown> | unknown,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  return schema.parse(await params);
}

export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

export function getZodErrorMessage(error: ZodError, fallback: string) {
  const issue = error.issues[0];
  if (!issue) {
    return fallback;
  }

  const path = issue.path.length > 0 ? issue.path.join(".") : "body";
  return `${path}: ${issue.message}`;
}
