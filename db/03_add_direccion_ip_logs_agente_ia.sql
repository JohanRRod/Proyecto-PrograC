ALTER TABLE public.logs_agente_ia
ADD COLUMN IF NOT EXISTS direccion_ip VARCHAR(45);
