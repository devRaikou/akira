/**
 * ═══════════════════════════════════════════════════════════════
 * 🧹 AKIRA BOT - TEMİZLE KOMUTU (GELİŞMİŞ)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Belirtilen sayıda mesajı siler.
 * - Çoklu filtreleme seçenekleri
 * - Detaylı istatistikler
 * - Log kaydı
 * - İlerleme göstergesi
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');
const { ModerationLog, GuildSettings } = require('../../database');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen sayıda mesajı siler.')
        .addIntegerOption(option =>
            option
                .setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Sadece bu kullanıcının mesajlarını sil')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('filtre')
                .setDescription('Mesaj filtresi')
                .setRequired(false)
                .addChoices(
                    { name: '🤖 Bot Mesajları', value: 'bots' },
                    { name: '👤 İnsan Mesajları', value: 'humans' },
                    { name: '📎 Ekli Dosyalar', value: 'attachments' },
                    { name: '🔗 Linkler', value: 'links' },
                    { name: '📌 Sabitlenmemişler', value: 'unpinned' },
                    { name: '💬 Embedler', value: 'embeds' },
                    { name: '😀 Emojiler İçeren', value: 'emojis' }
                )
        )
        .addStringOption(option =>
            option
                .setName('icerik')
                .setDescription('Bu metni içeren mesajları sil')
                .setMaxLength(100)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('onay_atla')
                .setDescription('Onay adımını atla (10+ mesaj için önerilmez)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ManageMessages],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('miktar');
        const targetUser = interaction.options.getUser('kullanici');
        const filter = interaction.options.getString('filtre');
        const contentFilter = interaction.options.getString('icerik');
        const skipConfirm = interaction.options.getBoolean('onay_atla') || false;

        // ─────────────────────────────────────────────────────────────
        // 📥 MESAJLARI TOPLA
        // ─────────────────────────────────────────────────────────────
        await interaction.deferReply({ ephemeral: true });

        try {
            // Mesajları al (daha fazla al ve filtrele)
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            // 14 günden eski mesajları filtrele (Discord API limiti)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            messages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

            // Kullanıcı filtresi
            if (targetUser) {
                messages = messages.filter(msg => msg.author.id === targetUser.id);
            }

            // Özel filtreler
            if (filter) {
                messages = applyFilter(messages, filter);
            }

            // İçerik filtresi
            if (contentFilter) {
                const lowerContent = contentFilter.toLowerCase();
                messages = messages.filter(msg => 
                    msg.content.toLowerCase().includes(lowerContent)
                );
            }

            // İstenen miktara göre kes
            messages = [...messages.values()].slice(0, amount);

            if (messages.length === 0) {
                return await interaction.editReply({
                    embeds: [EmbedHelper.warning('Mesaj Bulunamadı', 
                        'Belirtilen kriterlere uyan silinecek mesaj bulunamadı.\n\n' +
                        '**Olası Nedenler:**\n' +
                        '• 14 günden eski mesajlar silinemez\n' +
                        '• Filtrelere uyan mesaj yok\n' +
                        '• Kanal boş'
                    )]
                });
            }

            // ─────────────────────────────────────────────────────────────
            // 📊 MESAJ ANALİZİ
            // ─────────────────────────────────────────────────────────────
            const analysis = analyzeMessages(messages);

            // ─────────────────────────────────────────────────────────────
            // ⚠️ ONAY MESAJI (10+ mesaj veya onay atlanmadıysa)
            // ─────────────────────────────────────────────────────────────
            if (!skipConfirm && messages.length >= 10) {
                const confirmEmbed = new EmbedBuilder()
                    .setTitle('🧹 Toplu Silme Onayı')
                    .setDescription(`**${messages.length}** mesaj silinecek. Devam etmek istiyor musun?`)
                    .setColor(config.colors.warning)
                    .addFields(
                        { 
                            name: '📊 Mesaj Dağılımı', 
                            value: `👤 İnsan: **${analysis.humans}**\n🤖 Bot: **${analysis.bots}**`, 
                            inline: true 
                        },
                        { 
                            name: '📎 İçerik', 
                            value: `💬 Metin: **${analysis.text}**\n📎 Ekli: **${analysis.attachments}**\n🔗 Link: **${analysis.links}**`, 
                            inline: true 
                        }
                    )
                    .setTimestamp();

                // Aktif filtreler
                const activeFilters = [];
                if (targetUser) activeFilters.push(`👤 Kullanıcı: ${targetUser.tag}`);
                if (filter) activeFilters.push(`🔍 Filtre: ${getFilterName(filter)}`);
                if (contentFilter) activeFilters.push(`📝 İçerik: "${contentFilter}"`);
                
                if (activeFilters.length > 0) {
                    confirmEmbed.addFields({
                        name: '🎯 Aktif Filtreler',
                        value: activeFilters.join('\n'),
                        inline: false
                    });
                }

                // En aktif yazarlar
                if (analysis.topAuthors.length > 0) {
                    confirmEmbed.addFields({
                        name: '👥 En Çok Mesaj',
                        value: analysis.topAuthors.slice(0, 5).map((a, i) => 
                            `${i + 1}. ${a.tag}: **${a.count}** mesaj`
                        ).join('\n'),
                        inline: false
                    });
                }

                const buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('clear_confirm')
                            .setLabel(`${messages.length} Mesajı Sil`)
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🗑️'),
                        new ButtonBuilder()
                            .setCustomId('clear_cancel')
                            .setLabel('İptal')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('❌')
                    );

                await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [buttons]
                });

                // Buton bekle
                try {
                    const confirmation = await interaction.channel.awaitMessageComponent({
                        filter: i => i.user.id === interaction.user.id && 
                                   (i.customId === 'clear_confirm' || i.customId === 'clear_cancel'),
                        componentType: ComponentType.Button,
                        time: 30000
                    });

                    if (confirmation.customId === 'clear_cancel') {
                        const cancelEmbed = new EmbedBuilder()
                            .setTitle('❌ İşlem İptal Edildi')
                            .setDescription('Mesaj silme işlemi iptal edildi.')
                            .setColor(config.colors.error)
                            .setTimestamp();

                        return await confirmation.update({
                            embeds: [cancelEmbed],
                            components: []
                        });
                    }

                    await confirmation.deferUpdate();
                    
                    // Silme işlemini gerçekleştir
                    await performDelete(interaction, messages, analysis, targetUser, filter, contentFilter);

                } catch (error) {
                    if (error.code === 'InteractionCollectorError') {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle('⏰ Süre Doldu')
                            .setDescription('Onay süresi doldu. İşlem iptal edildi.')
                            .setColor(config.colors.error)
                            .setTimestamp();

                        await interaction.editReply({
                            embeds: [timeoutEmbed],
                            components: []
                        });
                    } else {
                        throw error;
                    }
                }

            } else {
                // Onay gerektirmeyen silme
                await performDelete(interaction, messages, analysis, targetUser, filter, contentFilter);
            }

        } catch (error) {
            console.error('Clear error:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', `Mesajlar silinemedi: ${error.message}`)]
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 🔧 YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────

/**
 * Mesaj filtrelerini uygular
 */
