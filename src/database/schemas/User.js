/**
 * ═══════════════════════════════════════════════════════════════
 * 👤 AKIRA BOT - KULLANICI SCHEMA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcı verilerini saklamak için mongoose schema
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Discord kullanıcı ID'si
    discordId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Kullanıcı adı (cache için)
    username: {
        type: String,
        required: true
    },

    // Sunucu ID'si
    guildId: {
        type: String,
        required: true,
        index: true
    },

    // Uyarı sayısı
    warnings: {
        type: Number,
        default: 0
    },

    // Uyarı detayları
    warningHistory: [{
        reason: String,
        moderatorId: String,
        date: { type: Date, default: Date.now }
    }],

    // Toplam komut kullanımı
    commandsUsed: {
        type: Number,
        default: 0
    },

    // VIP durumu
    isVip: {
        type: Boolean,
        default: false
    },

    // Özel notlar
    notes: {
        type: String,
        default: ''
    },

    // İlk kayıt tarihi
    createdAt: {
        type: Date,
        default: Date.now
    },

    // Son güncelleme tarihi
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// ─────────────────────────────────────────────────────────────
// 📊 STATIC METODLAR
// ─────────────────────────────────────────────────────────────

/**
 * Kullanıcıyı bul veya oluştur
 */
userSchema.statics.findOrCreate = async function(discordId, username, guildId) {
    let user = await this.findOne({ discordId, guildId });
    
    if (!user) {
        user = await this.create({
            discordId,
            username,
            guildId
        });
    } else {
        // Username güncellemesi
        if (user.username !== username) {
            user.username = username;
            await user.save();
        }
    }
    
    return user;
};

/**
 * Uyarı ekle
 */
userSchema.statics.addWarning = async function(discordId, guildId, reason, moderatorId) {
    const user = await this.findOne({ discordId, guildId });
    
    if (!user) {
        throw new Error('Kullanıcı bulunamadı');
    }

    user.warnings += 1;
    user.warningHistory.push({
        reason,
        moderatorId,
        date: new Date()
    });
    
    return await user.save();
};

/**
 * Komut kullanımını artır
 */
userSchema.statics.incrementCommandUsage = async function(discordId, guildId) {
    return await this.findOneAndUpdate(
        { discordId, guildId },
        { $inc: { commandsUsed: 1 }, $set: { updatedAt: new Date() } },
        { new: true }
    );
};

module.exports = mongoose.model('User', userSchema);
