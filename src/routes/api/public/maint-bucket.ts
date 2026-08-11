import { createFileRoute } from "@tanstack/react-router";

/** Temporary maintenance endpoint: applies storage bucket limits. Deleted after use. */
export const Route = createFileRoute("/api/public/maint-bucket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-maint") !== "vibrand-maint-2026") {
          return new Response("no", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const artwork = await supabaseAdmin.storage.updateBucket("quote-artwork", {
          public: false,
          fileSizeLimit: 20 * 1024 * 1024,
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/postscript",
            "application/illustrator",
            "image/svg+xml",
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
          ],
        });
        return Response.json({ artwork });
      },
    },
  },
});
