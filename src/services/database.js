/**
 * database.js — Camada de persistência local com SQLite
 */

import * as SQLite from 'expo-sqlite';

let db = null;

export const inicializar = async () => {
  db = await SQLite.openDatabaseAsync('safras_milhas.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS viagens (
      id TEXT PRIMARY KEY,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      mes_referencia TEXT NOT NULL,
      distancia_metros REAL NOT NULL,
      distancia_km REAL NOT NULL,
      local_inicio TEXT,
      local_fim TEXT,
      latitude_inicio REAL,
      longitude_inicio REAL,
      latitude_fim REAL,
      longitude_fim REAL,
      coordenadas TEXT,
      classificacao TEXT,
      provavel_trabalho INTEGER DEFAULT 0,
      valor REAL DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);
};

export const salvarViagem = async (viagem) => {
  const id = `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const mesReferencia = viagem.inicio.slice(0, 7);
  await db.runAsync(
    `INSERT INTO viagens (id,inicio,fim,mes_referencia,distancia_metros,distancia_km,local_inicio,local_fim,latitude_inicio,longitude_inicio,latitude_fim,longitude_fim,coordenadas,classificacao,provavel_trabalho,valor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, viagem.inicio, viagem.fim, mesReferencia, viagem.distanciaMetros, viagem.distanciaKm, viagem.localInicio||null, viagem.localFim||null, viagem.latInicio||null, viagem.lngInicio||null, viagem.latFim||null, viagem.lngFim||null, JSON.stringify(viagem.coordenadas||[]), null, viagem.provalTrabalho?1:0, viagem.valor||0]
  );
  return { id, mesReferencia, ...viagem };
};

export const buscarViagensPendentes = async () => {
  const rows = await db.getAllAsync(`SELECT * FROM viagens WHERE classificacao IS NULL ORDER BY inicio DESC`);
  return rows.map(mapearViagem);
};

export const buscarViagensConfirmadas = async (mes) => {
  const rows = await db.getAllAsync(`SELECT * FROM viagens WHERE classificacao = 'trabalho' AND mes_referencia = ? ORDER BY inicio DESC`, [mes]);
  return rows.map(mapearViagem);
};

export const buscarMesesDisponiveis = async () => {
  const rows = await db.getAllAsync(`SELECT DISTINCT mes_referencia FROM viagens WHERE classificacao = 'trabalho' ORDER BY mes_referencia DESC`);
  return rows.map(r => r.mes_referencia);
};

export const buscarViagemPorId = async (id) => {
  const row = await db.getFirstAsync(`SELECT * FROM viagens WHERE id = ?`, [id]);
  return row ? mapearViagem(row) : null;
};

export const classificarViagem = async (id, classificacao) => {
  await db.runAsync(`UPDATE viagens SET classificacao = ? WHERE id = ?`, [classificacao, id]);
};

export const salvarConfig = async (config) => {
  for (const [chave, valor] of Object.entries(config)) {
    await db.runAsync(`INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)`, [chave, String(valor)]);
  }
};

export const buscarConfig = async () => {
  const rows = await db.getAllAsync(`SELECT * FROM config`);
  if (rows.length === 0) return null;
  const config = {};
  rows.forEach(row => {
    const n = Number(row.valor);
    config[row.chave] = isNaN(n) ? row.valor : n;
  });
  return config;
};

const mapearViagem = (row) => ({
  id: row.id,
  inicio: row.inicio,
  fim: row.fim,
  mesReferencia: row.mes_referencia,
  distanciaMetros: row.distancia_metros,
  distanciaKm: row.distancia_km,
  localInicio: row.local_inicio,
  localFim: row.local_fim,
  latInicio: row.latitude_inicio,
  lngInicio: row.longitude_inicio,
  latFim: row.latitude_fim,
  lngFim: row.longitude_fim,
  coordenadas: (() => { try { return JSON.parse(row.coordenadas||'[]'); } catch { return []; } })(),
  classificacao: row.classificacao,
  provalTrabalho: row.provavel_trabalho === 1,
  valor: row.valor,
  criadoEm: row.criado_em,
});
