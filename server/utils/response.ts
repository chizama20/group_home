export const success = (data: unknown) => ({
  success: true,
  data
});

export const failure = (code: string, message: string) => ({
  success: false,
  error: { code, message }
});