function applyFilter(messages, filter) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|<a?:\w+:\d+>)/gi;

    switch (filter) {
        case 'bots':
            return messages.filter(msg => msg.author.bot);
        case 'humans':
            return messages.filter(msg => !msg.author.bot);
        case 'attachments':
            return messages.filter(msg => msg.attachments.size > 0);
        case 'links':
            return messages.filter(msg => urlRegex.test(msg.content));
        case 'unpinned':
            return messages.filter(msg => !msg.pinned);
        case 'embeds':
            return messages.filter(msg => msg.embeds.length > 0);
        case 'emojis':
            return messages.filter(msg => emojiRegex.test(msg.content));
        default:
            return messages;
    }
}

/**
 * Filtre adını döndürür
 */
function getFilterName(filter) {
    const names = {
        'bots': '🤖 Bot Mesajları',
        'humans': '👤 İnsan Mesajları',
        'attachments': '📎 Ekli Dosyalar',
        'links': '🔗 Linkler',
        'unpinned': '📌 Sabitlenmemişler',
        'embeds': '💬 Embedler',
        'emojis': '😀 Emoji İçerenler'
    };
    return names[filter] || filter;
}

/**
 * Mesajları analiz eder
 */
function analyzeMessages(messages) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const authorCounts = {};

    let bots = 0, humans = 0, attachments = 0, links = 0, text = 0;

    messages.forEach(msg => {
        if (msg.author.bot) bots++;
        else humans++;

        if (msg.attachments.size > 0) attachments++;
        if (urlRegex.test(msg.content)) links++;
        if (msg.content.length > 0) text++;

        const authorId = msg.author.id;
        if (!authorCounts[authorId]) {
            authorCounts[authorId] = { id: authorId, tag: msg.author.tag, count: 0 };
        }
        authorCounts[authorId].count++;
    });

    const topAuthors = Object.values(authorCounts)
        .sort((a, b) => b.count - a.count);

    return { bots, humans, attachments, links, text, topAuthors };
}

/**
 * Silme işlemini gerçekleştirir
 */
