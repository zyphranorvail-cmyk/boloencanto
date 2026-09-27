create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  produto text not null,
  valor_cents integer not null,
  cpf text not null,
  entrega text,
  detalhes jsonb,
  utm jsonb,
  bravopay_id text,
  status text not null default 'PENDING',
  pix_copia_cola text,
  comprovante_path text,
  comprovante_enviado_em timestamptz
);
grant all on public.pedidos to service_role;
alter table public.pedidos enable row level security;