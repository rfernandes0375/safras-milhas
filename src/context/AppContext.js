/**
 * AppContext.js — Estado global conectado ao SQLite
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Database from '../services/database';
import * as Tracking from '../services/tracking';
import { calcularReembolso } from '../utils/calculos';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
};

const CONFIG_PADRAO = {
  modoCalculo: 'valor_km', // 'consumo' ou 'valor_km'
  consumoMedio: 10,
  precoCombustivel: 6.5,
  valorPorKm: 0.85,
  raioGeofence: 300,
  baseLatitude: -16.6704,
  baseLongitude: -49.2552,
  notificacaoHora: 17,
  notificacaoDiaSemana: 5,
  distanciaMinima: 500,
};

export const AppProvider = ({ children }) => {
  const [carregando, setCarregando] = useState(true);
  const [viagensPendentes, setViagensPendentes] = useState([]);
  const [viagensConfirmadas, setViagensConfirmadas] = useState([]);
  const [mesAtual, setMesAtual] = useState(new Date().toISOString().slice(0, 7));
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [rastreamentoAtivo, setRastreamentoAtivo] = useState(false);

  // 1. Inicializa Banco e Carrega Dados
  const inicializarApp = useCallback(async () => {
    try {
      setCarregando(true);
      await Database.inicializar();
      
      // Carrega Configurações
      const configSalva = await Database.buscarConfig();
      if (configSalva) {
        setConfig(prev => ({ ...prev, ...configSalva }));
      }

      // Carrega Viagens
      await carregarViagens();

      // Inicia Rastreamento
      const ativo = await Tracking.iniciarRastreamento({
        config: configSalva || CONFIG_PADRAO,
        onViagemDetectada: handleNovaViagem,
        onViagemAtualizada: (estado) => {
          // Opcional: atualizar UI em tempo real se houver viagem em curso
        }
      });
      setRastreamentoAtivo(ativo);

    } catch (error) {
      console.error('[AppContext] Erro na inicialização:', error);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    inicializarApp();
  }, []);

  // 2. Carrega Viagens do Banco
  const carregarViagens = useCallback(async (mes) => {
    const mesFiltro = mes || mesAtual;
    const [pendentes, confirmadas] = await Promise.all([
      Database.buscarViagensPendentes(),
      Database.buscarViagensConfirmadas(mesFiltro)
    ]);
    setViagensPendentes(pendentes);
    setViagensConfirmadas(confirmadas);
  }, [mesAtual]);

  useEffect(() => {
    if (!carregando) carregarViagens();
  }, [mesAtual]);

  // 3. Callback quando o GPS detecta fim de viagem
  const handleNovaViagem = useCallback(async (novaViagem) => {
    // Calcula valor inicial (mesmo sendo pendente)
    const valor = calcularReembolso(novaViagem.distanciaKm, config);
    const viagemComId = await Database.salvarViagem({ ...novaViagem, valor });
    setViagensPendentes(prev => [viagemComId, ...prev]);
  }, [config]);

  // 4. Lógica de Classificação (O que acontece no Swipe)
  const classificarViagem = useCallback(async (id, classificacao, descricao = '') => {
    const viagem = viagensPendentes.find(v => v.id === id);
    if (!viagem) return;

    // Recalcula valor final com a config ATUAL (caso tenha mudado desde a gravação)
    const valorFinal = classificacao === 'trabalho' 
      ? calcularReembolso(viagem.distanciaKm, config)
      : 0;

    await Database.classificarViagem(id, classificacao, descricao, valorFinal);
    
    setViagensPendentes(prev => prev.filter(v => v.id !== id));
    if (classificacao === 'trabalho') {
      const viagemAtualizada = { ...viagem, classificacao, descricao, valor: valorFinal };
      setViagensConfirmadas(prev => [viagemAtualizada, ...prev]);
    }
  }, [viagensPendentes, config]);

  const editarViagem = useCallback(async (id, novosDados) => {
    // Atualiza apenas descrição (valor já foi fixado na classificação)
    setViagensConfirmadas(prev => prev.map(v => 
      v.id === id ? { ...v, ...novosDados } : v
    ));
  }, []);

  const excluirViagem = useCallback(async (id) => {
    setViagensConfirmadas(prev => prev.filter(v => v.id !== id));
  }, []);

  const salvarConfig = useCallback(async (novaConfig) => {
    await Database.salvarConfig(novaConfig);
    setConfig(prev => ({ ...prev, ...novaConfig }));
    Tracking.atualizarConfig(novaConfig);
  }, []);

  return (
    <AppContext.Provider value={{
      viagensPendentes, viagensConfirmadas, mesAtual, setMesAtual, config,
      totalKmMes: viagensConfirmadas.reduce((sum, v) => sum + (v.distanciaKm || 0), 0),
      totalReembolsoMes: viagensConfirmadas.reduce((sum, v) => sum + (v.valor || 0), 0),
      totalPendentes: viagensPendentes.length,
      rastreamentoAtivo,
      classificarViagem, editarViagem, excluirViagem, salvarConfig, carregarViagens, carregando,
    }}>
      {children}
    </AppContext.Provider>
  );
};
