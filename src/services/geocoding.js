/**
 * geocoding.js — Geocodificação reversa usando expo-location
 * Converte coordenadas GPS em nomes de lugares legíveis
 */

import * as Location from 'expo-location';

// Cache simples para evitar chamadas repetidas para o mesmo local
const cache = new Map();

/**
 * Converte coordenadas em nome de lugar legível
 * Exemplo: (-16.67, -49.25) → "Safras & Cifras"
 */
export const geocodificarCoordenada = async (latitude, longitude) => {
  const chaveCache = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  if (cache.has(chaveCache)) {
    return cache.get(chaveCache);
  }

  try {
    const resultados = await Location.reverseGeocodeAsync({ latitude, longitude });

    if (resultados?.length > 0) {
      const local = resultados[0];
      // Monta nome legível priorizando nome do estabelecimento, rua ou bairro
      const nome = formatarLocal(local);
      cache.set(chaveCache, nome);
      return nome;
    }
  } catch (error) {
    console.warn('[Geocoding] Erro na geocodificação:', error.message);
  }

  return 'Local desconhecido';
};

/** Formata resultado da geocodificação em string amigável */
const formatarLocal = (local) => {
  // Prioridade: nome do lugar > rua + número > bairro > cidade
  if (local.name && !local.name.match(/^\d/)) {
    return local.name;
  }

  const partes = [];
  if (local.street) partes.push(local.street);
  if (local.district || local.subregion) partes.push(local.district || local.subregion);
  if (local.city) partes.push(local.city);

  return partes.length > 0 ? partes.join(', ') : 'Local desconhecido';
};
