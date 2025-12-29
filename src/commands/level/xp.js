/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ AKIRA BOT - XP YÖNETİM KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * XP ve seviye yönetimi (Admin)
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const { UserLevel, GuildSettings } = require('../../database');
const { EmbedHelper } = require('../../utils');
const config = require('../../config/botConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('XP ve seviye yönetimi')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Kullanıcıya XP ekle')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('XP eklenecek kullanıcı')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('miktar')
                        .setDescription('Eklenecek XP miktarı')
                        .setMinValue(1)
                        .setMaxValue(1000000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cikar')
                .setDescription('Kullanıcıdan XP çıkar')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('XP çıkarılacak kullanıcı')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('miktar')
                        .setDescription('Çıkarılacak XP miktarı')
                        .setMinValue(1)
                        .setMaxValue(1000000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Kullanıcının XP\'sini ayarla')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('Kullanıcı')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('miktar')
                        .setDescription('Yeni XP miktarı')
                        .setMinValue(0)
                        .setMaxValue(100000000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('seviye')
                .setDescription('Kullanıcının seviyesini ayarla')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('Kullanıcı')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('seviye')
                        .setDescription('Yeni seviye')
                        .setMinValue(0)
                        .setMaxValue(1000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sifirla')
                .setDescription('Kullanıcının XP\'sini sıfırla')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('Kullanıcı')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('boost')
                .setDescription('Kullanıcıya XP boost ver')
                .addUserOption(option =>
                    option
                        .setName('kullanici')
                        .setDescription('Kullanıcı')
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option
                        .setName('carpan')
                        .setDescription('XP çarpanı (örn: 1.5, 2, 3)')
                        .setMinValue(1.1)
                        .setMaxValue(10)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('sure')
                        .setDescription('Boost süresi')
                        .setRequired(true)
                        .addChoices(
                            { name: '1 Saat', value: '1h' },
                            { name: '3 Saat', value: '3h' },
                            { name: '6 Saat', value: '6h' },
                            { name: '12 Saat', value: '12h' },
                            { name: '1 Gün', value: '1d' },
                            { name: '3 Gün', value: '3d' },
                            { name: '7 Gün', value: '7d' }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    cooldown: 3,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ManageGuild],

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply();

        try {
            switch (subcommand) {
                case 'ekle':
                    await handleAddXp(interaction);
                    break;
                case 'cikar':
                    await handleRemoveXp(interaction);
                    break;
                case 'ayarla':
                    await handleSetXp(interaction);
                    break;
                case 'seviye':
                    await handleSetLevel(interaction);
                    break;
                case 'sifirla':
                    await handleReset(interaction);
                    break;
                case 'boost':
                    await handleBoost(interaction);
                    break;
            }
        } catch (error) {
            console.error('XP komutu hatası:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', error.message || 'Bir hata oluştu.')]
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 🔧 ALT KOMUT HANDLERLARİ
// ─────────────────────────────────────────────────────────────

async function handleAddXp(interaction) {
    const targetUser = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetUser.bot) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Botlara XP eklenemez!')]
        });
    }

    const result = await UserLevel.addXp(
        targetUser.id,
        interaction.guild.id,
        amount,
        {
            username: targetUser.username,
            displayName: targetMember?.displayName,
            avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
        }
    );

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Eklendi')
        .setColor(config.colors.success)
        .addFields(
            { name: '👤 Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: '➕ Eklenen XP', value: `**${formatNumber(amount)}**`, inline: true },
            { name: '📊 Yeni Toplam', value: `**${formatNumber(result.user.totalXp)}** XP`, inline: true },
            { name: '📈 Seviye', value: `**${result.user.level}**`, inline: true }
        )
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    if (result.leveledUp) {
        embed.addFields({
            name: '🎉 Seviye Atladı!',
            value: `${result.oldLevel} → **${result.newLevel}**`,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveXp(interaction) {
    const targetUser = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');

    const userData = await UserLevel.findOne({ 
        discordId: targetUser.id, 
        guildId: interaction.guild.id 
    });

    if (!userData) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Bu kullanıcının seviye verisi bulunamadı!')]
        });
    }

    const newTotalXp = Math.max(0, userData.totalXp - amount);
    await UserLevel.setXp(targetUser.id, interaction.guild.id, newTotalXp);

    const updatedUser = await UserLevel.findOne({ 
        discordId: targetUser.id, 
        guildId: interaction.guild.id 
    });

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Çıkarıldı')
        .setColor(config.colors.warning)
        .addFields(
            { name: '👤 Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: '➖ Çıkarılan XP', value: `**${formatNumber(amount)}**`, inline: true },
            { name: '📊 Yeni Toplam', value: `**${formatNumber(updatedUser.totalXp)}** XP`, inline: true },
            { name: '📈 Seviye', value: `**${updatedUser.level}**`, inline: true }
        )
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleSetXp(interaction) {
    const targetUser = interaction.options.getUser('kullanici');
    const amount = interaction.options.getInteger('miktar');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Önce kullanıcıyı oluştur (yoksa)
    await UserLevel.findOrCreate(targetUser.id, interaction.guild.id, {
        username: targetUser.username,
        displayName: targetMember?.displayName,
        avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
    });

    const updatedUser = await UserLevel.setXp(targetUser.id, interaction.guild.id, amount);

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Ayarlandı')
        .setColor(config.colors.success)
        .addFields(
            { name: '👤 Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: '📊 Yeni XP', value: `**${formatNumber(amount)}**`, inline: true },
            { name: '📈 Seviye', value: `**${updatedUser.level}**`, inline: true }
        )
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleSetLevel(interaction) {
    const targetUser = interaction.options.getUser('kullanici');
    const newLevel = interaction.options.getInteger('seviye');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Önce kullanıcıyı oluştur (yoksa)
    await UserLevel.findOrCreate(targetUser.id, interaction.guild.id, {
        username: targetUser.username,
        displayName: targetMember?.displayName,
        avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
    });

    const updatedUser = await UserLevel.setLevel(targetUser.id, interaction.guild.id, newLevel);

    const embed = new EmbedBuilder()
        .setTitle('✅ Seviye Ayarlandı')
        .setColor(config.colors.success)
        .addFields(
            { name: '👤 Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: '📈 Yeni Seviye', value: `**${newLevel}**`, inline: true },
            { name: '📊 Toplam XP', value: `**${formatNumber(updatedUser.totalXp)}**`, inline: true }
        )
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleReset(interaction) {
    const targetUser = interaction.options.getUser('kullanici');

    const result = await UserLevel.deleteOne({ 
        discordId: targetUser.id, 
        guildId: interaction.guild.id 
    });

    if (result.deletedCount === 0) {
        return await interaction.editReply({
            embeds: [EmbedHelper.warning('Uyarı', 'Bu kullanıcının zaten seviye verisi yok.')]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🗑️ XP Sıfırlandı')
        .setColor(config.colors.error)
        .setDescription(`**${targetUser.tag}** kullanıcısının tüm seviye verileri silindi.`)
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleBoost(interaction) {
    const targetUser = interaction.options.getUser('kullanici');
    const multiplier = interaction.options.getNumber('carpan');
    const duration = interaction.options.getString('sure');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetUser.bot) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Botlara boost verilemez!')]
        });
    }

    // Süre hesapla
    const durations = {
        '1h': 60 * 60 * 1000,
        '3h': 3 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '3d': 3 * 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
    };

    const durationMs = durations[duration];
    const expiresAt = new Date(Date.now() + durationMs);

    // Önce kullanıcıyı oluştur (yoksa)
    await UserLevel.findOrCreate(targetUser.id, interaction.guild.id, {
        username: targetUser.username,
        displayName: targetMember?.displayName,
        avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
    });

    await UserLevel.giveBoost(targetUser.id, interaction.guild.id, multiplier, durationMs);

    const durationNames = {
        '1h': '1 Saat',
        '3h': '3 Saat',
        '6h': '6 Saat',
        '12h': '12 Saat',
        '1d': '1 Gün',
        '3d': '3 Gün',
        '7d': '7 Gün'
    };

    const embed = new EmbedBuilder()
        .setTitle('🚀 XP Boost Verildi')
        .setColor(config.colors.success)
        .addFields(
            { name: '👤 Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: '⚡ Çarpan', value: `**x${multiplier}**`, inline: true },
            { name: '⏱️ Süre', value: `**${durationNames[duration]}**`, inline: true },
            { 
                name: '📅 Bitiş', 
                value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>\n(<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)`, 
                inline: false 
            }
        )
        .setFooter({ text: `${interaction.user.tag} tarafından`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Kullanıcıya DM gönder
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('🚀 XP Boost Kazandın!')
            .setDescription(`**${interaction.guild.name}** sunucusunda XP boost kazandın!`)
            .setColor(config.colors.success)
            .addFields(
                { name: '⚡ Çarpan', value: `**x${multiplier}**`, inline: true },
                { name: '⏱️ Süre', value: `**${durationNames[duration]}**`, inline: true },
                { name: '📅 Bitiş', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true }
            )
            .setFooter({ text: 'Tüm kazandığın XP bu süre boyunca çarpılacak!' })
            .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
    } catch (e) {
        // DM kapalıysa devam et
    }
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('tr-TR');
}
