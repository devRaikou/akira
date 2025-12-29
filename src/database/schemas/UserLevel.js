/**
 * ═══════════════════════════════════════════════════════════════
 * ⭐ AKIRA BOT - SEVİYE SİSTEMİ SCHEMA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcı seviye ve XP verilerini saklar
 */

const mongoose = require('mongoose');

const userLevelSchema = new mongoose.Schema({
    // Discord kullanıcı ID'si
    discordId: {
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

    // Kullanıcı adı (cache için)
    username: {
        type: String,
        required: true
    },

    // Display name
    displayName: {
        type: String,
        default: null
    },

    // Avatar URL (cache için)
    avatarUrl: {
        type: String,
        default: null
    },

    // Mevcut seviye
    level: {
        type: Number,
        default: 0,
        min: 0
    },

    // Mevcut XP
    xp: {
        type: Number,
        default: 0,
        min: 0
    },

    // Toplam kazanılan XP
    totalXp: {
        type: Number,
        default: 0,
        min: 0
    },

    // Toplam gönderilen mesaj sayısı
    messageCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Son mesaj zamanı (spam koruması için)
    lastMessageAt: {
        type: Date,
        default: null
    },

    // Günlük XP (günlük limit için)
    dailyXp: {
        amount: { type: Number, default: 0 },
        date: { type: String, default: null } // YYYY-MM-DD formatında
    },

    // Haftalık XP
    weeklyXp: {
        amount: { type: Number, default: 0 },
        week: { type: String, default: null } // YYYY-WW formatında
    },

    // XP boost çarpanı
    xpMultiplier: {
        type: Number,
        default: 1.0,
        min: 0.1,
        max: 10.0
    },

    // Boost bitiş tarihi
    boostExpiresAt: {
        type: Date,
        default: null
    },

    // Kart özelleştirme
    cardSettings: {
        // Arka plan rengi veya görsel URL
        background: {
            type: { type: String, enum: ['color', 'image', 'gradient'], default: 'gradient' },
            value: { type: String, default: '#1a1a2e,#16213e' } // Gradient için virgülle ayrılmış
        },
        // Progress bar rengi
        progressBarColor: {
            type: String,
            default: '#5865F2'
        },
        // Accent rengi
        accentColor: {
            type: String,
            default: '#ffffff'
        },
        // Metin rengi
        textColor: {
            type: String,
            default: '#ffffff'
        },
        // Opaklık
        opacity: {
            type: Number,
            default: 0.8,
            min: 0.1,
            max: 1.0
        }
    },

    // Başarımlar
    achievements: [{
        id: String,
        name: String,
        description: String,
        unlockedAt: { type: Date, default: Date.now },
        icon: String
    }],

    // Rozetler
    badges: [{
        id: String,
        name: String,
        icon: String,
        obtainedAt: { type: Date, default: Date.now }
    }],

    // Seviye atlama geçmişi
    levelHistory: [{
        level: Number,
        reachedAt: { type: Date, default: Date.now },
        totalXpAtLevel: Number
    }]
}, {
    timestamps: true
});

// Compound index for unique user per guild
userLevelSchema.index({ discordId: 1, guildId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, totalXp: -1 }); // Leaderboard için
userLevelSchema.index({ guildId: 1, level: -1 });

// ─────────────────────────────────────────────────────────────
// 📊 STATIC METODLAR
// ─────────────────────────────────────────────────────────────

/**
 * Kullanıcıyı bul veya oluştur
 */
userLevelSchema.statics.findOrCreate = async function(discordId, guildId, userData = {}) {
    let user = await this.findOne({ discordId, guildId });
    
    if (!user) {
        user = await this.create({
            discordId,
            guildId,
            username: userData.username || 'Unknown',
            displayName: userData.displayName || null,
            avatarUrl: userData.avatarUrl || null
        });
    } else {
        // Kullanıcı bilgilerini güncelle
        let needsSave = false;
        
        if (userData.username && user.username !== userData.username) {
            user.username = userData.username;
            needsSave = true;
        }
        if (userData.displayName && user.displayName !== userData.displayName) {
            user.displayName = userData.displayName;
            needsSave = true;
        }
        if (userData.avatarUrl && user.avatarUrl !== userData.avatarUrl) {
            user.avatarUrl = userData.avatarUrl;
            needsSave = true;
        }
        
        if (needsSave) await user.save();
    }
    
    return user;
};

/**
 * Bir sonraki seviye için gereken XP'yi hesapla
 */
userLevelSchema.statics.calculateRequiredXp = function(level) {
    // Formül: 5 * (level^2) + 50 * level + 100
    return 5 * Math.pow(level, 2) + 50 * level + 100;
};

/**
 * Toplam XP'den seviye hesapla
 */
userLevelSchema.statics.calculateLevelFromXp = function(totalXp) {
    let level = 0;
    let xpRequired = 0;
    let remainingXp = totalXp;

    while (remainingXp >= this.calculateRequiredXp(level)) {
        remainingXp -= this.calculateRequiredXp(level);
        level++;
    }

    return { level, currentXp: remainingXp, requiredXp: this.calculateRequiredXp(level) };
};

/**
 * XP ekle ve seviye kontrolü yap
 */
userLevelSchema.statics.addXp = async function(discordId, guildId, xpAmount, userData = {}) {
    const user = await this.findOrCreate(discordId, guildId, userData);
    
    // XP boost kontrolü
    let multiplier = user.xpMultiplier;
    if (user.boostExpiresAt && new Date() > user.boostExpiresAt) {
        multiplier = 1.0;
        user.xpMultiplier = 1.0;
        user.boostExpiresAt = null;
    }
    
    const finalXp = Math.floor(xpAmount * multiplier);
    const oldLevel = user.level;
    
    // XP ekle
    user.xp += finalXp;
    user.totalXp += finalXp;
    user.messageCount += 1;
    user.lastMessageAt = new Date();
    
    // Günlük XP güncelle
    const today = new Date().toISOString().split('T')[0];
    if (user.dailyXp.date !== today) {
        user.dailyXp = { amount: finalXp, date: today };
    } else {
        user.dailyXp.amount += finalXp;
    }
    
    // Haftalık XP güncelle
    const weekNumber = getWeekNumber(new Date());
    if (user.weeklyXp.week !== weekNumber) {
        user.weeklyXp = { amount: finalXp, week: weekNumber };
    } else {
        user.weeklyXp.amount += finalXp;
    }
    
    // Seviye atlama kontrolü
    let leveledUp = false;
    let requiredXp = this.calculateRequiredXp(user.level);
    
    while (user.xp >= requiredXp) {
        user.xp -= requiredXp;
        user.level += 1;
        leveledUp = true;
        
        // Seviye geçmişine ekle
        user.levelHistory.push({
            level: user.level,
            reachedAt: new Date(),
            totalXpAtLevel: user.totalXp
        });
        
        requiredXp = this.calculateRequiredXp(user.level);
    }
    
    await user.save();
    
    return {
        user,
        xpGained: finalXp,
        leveledUp,
        oldLevel,
        newLevel: user.level,
        currentXp: user.xp,
        requiredXp: this.calculateRequiredXp(user.level)
    };
};

/**
 * XP ayarla
 */
userLevelSchema.statics.setXp = async function(discordId, guildId, xpAmount) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    
    const { level, currentXp, requiredXp } = this.calculateLevelFromXp(xpAmount);
    
    user.totalXp = xpAmount;
    user.xp = currentXp;
    user.level = level;
    
    await user.save();
    return user;
};

