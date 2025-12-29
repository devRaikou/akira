/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ AKIRA BOT - SEVİYE SİSTEMİ AYARLARI KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Seviye sistemi yapılandırması (Admin)
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { GuildSettings } = require('../../database');
const { EmbedHelper } = require('../../utils');
const config = require('../../config/botConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seviyeayar')
        .setDescription('Seviye sistemi ayarları')
        .addSubcommand(subcommand =>
            subcommand
                .setName('durum')
                .setDescription('Seviye sistemini aç/kapat')
                .addBooleanOption(option =>
                    option
                        .setName('aktif')
                        .setDescription('Seviye sistemi aktif mi?')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kanal')
                .setDescription('Seviye atlama bildirim kanalı')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Bildirim kanalı (boş bırakırsan kapat)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xpmiktari')
                .setDescription('Mesaj başına kazanılan XP miktarı')
                .addIntegerOption(option =>
                    option
                        .setName('min')
                        .setDescription('Minimum XP')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('max')
                        .setDescription('Maksimum XP')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bekleme')
                .setDescription('XP kazanma bekleme süresi (saniye)')
                .addIntegerOption(option =>
                    option
                        .setName('saniye')
                        .setDescription('Bekleme süresi (saniye)')
                        .setMinValue(0)
                        .setMaxValue(3600)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('xpyok')
                .setDescription('XP kazanılmayan kanal ekle/kaldır')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('boostkanal')
                .setDescription('Boost kanalı ekle/kaldır')
                .addChannelOption(option =>
                    option
                        .setName('kanal')
                        .setDescription('Kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option
                        .setName('carpan')
                        .setDescription('XP çarpanı (kaldırmak için 1 gir)')
                        .setMinValue(1)
                        .setMaxValue(10)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('bonusrol')
                .setDescription('Bonus XP rolü ekle/kaldır')
                .addRoleOption(option =>
                    option
                        .setName('rol')
                        .setDescription('Rol')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('bonus')
                        .setDescription('Bonus yüzdesi (kaldırmak için 0 gir)')
                        .setMinValue(0)
                        .setMaxValue(500)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('gunluklimit')
                .setDescription('Günlük XP limiti')
                .addIntegerOption(option =>
                    option
                        .setName('limit')
                        .setDescription('Günlük maksimum XP (0 = limitsiz)')
                        .setMinValue(0)
                        .setMaxValue(1000000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mesaj')
                .setDescription('Seviye atlama mesajını özelleştir')
                .addStringOption(option =>
                    option
                        .setName('mesaj')
                        .setDescription('{user} = kullanıcı, {level} = seviye, {oldLevel} = eski seviye')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('goster')
                .setDescription('Mevcut ayarları göster')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ManageGuild],

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply();

        try {
            switch (subcommand) {
                case 'durum':
                    await handleStatus(interaction);
                    break;
                case 'kanal':
                    await handleChannel(interaction);
                    break;
                case 'xpmiktari':
                    await handleXpAmount(interaction);
                    break;
                case 'bekleme':
                    await handleCooldown(interaction);
                    break;
                case 'xpyok':
                    await handleNoXpChannel(interaction);
                    break;
                case 'boostkanal':
                    await handleBoostChannel(interaction);
                    break;
                case 'bonusrol':
                    await handleBonusRole(interaction);
                    break;
                case 'gunluklimit':
                    await handleDailyLimit(interaction);
                    break;
                case 'mesaj':
                    await handleMessage(interaction);
                    break;
                case 'goster':
                    await handleShow(interaction);
                    break;
            }
        } catch (error) {
            console.error('Seviye ayar komutu hatası:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', error.message || 'Bir hata oluştu.')]
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 🔧 YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────

async function getOrCreateSettings(guildId) {
    let settings = await GuildSettings.findOne({ guildId });
    
    if (!settings) {
        settings = new GuildSettings({ guildId });
    }

    if (!settings.levelSystem) {
        settings.levelSystem = {
            enabled: true,
            levelUpChannel: null,
            levelUpMessage: '🎉 Tebrikler {user}! Artık **{level}. seviyedesin!**',
            xpPerMessage: { min: 15, max: 25 },
            xpCooldown: 60,
            noXpChannels: [],
            boostChannels: [],
            levelRoles: [],
            dailyXpLimit: 0,
            bonusXpRoles: [],
            announceLevelUp: true,
            showRankCard: true
        };
    }

    return settings;
}

// ─────────────────────────────────────────────────────────────
// 📝 SUBCOMMAND HANDLERS
// ─────────────────────────────────────────────────────────────

async function handleStatus(interaction) {
    const enabled = interaction.options.getBoolean('aktif');
    const settings = await getOrCreateSettings(interaction.guild.id);

    settings.levelSystem.enabled = enabled;
    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle(enabled ? '✅ Seviye Sistemi Aktif' : '❌ Seviye Sistemi Devre Dışı')
        .setDescription(
            enabled 
                ? 'Kullanıcılar artık mesaj göndererek XP kazanabilir.'
                : 'Kullanıcılar artık XP kazanamayacak. Mevcut veriler korunur.'
        )
        .setColor(enabled ? config.colors.success : config.colors.error)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleChannel(interaction) {
    const channel = interaction.options.getChannel('kanal');
    const settings = await getOrCreateSettings(interaction.guild.id);

    settings.levelSystem.levelUpChannel = channel?.id || null;
    settings.levelSystem.announceLevelUp = !!channel;
    await settings.save();

    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTimestamp();

    if (channel) {
        embed
            .setTitle('✅ Bildirim Kanalı Ayarlandı')
            .setDescription(`Seviye atlama bildirimleri ${channel} kanalında gösterilecek.`);
    } else {
        embed
            .setTitle('❌ Bildirimler Kapatıldı')
            .setDescription('Seviye atlama bildirimleri kapatıldı.');
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleXpAmount(interaction) {
    const min = interaction.options.getInteger('min');
    const max = interaction.options.getInteger('max');

    if (min > max) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Minimum değer maksimumdan büyük olamaz!')]
        });
    }

    const settings = await getOrCreateSettings(interaction.guild.id);
    settings.levelSystem.xpPerMessage = { min, max };
    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Miktarı Ayarlandı')
        .setDescription(`Her mesaj için **${min}** - **${max}** XP kazanılacak.`)
        .setColor(config.colors.success)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCooldown(interaction) {
    const seconds = interaction.options.getInteger('saniye');
    const settings = await getOrCreateSettings(interaction.guild.id);

    settings.levelSystem.xpCooldown = seconds;
    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ Bekleme Süresi Ayarlandı')
        .setDescription(
            seconds === 0
                ? 'XP kazanma bekleme süresi kaldırıldı. Her mesaj XP kazandırır.'
                : `Kullanıcılar **${seconds} saniyede** bir XP kazanabilir.`
        )
        .setColor(config.colors.success)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleNoXpChannel(interaction) {
    const channel = interaction.options.getChannel('kanal');
    const settings = await getOrCreateSettings(interaction.guild.id);

    if (!settings.levelSystem.noXpChannels) {
        settings.levelSystem.noXpChannels = [];
    }

    const index = settings.levelSystem.noXpChannels.indexOf(channel.id);
    let added = false;

    if (index === -1) {
        settings.levelSystem.noXpChannels.push(channel.id);
        added = true;
    } else {
        settings.levelSystem.noXpChannels.splice(index, 1);
    }

    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle(added ? '➕ Kanal Eklendi' : '➖ Kanal Kaldırıldı')
        .setDescription(
            added
                ? `${channel} kanalında artık XP kazanılmayacak.`
                : `${channel} kanalında artık XP kazanılabilir.`
        )
        .setColor(config.colors.success)
        .addFields({
            name: '📋 XP Yok Kanalları',
            value: settings.levelSystem.noXpChannels.length > 0
                ? settings.levelSystem.noXpChannels.map(id => `<#${id}>`).join(', ')
                : 'Yok'
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleBoostChannel(interaction) {
    const channel = interaction.options.getChannel('kanal');
    const multiplier = interaction.options.getNumber('carpan');
    const settings = await getOrCreateSettings(interaction.guild.id);

    if (!settings.levelSystem.boostChannels) {
        settings.levelSystem.boostChannels = [];
    }

    const index = settings.levelSystem.boostChannels.findIndex(bc => bc.channelId === channel.id);

    if (multiplier === 1) {
        // Kaldır
        if (index !== -1) {
            settings.levelSystem.boostChannels.splice(index, 1);
        }
        await settings.save();

        const embed = new EmbedBuilder()
            .setTitle('➖ Boost Kanalı Kaldırıldı')
            .setDescription(`${channel} kanalı artık boost kanalı değil.`)
            .setColor(config.colors.warning)
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    // Ekle veya güncelle
    if (index !== -1) {
        settings.levelSystem.boostChannels[index].multiplier = multiplier;
    } else {
        settings.levelSystem.boostChannels.push({
            channelId: channel.id,
            multiplier
        });
    }

    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ Boost Kanalı Ayarlandı')
        .setDescription(`${channel} kanalında **x${multiplier}** XP kazanılacak.`)
        .setColor(config.colors.success)
        .addFields({
            name: '🚀 Boost Kanalları',
            value: settings.levelSystem.boostChannels.length > 0
                ? settings.levelSystem.boostChannels.map(bc => 
                    `<#${bc.channelId}> → x${bc.multiplier}`
                ).join('\n')
                : 'Yok'
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleBonusRole(interaction) {
    const role = interaction.options.getRole('rol');
    const bonus = interaction.options.getInteger('bonus');
    const settings = await getOrCreateSettings(interaction.guild.id);

    if (!settings.levelSystem.bonusXpRoles) {
        settings.levelSystem.bonusXpRoles = [];
    }

    const index = settings.levelSystem.bonusXpRoles.findIndex(br => br.roleId === role.id);

    if (bonus === 0) {
        // Kaldır
        if (index !== -1) {
            settings.levelSystem.bonusXpRoles.splice(index, 1);
        }
        await settings.save();

        const embed = new EmbedBuilder()
            .setTitle('➖ Bonus Rolü Kaldırıldı')
            .setDescription(`${role} rolü artık bonus XP vermiyor.`)
            .setColor(config.colors.warning)
            .setTimestamp();

        return await interaction.editReply({ embeds: [embed] });
    }

    // Ekle veya güncelle
    if (index !== -1) {
        settings.levelSystem.bonusXpRoles[index].bonusPercent = bonus;
    } else {
        settings.levelSystem.bonusXpRoles.push({
            roleId: role.id,
            bonusPercent: bonus
        });
    }

    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ Bonus Rolü Ayarlandı')
        .setDescription(`${role} rolüne sahip kullanıcılar **+%${bonus}** bonus XP kazanacak.`)
        .setColor(config.colors.success)
        .addFields({
            name: '🎁 Bonus Rolleri',
            value: settings.levelSystem.bonusXpRoles.length > 0
                ? settings.levelSystem.bonusXpRoles.map(br => 
                    `<@&${br.roleId}> → +%${br.bonusPercent}`
                ).join('\n')
                : 'Yok'
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleDailyLimit(interaction) {
    const limit = interaction.options.getInteger('limit');
    const settings = await getOrCreateSettings(interaction.guild.id);

    settings.levelSystem.dailyXpLimit = limit;
    await settings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ Günlük Limit Ayarlandı')
        .setDescription(
            limit === 0
                ? 'Günlük XP limiti kaldırıldı.'
                : `Kullanıcılar günde maksimum **${formatNumber(limit)}** XP kazanabilir.`
        )
        .setColor(config.colors.success)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleMessage(interaction) {
    const message = interaction.options.getString('mesaj');
    const settings = await getOrCreateSettings(interaction.guild.id);

    settings.levelSystem.levelUpMessage = message;
    await settings.save();

    // Örnek mesaj
    const exampleMessage = message
        .replace('{user}', interaction.user.toString())
        .replace('{level}', '5')
        .replace('{oldLevel}', '4');

    const embed = new EmbedBuilder()
        .setTitle('✅ Mesaj Ayarlandı')
        .setColor(config.colors.success)
        .addFields(
            { name: '📝 Şablon', value: `\`${message}\``, inline: false },
            { name: '👀 Önizleme', value: exampleMessage, inline: false }
        )
        .setFooter({ text: 'Değişkenler: {user}, {level}, {oldLevel}' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleShow(interaction) {
    const settings = await getOrCreateSettings(interaction.guild.id);
    const ls = settings.levelSystem;

    const embed = new EmbedBuilder()
        .setTitle('⚙️ Seviye Sistemi Ayarları')
        .setColor(config.colors.primary)
        .addFields(
            { 
                name: '📊 Durum', 
                value: ls.enabled ? '✅ Aktif' : '❌ Devre Dışı', 
                inline: true 
            },
            { 
                name: '📢 Bildirim Kanalı', 
                value: ls.levelUpChannel ? `<#${ls.levelUpChannel}>` : '❌ Kapalı', 
                inline: true 
            },
            { 
                name: '🎯 XP Miktarı', 
                value: `${ls.xpPerMessage?.min || 15} - ${ls.xpPerMessage?.max || 25}`, 
                inline: true 
            },
            { 
                name: '⏱️ Bekleme', 
                value: `${ls.xpCooldown || 60} saniye`, 
                inline: true 
            },
            { 
                name: '📅 Günlük Limit', 
                value: ls.dailyXpLimit > 0 ? formatNumber(ls.dailyXpLimit) : 'Limitsiz', 
                inline: true 
            },
            { 
                name: '🎖️ Seviye Rolleri', 
                value: `${ls.levelRoles?.length || 0} adet`, 
                inline: true 
            },
            { 
                name: '🚫 XP Yok Kanalları', 
                value: ls.noXpChannels?.length > 0 
                    ? ls.noXpChannels.map(id => `<#${id}>`).join(', ') 
                    : 'Yok',
                inline: false 
            },
            { 
                name: '🚀 Boost Kanalları', 
                value: ls.boostChannels?.length > 0 
                    ? ls.boostChannels.map(bc => `<#${bc.channelId}> (x${bc.multiplier})`).join(', ') 
                    : 'Yok',
                inline: false 
            },
            { 
                name: '🎁 Bonus Roller', 
                value: ls.bonusXpRoles?.length > 0 
                    ? ls.bonusXpRoles.map(br => `<@&${br.roleId}> (+%${br.bonusPercent})`).join(', ') 
                    : 'Yok',
                inline: false 
            },
            { 
                name: '📝 Seviye Atlama Mesajı', 
                value: `\`${ls.levelUpMessage || 'Varsayılan'}\``,
                inline: false 
            }
        )
        .setFooter({ text: 'Ayarları değiştirmek için /seviyeayar komutlarını kullan' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('tr-TR');
}
