import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BASE = "https://bravopay.club/api/v1";
const PRECOS: Record<string, number> = {
  "Combo Festa 2KG": 17990,
  "Combo Festa 4KG": 29990,
  "Combo Festa 6KG": 41990,
  "Bolo 1KG": 8990,
  "Bolo 2KG": 12990,
  "Bolo 3KG": 16990,
  "Bolo 4KG": 20990,
};
const BUMP_CENTS = 3996;
const BUMP_IDS = ["brigadeiros", "beijinhos", "ninho-nutella", "churros"] as const;

const Body = z.object({
  produto: z.string().min(1).max(200),
  valor_cents: z.number().int().min(500).max(1_000_000),
  cpf: z.string().regex(/^\d{11}$/),
  entrega: z.string().max(200).optional(),
  detalhes: z.record(z.string(), z.unknown()).optional(),
  utm: z.record(z.string(), z.string().max(300)).optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/public/pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Dados inválidos" }, 400);
        const d = parsed.data;
        if (PRECOS[d.produto] !== d.valor_cents)
          return json({ error: "Produto ou valor inválido. Volte ao cardápio e tente novamente." }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: pedido, error } = await supabaseAdmin
          .from("pedidos")
          .insert({
            produto: d.produto,
            valor_cents: d.valor_cents,
            cpf: d.cpf,
            entrega: d.entrega ?? null,
            detalhes: (d.detalhes ?? null) as never,
            utm: (d.utm ?? null) as never,
          })
          .select("id")
          .single();
        if (error || !pedido) {
          console.error("insert pedido", error);
          return json({ error: "Não foi possível registrar o pedido" }, 500);
        }

        const res = await fetch(`${BASE}/transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["BRAVOPAY_API_KEY"]}`,
            "Content-Type": "application/json",
            "Idempotency-Key": pedido.id,
          },
          body: JSON.stringify({
            amount_cents: d.valor_cents,
            method: "pix",
            customer: { cpf: d.cpf },
            description: d.produto.slice(0, 300),
            external_reference: pedido.id,
            utm: d.utm,
            expires_in: 3600,
          }),
        });
        const tx = (await res.json().catch(() => null)) as {
          id?: string;
          status?: string;
          pix?: { copy_paste?: string; qr_code?: string; expires_at?: string };
        } | null;
        if (!res.ok || !tx?.pix?.copy_paste) {
          console.error("bravopay error", res.status, JSON.stringify(tx));
          return json({ error: "Não foi possível gerar o PIX. Tente novamente." }, 502);
        }

        await supabaseAdmin
          .from("pedidos")
          .update({ bravopay_id: tx.id ?? null, status: tx.status ?? "PENDING", pix_copia_cola: tx.pix.copy_paste })
          .eq("id", pedido.id);

        return json({
          pedido_id: pedido.id,
          copia_cola: tx.pix.copy_paste,
          qr_code: tx.pix.qr_code ?? null,
          expira_em: tx.pix.expires_at ?? null,
        });
      },

      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!z.string().uuid().safeParse(id).success) return json({ error: "id" }, 400);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: p } = await supabaseAdmin
          .from("pedidos")
          .select("bravopay_id,status")
          .eq("id", id)
          .single();
        if (!p?.bravopay_id) return json({ status: p?.status ?? "PENDING" });
        if (p.status === "PAID") return json({ status: "PAID" });
        const res = await fetch(`${BASE}/transactions/${encodeURIComponent(p.bravopay_id)}`, {
          headers: { Authorization: `Bearer ${process.env["BRAVOPAY_API_KEY"]}` },
        });
        const tx = (await res.json().catch(() => null)) as { status?: string } | null;
        const status = tx?.status ?? p.status;
        if (status !== p.status) await supabaseAdmin.from("pedidos").update({ status }).eq("id", id);
        return json({ status });
      },
    },
  },
});
