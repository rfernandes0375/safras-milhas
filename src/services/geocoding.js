/**
 * GeocodingService.js
 * 
 * Especialista em transformar coordenadas (lat/lon) em endereços legíveis.
 * Implementa lógica de re-tentativa (retry) para lidar com sinal de internet instável.
 */

import * as Location from 'expo-location';

/**
 * Busca o endereço de uma coordenada com lógica de re-tentativa.
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} maxRetries Máximo de tentativas (default 3)
 * @returns {Promise<string>} Endereço formatado ou "Local desconhecido"
 */
export async function obterEnderecoComRetry(latitude, longitude, maxRetries = 3) {
  let tentativa = 0;
  
  while (tentativa < maxRetries) {
    try {
      console.log(`[Geocoding] Tentativa ${tentativa + 1} para (${latitude}, ${longitude})`);
      
      const resultado = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (resultado && resultado[0]) {
        const { street, streetNumber, district, city, subregion, region } = resultado[0];
        
        // Constrói o endereço de forma inteligente, evitando campos nulos
        const partes = [];
        if (street) partes.push(street);
        if (streetNumber && streetNumber !== 'S/N') partes.push(streetNumber);
        
        let localidade = district || subregion || city || '';
        
        const enderecoBase = partes.join(', ');
        return enderecoBase ? `${enderecoBase} - ${localidade}` : localidade || 'Local identificado';
      }
    } catch (error) {
      console.warn(`[Geocoding] Falha na tentativa ${tentativa + 1}:`, error.message);
    }
    
    tentativa++;
    // Aguarda 1.5 segundos antes de tentar de novo (tempo para o sinal talvez estabilizar)
    if (tentativa < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  console.error('[Geocoding] Todas as tentativas falharam.');
  return 'Local desconhecido';
}
