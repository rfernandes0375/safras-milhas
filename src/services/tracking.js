/**
 * tracking.js — Serviço de rastreamento em segundo plano (iOS)
 *
 * CRÍTICO: Usa expo-location com "Always" permission e Significant Location Changes
 * para garantir funcionamento sem que o sistema iOS mate o processo.
 *
 * Lógica de detecção de viagem:
 * - Início: velocidade > 12 km/h detectada
 * - Fim: velocidade < 3 km/h por mais de 1 minuto consecutivo
 * - Distância mínima: 200m (viagens menores são descartadas)
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { geocodificarCoordenada } from './geocoding';
import { calcularDistanciaKm, eProvavelTrabalho } from '../utils/calculos';

// Nome da task registrada no sistema iOS
const TASK_RASTREAMENTO = 'SAFRAS_RASTREAMENTO_BG';

// Armazena a inscrição do watchPosition para poder parar depois
let foregroundSubscription = null;

// Estado interno do rastreamento
let estadoViagem = {
  emAndamento: false,
  coordenadas: [],
  inicio: null,
  latInicio: null,
  lngInicio: null,
  ultimaVelocidade: 0,
  tempoParado: 0,
  callback: null,
  callbackAtualizar: null,
  config: null,
};

// ─── Definição da Task em segundo plano ──────────────────────────────────────
TaskManager.defineTask(TASK_RASTREAMENTO, async ({ data, error }) => {
  if (error) {
    console.error('[Tracking Task] Erro:', error.message);
    return;
  }
  if (!data?.locations?.length) return;
  for (const local of data.locations) {
    await processarLocalizacao(local);
  }
});

// ─── Processamento de cada ponto GPS ─────────────────────────────────────────
const processarLocalizacao = async (local) => {
  const { latitude, longitude, speed, timestamp, accuracy } = local.coords;

  // Aumentada tolerância para evitar descarte em áreas de sinal médio
  if (accuracy > 80) return;

  const velocidadeKmh = (speed || 0) * 3.6;
  const agora = timestamp || Date.now();

  if (!estadoViagem.emAndamento) {
    // Iniciando rastreio mais cedo (8 km/h)
    if (velocidadeKmh > 8) {
      console.log('[Tracking] Viagem iniciada');
      estadoViagem.emAndamento = true;
      estadoViagem.inicio = new Date(agora).toISOString();
      estadoViagem.latInicio = latitude;
      estadoViagem.lngInicio = longitude;
      estadoViagem.coordenadas = [{ lat: latitude, lng: longitude, t: agora }];
      estadoViagem.tempoParado = 0;

      if (estadoViagem.callbackAtualizar) {
        estadoViagem.callbackAtualizar({ emAndamento: true, inicio: estadoViagem.inicio, coordenadas: estadoViagem.coordenadas });
      }
    }
  } else {
    const ultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 1];
    if (ultimoPonto) {
      const distUltimo = calcularDistanciaKm([{lat: ultimoPonto.lat, lng: ultimoPonto.lng}, {lat: latitude, lng: longitude}]) * 1000;
      if (distUltimo < 10 && velocidadeKmh < 5) return;
    }

    estadoViagem.coordenadas.push({ lat: latitude, lng: longitude, t: agora });

    if (velocidadeKmh < 3) {
      const penultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 2];
      if (penultimoPonto) estadoViagem.tempoParado += agora - penultimoPonto.t;
      if (estadoViagem.tempoParado >= 60_000) {
        await finalizarViagem(latitude, longitude, agora);
      }
    } else {
      estadoViagem.tempoParado = 0;
    }
  }
  estadoViagem.ultimaVelocidade = velocidadeKmh;
};

// ─── Finalização de viagem ────────────────────────────────────────────────────
const finalizarViagem = async (latFim, lngFim, agora, forcar = false) => {
  const coordenadas = estadoViagem.coordenadas;
  const distanciaKm = calcularDistanciaKm(coordenadas);
  const distanciaMetros = distanciaKm * 1000;

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

  if (estadoViagem.callbackAtualizar) estadoViagem.callbackAtualizar(null);
  
  const distMinima = estadoViagem.config?.distanciaMinima || 200;
  if (!forcar && distanciaMetros < distMinima) {
    console.log(`[Tracking] Viagem descartada: ${distanciaMetros.toFixed(0)}m (mínimo ${distMinima}m)`);
    return;
  }

  let localInicio = 'Local desconhecido';
  let localFim = 'Local desconhecido';

  try {
    [localInicio, localFim] = await Promise.all([
      geocodificarCoordenada(dadosViagem.latInicio, dadosViagem.lngInicio),
      geocodificarCoordenada(latFim, lngFim),
    ]);
  } catch (e) {}

  const provalTrabalho = eProvavelTrabalho(dadosViagem, estadoViagem.config);
  const viagemCompleta = { ...dadosViagem, localInicio, localFim, provalTrabalho };

  if (estadoViagem.callback) estadoViagem.callback(viagemCompleta);
};

// ─── API Pública ──────────────────────────────────────────────────────────────

export const iniciarRastreamento = async ({ onViagemDetectada, onViagemAtualizada, config }) => {
  estadoViagem.callback = onViagemDetectada;
  estadoViagem.callbackAtualizar = onViagemAtualizada;
  estadoViagem.config = config;

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  // Se estiver no EXPO GO, não tentamos o background (evita erro de Info.plist)
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo) {
    console.log('[Tracking] Ambiente: Expo Go. Usando rastreamento de primeiro plano.');
    if (foregroundSubscription) foregroundSubscription.remove();
    
    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 50,
        timeInterval: 10000,
      },
      (location) => processarLocalizacao(location)
    );
    return true;
  }

  // Se não for Expo Go, tenta o modo real (Background)
  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') return false;

    const ativa = await Location.hasStartedLocationUpdatesAsync(TASK_RASTREAMENTO).catch(() => false);
    if (!ativa) {
      await Location.startLocationUpdatesAsync(TASK_RASTREAMENTO, {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 50,
        deferredUpdatesInterval: 30000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Safras Milhas',
          notificationBody: 'Rastreamento ativo',
        },
        pausesUpdatesAutomatically: false,
      });
    }
    return true;
  } catch (err) {
    console.warn('[Tracking] Falha ao iniciar modo background, tentando foreground:', err.message);
    // Fallback manual se o modo background falhar (ex: Info.plist faltando)
    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 50,
      },
      (location) => processarLocalizacao(location)
    );
    return true;
  }
};

export const pararViagemManualmente = async () => {
  if (estadoViagem.emAndamento && estadoViagem.coordenadas.length > 0) {
    const ultimo = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 1];
    await finalizarViagem(ultimo.lat, ultimo.lng, Date.now(), true);
    return true;
  }
  return false;
};

export const atualizarConfig = (novaConfig) => {
  estadoViagem.config = { ...estadoViagem.config, ...novaConfig };
};

export const obterEstado = () => ({
  emAndamento: estadoViagem.emAndamento,
  inicio: estadoViagem.inicio,
  coordenadas: estadoViagem.coordenadas,
});