/**
 * Seviye ayarla
 */
userLevelSchema.statics.setLevel = async function(discordId, guildId, newLevel) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    
    // Yeni seviyeye ulaşmak için gereken toplam XP hesapla
    let totalXpRequired = 0;
    for (let i = 0; i < newLevel; i++) {
        totalXpRequired += this.calculateRequiredXp(i);
    }
    
    user.level = newLevel;
    user.xp = 0;
    user.totalXp = totalXpRequired;
    
    await user.save();
    return user;
};

/**
 * Leaderboard getir
 */
userLevelSchema.statics.getLeaderboard = async function(guildId, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    
    const users = await this.find({ guildId })
        .sort({ totalXp: -1 })
        .skip(skip)
        .limit(limit);
    
    const total = await this.countDocuments({ guildId });
    
    return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

/**
 * Kullanıcının sıralamasını getir
 */
userLevelSchema.statics.getUserRank = async function(discordId, guildId) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) return null;
    
    const rank = await this.countDocuments({
        guildId,
        totalXp: { $gt: user.totalXp }
    }) + 1;
    
    return { user, rank };
};

/**
 * XP boost ver
 */
userLevelSchema.statics.giveBoost = async function(discordId, guildId, multiplier, durationMs) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    
    user.xpMultiplier = multiplier;
    user.boostExpiresAt = new Date(Date.now() + durationMs);
    
    await user.save();
    return user;
};

/**
 * Kart ayarlarını güncelle
 */
userLevelSchema.statics.updateCardSettings = async function(discordId, guildId, settings) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    
    Object.assign(user.cardSettings, settings);
    await user.save();
    return user;
};

/**
 * Rozet ekle
 */
userLevelSchema.statics.addBadge = async function(discordId, guildId, badge) {
    const user = await this.findOne({ discordId, guildId });
    if (!user) throw new Error('Kullanıcı bulunamadı');
    
    // Aynı rozet var mı kontrol et
    if (user.badges.some(b => b.id === badge.id)) {
        return user;
    }
    
    user.badges.push(badge);
    await user.save();
    return user;
};

/**
 * Günlük/haftalık/aylık istatistikler
 */
userLevelSchema.statics.getTopDaily = async function(guildId, limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    
    return await this.find({ guildId, 'dailyXp.date': today })
        .sort({ 'dailyXp.amount': -1 })
        .limit(limit);
};

userLevelSchema.statics.getTopWeekly = async function(guildId, limit = 10) {
    const weekNumber = getWeekNumber(new Date());
    
    return await this.find({ guildId, 'weeklyXp.week': weekNumber })
        .sort({ 'weeklyXp.amount': -1 })
        .limit(limit);
};

// Yardımcı fonksiyon: Hafta numarası
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

module.exports = mongoose.model('UserLevel', userLevelSchema);
