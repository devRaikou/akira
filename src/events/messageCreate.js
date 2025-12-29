/**
 * ═══════════════════════════════════════════════════════════════
 * 💬 AKIRA BOT - MESSAGE CREATE EVENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Mesaj gönderildiğinde XP kazandırır
 */

const { Events, EmbedBuilder } = require('discord.js');
const { UserLevel, GuildSettings } = require('../database');
const config = require('../config/botConfig');

// XP cooldown cache (memory)
const xpCooldowns = new Map();

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client) {
        // Bot mesajlarını ve DM'leri yoksay
        if (message.author.bot || !message.guild) return;

        try {
            // Sunucu ayarlarını al
            const settings = await GuildSettings.findOrCreate(message.guild.id);
            
            // Seviye sistemi aktif mi?
            if (!settings.levelSystem?.enabled) return;

            // XP kazanılamaz kanal mı?
            if (settings.levelSystem.noXpChannels?.includes(message.channel.id)) return;

            // Cooldown kontrolü
            const cooldownKey = `${message.author.id}-${message.guild.id}`;
            const lastXpTime = xpCooldowns.get(cooldownKey);
            const cooldownMs = (settings.levelSystem.xpCooldown || 60) * 1000;

            if (lastXpTime && Date.now() - lastXpTime < cooldownMs) {
                return; // Cooldown içinde
            }

            // Günlük limit kontrolü
            const userData = await UserLevel.findOrCreate(message.author.id, message.guild.id, {
                username: message.author.username,
                displayName: message.member?.displayName,
                avatarUrl: message.author.displayAvatarURL({ dynamic: true })
            });

            const today = new Date().toISOString().split('T')[0];
            if (settings.levelSystem.dailyXpLimit > 0) {
                if (userData.dailyXp.date === today && 
                    userData.dailyXp.amount >= settings.levelSystem.dailyXpLimit) {
                    return; // Günlük limit aşıldı
                }
            }

            // XP hesapla
            const minXp = settings.levelSystem.xpPerMessage?.min || 15;
            const maxXp = settings.levelSystem.xpPerMessage?.max || 25;
            let xpAmount = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

            // Kanal boost kontrolü
            const boostChannel = settings.levelSystem.boostChannels?.find(
                bc => bc.channelId === message.channel.id
            );
            if (boostChannel) {
                xpAmount = Math.floor(xpAmount * boostChannel.multiplier);
            }

            // Rol bonus kontrolü
            if (settings.levelSystem.bonusXpRoles?.length > 0) {
                for (const bonusRole of settings.levelSystem.bonusXpRoles) {
                    if (message.member.roles.cache.has(bonusRole.roleId)) {
                        xpAmount = Math.floor(xpAmount * (1 + bonusRole.bonusPercent / 100));
                        break; // Sadece en yüksek bonus uygulanır
                    }
                }
            }

            // XP ekle
            const result = await UserLevel.addXp(
                message.author.id,
                message.guild.id,
                xpAmount,
                {
                    username: message.author.username,
                    displayName: message.member?.displayName,
                    avatarUrl: message.author.displayAvatarURL({ dynamic: true })
                }
            );

            // Cooldown güncelle
            xpCooldowns.set(cooldownKey, Date.now());

            // Seviye atladı mı?
            if (result.leveledUp && settings.levelSystem.announceLevelUp) {
                await handleLevelUp(message, result, settings);
            }

            // Seviye rolü kontrolü
            if (result.leveledUp && settings.levelSystem.levelRoles?.length > 0) {
                await handleLevelRoles(message, result.newLevel, settings.levelSystem.levelRoles);
            }

        } catch (error) {
            console.error('XP sistemi hatası:', error);
        }
    }
};

/**
 * Seviye atlama bildirimi gönder
 */
async function handleLevelUp(message, result, settings) {
    try {
        // Hedef kanal
        let targetChannel = message.channel;
        
        if (settings.levelSystem.levelUpChannel) {
            const lvlChannel = await message.guild.channels.fetch(settings.levelSystem.levelUpChannel)
                .catch(() => null);
            if (lvlChannel) targetChannel = lvlChannel;
        }

        // Mesajı oluştur
        let levelUpMessage = settings.levelSystem.levelUpMessage || 
            '🎉 Tebrikler {user}! **{level}**. seviyeye ulaştın!';
        
        levelUpMessage = levelUpMessage
            .replace('{user}', `<@${message.author.id}>`)
            .replace('{username}', message.author.username)
            .replace('{level}', result.newLevel)
            .replace('{oldLevel}', result.oldLevel)
            .replace('{server}', message.guild.name);

        // Embed oluştur
        const embed = new EmbedBuilder()
            .setTitle('🎊 Seviye Atladın!')
            .setDescription(levelUpMessage)
            .setColor(config.colors.success)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: '📊 Yeni Seviye', value: `**${result.newLevel}**`, inline: true },
                { name: '⭐ Toplam XP', value: `**${formatNumber(result.user.totalXp)}**`, inline: true },
                { name: '📨 Mesaj Sayısı', value: `**${formatNumber(result.user.messageCount)}**`, inline: true }
            )
            .setFooter({ text: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // Bir sonraki seviye bilgisi
        const nextLevelXp = UserLevel.calculateRequiredXp(result.newLevel);
        embed.addFields({
            name: '🎯 Sonraki Seviye',
            value: `**${result.currentXp}** / **${nextLevelXp}** XP`,
            inline: false
        });

        await targetChannel.send({ 
            content: `<@${message.author.id}>`,
            embeds: [embed] 
        });

    } catch (error) {
        console.error('Seviye atlama bildirimi hatası:', error);
    }
}

/**
 * Seviye rollerini yönet
 */
async function handleLevelRoles(message, newLevel, levelRoles) {
    try {
        const member = message.member;
        
        // Kazanılması gereken roller
        const rolesToAdd = levelRoles.filter(lr => lr.level <= newLevel);
        const rolesToRemove = levelRoles.filter(lr => lr.level > newLevel && lr.removeOnHigher);

        // Rolleri ekle
        for (const roleData of rolesToAdd) {
            if (!member.roles.cache.has(roleData.roleId)) {
                try {
                    await member.roles.add(roleData.roleId, `Seviye ${roleData.level} ödülü`);
                } catch (e) {
                    console.error(`Rol eklenemedi: ${roleData.roleId}`, e);
                }
            }
        }

        // Eski rolleri kaldır (removeOnHigher aktifse)
        for (const roleData of rolesToRemove) {
            if (member.roles.cache.has(roleData.roleId)) {
                try {
                    await member.roles.remove(roleData.roleId, 'Daha yüksek seviye rolü alındı');
                } catch (e) {
                    console.error(`Rol kaldırılamadı: ${roleData.roleId}`, e);
                }
            }
        }

    } catch (error) {
        console.error('Seviye rolleri hatası:', error);
    }
}

/**
 * Sayı formatla
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('tr-TR');
}
