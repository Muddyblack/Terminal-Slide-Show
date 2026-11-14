import fs from 'fs/promises';
import path from 'path';

/**
 * Reads a JSON content file (quotes, facts, greetings) for the configured language.
 * Looks in the content directory per language first, then directly in it (a simple
 * custom pack), then falls back to the bundled German files.
 * @param {string} name - File name, e.g. 'quotes.json'
 * @param {Object} options
 * @param {string} options.dataPath - Content directory
 * @param {string} options.language - Language code, e.g. 'de'
 * @param {string} options.bundledPath - Bundled content directory
 * @returns {Promise<any>}
 */
export async function readLocalizedData(name, { dataPath, language, bundledPath }) {
  const candidates = [
    path.join(dataPath, language, name),
    path.join(dataPath, name),
    path.join(bundledPath, language, name),
    path.join(bundledPath, 'de', name),
  ];

  for (const file of candidates) {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`No content file found for ${name}`);
}