async function performDelete(interaction, messages, analysis, targetUser, filter, contentFilter) {
    try {
        // Mesajları sil
        const deleted = await interaction.channel.bulkDelete(messages, true);

        // ─────────────────────────────────────────────────────────────
        // 📝 LOG KAYDI
        // ─────────────────────────────────────────────────────────────
        const logEntry = await ModerationLog.createLog({
            guildId: interaction.guild.id,
            action: 'clear',
            target: {
                userId: targetUser?.id || 'multiple',
                username: targetUser?.tag || 'Çoklu Kullanıcı',
                displayName: targetUser?.username || 'Çoklu'
            },
            moderator: {
                userId: interaction.user.id,
                username: interaction.user.tag,
                displayName: interaction.member.displayName
            },
            reason: buildReason(deleted.size, targetUser, filter, contentFilter),
            details: {
                messagesDeleted: deleted.size,
                channelId: interaction.channel.id,
                channelName: interaction.channel.name
            }
        });

        // ─────────────────────────────────────────────────────────────
        // ✅ BAŞARI MESAJI
        // ─────────────────────────────────────────────────────────────
        const successEmbed = new EmbedBuilder()
            .setTitle('🧹 Mesajlar Silindi')
            .setDescription(`**${deleted.size}** mesaj başarıyla silindi.`)
            .setColor(config.colors.success)
            .addFields(
                { 
                    name: '📊 Silinen Mesaj Detayları', 
                    value: `👤 İnsan: **${analysis.humans}**\n🤖 Bot: **${analysis.bots}**`, 
                    inline: true 
                },
                { 
                    name: '📋 Case', 
                    value: `#${logEntry.caseId}`, 
                    inline: true 
                },
                { 
                    name: '📍 Kanal', 
                    value: `${interaction.channel}`, 
                    inline: true 
                }
            )
            .setFooter({ text: `Case #${logEntry.caseId} • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // Aktif filtreler
        const activeFilters = [];
        if (targetUser) activeFilters.push(`👤 Kullanıcı: ${targetUser.tag}`);
        if (filter) activeFilters.push(`🔍 Filtre: ${getFilterName(filter)}`);
        if (contentFilter) activeFilters.push(`📝 İçerik: "${contentFilter}"`);
        
        if (activeFilters.length > 0) {
            successEmbed.addFields({
                name: '🎯 Uygulanan Filtreler',
                value: activeFilters.join('\n'),
                inline: false
            });
        }

        // En çok silinen
        if (analysis.topAuthors.length > 0 && analysis.topAuthors.length <= 5) {
            successEmbed.addFields({
                name: '👥 Silinen Mesaj Dağılımı',
                value: analysis.topAuthors.map(a => `• ${a.tag}: **${a.count}**`).join('\n'),
                inline: false
            });
        }

        await interaction.editReply({
            embeds: [successEmbed],
            components: []
        });

        // ─────────────────────────────────────────────────────────────
        // 📢 KANAL BİLDİRİMİ
        // ─────────────────────────────────────────────────────────────
        const channelNotify = await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`🧹 **${interaction.user.tag}** tarafından **${deleted.size}** mesaj silindi.`)
                    .setColor(config.colors.info)
                    .setTimestamp()
            ]
        });

        // 5 saniye sonra kaldır
        setTimeout(() => channelNotify.delete().catch(() => {}), 5000);

        // ─────────────────────────────────────────────────────────────
        // 📢 MOD LOG KANALI
        // ─────────────────────────────────────────────────────────────
        await sendModLog(interaction.guild, logEntry, interaction.user, analysis, targetUser, filter, contentFilter);

    } catch (error) {
        throw error;
    }
}

/**
 * Sebep mesajı oluşturur
 */
function buildReason(count, targetUser, filter, contentFilter) {
    let reason = `${count} mesaj silindi`;
    
    if (targetUser) reason += ` | Kullanıcı: ${targetUser.tag}`;
    if (filter) reason += ` | Filtre: ${getFilterName(filter)}`;
    if (contentFilter) reason += ` | İçerik: "${contentFilter}"`;
    
    return reason;
}

/**
 * Mod log kanalına mesaj gönderir
 */
async function sendModLog(guild, logEntry, moderator, analysis, targetUser, filter, contentFilter) {
    try {
        const settings = await GuildSettings.findOrCreate(guild.id);
        
        if (!settings.modLogChannel) return;

        const logChannel = await guild.channels.fetch(settings.modLogChannel).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('🧹 Mesajlar Silindi')
            .setColor(config.colors.info)
            .addFields(
                { name: '📋 Case', value: `#${logEntry.caseId}`, inline: true },
                { name: '👮 Moderatör', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
                { name: '📍 Kanal', value: `<#${logEntry.details.channelId}>`, inline: true },
                { name: '🗑️ Silinen', value: `**${logEntry.details.messagesDeleted}** mesaj`, inline: true },
                { name: '📊 Dağılım', value: `👤 ${analysis.humans} | 🤖 ${analysis.bots}`, inline: true }
            )
            .setFooter({ text: `Case #${logEntry.caseId}` })
            .setTimestamp();

        // Filtreler
        const activeFilters = [];
        if (targetUser) activeFilters.push(`👤 ${targetUser.tag}`);
        if (filter) activeFilters.push(getFilterName(filter));
        if (contentFilter) activeFilters.push(`"${contentFilter}"`);
        
        if (activeFilters.length > 0) {
            logEmbed.addFields({
                name: '🎯 Filtreler',
                value: activeFilters.join(' • '),
                inline: false
            });
        }

        const logMessage = await logChannel.send({ embeds: [logEmbed] });
        
        await ModerationLog.updateCase(guild.id, logEntry.caseId, { logMessageId: logMessage.id });

    } catch (error) {
        console.error('Mod log error:', error);
    }
}
