import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/public/comprovante")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null);
        const id = String(form?.get("pedido_id") ?? "");
        const file = form?.get("arquivo");
        if (!z.string().uuid().safeParse(id).success || !(file instanceof File))
          return json({ error: "Envie o comprovante" }, 400);
        const ext = TIPOS[file.type];
        if (!ext) return json({ error: "Envie uma imagem ou PDF" }, 400);
        if (file.size > 10 * 1024 * 1024) return json({ error: "Arquivo maior que 10MB" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: p } = await supabaseAdmin.from("pedidos").select("id").eq("id", id).single();
        if (!p) return json({ error: "Pedido não encontrado" }, 404);

        const path = `${id}/${Date.now()}.${ext}`;
        const { error } = await supabaseAdmin.storage
          .from("comprovantes")
          .upload(path, await file.arrayBuffer(), { contentType: file.type });
        if (error) {
          console.error("upload comprovante", error);
          return json({ error: "Falha ao enviar. Tente novamente." }, 500);
        }
        await supabaseAdmin
          .from("pedidos")
          .update({ comprovante_path: path, comprovante_enviado_em: new Date().toISOString() })
          .eq("id", id);
        return json({ ok: true });
      },
    },
  },
});
