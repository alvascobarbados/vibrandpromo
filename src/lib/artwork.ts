/** Shared artwork limits — imported by both client and server. */
export const ARTWORK_MAX_BYTES = 20 * 1024 * 1024;
export const ARTWORK_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
  "ai",
  "eps",
  "svg",
  "zip",
] as const;

export function isAllowedArtwork(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return (ARTWORK_EXTENSIONS as readonly string[]).includes(extension);
}

export function safeArtworkName(filename: string) {
  return filename.replace(/[^\w.-]+/g, "_").slice(-120);
}
