/**
 * ═══════════════════════════════════════════════════════════════
 * ⏱️ AKIRA BOT - COOLDOWN SCHEMA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Komut cooldown verilerini MongoDB'de saklar
 */

const mongoose = require('mongoose');

const cooldownSchema = new mongoose.Schema({
    // Kullanıcı ID'si
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Komut adı
    commandName: {
        type: String,
        required: true,
        index: true
    },

    // Sunucu ID'si
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // Cooldown bitiş zamanı (TTL index aşağıda tanımlı)
    expiresAt: {
        type: Date,
        required: true
    },

    // Oluşturulma tarihi
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for faster queries
cooldownSchema.index({ userId: 1, commandName: 1, guildId: 1 }, { unique: true });

// TTL index - süresi dolan cooldown'ları otomatik sil
cooldownSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─────────────────────────────────────────────────────────────
// 📊 STATIC METODLAR
// ─────────────────────────────────────────────────────────────

/**
 * Cooldown kontrolü yap
 * @returns {number|null} Kalan süre (saniye) veya null (cooldown yok)
 */
cooldownSchema.statics.checkCooldown = async function(userId, commandName, guildId) {
    const cooldown = await this.findOne({
        userId,
        commandName,
        guildId,
        expiresAt: { $gt: new Date() }
    });

    if (cooldown) {
        const remaining = Math.ceil((cooldown.expiresAt - new Date()) / 1000);
        return remaining > 0 ? remaining : null;
    }

    return null;
};

/**
 * Cooldown ayarla
 */
cooldownSchema.statics.setCooldown = async function(userId, commandName, guildId, seconds) {
    const expiresAt = new Date(Date.now() + (seconds * 1000));

    return await this.findOneAndUpdate(
        { userId, commandName, guildId },
        { expiresAt, createdAt: new Date() },
        { upsert: true, new: true }
    );
};

/**
 * Cooldown temizle
 */
cooldownSchema.statics.clearCooldown = async function(userId, commandName, guildId) {
    return await this.deleteOne({ userId, commandName, guildId });
};

/**
 * Kullanıcının tüm cooldown'larını temizle
 */
cooldownSchema.statics.clearAllUserCooldowns = async function(userId, guildId) {
    return await this.deleteMany({ userId, guildId });
};

/**
 * Süresi dolmuş cooldown'ları manuel temizle
 */
cooldownSchema.statics.cleanupExpired = async function() {
    return await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

module.exports = mongoose.model('Cooldown', cooldownSchema);
