/**
 * ═══════════════════════════════════════════════════════════════
 * 🧰 AKIRA BOT - GENEL UTILITY FONKSİYONLARI
 * ═══════════════════════════════════════════════════════════════
 */

const { PermissionFlagsBits } = require('discord.js');

/**
 * Süreyi milisaniyeden okunabilir formata çevir
 */
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (seconds > 0) parts.push(`${seconds} saniye`);

    return parts.join(' ') || '0 saniye';
}

/**
 * String'i parse edip süreye çevir (örn: "1d", "2h", "30m")
 */
function parseDuration(input) {
    const regex = /^(\d+)(s|m|h|d|w)$/i;
    const match = input.match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,           // saniye
        m: 60 * 1000,      // dakika
        h: 60 * 60 * 1000, // saat
        d: 24 * 60 * 60 * 1000, // gün
        w: 7 * 24 * 60 * 60 * 1000 // hafta
    };

    return value * multipliers[unit];
}

/**
 * Büyük sayıları formatla (1000 -> 1K)
 */
function formatNumber(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

/**
 * String'i belirli uzunlukta kes
 */
function truncate(str, length = 100) {
    if (str.length <= length) return str;
    return str.slice(0, length - 3) + '...';
}

/**
 * Rastgele renk üret
 */
function randomColor() {
    return Math.floor(Math.random() * 16777215);
}

/**
 * Async sleep fonksiyonu
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Emoji'yi ID'den çıkar
 */
function parseEmoji(emojiString) {
    const match = emojiString.match(/<?(a)?:?(\w+):(\d+)>?/);
    if (!match) return null;
    return {
        animated: !!match[1],
        name: match[2],
        id: match[3]
    };
}

/**
 * Kullanıcı mention'ından ID çıkar
 */
function parseUserId(mention) {
    const match = mention.match(/^<@!?(\d+)>$/);
    return match ? match[1] : mention;
}

/**
 * Rol mention'ından ID çıkar
 */
function parseRoleId(mention) {
    const match = mention.match(/^<@&(\d+)>$/);
    return match ? match[1] : mention;
}

/**
 * Kanal mention'ından ID çıkar
 */
function parseChannelId(mention) {
    const match = mention.match(/^<#(\d+)>$/);
    return match ? match[1] : mention;
}

/**
 * Tarih formatla
 */
function formatDate(date) {
    return new Date(date).toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * İki tarih arasındaki farkı hesapla
 */
function getTimeDiff(date1, date2 = new Date()) {
    return formatDuration(Math.abs(new Date(date2) - new Date(date1)));
}

/**
 * Yetki bitfield'ını kontrol et
 */
function hasPermission(member, permission) {
    return member.permissions.has(permission);
}

/**
 * Tüm yetkileri kontrol et
 */
function hasAllPermissions(member, permissions) {
    return permissions.every(perm => member.permissions.has(perm));
}

/**
 * Herhangi bir yetkiyi kontrol et
 */
function hasAnyPermission(member, permissions) {
    return permissions.some(perm => member.permissions.has(perm));
}

/**
 * Güvenli JSON parse
 */
function safeJsonParse(str, fallback = null) {
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

/**
 * Progress bar oluştur
 */
function createProgressBar(current, total, length = 10) {
    const percentage = current / total;
    const filled = Math.round(length * percentage);
    const empty = length - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage * 100)}%`;
}

module.exports = {
    formatDuration,
    parseDuration,
    formatNumber,
    truncate,
    randomColor,
    sleep,
    parseEmoji,
    parseUserId,
    parseRoleId,
    parseChannelId,
    formatDate,
    getTimeDiff,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    safeJsonParse,
    createProgressBar
};
