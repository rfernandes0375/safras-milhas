/**
 * tracking.js — Motor de Rastreamento de Viagens
 * 
 * Versão Refatorada (v1.1.0)
 * Foco: Estabilidade, Separação de Responsabilidades e Robustez de Dados.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { 
  salvarEstadoRastreamento, 
  buscarEstadoRastreamento, 
  limparEstadoRastreamento, 
  adicionarPontoTemporario, 
  buscarPontosTemporarios, 
  limparPontosTemporarios, 
  salvarViagem,
  atualizarEnderecosViagem
} from './database';
import { obterEnderecoComRetry } from './geocoding';
import { calcularDistanciaKm, eProvavelTrabalho } from '../utils/calculos';

const TASK_RASTREAMENTO = 'SAFRAS_RASTREAMENTO_BG';

// Estado Volátil (em memória)
let foregroundSubscription = null;
let ultimaLocalizacao = null;
let estadoViagem = {
  emAndamento: false,
  coordenadas: [],
  inicio: null,
  latInicio: null,
  lngInicio: null,
  tempoParado: 0,
  callback: null,
  callbackAtualizar: null,
  config: null,
};

// ─── TASK DE SEGUNDO PLANO ───────────────────────────────────────────────────
TaskManager.defineTask(TASK_RASTREAMENTO, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  for (const local of data.locations) {
    await processarLocalizacao(local);
  }
});

// ─── PROCESSAMENTO DE PONTOS ─────────────────────────────────────────────────
const processarLocalizacao = async (local) => {
  if (!local?.coords) return;
  
  ultimaLocalizacao = local.coords;
  const { latitude, longitude, speed, timestamp, accuracy } = local.coords;

  // Filtro de precisão (ignora pontos muito ruins)
  if (accuracy > 80) return;

  const velocidadeKmh = (speed || 0) * 3.6;
  const agora = timestamp || Date.now();

  if (!estadoViagem.emAndamento) {
    // LÓGICA DE INÍCIO: Detecta movimento acima de 10km/h
    if (velocidadeKmh > 5) {
      iniciarNovaViagem(latitude, longitude, agora);
    }
  } else {
    // LÓGICA DE ANDAMENTO
    await registrarMovimento(latitude, longitude, velocidadeKmh, agora);
  }
};

// ─── FUNÇÕES AUXILIARES DE ESTADO ───────────────────────────────────────────

const iniciarNovaViagem = async (lat, lng, agora) => {
  console.log('[Tracking] Viagem iniciada');
  estadoViagem.emAndamento = true;
  estadoViagem.inicio = new Date(agora).toISOString();
  estadoViagem.latInicio = lat;
  estadoViagem.lngInicio = lng;
  estadoViagem.coordenadas = [{ lat, lng, t: agora }];
  estadoViagem.tempoParado = 0;

  if (estadoViagem.callbackAtualizar) {
    estadoViagem.callbackAtualizar({ ...estadoViagem });
  }
  
  await salvarEstadoRastreamento(estadoViagem);
  await adicionarPontoTemporario(lat, lng, agora);
};

const registrarMovimento = async (lat, lng, vel, agora) => {
  const ultimoPonto = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 1];
  
  // Evita salvar pontos duplicados se estiver parado
  if (ultimoPonto) {
    const dist = calcularDistanciaKm([{lat: ultimoPonto.lat, lng: ultimoPonto.lng}, {lat, lng}]) * 1000;
    if (dist < 10 && vel < 3) return;
  }

  estadoViagem.coordenadas.push({ lat, lng, t: agora });
  await adicionarPontoTemporario(lat, lng, agora);
  
  // Persistência agressiva: Salva o progresso para recuperação pós-crash
  await salvarEstadoRastreamento({ ...estadoViagem, coordenadas: [] });
  if (vel < 3) {
    const penultimo = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 2];
    if (penultimo) estadoViagem.tempoParado += agora - penultimo.t;
    
    if (estadoViagem.tempoParado >= 60000) {
      await finalizarViagem(lat, lng, agora);
    }
  } else {
    estadoViagem.tempoParado = 0;
  }
  
  // Salva metadados (sem as coordenadas pesadas)
  await salvarEstadoRastreamento({ ...estadoViagem, coordenadas: [] });
};

const finalizarViagem = async (latFim, lngFim, agora, forcar = false) => {
  const coordenadas = estadoViagem.coordenadas;
  const distanciaKm = calcularDistanciaKm(coordenadas);
  const distanciaMetros = distanciaKm * 1000;
  const distMinima = estadoViagem.config?.distanciaMinima || 50;

  // 1. Prepara dados
  const dadosBase = {
    inicio: estadoViagem.inicio,
    fim: new Date(agora).toISOString(),
    latInicio: estadoViagem.latInicio,
    lngInicio: estadoViagem.lngInicio,
    latFim,
    lngFim,
    coordenadas,
    distanciaKm,
    distanciaMetros,
  };

  // 2. Limpa estado IMEDIATAMENTE (evita loops se houver erro)
  estadoViagem.emAndamento = false;
  estadoViagem.coordenadas = [];
  if (estadoViagem.callbackAtualizar) estadoViagem.callbackAtualizar(null);
  await limparEstadoRastreamento();
  await limparPontosTemporarios();

  // 3. Valida distância
  if (!forcar && distanciaMetros < distMinima) {
    console.log(`[Tracking] Viagem descartada: ${distanciaMetros.toFixed(0)}m`);
    return;
  }

  // 4. Salva no Banco IMEDIATAMENTE (Custe o que custar)
  const provalTrabalho = eProvavelTrabalho(dadosBase, estadoViagem.config);
  const viagemInicial = { ...dadosBase, localInicio: 'Buscando endereço...', localFim: 'Buscando endereço...', provalTrabalho };
  
  const resultado = await salvarViagem(viagemInicial);
  const idSalvo = resultado.id;
  console.log('[Tracking] Viagem salva preliminarmente com ID:', idSalvo);

  if (estadoViagem.callback) estadoViagem.callback(resultado);

  // 5. Busca Endereços em background (sem travar o salvamento)
  try {
    console.log('[Tracking] Buscando endereços em background...');
    const [localInicio, localFim] = await Promise.all([
      obterEnderecoComRetry(dadosBase.latInicio, dadosBase.lngInicio),
      obterEnderecoComRetry(latFim, lngFim)
    ]);
    
    // Atualiza o registro com os endereços reais
    await atualizarEnderecosViagem(idSalvo, localInicio, localFim);
    console.log('[Tracking] Endereços atualizados com sucesso!');
  } catch (err) {
    console.warn('[Tracking] Falha ao buscar endereços, mas a viagem está salva.', err.message);
  }
};

// ─── API PÚBLICA ─────────────────────────────────────────────────────────────

export const iniciarRastreamento = async ({ onViagemDetectada, onViagemAtualizada, config }) => {
  estadoViagem.callback = onViagemDetectada;
  estadoViagem.callbackAtualizar = onViagemAtualizada;
  estadoViagem.config = config;

  // Tenta recuperar viagem órfã (Autocura)
  const estadoSalvo = await buscarEstadoRastreamento();
  const pontosSalvos = await buscarPontosTemporarios();

  if (estadoSalvo?.emAndamento && pontosSalvos.length > 0) {
    const ultimoPonto = pontosSalvos[pontosSalvos.length - 1];
    const tempoOcioso = Date.now() - (ultimoPonto.t || Date.now());

    if (tempoOcioso > 10 * 60 * 1000) {
      // Viagem de mais de 10 min atrás -> Finaliza
      estadoViagem.emAndamento = true;
      estadoViagem.coordenadas = pontosSalvos;
      estadoViagem.inicio = estadoSalvo.inicio;
      estadoViagem.latInicio = estadoSalvo.latInicio;
      estadoViagem.lngInicio = estadoSalvo.lngInicio;
      await finalizarViagem(ultimoPonto.lat, ultimoPonto.lng, ultimoPonto.t, true);
    } else {
      // Viagem recente -> Recupera
      estadoViagem.emAndamento = true;
      estadoViagem.inicio = estadoSalvo.inicio;
      estadoViagem.latInicio = estadoSalvo.latInicio;
      estadoViagem.lngInicio = estadoSalvo.lngInicio;
      estadoViagem.coordenadas = pontosSalvos;
      if (onViagemAtualizada) onViagemAtualizada({ ...estadoViagem });
    }
  }

  // Permissões e Inicialização de Sensores
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus === 'granted') {
      await Location.startLocationUpdatesAsync(TASK_RASTREAMENTO, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 30,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
        allowsBackgroundLocationUpdates: true,
        foregroundService: {
          notificationTitle: 'Safras Milhas',
          notificationBody: 'Rastreamento ativo em segundo plano...',
          notificationColor: '#00D1FF',
        }
      });
      return true;
    }
  } catch (err) {
    console.warn('[Tracking] Background Location falhou no Expo Go:', err.message);
  }

  // Fallback: WatchPosition
  if (foregroundSubscription) foregroundSubscription.remove();
  foregroundSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 20 },
    (location) => processarLocalizacao(location)
  );
  return true;
};

export const getUltimaLocalizacao = () => ultimaLocalizacao;
export const obterEstado = () => ({ ...estadoViagem });
export const atualizarConfig = (novaConfig) => {
  estadoViagem.config = { ...estadoViagem.config, ...novaConfig };
};

export const pararViagemManualmente = async () => {
  if (estadoViagem.emAndamento && estadoViagem.coordenadas.length > 0) {
    const ultimo = estadoViagem.coordenadas[estadoViagem.coordenadas.length - 1];
    await finalizarViagem(ultimo.lat, ultimo.lng, Date.now(), true);
    return true;
  }
  return false;
};
