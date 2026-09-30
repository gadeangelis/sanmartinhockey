import { createClient } from '@supabase/supabase-js';
import { 
  DEFAULT_ADMIN_USER 
} from './mockData';

// Configuración de Supabase (desde Variables de Entorno .env o LocalStorage)
const getEnvOrLocal = (envVar, localKey) => {
  const envVal = envVar ? String(envVar).trim() : '';
  if (envVal && !envVal.includes('tu-proyecto')) return envVal;
  return localStorage.getItem(localKey)?.trim() || '';
};

export const getSupabaseCredentials = () => {
  const url = getEnvOrLocal(import.meta.env.VITE_SUPABASE_URL, 'hc_supabase_url');
  const key = getEnvOrLocal(import.meta.env.VITE_SUPABASE_ANON_KEY, 'hc_supabase_key');
  return { url, key };
};

export const isSupabaseConfigured = () => {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.includes('supabase.co'));
};

const creds = getSupabaseCredentials();
export let supabase = isSupabaseConfigured() 
  ? createClient(creds.url, creds.key)
  : null;

// Helpers para LocalStorage (Cache & Modo Desconectado)
export const getLocalData = (key, initial) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : initial;
  } catch (e) {
    return initial;
  }
};

export const setLocalData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando en local storage:', e);
  }
};

// Limpieza automática de datos mock antiguos para garantizar que los estados inicien limpios
const cleanLegacyMockData = () => {
  const isMockId = (id) => typeof id === 'string' && (
    id.startsWith('ent-') || 
    id.startsWith('cant-') || 
    id.startsWith('sp-') || 
    id.startsWith('gas-') || 
    id === 'usr-admin-1' || 
    id === 'usr-tesorero-1' || 
    id === 'usr-delegado-1' ||
    id === 'usr-padre-1'
  );
  ['hc_entradas', 'hc_cantina', 'hc_sponsors', 'hc_gastos'].forEach(key => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.some(item => isMockId(item?.id))) {
          const clean = parsed.filter(item => !isMockId(item?.id));
          localStorage.setItem(key, JSON.stringify(clean));
        }
      }
    } catch (e) {
      // Ignorar errores de parseo
    }
  });
};
cleanLegacyMockData();

// Sanitiza registros antes de enviarlos a PostgreSQL / Supabase
const sanitizeForPostgres = (record, user, defaultRole = 'delegado') => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // Garantizar UUID válido para Postgres
  const cleanId = (record.id && isUuid.test(record.id)) ? record.id : crypto.randomUUID();
  const cleanUserId = (user?.id && isUuid.test(user.id)) ? user.id : null;

  const sanitized = {
    ...record,
    id: cleanId,
    created_by_name: user?.full_name || record.created_by_name || 'Usuario',
    created_by_role: user?.role || record.created_by_role || defaultRole,
    created_at: record.created_at || new Date().toISOString()
  };

  if (cleanUserId) {
    sanitized.created_by_id = cleanUserId;
  } else {
    delete sanitized.created_by_id; // Evitar violar foreign key o uuid inválido
  }

  return sanitized;
};

