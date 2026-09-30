// Hockey Club San Martín (A.C.S.M.) - Estados iniciales limpios
// Todos los datos dependen exclusivamente de las consultas en vivo a Supabase.

export const INITIAL_PROFILES = [];
export const INITIAL_ENTRADAS = [];
export const INITIAL_CANTINA = [];
export const INITIAL_SPONSORS = [];
export const INITIAL_GASTOS = [];

export const DEFAULT_ADMIN_USER = {
  id: 'usr-admin-principal',
  email: 'admin@hockeysanmartin.com',
  full_name: 'Gustavo Administrador',
  role: 'admin',
  status: 'approved',
  created_at: new Date().toISOString()
};

export const DEMO_ROLES = [
  DEFAULT_ADMIN_USER,
  {
    id: 'usr-tesorero-principal',
    email: 'tesoreria@hockeysanmartin.com',
    full_name: 'Carlos Tesorero',
    role: 'tesorero',
    status: 'approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-delegado-principal',
    email: 'delegado@hockeysanmartin.com',
    full_name: 'Martín Delegado (Solo Lectura)',
    role: 'delegado',
    status: 'approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-padre-principal',
    email: 'padre@hockeysanmartin.com',
    full_name: 'Laura Fernández (Socio/Padre)',
    role: 'padre',
    status: 'approved',
    created_at: new Date().toISOString()
  }
];
