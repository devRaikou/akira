/**
 * ═══════════════════════════════════════════════════════════════
 * 🎨 AKIRA BOT - MİNİMAL RANK KARTI
 * ═══════════════════════════════════════════════════════════════
 * 
 * Modern, minimal tasarım - Japonca/Unicode karakter desteği
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// 🔤 FONT YÜKLEMESİ (Unicode/Japonca desteği)
// ─────────────────────────────────────────────────────────────

const loadFonts = () => {
    const fontPaths = [
        // Windows fontları
        { path: 'C:\\Windows\\Fonts\\seguiemj.ttf', name: 'Segoe UI Emoji' },
        { path: 'C:\\Windows\\Fonts\\segoeui.ttf', name: 'Segoe UI' },
        { path: 'C:\\Windows\\Fonts\\segoeuib.ttf', name: 'Segoe UI Bold' },
        // Japonca fontlar (Windows)
        { path: 'C:\\Windows\\Fonts\\msgothic.ttc', name: 'MS Gothic' },
        { path: 'C:\\Windows\\Fonts\\meiryo.ttc', name: 'Meiryo' },
        { path: 'C:\\Windows\\Fonts\\YuGothM.ttc', name: 'Yu Gothic' },
        { path: 'C:\\Windows\\Fonts\\msmincho.ttc', name: 'MS Mincho' },
        // Noto Sans (eğer yüklüyse)
        { path: 'C:\\Windows\\Fonts\\NotoSansCJK-Regular.ttc', name: 'Noto Sans CJK' },
        { path: 'C:\\Windows\\Fonts\\NotoSansJP-Regular.otf', name: 'Noto Sans JP' },
    ];

    for (const font of fontPaths) {
        try {
            if (fs.existsSync(font.path)) {
                GlobalFonts.registerFromPath(font.path, font.name);
            }
        } catch (e) {
            // Font yüklenemezse sessizce devam et
        }
    }
};

loadFonts();

// Unicode destekli font ailesi
const FONT_FAMILY = '"Segoe UI", "Meiryo", "Yu Gothic", "MS Gothic", "Noto Sans JP", "Noto Sans CJK", Arial, sans-serif';
const FONT_FAMILY_BOLD = '"Segoe UI Bold", "Meiryo", "Yu Gothic", Arial, sans-serif';

// ─────────────────────────────────────────────────────────────
// 🎨 MİNİMAL RANK KART BUILDER
// ─────────────────────────────────────────────────────────────

class RankCardBuilder {
    constructor() {
        this.width = 800;
        this.height = 200;
        this.canvas = createCanvas(this.width, this.height);
        this.ctx = this.canvas.getContext('2d');
        
        // Minimal varsayılan ayarlar
        this.settings = {
            backgroundColor: ['#0f0f0f', '#1a1a1a'],
            progressBarColor: '#5865F2',
            accentColor: '#5865F2',
            textColor: '#ffffff',
            subtextColor: 'rgba(255, 255, 255, 0.5)'
        };
        
        this.userData = {
            username: 'User',
            displayName: null,
            avatarUrl: null,
            level: 0,
            rank: 1,
            currentXp: 0,
            requiredXp: 100,
            totalXp: 0,
            badges: [],
            status: 'offline'
        };
    }

    setSettings(settings) {
        if (settings.backgroundColor) {
            this.settings.backgroundColor = Array.isArray(settings.backgroundColor) 
                ? settings.backgroundColor 
                : [settings.backgroundColor, settings.backgroundColor];
        }
        if (settings.progressBarColor) this.settings.progressBarColor = settings.progressBarColor;
        if (settings.accentColor) this.settings.accentColor = settings.accentColor;
        if (settings.textColor) this.settings.textColor = settings.textColor;
        return this;
    }

    setUserData(data) {
        Object.assign(this.userData, data);
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // 🖼️ ARKA PLAN
    // ─────────────────────────────────────────────────────────

    async drawBackground() {
        const { ctx, width, height, settings } = this;
        const radius = 16;
        
        // Rounded clip
        ctx.beginPath();
        ctx.roundRect(0, 0, width, height, radius);
        ctx.clip();
        
        // Gradient arka plan
        const colors = settings.backgroundColor;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        
        if (colors.length === 2) {
            gradient.addColorStop(0, colors[0]);
            gradient.addColorStop(1, colors[1]);
        } else if (colors.length >= 3) {
            colors.forEach((color, i) => {
                gradient.addColorStop(i / (colors.length - 1), color);
            });
        } else {
            gradient.addColorStop(0, colors[0] || '#0f0f0f');
            gradient.addColorStop(1, colors[0] || '#1a1a1a');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Subtle noise texture
        this.drawNoiseTexture();
        
        // Accent glow (subtle)
        ctx.save();
        const glowGradient = ctx.createRadialGradient(0, height, 0, 0, height, 300);
        glowGradient.addColorStop(0, this.hexToRgba(settings.accentColor, 0.08));
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        
        return this;
    }

    drawNoiseTexture() {
        const { ctx, width, height } = this;
        ctx.save();
        ctx.globalAlpha = 0.02;
        
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
            ctx.fillRect(x, y, 1, 1);
        }
        
        ctx.restore();
    }

    // ─────────────────────────────────────────────────────────
    // 👤 AVATAR
    // ─────────────────────────────────────────────────────────

    async drawAvatar() {
        const { ctx, userData, settings } = this;
        
        const avatarX = 32;
        const avatarY = 32;
        const avatarSize = 136;
        const radius = 16;
        
        // Avatar container (rounded square)
        ctx.save();
        
        // Subtle border
        ctx.beginPath();
        ctx.roundRect(avatarX - 2, avatarY - 2, avatarSize + 4, avatarSize + 4, radius + 2);
        ctx.fillStyle = this.hexToRgba(settings.accentColor, 0.3);
        ctx.fill();
        
        // Avatar clip
        ctx.beginPath();
        ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, radius);
        ctx.clip();
        
        // Avatar image
        if (userData.avatarUrl) {
            try {
                const avatar = await loadImage(userData.avatarUrl);
                ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            } catch (e) {
                this.drawDefaultAvatar(avatarX, avatarY, avatarSize, radius);
            }
        } else {
            this.drawDefaultAvatar(avatarX, avatarY, avatarSize, radius);
        }
        
        ctx.restore();
        
        // Status indicator
        this.drawStatusIndicator(avatarX + avatarSize - 12, avatarY + avatarSize - 12);
        
        return this;
    }

    drawDefaultAvatar(x, y, size, radius) {
        const { ctx, userData, settings } = this;
        
        ctx.fillStyle = settings.accentColor;
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${size * 0.4}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            (userData.displayName || userData.username).charAt(0).toUpperCase(), 
            x + size / 2, 
            y + size / 2
        );
    }

    drawStatusIndicator(x, y) {
        const { ctx, userData } = this;
        const size = 20;
        
        const statusColors = {
            online: '#22c55e',
            idle: '#eab308',
            dnd: '#ef4444',
            offline: '#6b7280'
        };
        
        // Outer ring (background)
        ctx.beginPath();
        ctx.arc(x, y, size / 2 + 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0f0f0f';
        ctx.fill();
        
        // Status dot
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = statusColors[userData.status] || statusColors.offline;
        ctx.fill();
    }

    // ─────────────────────────────────────────────────────────
    // 📝 KULLANICI BİLGİLERİ
    // ─────────────────────────────────────────────────────────

    drawUserInfo() {
        const { ctx, userData, settings } = this;
        
        const textX = 200;
        const nameY = 60;
        
        // Display name (büyük, bold)
        const displayName = userData.displayName || userData.username;
        ctx.font = `bold 28px ${FONT_FAMILY}`;
        ctx.fillStyle = settings.textColor;
        ctx.textAlign = 'left';
        
        // Metni ölç ve gerekirse kısalt
        const maxWidth = 350;
        const truncatedName = this.truncateText(displayName, maxWidth);
        ctx.fillText(truncatedName, textX, nameY);
        
        // Username (küçük, soluk)
        if (userData.displayName && userData.displayName !== userData.username) {
            ctx.font = `14px ${FONT_FAMILY}`;
            ctx.fillStyle = settings.subtextColor;
            ctx.fillText(`@${userData.username}`, textX, nameY + 22);
        }
        
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // 📊 SEVİYE VE SIRALAMA
    // ─────────────────────────────────────────────────────────

    drawStats() {
        const { ctx, userData, settings, width } = this;
        
        const rightX = width - 40;
        const topY = 55;
        
        // Level (sağ üst)
        ctx.textAlign = 'right';
        
        // "LVL" label
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillStyle = settings.subtextColor;
        ctx.fillText('LVL', rightX, topY - 20);
        
        // Level value
        ctx.font = `bold 36px ${FONT_FAMILY}`;
        ctx.fillStyle = settings.accentColor;
        ctx.fillText(userData.level.toString(), rightX, topY + 12);
        
        // Rank (level'in solunda)
        const rankX = rightX - 90;
        
        ctx.font = `bold 12px ${FONT_FAMILY}`;
        ctx.fillStyle = settings.subtextColor;
        ctx.fillText('RANK', rankX, topY - 20);
        
        ctx.font = `bold 36px ${FONT_FAMILY}`;
        ctx.fillStyle = settings.textColor;
        ctx.fillText(`#${userData.rank}`, rankX, topY + 12);
        
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // 📈 PROGRESS BAR
    // ─────────────────────────────────────────────────────────

    drawProgressBar() {
        const { ctx, userData, settings, width } = this;
        
        const barX = 200;
        const barY = 130;
        const barWidth = width - barX - 40;
        const barHeight = 12;
        const radius = 6;
        
        // XP bilgisi (bar üstünde)
        const progress = Math.min((userData.currentXp / userData.requiredXp) * 100, 100);
        
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = settings.subtextColor;
        ctx.fillText(
            `${this.formatNumber(userData.currentXp)} / ${this.formatNumber(userData.requiredXp)} XP`, 
            barX, 
            barY - 8
        );
        
        // Yüzde (sağda)
        ctx.textAlign = 'right';
        ctx.fillStyle = settings.textColor;
        ctx.fillText(`${Math.round(progress)}%`, barX + barWidth, barY - 8);
        
        // Bar arka planı
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, radius);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        
        // Progress
        const progressWidth = (userData.currentXp / userData.requiredXp) * barWidth;
        if (progressWidth > 0) {
            ctx.beginPath();
            ctx.roundRect(barX, barY, Math.max(progressWidth, radius * 2), barHeight, radius);
            
            // Gradient progress
            const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            progressGradient.addColorStop(0, settings.progressBarColor);
            progressGradient.addColorStop(1, this.lightenColor(settings.progressBarColor, 15));
            ctx.fillStyle = progressGradient;
            ctx.fill();
        }
        
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // 🏷️ ALT BİLGİ
    // ─────────────────────────────────────────────────────────

    drawFooter() {
        const { ctx, userData, settings, width } = this;
        
        const footerY = 170;
        const barX = 200;
        
        // Toplam XP
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = settings.subtextColor;
        ctx.fillText(`Total: ${this.formatNumber(userData.totalXp)} XP`, barX, footerY);
        
        // Badges (sağda)
        if (userData.badges && userData.badges.length > 0) {
            const badgeStartX = width - 40;
            const badgeSize = 18;
            
            const visibleBadges = userData.badges.slice(0, 4);
            
            for (let i = 0; i < visibleBadges.length; i++) {
                const badge = visibleBadges[i];
                const badgeX = badgeStartX - (i * (badgeSize + 6));
                
                ctx.font = `${badgeSize}px ${FONT_FAMILY}`;
                ctx.textAlign = 'center';
                ctx.fillText(badge.icon || '⭐', badgeX, footerY);
            }
        }
        
        return this;
    }

    // ─────────────────────────────────────────────────────────
    // 🔧 YARDIMCI FONKSİYONLAR
    // ─────────────────────────────────────────────────────────

    truncateText(text, maxWidth) {
        const { ctx } = this;
        
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ─────────────────────────────────────────────────────────
    // 🏗️ BUILD
    // ─────────────────────────────────────────────────────────

    async build() {
        await this.drawBackground();
        await this.drawAvatar();
        this.drawUserInfo();
        this.drawStats();
        this.drawProgressBar();
        this.drawFooter();
        
        return this.canvas;
    }

    async toBuffer() {
        const canvas = await this.build();
        return canvas.toBuffer('image/png');
    }

    async toAttachment(filename = 'rank-card.png') {
        const buffer = await this.toBuffer();
        return new AttachmentBuilder(buffer, { name: filename });
    }
}

// ─────────────────────────────────────────────────────────────
// 📊 LEADERBOARD KARTI
// ─────────────────────────────────────────────────────────────

class LeaderboardCardBuilder {
    constructor() {
        this.width = 800;
        this.rowHeight = 60;
        this.padding = 24;
        this.users = [];
        
        this.settings = {
            backgroundColor: ['#0f0f0f', '#1a1a1a'],
            accentColor: '#5865F2',
            textColor: '#ffffff',
            subtextColor: 'rgba(255, 255, 255, 0.5)'
        };
    }

    setSettings(settings) {
        Object.assign(this.settings, settings);
        return this;
    }

    setUsers(users) {
        this.users = users.slice(0, 10); // Max 10 user
        return this;
    }

    async build() {
        const headerHeight = 50;
        const height = headerHeight + (this.users.length * this.rowHeight) + this.padding * 2;
        
        const canvas = createCanvas(this.width, height);
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.beginPath();
        ctx.roundRect(0, 0, this.width, height, 16);
        ctx.clip();
        
        const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, this.settings.backgroundColor[0]);
        gradient.addColorStop(1, this.settings.backgroundColor[1] || this.settings.backgroundColor[0]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, height);
        
        // Header
        ctx.font = `bold 18px ${FONT_FAMILY}`;
        ctx.fillStyle = this.settings.textColor;
        ctx.textAlign = 'left';
        ctx.fillText('🏆 Sıralama', this.padding, this.padding + 20);
        
        // Users
        for (let i = 0; i < this.users.length; i++) {
            await this.drawUserRow(ctx, this.users[i], i, headerHeight + this.padding);
        }
        
        return canvas;
    }

    async drawUserRow(ctx, user, index, startY) {
        const y = startY + (index * this.rowHeight);
        const x = this.padding;
        
        // Rank medals
        const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        const rankIcons = ['🥇', '🥈', '🥉'];
        
        // Rank number/icon
        ctx.font = `bold 20px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        
        if (index < 3) {
            ctx.fillText(rankIcons[index], x + 20, y + 35);
        } else {
            ctx.fillStyle = this.settings.subtextColor;
            ctx.fillText(`${index + 1}`, x + 20, y + 35);
        }
        
        // Avatar
        const avatarX = x + 50;
        const avatarSize = 40;
        
        try {
            if (user.avatarUrl) {
                const avatar = await loadImage(user.avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize/2, y + 25, avatarSize/2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(avatar, avatarX, y + 5, avatarSize, avatarSize);
                ctx.restore();
            }
        } catch (e) {
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, y + 25, avatarSize/2, 0, Math.PI * 2);
            ctx.fillStyle = this.settings.accentColor;
            ctx.fill();
        }
        
        // Name
        ctx.font = `bold 16px ${FONT_FAMILY}`;
        ctx.fillStyle = this.settings.textColor;
        ctx.textAlign = 'left';
        ctx.fillText(user.displayName || user.username, avatarX + avatarSize + 15, y + 30);
        
        // Level & XP
        ctx.font = `14px ${FONT_FAMILY}`;
        ctx.textAlign = 'right';
        ctx.fillStyle = this.settings.accentColor;
        ctx.fillText(`LVL ${user.level}`, this.width - this.padding, y + 25);
        
        ctx.fillStyle = this.settings.subtextColor;
        ctx.fillText(`${this.formatNumber(user.totalXp)} XP`, this.width - this.padding, y + 43);
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    async toBuffer() {
        const canvas = await this.build();
        return canvas.toBuffer('image/png');
    }

    async toAttachment(filename = 'leaderboard.png') {
        const buffer = await this.toBuffer();
        return new AttachmentBuilder(buffer, { name: filename });
    }
}

// ─────────────────────────────────────────────────────────────
// 📦 KOLAY KULLANIM FONKSİYONLARI
// ─────────────────────────────────────────────────────────────

/**
 * Hızlı rank kartı oluştur
 */
