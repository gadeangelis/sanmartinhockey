-- ==============================================================================
-- HOCKEY CLUB SAN MARTIN (A.C.S.M.)
-- Base de Datos PostgreSQL / Supabase para Gestión Financiera y Contable
-- SCRIPT DE CONEXIÓN PERSISTENTE Y HABILITACIÓN DE ACCESO REAL
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: PERFILES DE USUARIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'delegado' CHECK (role IN ('padre', 'delegado', 'tesorero', 'admin')),
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABLA: ENTRADAS DE JORNADA
CREATE TABLE IF NOT EXISTS public.entradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    rival TEXT NOT NULL,
    division TEXT NOT NULL DEFAULT 'SENIOR',
    torneo_tipo TEXT NOT NULL DEFAULT 'OFICIAL',
    es_playa BOOLEAN DEFAULT FALSE,
    talonario_tipo TEXT NOT NULL DEFAULT 'GENERAL',
    nro_inicial INTEGER NOT NULL DEFAULT 0,
    nro_final INTEGER NOT NULL DEFAULT 0,
    cantidad_vendida INTEGER NOT NULL DEFAULT 0,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    efectivo NUMERIC(12, 2) DEFAULT 0,
    transferencia NUMERIC(12, 2) DEFAULT 0,
    foto_url TEXT,
    created_by_id UUID,
    created_by_name TEXT NOT NULL DEFAULT 'Usuario',
    created_by_role TEXT NOT NULL DEFAULT 'delegado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA: CANTINA
CREATE TABLE IF NOT EXISTS public.cantina (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    rival TEXT NOT NULL,
    division TEXT NOT NULL DEFAULT 'SENIOR',
    total_ventas NUMERIC(12, 2) NOT NULL DEFAULT 0,
    efectivo NUMERIC(12, 2) DEFAULT 0,
    transferencia NUMERIC(12, 2) DEFAULT 0,
    notas TEXT,
    foto_url TEXT,
    created_by_id UUID,
    created_by_name TEXT NOT NULL DEFAULT 'Usuario',
    created_by_role TEXT NOT NULL DEFAULT 'delegado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA: SPONSORS (Patrocinios)
CREATE TABLE IF NOT EXISTS public.sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'Baranda Grande',
    monto NUMERIC(12, 2) NOT NULL DEFAULT 0,
    medio_pago TEXT NOT NULL DEFAULT 'Efectivo',
    vigencia TEXT,
    estado TEXT DEFAULT 'Activo',
    notas TEXT,
    created_by_id UUID,
    created_by_name TEXT NOT NULL DEFAULT 'Administrador',
    created_by_role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA: GASTOS (Generales del Club y Gastos del Partido)
CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha DATE NOT NULL,
    motivo_categoria TEXT NOT NULL,
    monto NUMERIC(12, 2) NOT NULL DEFAULT 0,
    medio_pago TEXT NOT NULL DEFAULT 'Efectivo',
    proveedor TEXT,
    foto_url TEXT,
    rival TEXT,
    division TEXT,
    created_by_id UUID,
    created_by_name TEXT NOT NULL DEFAULT 'Tesorero',
    created_by_role TEXT NOT NULL DEFAULT 'tesorero',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migraciones en caso de que las tablas ya existan:
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS rival TEXT;
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_motivo_categoria_check;
ALTER TABLE public.gastos DROP CONSTRAINT IF EXISTS gastos_medio_pago_check;
ALTER TABLE public.gastos ADD CONSTRAINT gastos_medio_pago_check 
    CHECK (medio_pago IN ('Efectivo', 'Efectivo de Caja', 'Efectivo de Sponsor', 'Transferencia'));

ALTER TABLE public.entradas ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.cantina ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.sponsors ALTER COLUMN created_by_id DROP NOT NULL;
ALTER TABLE public.gastos ALTER COLUMN created_by_id DROP NOT NULL;

-- 7. VISTA CONSOLIDADA: RENDICIÓN AL CLUB SAN MARTÍN
CREATE OR REPLACE VIEW public.vista_rendicion_club AS
SELECT 
    fecha,
    rival,
    division,
    SUM(transferencia_entradas) as transferencias_entradas,
    SUM(transferencia_cantina) as transferencias_cantina,
    SUM(transferencia_entradas + transferencia_cantina) as total_rendido_club
FROM (
    SELECT fecha, rival, division, transferencia as transferencia_entradas, 0 as transferencia_cantina
    FROM public.entradas
    UNION ALL
    SELECT fecha, rival, division, 0 as transferencia_entradas, transferencia as transferencia_cantina
    FROM public.cantina
) as consolidados
GROUP BY fecha, rival, division
ORDER BY fecha DESC;

-- 8. HABILITAR ACCESO REAL PERSISTENTE (DESACTIVAR RLS Y OTORGAR PRIVILEGIOS)
-- Esto permite que la aplicación web pueda ejecutar SELECT, INSERT, UPDATE y DELETE
-- directamente desde el cliente con la API anon key de Supabase sin bloqueos 42501.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cantina DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 9. CONFIGURACIÓN DEL STORAGE BUCKET PARA FOTOS Y COMPROBANTES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir lectura y subida pública de comprobantes
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;
