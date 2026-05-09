/**
 * database.js — Camada de persistência local com SQLite
 */

import * as SQLite from 'expo-sqlite';

let db = null;
let inicializandoPromise = null;

const obterDB = async () => {
  if (db) return db;
  if (inicializandoPromise) return inicializandoPromise;

  inicializandoPromise = (async () => {
    const database = await SQLite.openDatabaseAsync('safras_milhas.db');
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync(`
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
        descricao TEXT,
        criado_em TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS estado_rastreamento (
        id INTEGER PRIMARY KEY,
        dados TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pontos_viagem_atual (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        t INTEGER NOT NULL
      );
    `);
    db = database;
    return database;
  })();

  return inicializandoPromise;
};

export const inicializar = async () => {
  await obterDB();
};

export const adicionarPontoTemporario = async (lat, lng, t) => {
  const database = await obterDB();
  await database.runAsync(
    `INSERT INTO pontos_viagem_atual (lat, lng, t) VALUES (?, ?, ?)`,
    [lat, lng, t]
  );
};

export const buscarPontosTemporarios = async () => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT lat, lng, t FROM pontos_viagem_atual ORDER BY t ASC`);
  return rows.map(r => ({ lat: r.lat, lng: r.lng, t: r.t }));
};

export const limparPontosTemporarios = async () => {
  const database = await obterDB();
  await database.runAsync(`DELETE FROM pontos_viagem_atual`);
};

export const salvarEstadoRastreamento = async (estado) => {
  const database = await obterDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO estado_rastreamento (id, dados) VALUES (1, ?)`,
    [JSON.stringify(estado)]
  );
};

export const buscarEstadoRastreamento = async () => {
  const database = await obterDB();
  const row = await database.getFirstAsync(`SELECT dados FROM estado_rastreamento WHERE id = 1`);
  return row ? JSON.parse(row.dados) : null;
};

export const limparEstadoRastreamento = async () => {
  const database = await obterDB();
  await database.runAsync(`DELETE FROM estado_rastreamento WHERE id = 1`);
};

export const salvarViagem = async (viagem) => {
  const database = await obterDB();
  const id = `v_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const mesReferencia = viagem.inicio.slice(0, 7);
  await database.runAsync(
    `INSERT INTO viagens (id,inicio,fim,mes_referencia,distancia_metros,distancia_km,local_inicio,local_fim,latitude_inicio,longitude_inicio,latitude_fim,longitude_fim,coordenadas,classificacao,provavel_trabalho,valor,descricao) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, viagem.inicio, viagem.fim, mesReferencia, viagem.distanciaMetros, viagem.distanciaKm, viagem.localInicio||null, viagem.localFim||null, viagem.latInicio||null, viagem.lngInicio||null, viagem.latFim||null, viagem.lngFim||null, JSON.stringify(viagem.coordenadas||[]), null, viagem.provalTrabalho?1:0, viagem.valor||0, viagem.descricao||null]
  );
  return { id, mesReferencia, ...viagem };
};

export const buscarViagensPendentes = async () => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT * FROM viagens WHERE classificacao IS NULL ORDER BY inicio DESC`);
  return rows.map(mapearViagem);
};

export const buscarViagensConfirmadas = async (mes) => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT * FROM viagens WHERE classificacao = 'trabalho' AND mes_referencia = ? ORDER BY inicio DESC`, [mes]);
  return rows.map(mapearViagem);
};

export const buscarMesesDisponiveis = async () => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT DISTINCT mes_referencia FROM viagens WHERE classificacao = 'trabalho' ORDER BY mes_referencia DESC`);
  return rows.map(r => r.mes_referencia);
};

export const buscarViagensDescartadas = async () => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT * FROM viagens WHERE classificacao IN ('pessoal', 'descartada') ORDER BY inicio DESC`);
  return rows.map(mapearViagem);
};

export const restaurarViagem = async (id) => {
  const database = await obterDB();
  await database.runAsync(`UPDATE viagens SET classificacao = NULL WHERE id = ?`, [id]);
};

export const buscarViagemPorId = async (id) => {
  const database = await obterDB();
  const row = await database.getFirstAsync(`SELECT * FROM viagens WHERE id = ?`, [id]);
  return row ? mapearViagem(row) : null;
};

export const classificarViagem = async (id, classificacao, descricao = null, valor = 0) => {
  const database = await obterDB();
  await database.runAsync(
    `UPDATE viagens SET classificacao = ?, descricao = ?, valor = ? WHERE id = ?`,
    [classificacao, descricao, valor, id]
  );
};

export const atualizarViagem = async (id, { descricao, valor, classificacao }) => {
  const database = await obterDB();
  await database.runAsync(
    `UPDATE viagens SET descricao = ?, valor = ?, classificacao = ? WHERE id = ?`,
    [descricao, valor, classificacao, id]
  );
};

export const excluirViagem = async (id) => {
  const database = await obterDB();
  await database.runAsync(`UPDATE viagens SET classificacao = 'descartada' WHERE id = ?`, [id]);
};

export const excluirPermanente = async (id) => {
  const database = await obterDB();
  await database.runAsync(`DELETE FROM viagens WHERE id = ?`, [id]);
};

export const limparLixeira = async () => {
  const database = await obterDB();
  await database.runAsync(`DELETE FROM viagens WHERE classificacao IN ('pessoal', 'descartada', 'descartado')`);
};

export const atualizarEnderecosViagem = async (id, localInicio, localFim) => {
  const database = await obterDB();
  await database.runAsync(
    `UPDATE viagens SET local_inicio = ?, local_fim = ? WHERE id = ?`,
    [localInicio, localFim, id]
  );
};

export const salvarConfig = async (config) => {
  const database = await obterDB();
  for (const [chave, valor] of Object.entries(config)) {
    await database.runAsync(`INSERT OR REPLACE INTO config (chave, valor) VALUES (?, ?)`, [chave, String(valor)]);
  }
};

export const buscarConfig = async () => {
  const database = await obterDB();
  const rows = await database.getAllAsync(`SELECT * FROM config`);
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
  descricao: row.descricao,
  criadoEm: row.criado_em,
});
