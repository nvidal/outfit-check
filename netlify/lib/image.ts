export const parseImagePayload = (input: string) => {
  const match = input.match(/^data:(image\/[a-zA-Z+\-.]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: "image/jpeg", base64: input };
};

export const getExtension = (mimeType: string) => {
  const parts = mimeType.split("/");
  if (parts.length === 2) {
    return parts[1].split("+")[0];
  }
  return "jpg";
};
