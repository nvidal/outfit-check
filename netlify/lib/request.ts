export const extractClientIp = (req: Request): string => {
  const primaryHeaders = [
    "x-nf-client-connection-ip",
    "x-real-ip",
    "true-client-ip",
    "x-client-ip"
  ];

  for (const header of primaryHeaders) {
    const value = req.headers.get(header);
    if (value) {
      return value.split(",")[0]?.trim() || value;
    }
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || forwarded;
  }

  return "unknown";
};
