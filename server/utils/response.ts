export const success = (data: unknown, meta?: Record<string, unknown>) => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
});

export const failure = (code: string, message: string) => ({
  success: false,
  error: { code, message }
});
