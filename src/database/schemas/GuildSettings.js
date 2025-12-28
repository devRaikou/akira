/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ AKIRA BOT - SUNUCU AYARLARI SCHEMA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucu bazlı ayarları saklar
 */

const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    // Sunucu ID'si
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Log kanalı
    logChannel: {
        type: String,
        default: null
    },

    // Moderasyon log kanalı
    modLogChannel: {
        type: String,
        default: null
    },

    // Hoşgeldin kanalı
    welcomeChannel: {
        type: String,
        default: null
    },

    // Hoşgeldin mesajı
    welcomeMessage: {
        type: String,
        default: 'Hoş geldin {user}! Sunucumuza katıldığın için teşekkürler.'
    },

    // Ayrılma kanalı
    leaveChannel: {
        type: String,
        default: null
    },

    // Otomatik rol
    autoRole: {
        type: String,
        default: null
    },

    // Küfür filtresi
    profanityFilter: {
        enabled: { type: Boolean, default: false },
        words: [{ type: String }],
        action: { type: String, enum: ['warn', 'mute', 'kick', 'ban'], default: 'warn' }
    },

    // Anti-spam ayarları
    antiSpam: {
        enabled: { type: Boolean, default: false },
        maxMessages: { type: Number, default: 5 },
        interval: { type: Number, default: 5000 }, // ms
        action: { type: String, enum: ['warn', 'mute', 'kick'], default: 'warn' }
    },

    // Özel prefix (opsiyonel, slash command'larda kullanılmaz)
    prefix: {
        type: String,
        default: '!'
    },

    // Devre dışı bırakılan komutlar
    disabledCommands: [{
        type: String
    }],

    // Devre dışı bırakılan kanallar (komutlar için)
    disabledChannels: [{
        type: String
    }]
}, {
    timestamps: true
});

// ─────────────────────────────────────────────────────────────
// 📊 STATIC METODLAR
// ─────────────────────────────────────────────────────────────

/**
 * Sunucu ayarlarını bul veya oluştur
 */
guildSettingsSchema.statics.findOrCreate = async function(guildId) {
    let settings = await this.findOne({ guildId });
    
    if (!settings) {
        settings = await this.create({ guildId });
    }
    
    return settings;
};

/**
 * Belirli bir ayarı güncelle
 */
guildSettingsSchema.statics.updateSetting = async function(guildId, key, value) {
    return await this.findOneAndUpdate(
        { guildId },
        { $set: { [key]: value } },
        { new: true, upsert: true }
    );
};

/**
 * Komut devre dışı bırak
 */
guildSettingsSchema.statics.disableCommand = async function(guildId, commandName) {
    return await this.findOneAndUpdate(
        { guildId },
        { $addToSet: { disabledCommands: commandName } },
        { new: true, upsert: true }
    );
};

/**
 * Komut aktif et
 */
guildSettingsSchema.statics.enableCommand = async function(guildId, commandName) {
    return await this.findOneAndUpdate(
        { guildId },
        { $pull: { disabledCommands: commandName } },
        { new: true }
    );
};

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
