/**
 * ═══════════════════════════════════════════════════════════════
 * ⏱️ AKIRA BOT - COOLDOWN MANAGER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Komut cooldown yönetimi - Memory ve MongoDB desteği
 */

const config = require('../config/botConfig');
const { Cooldown } = require('../database');
const Logger = require('./logger');

class CooldownManager {
    constructor() {
        // Memory-based cooldown storage (fallback)
        this.cooldowns = new Map();
        
        // Periyodik temizlik
        this.startCleanupInterval();
    }

    /**
     * Geliştirici kontrolü
     */
    isDeveloper(userId) {
        return config.developers.ids.includes(userId);
    }

    /**
     * Cooldown kontrolü yap
     * @param {string} userId - Kullanıcı ID
     * @param {string} commandName - Komut adı
     * @param {string} guildId - Sunucu ID
     * @returns {Promise<number|null>} Kalan süre (saniye) veya null
     */
    async check(userId, commandName, guildId) {
        // Geliştirici bypass kontrolü
        if (config.developers.privileges.bypassCooldown && this.isDeveloper(userId)) {
            return null;
        }

        // Database kullanılıyorsa
        if (config.cooldown.useDatabase) {
            try {
                return await Cooldown.checkCooldown(userId, commandName, guildId);
            } catch (error) {
                Logger.error('Cooldown DB kontrolü başarısız, memory kullanılıyor:', error);
                return this.checkMemory(userId, commandName, guildId);
            }
        }

        // Memory-based kontrol
        return this.checkMemory(userId, commandName, guildId);
    }

    /**
     * Memory-based cooldown kontrolü
     */
    checkMemory(userId, commandName, guildId) {
        const key = `${userId}-${commandName}-${guildId}`;
        const expiry = this.cooldowns.get(key);

        if (expiry && expiry > Date.now()) {
            return Math.ceil((expiry - Date.now()) / 1000);
        }

        return null;
    }

    /**
     * Cooldown ayarla
     * @param {string} userId - Kullanıcı ID
     * @param {string} commandName - Komut adı
     * @param {string} guildId - Sunucu ID
     * @param {number} seconds - Cooldown süresi (saniye)
     */
    async set(userId, commandName, guildId, seconds) {
        // Geliştirici için cooldown ayarlama
        if (config.developers.privileges.bypassCooldown && this.isDeveloper(userId)) {
            return;
        }

        // Cooldown süresini sınırla
        const cooldownSeconds = Math.min(seconds, config.cooldown.maxCooldown);

        // Database kullanılıyorsa
        if (config.cooldown.useDatabase) {
            try {
                await Cooldown.setCooldown(userId, commandName, guildId, cooldownSeconds);
                return;
            } catch (error) {
                Logger.error('Cooldown DB ayarlaması başarısız, memory kullanılıyor:', error);
            }
        }

        // Memory-based ayarlama
        const key = `${userId}-${commandName}-${guildId}`;
        this.cooldowns.set(key, Date.now() + (cooldownSeconds * 1000));
    }

    /**
     * Cooldown temizle
     */
    async clear(userId, commandName, guildId) {
        if (config.cooldown.useDatabase) {
            try {
                await Cooldown.clearCooldown(userId, commandName, guildId);
            } catch (error) {
                Logger.error('Cooldown DB temizleme hatası:', error);
            }
        }

        const key = `${userId}-${commandName}-${guildId}`;
        this.cooldowns.delete(key);
    }

    /**
     * Kullanıcının tüm cooldown'larını temizle
     */
    async clearAll(userId, guildId) {
        if (config.cooldown.useDatabase) {
            try {
                await Cooldown.clearAllUserCooldowns(userId, guildId);
            } catch (error) {
                Logger.error('Cooldown DB toplu temizleme hatası:', error);
            }
        }

        // Memory'den temizle
        for (const [key] of this.cooldowns) {
            if (key.startsWith(`${userId}-`) && key.endsWith(`-${guildId}`)) {
                this.cooldowns.delete(key);
            }
        }
    }

    /**
     * Periyodik temizlik başlat
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupMemory();
        }, config.cooldown.cleanupInterval);
    }

    /**
     * Süresi dolmuş memory cooldown'larını temizle
     */
    cleanupMemory() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, expiry] of this.cooldowns) {
            if (expiry <= now) {
                this.cooldowns.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            Logger.debug(`${cleaned} adet süresi dolmuş cooldown temizlendi (memory)`);
        }
    }

    /**
     * Kalan süreyi formatla
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds} saniye`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return secs > 0 ? `${minutes} dakika ${secs} saniye` : `${minutes} dakika`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours} saat ${minutes} dakika` : `${hours} saat`;
        }
    }
}

// Singleton instance
module.exports = new CooldownManager();
