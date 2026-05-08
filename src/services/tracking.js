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
import { salvarEstadoRastreamento, buscarEstadoRastreamento, limparEstadoRastreamento } from './database';
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
    // Iniciando rastreio a 10 km/h (evita disparos em caminhadas)
    if (velocidadeKmh > 10) {
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
      
      // Persiste estado e ponto inicial
      await salvarEstadoRastreamento(estadoViagem);
      await adicionarPontoTemporario(latitude, longitude, agora);
    }
  } else {
    const ultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 1];
    if (ultimoPonto) {
      const distUltimo = calcularDistanciaKm([{lat: ultimoPonto.lat, lng: ultimoPonto.lng}, {lat: latitude, lng: longitude}]) * 1000;
      // Se andou menos de 10m e está parado, ignora para poupar banco
      if (distUltimo < 10 && velocidadeKmh < 3) return;
    }

    estadoViagem.coordenadas.push({ lat: latitude, lng: longitude, t: agora });

    // Salva ponto individual de forma rápida
    await adicionarPontoTemporario(latitude, longitude, agora);

    if (velocidadeKmh < 3) {
      const penultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 2];
      if (penultimoPonto) estadoViagem.tempoParado += agora - penultimoPonto.t;
      if (estadoViagem.tempoParado >= 60_000) {
        await finalizarViagem(latitude, longitude, agora);
      }
    } else {
      estadoViagem.tempoParado = 0;
    }
    // Salva estado geral (metadados)
    await salvarEstadoRastreamento({ ...estadoViagem, coordenadas: [] }); // Não salva coordenadas aqui para ser rápido
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
  
  // Limpa estado temporário do banco pois a viagem foi concluída ou descartada
  await limparEstadoRastreamento();
  await limparPontosTemporarios();
  
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

  // 1. Tenta recuperar viagem que estava em curso (metadados)
  const estadoSalvo = await buscarEstadoRastreamento();
  if (estadoSalvo && estadoSalvo.emAndamento) {
    console.log('[Tracking] Recuperando metadados da viagem em curso...');
    estadoViagem.emAndamento = true;
    estadoViagem.inicio = estadoSalvo.inicio;
    estadoViagem.latInicio = estadoSalvo.latInicio;
    estadoViagem.lngInicio = estadoSalvo.lngInicio;
    estadoViagem.tempoParado = estadoSalvo.tempoParado || 0;

    // 2. Recupera os pontos individuais (Caixa Preta)
    const pontosSalvos = await buscarPontosTemporarios();
    if (pontosSalvos.length > 0) {
      console.log(`[Tracking] Recuperados ${pontosSalvos.length} pontos da caixa preta.`);
      estadoViagem.coordenadas = pontosSalvos;
    } else {
      estadoViagem.coordenadas = estadoSalvo.coordenadas || [];
    }
    
    if (onViagemAtualizada) {
      onViagemAtualizada({ 
        emAndamento: true, 
        inicio: estadoViagem.inicio, 
        coordenadas: estadoViagem.coordenadas 
      });
    }
  }

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  // TENTA usar o modo Background mesmo no Expo Go (melhoria de robustez)
  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    
    // Se temos permissão de background, tentamos o modo "Real"
    if (bgStatus === 'granted') {
      const ativa = await Location.hasStartedLocationUpdatesAsync(TASK_RASTREAMENTO).catch(() => false);
      if (!ativa) {
        await Location.startLocationUpdatesAsync(TASK_RASTREAMENTO, {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 30, // Reduzido para pegar mais detalhes
          deferredUpdatesInterval: 15000,
          showsBackgroundLocationIndicator: true, // Força a "Bolha Azul" no iOS
          foregroundService: {
            notificationTitle: 'Safras Milhas',
            notificationBody: 'Rastreamento ativo',
          },
          pausesUpdatesAutomatically: false,
        });
      }
      return true;
    }
  } catch (err) {
    console.warn('[Tracking] Falha ao iniciar modo background:', err.message);
  }

  // Fallback para Foreground se o background for negado ou falhar no Expo Go
  if (foregroundSubscription) foregroundSubscription.remove();
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 30,
    },
    (location) => processarLocalizacao(location)
  );
  return true;
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
