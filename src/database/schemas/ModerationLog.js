/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 AKIRA BOT - MODERASYON LOG SCHEMA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tüm moderasyon işlemlerini veritabanında saklar
 */

const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
    // Case numarası (sunucu bazlı otomatik artan)
    caseId: {
        type: Number,
        required: true
    },

    // Sunucu ID'si
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // İşlem türü
    action: {
        type: String,
        enum: ['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'timeout', 'clear'],
        required: true
    },

    // Hedef kullanıcı bilgileri
    target: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        displayName: { type: String },
        avatarUrl: { type: String }
    },

    // Moderatör bilgileri
    moderator: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        displayName: { type: String }
    },

    // Sebep
    reason: {
        type: String,
        default: 'Sebep belirtilmedi'
    },

    // Süre (timeout, mute, tempban için)
    duration: {
        value: { type: Number, default: null },
        unit: { type: String, enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'permanent'], default: 'permanent' },
        expiresAt: { type: Date, default: null }
    },

    // Ek bilgiler
    details: {
        messagesDeleted: { type: Number, default: 0 },  // Temizle komutu için
        deletedMessageDays: { type: Number, default: 0 }, // Ban komutu için
        channelId: { type: String },                     // İşlemin yapıldığı kanal
        channelName: { type: String }
    },

    // DM gönderildi mi?
    dmSent: {
        type: Boolean,
        default: false
    },

    // Log mesajı ID'si (düzenleme için)
    logMessageId: {
        type: String,
        default: null
    },

    // İşlem durumu
    active: {
        type: Boolean,
        default: true
    },

    // İşlemin geri alınma bilgisi
    revoked: {
        isRevoked: { type: Boolean, default: false },
        revokedBy: { type: String, default: null },
        revokedAt: { type: Date, default: null },
        revokeReason: { type: String, default: null }
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
moderationLogSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
moderationLogSchema.index({ guildId: 1, 'target.userId': 1 });
moderationLogSchema.index({ guildId: 1, action: 1 });
moderationLogSchema.index({ guildId: 1, createdAt: -1 });

// ─────────────────────────────────────────────────────────────
// 📊 STATIC METODLAR
// ─────────────────────────────────────────────────────────────

/**
 * Yeni case ID oluştur
 */
moderationLogSchema.statics.getNextCaseId = async function(guildId) {
    const lastCase = await this.findOne({ guildId }).sort({ caseId: -1 });
    return lastCase ? lastCase.caseId + 1 : 1;
};

/**
 * Yeni moderasyon kaydı oluştur
 */
moderationLogSchema.statics.createLog = async function(data) {
    const caseId = await this.getNextCaseId(data.guildId);
    return await this.create({ ...data, caseId });
};

/**
 * Case ID'ye göre bul
 */
moderationLogSchema.statics.findByCase = async function(guildId, caseId) {
    return await this.findOne({ guildId, caseId });
};

/**
 * Kullanıcının tüm kayıtlarını getir
 */
moderationLogSchema.statics.getUserHistory = async function(guildId, userId, limit = 10) {
    return await this.find({ guildId, 'target.userId': userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Kullanıcının belirli türdeki kayıtlarını getir
 */
moderationLogSchema.statics.getUserActionHistory = async function(guildId, userId, action, limit = 10) {
    return await this.find({ guildId, 'target.userId': userId, action })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Kullanıcının aktif cezalarını getir
 */
moderationLogSchema.statics.getActivePunishments = async function(guildId, userId) {
    return await this.find({
        guildId,
        'target.userId': userId,
        active: true,
        action: { $in: ['ban', 'mute', 'timeout'] }
    });
};

/**
 * Sunucunun son moderasyon işlemlerini getir
 */
moderationLogSchema.statics.getRecentLogs = async function(guildId, limit = 25) {
    return await this.find({ guildId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Moderatörün işlemlerini getir
 */
moderationLogSchema.statics.getModeratorLogs = async function(guildId, moderatorId, limit = 25) {
    return await this.find({ guildId, 'moderator.userId': moderatorId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Case'i geri al
 */
moderationLogSchema.statics.revokeCase = async function(guildId, caseId, revokedBy, reason) {
    return await this.findOneAndUpdate(
        { guildId, caseId },
        {
            $set: {
                active: false,
                'revoked.isRevoked': true,
                'revoked.revokedBy': revokedBy,
                'revoked.revokedAt': new Date(),
                'revoked.revokeReason': reason
            }
        },
        { new: true }
    );
};

/**
 * Sunucu istatistiklerini getir
 */
moderationLogSchema.statics.getGuildStats = async function(guildId) {
    const stats = await this.aggregate([
        { $match: { guildId } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        total: 0,
        ban: 0,
        unban: 0,
        kick: 0,
        mute: 0,
        unmute: 0,
        warn: 0,
        timeout: 0,
        clear: 0
    };

    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });

    return result;
};

/**
 * Case'i güncelle
 */
moderationLogSchema.statics.updateCase = async function(guildId, caseId, updates) {
    return await this.findOneAndUpdate(
        { guildId, caseId },
        { $set: updates },
        { new: true }
    );
};

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