// API Abstraída para interactuar con Supabase (con sincronización en caché local)
export const clubApi = {
  // Configuración
  getConfig: () => {
    const creds = getSupabaseCredentials();
    return {
      url: creds.url,
      key: creds.key,
      isConfigured: isSupabaseConfigured()
    };
  },

  saveConfig: (url, key) => {
    localStorage.setItem('hc_supabase_url', url.trim());
    localStorage.setItem('hc_supabase_key', key.trim());
    if (url.trim() && key.trim()) {
      supabase = createClient(url.trim(), key.trim());
    } else {
      supabase = null;
    }
  },

  // Test de conexión y permisos reales
  testConnection: async () => {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, message: 'Supabase no está configurado.' };
    }
    try {
      // 1. Probar lectura
      const { data: readData, error: readError } = await supabase.from('entradas').select('id').limit(1);
      if (readError) {
        return { success: false, message: `Error de lectura: ${readError.message}` };
      }

      // 2. Probar inserción y borrado
      const testId = crypto.randomUUID();
      const testRecord = {
        id: testId,
        fecha: new Date().toISOString().split('T')[0],
        rival: 'test_conn',
        division: 'SENIOR',
        talonario_tipo: 'GENERAL',
        nro_inicial: 0,
        nro_final: 0,
        cantidad_vendida: 0,
        precio_unitario: 0,
        subtotal: 0,
        efectivo: 0,
        transferencia: 0,
        created_by_name: 'Test System',
        created_by_role: 'admin'
      };

      const { error: writeError } = await supabase.from('entradas').insert([testRecord]);
      if (writeError) {
        return { 
          success: false, 
          isRlsBlocked: writeError.code === '42501' || writeError.message?.includes('security policy'),
          message: writeError.message 
        };
      }

      // Limpiar registro de prueba
      await supabase.from('entradas').delete().eq('id', testId);

      return { success: true, message: 'Conexión y permisos verificados con éxito.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  // Perfiles de Usuarios
  getProfiles: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          if (data.length > 0) setLocalData('hc_profiles', data);
          return data.length > 0 ? data : getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
        }
        if (error) console.error('Error supabase getProfiles:', error);
      } catch (e) {
        console.warn('Fallback local profiles:', e);
      }
    }
    return getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
  },

  approveUser: async (userId, targetRole = null) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload = { status: 'approved' };
        if (targetRole) updatePayload.role = targetRole;
        const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
        if (error) console.error('Error supabase approveUser:', error);
      } catch (e) {
        console.warn('Error supabase approveUser:', e);
      }
    }
    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const updated = profiles.map(p => {
      if (p.id === userId) {
        return { ...p, status: 'approved', role: targetRole || p.role };
      }
      return p;
    });
    setLocalData('hc_profiles', updated);
    return updated;
  },

  rejectUser: async (userId) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
        if (error) console.error('Error supabase rejectUser:', error);
      } catch (e) {
        console.warn('Error supabase rejectUser:', e);
      }
    }
    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const updated = profiles.map(p => (p.id === userId ? { ...p, status: 'rejected' } : p));
    setLocalData('hc_profiles', updated);
    return updated;
  },

  updateUserRole: async (userId, newRole) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) console.error('Error supabase updateUserRole:', error);
      } catch (e) {
        console.warn('Error supabase updateUserRole:', e);
      }
    }
    const profiles = getLocalData('hc_profiles', [DEFAULT_ADMIN_USER]);
    const updated = profiles.map(p => (p.id === userId ? { ...p, role: newRole } : p));
    setLocalData('hc_profiles', updated);
    return updated;
  },

  // ==================== ENTRADAS ====================
  getEntradas: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('entradas').select('*').order('fecha', { ascending: false });
        if (!error && Array.isArray(data)) {
          setLocalData('hc_entradas', data);
          return data;
        }
        if (error) console.error('Error cargando entradas desde Supabase:', error);
      } catch (e) {
        console.warn('Fallback a modo local para entradas:', e);
      }
    }
    return getLocalData('hc_entradas', []);
  },

  addEntrada: async (entrada, user) => {
    const record = sanitizeForPostgres(entrada, user, 'delegado');

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('entradas').insert([record]).select();
      if (error) {
        console.error('Error insertando entrada en Supabase:', error);
        throw new Error(error.message || 'Error guardando entrada en Supabase');
      }
      if (data && data[0]) {
        const current = getLocalData('hc_entradas', []);
        const updated = [data[0], ...current.filter(item => item.id !== data[0].id)];
        setLocalData('hc_entradas', updated);
        return data[0];
      }
    }

    const current = getLocalData('hc_entradas', []);
    const updated = [record, ...current];
    setLocalData('hc_entradas', updated);
    return record;
  },

  deleteEntrada: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('entradas').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando entrada en Supabase:', error);
        throw new Error(error.message || 'Error eliminando en Supabase');
      }
    }
    const current = getLocalData('hc_entradas', []);
    const updated = current.filter(item => item.id !== id);
    setLocalData('hc_entradas', updated);
    return updated;
  },

  // ==================== CANTINA ====================
  getCantina: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('cantina').select('*').order('fecha', { ascending: false });
        if (!error && Array.isArray(data)) {
          setLocalData('hc_cantina', data);
          return data;
        }
        if (error) console.error('Error cargando cantina desde Supabase:', error);
      } catch (e) {
        console.warn('Fallback a modo local para cantina:', e);
      }
    }
    return getLocalData('hc_cantina', []);
  },

  addCantina: async (cantinaRecord, user) => {
    const record = sanitizeForPostgres(cantinaRecord, user, 'delegado');

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('cantina').insert([record]).select();
      if (error) {
        console.error('Error insertando cantina en Supabase:', error);
        throw new Error(error.message || 'Error guardando cantina en Supabase');
      }
      if (data && data[0]) {
        const current = getLocalData('hc_cantina', []);
        const updated = [data[0], ...current.filter(item => item.id !== data[0].id)];
        setLocalData('hc_cantina', updated);
        return data[0];
      }
    }

    const current = getLocalData('hc_cantina', []);
    const updated = [record, ...current];
    setLocalData('hc_cantina', updated);
    return record;
  },

  deleteCantina: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('cantina').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando cantina en Supabase:', error);
        throw new Error(error.message || 'Error eliminando en Supabase');
      }
    }
    const current = getLocalData('hc_cantina', []);
    const updated = current.filter(item => item.id !== id);
    setLocalData('hc_cantina', updated);
    return updated;
  },

  // ==================== SPONSORS ====================
  getSponsors: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('sponsors').select('*').order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          setLocalData('hc_sponsors', data);
          return data;
        }
        if (error) console.error('Error cargando sponsors desde Supabase:', error);
      } catch (e) {
        console.warn('Fallback a modo local para sponsors:', e);
      }
    }
    return getLocalData('hc_sponsors', []);
  },

  addSponsor: async (sponsor, user) => {
    const record = sanitizeForPostgres(sponsor, user, 'admin');

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.from('sponsors').insert([record]).select();
      if (error) {
        console.error('Error insertando sponsor en Supabase:', error);
        throw new Error(error.message || 'Error guardando sponsor en Supabase');
      }
      if (data && data[0]) {
        const current = getLocalData('hc_sponsors', []);
        const updated = [data[0], ...current.filter(item => item.id !== data[0].id)];
        setLocalData('hc_sponsors', updated);
        return data[0];
      }
    }

    const current = getLocalData('hc_sponsors', []);
    const updated = [record, ...current];
    setLocalData('hc_sponsors', updated);
    return record;
  },

  deleteSponsor: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando sponsor en Supabase:', error);
        throw new Error(error.message || 'Error eliminando en Supabase');
      }
    }
    const current = getLocalData('hc_sponsors', []);
    const updated = current.filter(item => item.id !== id);
    setLocalData('hc_sponsors', updated);
    return updated;
  },

  // ==================== GASTOS ====================
  getGastos: async () => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('gastos').select('*').order('fecha', { ascending: false });
        if (!error && Array.isArray(data)) {
          // Normalizar metadatos si estaban respaldados en proveedor por esquema anterior
          const parsed = data.map(g => {
            let res = { ...g };
            if (!res.rival && res.proveedor && res.proveedor.includes('[PARTIDO:')) {
              const match = res.proveedor.match(/\[PARTIDO:([^|]+)\|([^\]]+)\]/);
              if (match) {
                res.rival = match[1];
                res.division = match[2];
                res.proveedor = res.proveedor.replace(/\[PARTIDO:[^\]]+\]/, '').trim();
              }
            }
            if (res.proveedor && res.proveedor.includes('[MEDIO:')) {
              const matchMedio = res.proveedor.match(/\[MEDIO:([^\]]+)\]/);
              if (matchMedio) {
                res.medio_pago = matchMedio[1];
                res.proveedor = res.proveedor.replace(/\[MEDIO:[^\]]+\]/, '').trim();
              }
            }
            return res;
          });
          setLocalData('hc_gastos', parsed);
          return parsed;
        }
        if (error) console.error('Error cargando gastos desde Supabase:', error);
      } catch (e) {
        console.warn('Fallback a modo local para gastos:', e);
      }
    }
    return getLocalData('hc_gastos', []);
  },

  addGasto: async (gasto, user) => {
    const record = sanitizeForPostgres(gasto, user, 'tesorero');

    if (isSupabaseConfigured() && supabase) {
      let { data, error } = await supabase.from('gastos').insert([record]).select();

      // Si falla porque no existen columnas 'rival' o 'division' en el esquema de Supabase,
      // reintentar guardando la referencia del partido codificada en el campo proveedor
      if (error && (error.message?.includes('rival') || error.message?.includes('division'))) {
        console.warn('Columnas rival/division pendientes en Supabase, aplicando guardado de compatibilidad...');
        const fallbackRecord = { ...record };
        delete fallbackRecord.rival;
        delete fallbackRecord.division;
        if (record.rival) {
          fallbackRecord.proveedor = `${fallbackRecord.proveedor || ''} [PARTIDO:${record.rival}|${record.division || 'SENIOR'}]`.trim();
        }
        const retry = await supabase.from('gastos').insert([fallbackRecord]).select();
        data = retry.data;
        error = retry.error;
      }

      // Si falla por restricción check de medio_pago ('gastos_medio_pago_check')
      if (error && (error.message?.includes('gastos_medio_pago_check') || error.message?.includes('medio_pago'))) {
        console.warn('Restricción gastos_medio_pago_check activa en Supabase, aplicando guardado de compatibilidad...');
        const fallbackRecord = { ...record };
        if (fallbackRecord.rival && (error.message?.includes('rival') || error.message?.includes('division'))) {
          delete fallbackRecord.rival;
          delete fallbackRecord.division;
          fallbackRecord.proveedor = `${fallbackRecord.proveedor || ''} [PARTIDO:${record.rival}|${record.division || 'SENIOR'}]`.trim();
        }
        fallbackRecord.medio_pago = 'Efectivo';
        fallbackRecord.proveedor = `${fallbackRecord.proveedor || ''} [MEDIO:${record.medio_pago}]`.trim();
        const retry = await supabase.from('gastos').insert([fallbackRecord]).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Error insertando gasto en Supabase:', error);
        throw new Error(error.message || 'Error guardando gasto en Supabase');
      }

      if (data && data[0]) {
        const returned = { ...data[0], rival: record.rival, division: record.division, medio_pago: record.medio_pago };
        const current = getLocalData('hc_gastos', []);
        const updated = [returned, ...current.filter(item => item.id !== returned.id)];
        setLocalData('hc_gastos', updated);
        return returned;
      }
    }

    const current = getLocalData('hc_gastos', []);
    const updated = [record, ...current];
    setLocalData('hc_gastos', updated);
    return record;
  },

  deleteGasto: async (id) => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando gasto en Supabase:', error);
        throw new Error(error.message || 'Error eliminando en Supabase');
      }
    }
    const current = getLocalData('hc_gastos', []);
    const updated = current.filter(item => item.id !== id);
    setLocalData('hc_gastos', updated);
    return updated;
  },

  // ==================== SUBIDA DE COMPROBANTES / IMÁGENES ====================
  uploadImage: async (file) => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `comprobantes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('comprobantes').getPublicUrl(filePath);
          return data.publicUrl;
        } else {
          console.warn('Error subiendo imagen a storage Supabase:', uploadError.message);
        }
      } catch (e) {
        console.warn('Error subiendo a Supabase Storage, convirtiendo a DataURL:', e);
      }
    }

    // Fallback: Convertir a DataURL Base64 para almacenamiento inmediato
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
