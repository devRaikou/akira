/**
 * ═══════════════════════════════════════════════════════════════
 * 🗄️ AKIRA BOT - MONGODB BAĞLANTI MODÜLÜ
 * ═══════════════════════════════════════════════════════════════
 * 
 * Mongoose kullanarak MongoDB bağlantısını yönetir.
 * Otomatik yeniden bağlanma ve hata yönetimi içerir.
 */

const mongoose = require('mongoose');
const Logger = require('../utils/logger');
const config = require('../config/botConfig');

class Database {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * MongoDB'ye bağlanır
     * @returns {Promise<mongoose.Connection>}
     */
    async connect() {
        try {
            Logger.info('MongoDB bağlantısı kuruluyor...');

            // Mongoose bağlantı event'leri
            mongoose.connection.on('connected', () => {
                this.isConnected = true;
                Logger.success('MongoDB bağlantısı başarıyla kuruldu!');
            });

            mongoose.connection.on('disconnected', () => {
                this.isConnected = false;
                Logger.warn('MongoDB bağlantısı kesildi!');
            });

            mongoose.connection.on('error', (error) => {
                Logger.error('MongoDB bağlantı hatası:', error);
            });

            mongoose.connection.on('reconnected', () => {
                this.isConnected = true;
                Logger.info('MongoDB yeniden bağlandı!');
            });

            // Bağlantıyı kur
            this.connection = await mongoose.connect(config.database.uri, config.database.options);

            return this.connection;

        } catch (error) {
            Logger.error('MongoDB bağlantısı kurulamadı:', error);
            throw error;
        }
    }

    /**
     * MongoDB bağlantısını kapatır
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (this.connection) {
                await mongoose.connection.close();
                this.isConnected = false;
                Logger.info('MongoDB bağlantısı kapatıldı.');
            }
        } catch (error) {
            Logger.error('MongoDB bağlantısı kapatılırken hata:', error);
            throw error;
        }
    }

    /**
     * Bağlantı durumunu kontrol eder
     * @returns {boolean}
     */
    checkConnection() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    /**
     * Veritabanı ping testi
     * @returns {Promise<number>} Ping süresi (ms)
     */
    async ping() {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        return Date.now() - start;
    }
}

// Singleton instance
module.exports = new Database();
