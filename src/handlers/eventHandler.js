/**
 * ═══════════════════════════════════════════════════════════════
 * 📡 AKIRA BOT - EVENT HANDLER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Discord.js event'lerini yükler ve yönetir.
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

/**
 * Tüm event'leri yükle
 * @param {Client} client - Discord.js Client
 */
async function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    
    // Event klasörü yoksa oluştur
    if (!fs.existsSync(eventsPath)) {
        Logger.warn('Event klasörü bulunamadı, oluşturuluyor...');
        fs.mkdirSync(eventsPath, { recursive: true });
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    let loadedCount = 0;

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);

            // Event validasyonu
            if (!event.name || !event.execute) {
                Logger.warn(`${file} geçersiz event formatı (name veya execute eksik)`);
                continue;
            }

            // Event'i kaydet
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            loadedCount++;
            Logger.debug(`Event yüklendi: ${event.name} ${event.once ? '(once)' : ''}`);

        } catch (error) {
            Logger.error(`Event yüklenemedi: ${file}`, error);
        }
    }

    Logger.success(`${loadedCount} event başarıyla yüklendi!`);
}

module.exports = { loadEvents };
