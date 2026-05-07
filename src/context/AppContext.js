/**
 * AppContext.js — Estado global com DADOS MOCKADOS para teste no browser/PC
 *
 * Para testar no PC (Expo Web): este arquivo usa dados simulados, sem SQLite nem GPS.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { calcularReembolso } from '../utils/calculos';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
};

const CONFIG_PADRAO = {
  modoCalculo: 'consumo',
  consumoMedio: 10,
  precoCombustivel: 6.5,
  valorPorKm: 0.60,
  raioGeofence: 300,
  baseLatitude: -16.6704,
  baseLongitude: -49.2552,
  notificacaoHora: 17,
  notificacaoDiaSemana: 5,
  distanciaMinima: 500,
};

const hoje = new Date();
const mesAtualStr = hoje.toISOString().slice(0, 7);

const gerarData = (diasAtras, hora, minuto) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
};

const VIAGENS_PENDENTES_MOCK = [
  {
    id: 'p1',
    inicio: gerarData(1, 9, 15),
    fim: gerarData(1, 9, 42),
    mesReferencia: mesAtualStr,
    distanciaMetros: 12400,
    distanciaKm: 12.4,
    localInicio: 'Safras & Cifras',
    localFim: 'Cartório 1º Ofício',
    valor: 8.06,
    classificacao: null,
  },
  {
    id: 'p2',
    inicio: gerarData(2, 14, 30),
    fim: gerarData(2, 15, 5),
    mesReferencia: mesAtualStr,
    distanciaMetros: 8700,
    distanciaKm: 8.7,
    localInicio: 'Shopping Flamboyant',
    localFim: 'Safras & Cifras',
    valor: 5.66,
    classificacao: null,
  }
];

const VIAGENS_CONFIRMADAS_MOCK = [
  {
    id: 'c1',
    inicio: gerarData(7, 8, 30),
    fim: gerarData(7, 9, 10),
    mesReferencia: mesAtualStr,
    distanciaMetros: 18600,
    distanciaKm: 18.6,
    localInicio: 'Safras & Cifras',
    localFim: 'Banco Bradesco',
    classificacao: 'trabalho',
    valor: 12.09,
    descricao: 'Depósito de cheques e retirada de extratos',
  }
];

export const AppProvider = ({ children }) => {
  const [viagensPendentes, setViagensPendentes] = useState(VIAGENS_PENDENTES_MOCK);
  const [viagensConfirmadas, setViagensConfirmadas] = useState(VIAGENS_CONFIRMADAS_MOCK);
  const [mesAtual, setMesAtual] = useState(mesAtualStr);
  const [config, setConfig] = useState(CONFIG_PADRAO);

  const classificarViagem = useCallback(async (id, classificacao, descricao = '') => {
    const viagem = viagensPendentes.find(v => v.id === id);
    setViagensPendentes(prev => prev.filter(v => v.id !== id));
    if (classificacao === 'trabalho' && viagem) {
      setViagensConfirmadas(prev => [{ ...viagem, classificacao: 'trabalho', descricao }, ...prev]);
    }
  }, [viagensPendentes]);

  const editarViagem = useCallback(async (id, novosDados) => {
    setViagensConfirmadas(prev => prev.map(v => 
      v.id === id ? { ...v, ...novosDados } : v
    ));
  }, []);

  const excluirViagem = useCallback(async (id) => {
    setViagensConfirmadas(prev => prev.filter(v => v.id !== id));
  }, []);

  const salvarConfig = useCallback(async (novaConfig) => {
    setConfig(prev => ({ ...prev, ...novaConfig }));
  }, []);

  const carregarViagens = useCallback(async () => {}, []);

  return (
    <AppContext.Provider value={{
      viagensPendentes, viagensConfirmadas, mesAtual, setMesAtual, config,
      totalKmMes: viagensConfirmadas.reduce((sum, v) => sum + (v.distanciaKm || 0), 0),
      totalReembolsoMes: viagensConfirmadas.reduce((sum, v) => sum + (v.valor || 0), 0),
      totalPendentes: viagensPendentes.length,
      rastreamentoAtivo: true, viagemEmAndamento: null,
      classificarViagem, editarViagem, excluirViagem, salvarConfig, carregarViagens, carregando: false,
    }}>
      {children}
    </AppContext.Provider>
  );
};
