/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ AKIRA BOT - AYARLAR KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucu ayarlarını görüntüler ve değiştirir.
 * Sadece yöneticiler kullanabilir.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../../config/botConfig');
const { GuildSettings } = require('../../database');
const { EmbedHelper } = require('../../utils');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('ayarlar')
        .setDescription('Sunucu ayarlarını yönetir.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('goruntule')
                .setDescription('Mevcut sunucu ayarlarını gösterir.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('hosgeldin')
                .setDescription('Hoşgeldin kanalını ayarlar.')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Hoşgeldin mesajlarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('log')
                .setDescription('Log kanalını ayarlar.')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Log mesajlarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('otorol')
                .setDescription('Otomatik verilecek rolü ayarlar.')
                .addRoleOption(option =>
                    option
                        .setName('rol')
                        .setDescription('Yeni üyelere verilecek rol')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.Administrator],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'goruntule':
                return await showSettings(interaction);
            case 'hosgeldin':
                return await setWelcomeChannel(interaction);
            case 'log':
                return await setLogChannel(interaction);
            case 'otorol':
                return await setAutoRole(interaction);
        }
    }
};

/**
 * Mevcut ayarları göster
 */
async function showSettings(interaction) {
    const settings = await GuildSettings.findOrCreate(interaction.guildId);

    const getChannelMention = (id) => id ? `<#${id}>` : '`Ayarlanmamış`';
    const getRoleMention = (id) => id ? `<@&${id}>` : '`Ayarlanmamış`';

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Sunucu Ayarları')
        .setColor(config.colors.primary)
        .addFields(
            { 
                name: '👋 Hoşgeldin Kanalı', 
                value: getChannelMention(settings.welcomeChannel), 
                inline: true 
            },
            { 
                name: '👋 Ayrılma Kanalı', 
                value: getChannelMention(settings.leaveChannel), 
                inline: true 
            },
            { 
                name: '📝 Log Kanalı', 
                value: getChannelMention(settings.logChannel), 
                inline: true 
            },
            { 
                name: '🛡️ Mod Log Kanalı', 
                value: getChannelMention(settings.modLogChannel), 
                inline: true 
            },
            { 
                name: '🎭 Otomatik Rol', 
                value: getRoleMention(settings.autoRole), 
                inline: true 
            },
            { 
                name: '🚫 Devre Dışı Komutlar', 
                value: settings.disabledCommands?.length > 0 
                    ? settings.disabledCommands.map(c => `\`${c}\``).join(', ')
                    : '`Yok`', 
                inline: false 
            }
        )
        .setTimestamp()
        .setFooter({ text: 'Ayarları değiştirmek için alt komutları kullan' });

    await interaction.reply({ embeds: [embed] });
}

/**
 * Hoşgeldin kanalını ayarla
 */
async function setWelcomeChannel(interaction) {
    const channel = interaction.options.getChannel('kanal');

    await GuildSettings.updateSetting(interaction.guildId, 'welcomeChannel', channel.id);

    const embed = EmbedHelper.success(
        'Ayar Güncellendi',
        `Hoşgeldin kanalı ${channel} olarak ayarlandı.`
    );

    await interaction.reply({ embeds: [embed] });
}

/**
 * Log kanalını ayarla
 */
async function setLogChannel(interaction) {
    const channel = interaction.options.getChannel('kanal');

    await GuildSettings.updateSetting(interaction.guildId, 'logChannel', channel.id);

    const embed = EmbedHelper.success(
        'Ayar Güncellendi',
        `Log kanalı ${channel} olarak ayarlandı.`
    );

    await interaction.reply({ embeds: [embed] });
}

/**
 * Otomatik rolü ayarla
 */
async function setAutoRole(interaction) {
    const role = interaction.options.getRole('rol');

    // Bot'un rolünden yüksek rol seçilmiş mi?
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return await interaction.reply({
            embeds: [EmbedHelper.error('Hata', 'Bu rolü vermek için yetkim yok. Rolüm daha düşük!')],
            ephemeral: true
        });
    }

    // Yönetilen rol mu?
    if (role.managed) {
        return await interaction.reply({
            embeds: [EmbedHelper.error('Hata', 'Bu rol bir entegrasyon tarafından yönetiliyor!')],
            ephemeral: true
        });
    }

    await GuildSettings.updateSetting(interaction.guildId, 'autoRole', role.id);

    const embed = EmbedHelper.success(
        'Ayar Güncellendi',
        `Otomatik rol ${role} olarak ayarlandı. Yeni üyeler bu rolü alacak.`
    );

    await interaction.reply({ embeds: [embed] });
}
