// src/services/powerManager.js
import { Logger } from '../utils/logger.js';

export class PowerManager {
  constructor(options = {}) {
    this.logger = new Logger('PowerManager');
    this.inactivityTimeout = options.inactivityTimeout || 5 * 60 * 1000; // Default 5 minutes
    this.services = new Map();
    this.isActive = true;
    this.inactivityTimer = null;
    this.initialized = false;
  }

  initialize() {
    this.initialized = true;
    this.logger.info('Power Manager initialized');
  }

  registerService(name, service) {
    if (!service.pause || !service.resume) {
      throw new Error(`Service ${name} must implement pause() and resume() methods`);
    }
    this.services.set(name, service);
    this.logger.info(`Registered service: ${name}`);
  }

  handleClientActivity() {
    if (!this.isActive) {
      this.resumeServices();
    }
    this.resetInactivityTimer();
  }

  resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.inactivityTimer = setTimeout(() => {
      this.pauseServices();
    }, this.inactivityTimeout);
  }

  async pauseServices() {
    if (!this.isActive) return;
    
    this.logger.info('Entering power-saving mode');
    this.isActive = false;

    for (const [name, service] of this.services) {
      try {
        await service.pause();
        this.logger.info(`Paused service: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to pause service ${name}:`, error);
      }
    }
  }

  async resumeServices() {
    if (this.isActive) return;
    
    this.logger.info('Resuming from power-saving mode');
    this.isActive = true;

    for (const [name, service] of this.services) {
      try {
        await service.resume();
        this.logger.info(`Resumed service: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to resume service ${name}:`, error);
      }
    }
  }

  stop() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
}