async function createRankCard(options) {
    const builder = new RankCardBuilder();
    
    // Kart ayarları
    if (options.cardSettings) {
        builder.setSettings({
            backgroundColor: options.cardSettings.backgroundColor || ['#0f0f0f', '#1a1a1a'],
            progressBarColor: options.cardSettings.progressBarColor || '#5865F2',
            accentColor: options.cardSettings.accentColor || '#5865F2'
        });
    }
    
    // Kullanıcı verileri
    builder.setUserData({
        username: options.username,
        displayName: options.displayName,
        avatarUrl: options.avatarUrl,
        level: options.level || 0,
        rank: options.rank || 1,
        currentXp: options.currentXp || 0,
        requiredXp: options.requiredXp || 100,
        totalXp: options.totalXp || 0,
        badges: options.badges || [],
        status: options.status || 'offline'
    });
    
    return builder.toBuffer();
}

/**
 * Hızlı leaderboard kartı oluştur
 */
async function createLeaderboardCard(users, settings = {}) {
    const builder = new LeaderboardCardBuilder();
    builder.setSettings(settings);
    builder.setUsers(users);
    return builder.toBuffer();
}

module.exports = {
    RankCardBuilder,
    LeaderboardCardBuilder,
    createRankCard,
    createLeaderboardCard,
    RankCard: {
        createRankCard,
        createLeaderboardCard
    }
};
