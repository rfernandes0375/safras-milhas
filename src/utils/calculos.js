/**
 * calculos.js — Utilitários de cálculo de distância e reembolso
 */

// ─── Constantes da base Safras & Cifras ───────────────────────────────────────
const BASE_LAT = -16.6704;
const BASE_LNG = -49.2552;

/**
 * Calcula distância total de uma rota a partir de array de coordenadas
 * Usa fórmula de Haversine para precisão
 * @param {Array<{lat, lng}>} coordenadas
 * @returns {number} distância em km
 */
export const calcularDistanciaKm = (coordenadas) => {
  if (!coordenadas || coordenadas.length < 2) return 0;

  let totalKm = 0;
  for (let i = 1; i < coordenadas.length; i++) {
    totalKm += haversine(
      coordenadas[i - 1].lat, coordenadas[i - 1].lng,
      coordenadas[i].lat, coordenadas[i].lng
    );
  }
  return totalKm;
};

/**
 * Fórmula de Haversine — distância entre dois pontos na esfera terrestre
 * @returns {number} distância em km
 */
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em km
  const dLat = grausParaRad(lat2 - lat1);
  const dLon = grausParaRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(grausParaRad(lat1)) * Math.cos(grausParaRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const grausParaRad = (graus) => (graus * Math.PI) / 180;

/**
 * Distância entre dois pontos (lat/lng) em metros
 */
export const distanciaEntreMetros = (lat1, lng1, lat2, lng2) => {
  return haversine(lat1, lng1, lat2, lng2) * 1000;
};

/**
 * Calcula valor de reembolso para uma viagem
 * @param {number} distanciaKm
 * @param {object} config - configurações do app
 * @returns {number} valor em R$
 */
export const calcularReembolso = (distanciaKm, config) => {
  if (!distanciaKm || distanciaKm <= 0) return 0;

  if (config.modoCalculo === 'valor_km') {
    // Modo simples: km × R$/km
    return distanciaKm * config.valorPorKm;
  } else {
    // Modo consumo: km ÷ consumo × preço do combustível
    const litros = distanciaKm / config.consumoMedio;
    return litros * config.precoCombustivel;
  }
};

/**
 * Verifica se uma viagem é provavelmente de trabalho (pré-classificação automática)
 * Critérios: dia útil + horário 08h–18h + origem/destino próximos à base
 *
 * @param {object} viagem
 * @param {object} config
 * @returns {boolean}
 */
export const eProvavelTrabalho = (viagem, config) => {
  if (!viagem?.inicio) return false;

  const dataInicio = new Date(viagem.inicio);
  const diaSemana = dataInicio.getDay(); // 0=Dom, 6=Sab
  const hora = dataInicio.getHours();
  const raio = config?.raioGeofence || 300;
  const baseLat = config?.baseLatitude || BASE_LAT;
  const baseLng = config?.baseLongitude || BASE_LNG;

  // 1. Dia útil (segunda a sexta)
  const ehDiaUtil = diaSemana >= 1 && diaSemana <= 5;

  // 2. Horário comercial (08h–18h)
  const ehHorarioComercial = hora >= 8 && hora <= 18;

  // 3. Origem ou destino próximo à base
  const distanciaInicio = distanciaEntreMetros(
    viagem.latInicio, viagem.lngInicio, baseLat, baseLng
  );
  const distanciaFim = distanciaEntreMetros(
    viagem.latFim, viagem.lngFim, baseLat, baseLng
  );
  const passaPelaBase = distanciaInicio <= raio || distanciaFim <= raio;

  return ehDiaUtil && ehHorarioComercial && passaPelaBase;
};

/** Formata valor em Real brasileiro */
export const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
};

/** Formata distância em km */
export const formatarKm = (km) => {
  if (!km) return '0 km';
  return `${km.toFixed(1)} km`;
};

/** Formata data e hora em português */
export const formatarDataHora = (isoString) => {
  if (!isoString) return '';
  const data = new Date(isoString);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Formata apenas a hora */
export const formatarHora = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Formata data completa */
export const formatarData = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Formata mês/ano para exibição */
export const formatarMes = (mesStr) => {
  if (!mesStr) return '';
  const [ano, mes] = mesStr.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(mes) - 1]} ${ano}`;
};
