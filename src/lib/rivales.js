// Listado oficial de clubes rivales del Hockey sobre Patines Mendoza
export const RIVALES = [
  { id: 'bancomendoza', name: 'Banco Mendoza' },
  { id: 'bernardinorivadavia', name: 'Bernardino Rivadavia' },
  { id: 'casadeitalia', name: 'Casa de Italia' },
  { id: 'giol', name: 'GIOL' },
  { id: 'godoycruz', name: 'Godoy Cruz' },
  { id: 'guaymallen', name: 'Guaymallén' },
  { id: 'impsa', name: 'IMPSA' },
  { id: 'lacolonia', name: 'La Colonia' },
  { id: 'murialdo', name: 'Murialdo' },
  { id: 'palmira', name: 'Palmira' },
  { id: 'petroleros', name: 'Petroleros' },
  { id: 'talleres', name: 'Talleres' }
];

export const getRivalInfo = (rivalVal) => {
  if (!rivalVal) return { id: 'murialdo', name: 'Murialdo', image: '/escudos-rivales/murialdo.jpg' };
  
  // Buscar por ID exacto
  let found = RIVALES.find(r => r.id === rivalVal);
  if (found) {
    return {
      id: found.id,
      name: found.name,
      image: `/escudos-rivales/${found.id}.jpg`
    };
  }

  // Buscar por nombre exacto o parcial
  found = RIVALES.find(r => r.name.toLowerCase() === String(rivalVal).toLowerCase());
  if (found) {
    return {
      id: found.id,
      name: found.name,
      image: `/escudos-rivales/${found.id}.jpg`
    };
  }

  // Búsqueda flexible por texto contenido
  const clean = String(rivalVal).toLowerCase().replace(/[^a-z0-9]/g, '');
  found = RIVALES.find(r => clean.includes(r.id) || r.id.includes(clean));
  if (found) {
    return {
      id: found.id,
      name: found.name,
      image: `/escudos-rivales/${found.id}.jpg`
    };
  }

  return {
    id: clean,
    name: rivalVal,
    image: `/escudos-rivales/${clean}.jpg`
  };
};
