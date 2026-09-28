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

        const path = `${id}/${crypto.randomUUID()}.${ext}`;
        const bytes = await file.arrayBuffer();
        let uploadError: { message: string; status?: number | string } | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const { error } = await supabaseAdmin.storage
              .from("comprovantes")
              .upload(path, bytes, { contentType: file.type, upsert: true });
            uploadError = error;
          } catch (error) {
            uploadError = { message: error instanceof Error ? error.message : String(error) };
          }
          if (!uploadError) break;
          const status = Number(uploadError.status);
          if (status >= 400 && status < 500) break;
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
        if (uploadError) {
          console.error("upload comprovante", { message: uploadError.message, status: uploadError.status });
          return json({ error: "Falha ao enviar. Tente novamente." }, 500);
        }
        const { error: updateError } = await supabaseAdmin
          .from("pedidos")
          .update({ comprovante_path: path, comprovante_enviado_em: new Date().toISOString() })
          .eq("id", id);
        if (updateError) {
          console.error("registro comprovante", updateError);
          return json({ error: "Não foi possível registrar o comprovante. Tente novamente." }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
