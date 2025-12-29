/**
 * ═══════════════════════════════════════════════════════════════
 * 🎖️ AKIRA BOT - SEVİYE ROLLERİ KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Seviye rolleri yönetimi (Admin)
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const { GuildSettings } = require('../../database');
const { EmbedHelper } = require('../../utils');
const config = require('../../config/botConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seviyerol')
        .setDescription('Seviye rolleri yönetimi')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Seviye rolü ekle')
                .addIntegerOption(option =>
                    option
                        .setName('seviye')
                        .setDescription('Rol için gereken seviye')
                        .setMinValue(1)
                        .setMaxValue(1000)
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('rol')
                        .setDescription('Verilecek rol')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('ustseviyelerdkaldir')
                        .setDescription('Üst seviyeye geçince rolü kaldır?')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kaldir')
                .setDescription('Seviye rolü kaldır')
                .addIntegerOption(option =>
                    option
                        .setName('seviye')
                        .setDescription('Kaldırılacak rolün seviyesi')
                        .setMinValue(1)
                        .setMaxValue(1000)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Seviye rollerini listele')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('senkronize')
                .setDescription('Tüm kullanıcıların seviye rollerini senkronize et')
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
                case 'ekle':
                    await handleAdd(interaction);
                    break;
                case 'kaldir':
                    await handleRemove(interaction);
                    break;
                case 'liste':
                    await handleList(interaction);
                    break;
                case 'senkronize':
                    await handleSync(interaction, client);
                    break;
            }
        } catch (error) {
            console.error('Seviye rol komutu hatası:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', error.message || 'Bir hata oluştu.')]
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// ➕ ROL EKLEME
// ─────────────────────────────────────────────────────────────

async function handleAdd(interaction) {
    const level = interaction.options.getInteger('seviye');
    const role = interaction.options.getRole('rol');
    const removeOnHigher = interaction.options.getBoolean('ustseviyelerdkaldir') ?? false;

    // Bot rolü kontrol
    if (role.managed) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Bot tarafından yönetilen roller seviye rolü olarak ayarlanamaz!')]
        });
    }

    // Bot yetkisi kontrol
    const botMember = interaction.guild.members.me;
    if (botMember.roles.highest.position <= role.position) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Bu rolü verebilmem için rolüm daha yüksek olmalı!')]
        });
    }

    // @everyone kontrolü
    if (role.id === interaction.guild.id) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', '@everyone rolü seviye rolü olarak ayarlanamaz!')]
        });
    }

    // Sunucu ayarlarını al
    let guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    
    if (!guildSettings) {
        guildSettings = new GuildSettings({ guildId: interaction.guild.id });
    }

    // levelSystem objesini oluştur
    if (!guildSettings.levelSystem) {
        guildSettings.levelSystem = { levelRoles: [] };
    }
    if (!guildSettings.levelSystem.levelRoles) {
        guildSettings.levelSystem.levelRoles = [];
    }

    // Mevcut seviye kontrolü
    const existingIndex = guildSettings.levelSystem.levelRoles.findIndex(r => r.level === level);
    
    if (existingIndex !== -1) {
        // Mevcut olanı güncelle
        guildSettings.levelSystem.levelRoles[existingIndex] = {
            level,
            roleId: role.id,
            removeOnHigher
        };
    } else {
        // Yeni ekle
        guildSettings.levelSystem.levelRoles.push({
            level,
            roleId: role.id,
            removeOnHigher
        });
    }

    // Seviyeye göre sırala
    guildSettings.levelSystem.levelRoles.sort((a, b) => a.level - b.level);

    await guildSettings.save();

    const embed = new EmbedBuilder()
        .setTitle('✅ Seviye Rolü Eklendi')
        .setColor(role.color || config.colors.success)
        .addFields(
            { name: '📈 Seviye', value: `**${level}**`, inline: true },
            { name: '🎭 Rol', value: `${role}`, inline: true },
            { 
                name: '🔄 Üst Seviyede Kaldır', 
                value: removeOnHigher ? '✅ Evet' : '❌ Hayır', 
                inline: true 
            }
        )
        .setFooter({ 
            text: existingIndex !== -1 
                ? 'Mevcut rol güncellendi' 
                : `Toplam ${guildSettings.levelSystem.levelRoles.length} seviye rolü`
        })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// ➖ ROL KALDIRMA
// ─────────────────────────────────────────────────────────────

async function handleRemove(interaction) {
    const level = interaction.options.getInteger('seviye');

    const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    if (!guildSettings?.levelSystem?.levelRoles?.length) {
        return await interaction.editReply({
            embeds: [EmbedHelper.warning('Uyarı', 'Bu sunucuda henüz seviye rolü tanımlanmamış.')]
        });
    }

    const existingIndex = guildSettings.levelSystem.levelRoles.findIndex(r => r.level === level);

    if (existingIndex === -1) {
        return await interaction.editReply({
            embeds: [EmbedHelper.warning('Uyarı', `Seviye **${level}** için tanımlı bir rol bulunamadı.`)]
        });
    }

    const removed = guildSettings.levelSystem.levelRoles.splice(existingIndex, 1)[0];
    await guildSettings.save();

    const role = interaction.guild.roles.cache.get(removed.roleId);

    const embed = new EmbedBuilder()
        .setTitle('🗑️ Seviye Rolü Kaldırıldı')
        .setColor(config.colors.warning)
        .addFields(
            { name: '📈 Seviye', value: `**${level}**`, inline: true },
            { name: '🎭 Rol', value: role ? `${role}` : `\`${removed.roleId}\``, inline: true }
        )
        .setFooter({ text: `Kalan ${guildSettings.levelSystem.levelRoles.length} seviye rolü` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 📋 ROL LİSTESİ
// ─────────────────────────────────────────────────────────────

async function handleList(interaction) {
    const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    if (!guildSettings?.levelSystem?.levelRoles?.length) {
        return await interaction.editReply({
            embeds: [EmbedHelper.info('Seviye Rolleri', 'Bu sunucuda henüz seviye rolü tanımlanmamış.\n\n`/seviyerol ekle` komutu ile ekleyebilirsin.')]
        });
    }

    const levelRoles = guildSettings.levelSystem.levelRoles;
    
    let description = '';
    let validCount = 0;
    let invalidCount = 0;

    for (const lr of levelRoles) {
        const role = interaction.guild.roles.cache.get(lr.roleId);
        
        if (role) {
            validCount++;
            const removeIcon = lr.removeOnHigher ? '🔄' : '📌';
            description += `${removeIcon} **Seviye ${lr.level}** → ${role}\n`;
        } else {
            invalidCount++;
            description += `⚠️ **Seviye ${lr.level}** → \`Silinmiş Rol\`\n`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🎖️ Seviye Rolleri')
        .setDescription(description || 'Rol bulunamadı.')
        .setColor(config.colors.primary)
        .addFields(
            { name: '📊 İstatistik', value: `✅ Geçerli: ${validCount}\n⚠️ Geçersiz: ${invalidCount}`, inline: true }
        )
        .setFooter({ text: '🔄 = Üst seviyede kaldırılır | 📌 = Kalıcı' });

    // Geçersiz roller varsa temizleme butonu eklenebilir
    if (invalidCount > 0) {
        embed.addFields({
            name: '💡 İpucu',
            value: 'Silinmiş rolleri kaldırmak için `/seviyerol senkronize` komutunu kullan.'
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 🔄 SENKRONİZASYON
// ─────────────────────────────────────────────────────────────

async function handleSync(interaction, client) {
    const guildSettings = await GuildSettings.findOne({ guildId: interaction.guild.id });

    if (!guildSettings?.levelSystem?.levelRoles?.length) {
        return await interaction.editReply({
            embeds: [EmbedHelper.warning('Uyarı', 'Senkronize edilecek seviye rolü bulunamadı.')]
        });
    }

    // Geçersiz rolleri temizle
    const validRoles = guildSettings.levelSystem.levelRoles.filter(lr => 
        interaction.guild.roles.cache.has(lr.roleId)
    );

    const removedCount = guildSettings.levelSystem.levelRoles.length - validRoles.length;
    guildSettings.levelSystem.levelRoles = validRoles;
    await guildSettings.save();

    // Kullanıcı rollerini senkronize et
    const { UserLevel } = require('../../database');
    const allUsers = await UserLevel.find({ guildId: interaction.guild.id });

    let syncedUsers = 0;
    let rolesGiven = 0;
    let rolesRemoved = 0;
    let errors = 0;

    const statusEmbed = new EmbedBuilder()
        .setTitle('🔄 Senkronizasyon Başladı')
        .setDescription(`**${allUsers.length}** kullanıcı kontrol ediliyor...`)
        .setColor(config.colors.primary);

    await interaction.editReply({ embeds: [statusEmbed] });

    for (const userData of allUsers) {
        try {
            const member = await interaction.guild.members.fetch(userData.discordId).catch(() => null);
            if (!member) continue;

            const userLevel = userData.level;
            
            // Kullanıcının hak ettiği rolleri bul
            const eligibleRoles = validRoles.filter(lr => lr.level <= userLevel);
            const highestEligible = eligibleRoles[eligibleRoles.length - 1];

            for (const lr of validRoles) {
                const role = interaction.guild.roles.cache.get(lr.roleId);
                if (!role) continue;

                const hasRole = member.roles.cache.has(role.id);
                const shouldHave = lr.level <= userLevel && 
                    (!lr.removeOnHigher || lr.level === highestEligible?.level);

                if (shouldHave && !hasRole) {
                    await member.roles.add(role).catch(() => errors++);
                    rolesGiven++;
                } else if (!shouldHave && hasRole) {
                    await member.roles.remove(role).catch(() => errors++);
                    rolesRemoved++;
                }
            }

            syncedUsers++;
        } catch (error) {
            errors++;
        }
    }

    const resultEmbed = new EmbedBuilder()
        .setTitle('✅ Senkronizasyon Tamamlandı')
        .setColor(config.colors.success)
        .addFields(
            { name: '👥 Kontrol Edilen', value: `**${syncedUsers}** kullanıcı`, inline: true },
            { name: '➕ Verilen Rol', value: `**${rolesGiven}**`, inline: true },
            { name: '➖ Alınan Rol', value: `**${rolesRemoved}**`, inline: true }
        )
        .setTimestamp();

    if (removedCount > 0) {
        resultEmbed.addFields({
            name: '🗑️ Temizlenen',
            value: `**${removedCount}** geçersiz rol yapılandırması silindi.`,
            inline: false
        });
    }

    if (errors > 0) {
        resultEmbed.addFields({
            name: '⚠️ Hatalar',
            value: `**${errors}** işlem başarısız oldu (yetki eksikliği olabilir).`,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [resultEmbed] });
}
