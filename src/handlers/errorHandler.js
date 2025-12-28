/**
 * ═══════════════════════════════════════════════════════════════
 * ❌ AKIRA BOT - ERROR HANDLER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Merkezi hata yönetimi
 */

const Logger = require('../utils/logger');
const EmbedHelper = require('../utils/embedHelper');

/**
 * Global hata yakalayıcıları ayarla
 * @param {Client} client - Discord.js Client
 */
function setupErrorHandlers(client) {
    // Uncaught Exception
    process.on('uncaughtException', (error) => {
        Logger.error('Yakalanmamış Hata:', error);
    });

    // Unhandled Promise Rejection
    process.on('unhandledRejection', (reason, promise) => {
        Logger.error('İşlenmemiş Promise Reddi:', reason);
    });

    // Discord.js Hataları
    client.on('error', (error) => {
        Logger.error('Discord.js Hatası:', error);
    });

    // Discord.js Uyarıları
    client.on('warn', (warning) => {
        Logger.warn('Discord.js Uyarısı:', warning);
    });

    // Shard Hataları (eğer sharding kullanılıyorsa)
    client.on('shardError', (error, shardId) => {
        Logger.error(`Shard ${shardId} Hatası:`, error);
    });

    // SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
        Logger.info('Bot kapatılıyor (SIGINT)...');
        await gracefulShutdown(client);
    });

    // SIGTERM
    process.on('SIGTERM', async () => {
        Logger.info('Bot kapatılıyor (SIGTERM)...');
        await gracefulShutdown(client);
    });

    Logger.debug('Hata yakalayıcıları ayarlandı.');
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown(client) {
    try {
        // MongoDB bağlantısını kapat
        const database = require('../database/connection');
        await database.disconnect();

        // Discord bağlantısını kapat
        client.destroy();

        Logger.info('Bot başarıyla kapatıldı.');
        process.exit(0);

    } catch (error) {
        Logger.error('Kapatma sırasında hata:', error);
        process.exit(1);
    }
}

/**
 * Komut hatası işle
 */
async function handleCommandError(interaction, error) {
    Logger.error(`Komut hatası [${interaction.commandName}]:`, error);

    const errorEmbed = EmbedHelper.error(
        'Bir Hata Oluştu',
        'Komut çalıştırılırken beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar dene.'
    );

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    } catch (e) {
        Logger.error('Hata mesajı gönderilemedi:', e);
    }
}

/**
 * Veritabanı hatası işle
 */
function handleDatabaseError(error, operation) {
    Logger.error(`Veritabanı hatası [${operation}]:`, error);
    
    // Kritik hata kontrolü
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        Logger.warn('Veritabanı bağlantısı kaybolmuş olabilir!');
    }
}

module.exports = {
    setupErrorHandlers,
    gracefulShutdown,
    handleCommandError,
    handleDatabaseError
};
