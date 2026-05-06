/**
 * tracking.js — Serviço de rastreamento em segundo plano (iOS)
 *
 * CRÍTICO: Usa expo-location com "Always" permission e Significant Location Changes
 * para garantir funcionamento sem que o sistema iOS mate o processo.
 *
 * Lógica de detecção de viagem:
 * - Início: velocidade > 20 km/h detectada
 * - Fim: velocidade = 0 por mais de 2 minutos consecutivos
 * - Distância mínima: 500m (viagens menores são descartadas)
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { geocodificarCoordenada } from './geocoding';
import { calcularDistanciaKm, eProvavelTrabalho } from '../utils/calculos';

// Nome da task registrada no sistema iOS
const TASK_RASTREAMENTO = 'SAFRAS_RASTREAMENTO_BG';

// Estado interno do rastreamento (persiste entre chamadas da task)
let estadoViagem = {
  emAndamento: false,
  coordenadas: [],
  inicio: null,
  latInicio: null,
  lngInicio: null,
  ultimaVelocidade: 0,
  tempoParado: 0, // milissegundos parado
  callback: null,
  callbackAtualizar: null,
  config: null,
};

// ─── Definição da Task em segundo plano ──────────────────────────────────────
// IMPORTANTE: TaskManager.defineTask DEVE ser chamado no nível raiz do módulo,
// não dentro de funções — exigência do expo-task-manager para iOS.
TaskManager.defineTask(TASK_RASTREAMENTO, async ({ data, error }) => {
  if (error) {
    console.error('[Tracking Task] Erro:', error.message);
    return;
  }

  if (!data?.locations?.length) return;

  const locais = data.locations;

  for (const local of locais) {
    await processarLocalizacao(local);
  }
});

// ─── Processamento de cada ponto GPS ─────────────────────────────────────────
const processarLocalizacao = async (local) => {
  const { latitude, longitude, speed, timestamp } = local.coords;

  // speed em m/s → converte para km/h
  const velocidadeKmh = (speed || 0) * 3.6;
  const agora = timestamp || Date.now();

  if (!estadoViagem.emAndamento) {
    // Detecta INÍCIO de viagem: velocidade > 20 km/h
    if (velocidadeKmh > 20) {
      console.log('[Tracking] Início de viagem detectado —', velocidadeKmh.toFixed(1), 'km/h');
      estadoViagem.emAndamento = true;
      estadoViagem.inicio = new Date(agora).toISOString();
      estadoViagem.latInicio = latitude;
      estadoViagem.lngInicio = longitude;
      estadoViagem.coordenadas = [{ lat: latitude, lng: longitude, t: agora }];
      estadoViagem.tempoParado = 0;

      // Notifica a UI que uma viagem começou
      if (estadoViagem.callbackAtualizar) {
        estadoViagem.callbackAtualizar({
          emAndamento: true,
          inicio: estadoViagem.inicio,
          coordenadas: estadoViagem.coordenadas,
        });
      }
    }
  } else {
    // Viagem em andamento — grava coordenada
    estadoViagem.coordenadas.push({ lat: latitude, lng: longitude, t: agora });

    if (velocidadeKmh < 2) {
      // Carro parado: acumula tempo parado
      const ultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 2];
      if (ultimoPonto) {
        estadoViagem.tempoParado += agora - ultimoPonto.t;
      }

      // DETECTA FIM: parado por mais de 2 minutos (120.000ms)
      if (estadoViagem.tempoParado >= 120_000) {
        console.log('[Tracking] Fim de viagem — parado por 2+ minutos');
        await finalizarViagem(latitude, longitude, agora);
      }
    } else {
      // Em movimento — reseta contador de parado
      estadoViagem.tempoParado = 0;
    }
  }

  estadoViagem.ultimaVelocidade = velocidadeKmh;
};

// ─── Finalização de viagem ────────────────────────────────────────────────────
const finalizarViagem = async (latFim, lngFim, agora) => {
  const coordenadas = estadoViagem.coordenadas;

  // Calcula distância total percorrida
  const distanciaKm = calcularDistanciaKm(coordenadas);
  const distanciaMetros = distanciaKm * 1000;

  // Reseta estado para próxima viagem
  const dadosViagem = {
    inicio: estadoViagem.inicio,
    fim: new Date(agora).toISOString(),
    latInicio: estadoViagem.latInicio,
    lngInicio: estadoViagem.lngInicio,
    latFim,
    lngFim,
    coordenadas,
    distanciaMetros,
    distanciaKm,
  };

  estadoViagem.emAndamento = false;
  estadoViagem.coordenadas = [];
  estadoViagem.inicio = null;
  estadoViagem.tempoParado = 0;

  if (estadoViagem.callbackAtualizar) {
    estadoViagem.callbackAtualizar(null);
  }

  // Distância mínima: 500m
  if (distanciaMetros < (estadoViagem.config?.distanciaMinima || 500)) {
    console.log('[Tracking] Viagem descartada — menos de 500m');
    return;
  }

  // Geocodificação reversa (ponto de início e fim)
  let localInicio = 'Local desconhecido';
  let localFim = 'Local desconhecido';

  try {
    [localInicio, localFim] = await Promise.all([
      geocodificarCoordenada(dadosViagem.latInicio, dadosViagem.lngInicio),
      geocodificarCoordenada(latFim, lngFim),
    ]);
  } catch (e) {
    console.warn('[Tracking] Geocodificação falhou — usando coordenadas brutas');
  }

  // Pré-classificação automática
  const provalTrabalho = eProvavelTrabalho(dadosViagem, estadoViagem.config);

  const viagemCompleta = {
    ...dadosViagem,
    localInicio,
    localFim,
    provalTrabalho,
  };

  // Dispara callback para salvar no banco via AppContext
  if (estadoViagem.callback) {
    estadoViagem.callback(viagemCompleta);
  }

  console.log('[Tracking] Viagem registrada:', distanciaKm.toFixed(2), 'km —', localInicio, '→', localFim);
};

// ─── API Pública ──────────────────────────────────────────────────────────────

/** Inicia o rastreamento em segundo plano */
export const iniciarRastreamento = async ({ onViagemDetectada, onViagemAtualizada, config }) => {
  estadoViagem.callback = onViagemDetectada;
  estadoViagem.callbackAtualizar = onViagemAtualizada;
  estadoViagem.config = config;

  // Solicita permissão "Sempre" — obrigatória para funcionar em segundo plano
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.error('[Tracking] Permissão de localização em segundo plano negada');
    return false;
  }

  // Verifica se a task já está registrada
  const ativa = await Location.hasStartedLocationUpdatesAsync(TASK_RASTREAMENTO).catch(() => false);
  if (ativa) {
    console.log('[Tracking] Rastreamento já ativo');
    return true;
  }

  // Inicia rastreamento contínuo em segundo plano
  // deferredUpdatesInterval: 30s — balanceia precisão e bateria
  await Location.startLocationUpdatesAsync(TASK_RASTREAMENTO, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 50,          // grava a cada 50m de deslocamento
    deferredUpdatesInterval: 30000, // ou a cada 30s
    showsBackgroundLocationIndicator: true, // barra azul no iOS — exigida pela Apple
    foregroundService: {
      notificationTitle: 'Safras Milhas',
      notificationBody: 'Rastreamento ativo em segundo plano',
      notificationColor: '#1A73E8',
    },
    // pausesUpdatesAutomatically: false — garante funcionamento mesmo parado
    pausesUpdatesAutomatically: false,
  });

  console.log('[Tracking] Rastreamento iniciado com sucesso');
  return true;
};

/** Atualiza configurações sem reiniciar o rastreamento */
export const atualizarConfig = (novaConfig) => {
  estadoViagem.config = { ...estadoViagem.config, ...novaConfig };
};

/** Retorna estado atual do rastreamento */
export const obterEstado = () => ({
  emAndamento: estadoViagem.emAndamento,
  inicio: estadoViagem.inicio,
  coordenadas: estadoViagem.coordenadas,
});
