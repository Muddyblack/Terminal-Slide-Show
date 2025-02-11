/**
 * @fileoverview Manages slideshow media files and client sessions
 * @module SlideshowManager
 */

import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { DateParser } from '../utils/dateParser.js';
import { config } from '../../config/config.js';
import { isValidFile } from '../utils/fileValidator.js';

/**
 * @typedef {Object} MediaFile
 * @property {string} name - File name
 * @property {string} path - Full file path
 * @property {Object} [dates] - Parsed dates from filename
 * @property {boolean} [isDynamicView] - Whether this is a dynamic view
 */

/**
 * @typedef {Object} ClientSession
 * @property {number} currentIndex - Current media index
 * @property {number} lastAccessed - Timestamp of last access
 */


/**
 * Manages slideshow media files and client sessions
 * @class SlideshowManager
 */
export class SlideshowManager {
  /**
   * Creates a new SlideshowManager instance
   * @constructor
   */
  constructor() {
    /** @private @type {Logger} */
    this.logger = new Logger('SlideshowManager');
    /** @private @type {string} */
    this.downloadPath = config.paths.downloadPath;
    /** @private @type {string} */
    this.mediaPath = path.join(process.cwd(), this.downloadPath);
    /** @private @type {MediaFile[]} */
    this.mediaFiles = [];
    /** @private @type {NodeJS.Timeout|null} */
    this.watchInterval = null;
    /** @private @type {boolean} */
    this.initialized = false;
    /** @private @type {boolean} */
    this.isPaused = false;
    /** @private @type {MediaFile} */
    this.dynamicView = {
      name: 'dynamic-view',
      path: null,
      isDynamicView: true
    };
  }

    /**
   * Initializes the slideshow manager
   * @async
   * @returns {Promise<void>}
   */
    async initialize() {
      await fs.ensureDir(this.mediaPath);
      await this.updateMediaList();
      this.startWatching(config.slideshow.watchInterval);
      this.initialized = true;
      return;
    }

  /**
   * Checks if manager is initialized
   * @returns {boolean} Initialization status
   */
  isInitialized() {
    return this.initialized;
  }

    /**
   * Updates the list of available media files
   * @async
   * @private
   * @returns {Promise<void>}
   */
  async updateMediaList() {
    if (this.isPaused) return;

    try {
      const files = await fs.readdir(this.mediaPath);
      const fileMedias = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return config.mediaTypes.imageTypes.includes(ext) || config.mediaTypes.videoTypes.includes(ext);
        })
        .map(file => {
          const parsedInfo = DateParser.parseFileName(file);
          return {
            name: file,
            path: path.join(this.mediaPath, file),
            dates: parsedInfo,
            duration: parsedInfo.duration
          };
        })
        .filter(file => isValidFile(file.name));

      // Create new media list
      const newMediaList = [
        ...fileMedias.slice(0, Math.floor(fileMedias.length / 2)),
        this.dynamicView,
        ...fileMedias.slice(Math.floor(fileMedias.length / 2))
      ];

      // Check if media list has changed
      const hasChanged = JSON.stringify(this.mediaFiles) !== JSON.stringify(newMediaList);

      if (hasChanged) {
        this.mediaFiles = newMediaList;
        this.logger.info(`Updated media list: ${this.mediaFiles.length} files`);
        
        // Broadcast update to all connected clients
        if (global.webSocketManager) {
          global.webSocketManager.broadcastUpdate(this.mediaFiles);
        }
      }
    } catch (error) {
      this.logger.error('Failed to update media list:', error);
    }
  }

      /**
   * Starts watching for media changes
   * @param {number} [interval=1000] - Watch interval in milliseconds
   */
  startWatching(interval = 1000) {
    if (this.isPaused) return;

    this.watchInterval = setInterval(async () => {
      if (!this.isPaused) {
        await this.updateMediaList();
      }
    }, interval);
  }

    /**
   * Stops watching for media changes
   */
  stop() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

    /**
   * Pauses slideshow manager operations
   * @async
   * @returns {Promise<void>}
   */
  async pause() {
    this.logger.info('Pausing Slideshow Manager');
    this.isPaused = true;
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

    /**
   * Resumes slideshow manager operations
   * @async
   * @returns {Promise<void>}
   */
  async resume() {
    this.logger.info('Resuming Slideshow Manager');
    this.isPaused = false;
    await this.updateMediaList();
    this.startWatching(config.slideshow.watchInterval);
  }

  /**
   * Gets all available media files
   * @returns {MediaFile[]} Array of media files
   */
  getAllMedia() {
    return this.mediaFiles;
  }
}