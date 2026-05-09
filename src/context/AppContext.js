/**
 * AppContext.js — Estado global conectado ao SQLite
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Database from '../services/database';
import * as Tracking from '../services/tracking';
import { obterEnderecoComRetry } from '../services/geocoding';
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
  const [viagemEmCurso, setViagemEmCurso] = useState(false);

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
        onViagemDetectada: async (viagem) => {
          await handleNovaViagem(viagem);
          await carregarViagens(); // Recarrega para garantir que apareça na lista
        },
        onViagemAtualizada: (estado) => {
          setViagemEmCurso(!!estado?.emAndamento);
        }
      });
      setRastreamentoAtivo(!!ativo);

      // Recarga de segurança após iniciar o rastreamento (caso uma viagem órfã tenha sido recuperada)
      await carregarViagens();

    } catch (error) {
      console.error('[AppContext] Erro na inicialização:', error);
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
    const viagem = viagensConfirmadas.find(v => v.id === id);
    if (!viagem) return;

    const dadosAtualizados = { ...viagem, ...novosDados };
    
    // Persiste no Banco
    await Database.atualizarViagem(id, {
      descricao: dadosAtualizados.descricao,
      valor: dadosAtualizados.valor,
      classificacao: dadosAtualizados.classificacao
    });

    // Atualiza Estado
    setViagensConfirmadas(prev => prev.map(v => 
      v.id === id ? dadosAtualizados : v
    ));
  }, [viagensConfirmadas]);

  const excluirViagem = useCallback(async (id) => {
    await Database.excluirViagem(id);
    setViagensConfirmadas(prev => prev.filter(v => v.id !== id));
    setViagensPendentes(prev => prev.filter(v => v.id !== id));
  }, []);

  const limparLixeira = useCallback(async () => {
    await Database.limparLixeira();
  }, []);

  // 5. Recuperação de Endereço (Conserta "Local desconhecido")
  const tentarRecuperarEndereco = useCallback(async (viagem) => {
    if (!viagem) return;
    
    // Se ambos os endereços já estão preenchidos, não faz nada
    const inicioDesconhecido = !viagem.localInicio || viagem.localInicio === 'Local desconhecido';
    const fimDesconhecido = !viagem.localFim || viagem.localFim === 'Local desconhecido';
    
    if (!inicioDesconhecido && !fimDesconhecido) return;

    console.log(`[AppContext] Tentando recuperar endereços para viagem ${viagem.id}`);
    
    const [novoInicio, novoFim] = await Promise.all([
      inicioDesconhecido ? obterEnderecoComRetry(viagem.latInicio, viagem.lngInicio) : Promise.resolve(viagem.localInicio),
      fimDesconhecido ? obterEnderecoComRetry(viagem.latFim, viagem.lngFim) : Promise.resolve(viagem.localFim)
    ]);

    if (novoInicio !== viagem.localInicio || novoFim !== viagem.localFim) {
      await Database.atualizarEnderecosViagem(viagem.id, novoInicio, novoFim);
      
      // Atualiza o estado local para refletir na UI imediatamente
      const atualizarLista = (lista) => lista.map(v => v.id === viagem.id ? { ...v, localInicio: novoInicio, localFim: novoFim } : v);
      
      setViagensPendentes(atualizarLista);
      setViagensConfirmadas(atualizarLista);
    }
  }, []);

  const salvarConfig = useCallback(async (novaConfig) => {
    await Database.salvarConfig(novaConfig);
    setConfig(prev => ({ ...prev, ...novaConfig }));
    Tracking.atualizarConfig(novaConfig);
  }, []);

  const pararViagem = useCallback(async () => {
    const sucesso = await Tracking.pararViagemManualmente();
    if (sucesso) await carregarViagens();
    return sucesso;
  }, [carregarViagens]);

  return (
    <AppContext.Provider value={{
      viagensPendentes, viagensConfirmadas, mesAtual, setMesAtual, config,
      totalKmMes: viagensConfirmadas.reduce((sum, v) => sum + (v.distanciaKm || 0), 0),
      totalReembolsoMes: viagensConfirmadas.reduce((sum, v) => sum + (v.valor || 0), 0),
      totalPendentes: viagensPendentes.length,
      rastreamentoAtivo,
      viagemEmCurso,
      classificarViagem, editarViagem, excluirViagem, salvarConfig, carregarViagens, carregando,
      pararViagem,
      tentarRecuperarEndereco,
      limparLixeira,
      inicializarApp,
    }}>
      {children}
    </AppContext.Provider>
  );
};
