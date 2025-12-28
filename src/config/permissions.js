/**
 * ═══════════════════════════════════════════════════════════════
 * 🔐 AKIRA BOT - YETKİ KONFİGÜRASYONU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Discord izinleri ve özel rol bazlı yetki sistemi
 */

const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📋 YETKİ SEVİYELERİ
    // ─────────────────────────────────────────────────────────────
    levels: {
        USER: 0,           // Normal kullanıcı
        MODERATOR: 1,      // Moderatör
        ADMIN: 2,          // Yönetici
        OWNER: 3,          // Sunucu sahibi
        DEVELOPER: 4       // Bot geliştiricisi
    },

    // ─────────────────────────────────────────────────────────────
    // 🔑 DISCORD İZİN HARİTASI
    // ─────────────────────────────────────────────────────────────
    // Sık kullanılan izinlerin Türkçe açıklamaları
    permissionNames: {
        [PermissionFlagsBits.Administrator]: 'Yönetici',
        [PermissionFlagsBits.ManageGuild]: 'Sunucuyu Yönet',
        [PermissionFlagsBits.ManageRoles]: 'Rolleri Yönet',
        [PermissionFlagsBits.ManageChannels]: 'Kanalları Yönet',
        [PermissionFlagsBits.ManageMessages]: 'Mesajları Yönet',
        [PermissionFlagsBits.KickMembers]: 'Üyeleri At',
        [PermissionFlagsBits.BanMembers]: 'Üyeleri Yasakla',
        [PermissionFlagsBits.ModerateMembers]: 'Üyeleri Sustur',
        [PermissionFlagsBits.MuteMembers]: 'Üyeleri Sessize Al',
        [PermissionFlagsBits.DeafenMembers]: 'Üyeleri Sağırlaştır',
        [PermissionFlagsBits.MoveMembers]: 'Üyeleri Taşı',
        [PermissionFlagsBits.ManageNicknames]: 'Takma Adları Yönet',
        [PermissionFlagsBits.ManageWebhooks]: 'Webhook\'ları Yönet',
        [PermissionFlagsBits.ManageEmojisAndStickers]: 'Emoji ve Çıkartmaları Yönet',
        [PermissionFlagsBits.ViewAuditLog]: 'Denetim Kaydını Görüntüle',
        [PermissionFlagsBits.ViewChannel]: 'Kanalları Görüntüle',
        [PermissionFlagsBits.SendMessages]: 'Mesaj Gönder',
        [PermissionFlagsBits.EmbedLinks]: 'Bağlantı Yerleştir',
        [PermissionFlagsBits.AttachFiles]: 'Dosya Ekle',
        [PermissionFlagsBits.AddReactions]: 'Tepki Ekle',
        [PermissionFlagsBits.UseExternalEmojis]: 'Harici Emoji Kullan',
        [PermissionFlagsBits.MentionEveryone]: 'Herkesten Bahset',
        [PermissionFlagsBits.Connect]: 'Bağlan',
        [PermissionFlagsBits.Speak]: 'Konuş'
    },

    // ─────────────────────────────────────────────────────────────
    // 🎭 ÖZEL ROL BAZLI YETKİLER
    // ─────────────────────────────────────────────────────────────
    // Sunucunuzdaki rol ID'lerini buraya ekleyebilirsiniz
    customRoles: {
        moderator: [],     // Moderatör rol ID'leri
        admin: [],         // Admin rol ID'leri
        vip: []            // VIP rol ID'leri
    },

    /**
     * Kullanıcının yetki seviyesini hesaplar
     * @param {GuildMember} member - Discord üyesi
     * @param {string[]} developerIds - Geliştirici ID'leri
     * @returns {number} Yetki seviyesi
     */
    getPermissionLevel(member, developerIds = []) {
        // Geliştirici kontrolü
        if (developerIds.includes(member.id)) {
            return this.levels.DEVELOPER;
        }

        // Sunucu sahibi kontrolü
        if (member.id === member.guild.ownerId) {
            return this.levels.OWNER;
        }

        // Administrator yetkisi kontrolü
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return this.levels.ADMIN;
        }

        // Moderatör yetkileri kontrolü
        const modPermissions = [
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.KickMembers,
            PermissionFlagsBits.BanMembers,
            PermissionFlagsBits.ModerateMembers
        ];

        if (modPermissions.some(perm => member.permissions.has(perm))) {
            return this.levels.MODERATOR;
        }

        return this.levels.USER;
    },

    /**
     * Eksik yetkileri Türkçe olarak listeler
     * @param {GuildMember} member - Discord üyesi
     * @param {bigint[]} requiredPermissions - Gerekli izinler
     * @returns {string[]} Eksik yetki isimleri
     */
    getMissingPermissions(member, requiredPermissions) {
        const missing = [];
        
        for (const permission of requiredPermissions) {
            if (!member.permissions.has(permission)) {
                const permName = this.permissionNames[permission] || 'Bilinmeyen Yetki';
                missing.push(permName);
            }
        }

        return missing;
    }
};
