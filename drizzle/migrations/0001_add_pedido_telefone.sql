ALTER TABLE public.pedidos ADD COLUMN telefone text;
UPDATE public.pedidos SET telefone = detalhes #>> '{cliente,telefone}' WHERE detalhes #>> '{cliente,telefone}' ~ '^\d{10,11}$';