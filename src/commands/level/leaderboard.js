/**
 * ═══════════════════════════════════════════════════════════════
 * 🏆 AKIRA BOT - LEADERBOARD KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucu sıralamasını gösterir
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { UserLevel, GuildSettings } = require('../../database');
const { createLeaderboardCard, EmbedHelper } = require('../../utils');
const config = require('../../config/botConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Sunucu seviye sıralamasını görüntüle')
        .addStringOption(option =>
            option
                .setName('tur')
                .setDescription('Sıralama türü')
                .setRequired(false)
                .addChoices(
                    { name: '🏆 Genel Sıralama', value: 'all' },
                    { name: '📅 Günlük Sıralama', value: 'daily' },
                    { name: '📆 Haftalık Sıralama', value: 'weekly' }
                )
        )
        .addStringOption(option =>
            option
                .setName('gosterim')
                .setDescription('Görüntüleme modu')
                .setRequired(false)
                .addChoices(
                    { name: '📝 Metin', value: 'text' },
                    { name: '🖼️ Görsel', value: 'image' }
                )
        ),

    cooldown: 15,
    developerOnly: false,

    async execute(interaction, client) {
        const type = interaction.options.getString('tur') || 'all';
        const displayMode = interaction.options.getString('gosterim') || 'text';

        await interaction.deferReply();

        try {
            // Sunucu ayarlarını kontrol et
            const settings = await GuildSettings.findOrCreate(interaction.guild.id);
            
            if (!settings.levelSystem?.enabled) {
                return await interaction.editReply({
                    embeds: [EmbedHelper.warning('Sistem Kapalı', 'Bu sunucuda seviye sistemi aktif değil.')]
                });
            }

            let users, title, description;
            const limit = 10;
            let page = 1;

            // Sıralama türüne göre veri al
            switch (type) {
                case 'daily':
                    users = await UserLevel.getTopDaily(interaction.guild.id, limit);
                    title = '📅 Günlük Sıralama';
                    description = 'Bugün en çok XP kazanan kullanıcılar';
                    break;
                case 'weekly':
                    users = await UserLevel.getTopWeekly(interaction.guild.id, limit);
                    title = '📆 Haftalık Sıralama';
                    description = 'Bu hafta en çok XP kazanan kullanıcılar';
                    break;
                default:
                    const leaderboard = await UserLevel.getLeaderboard(interaction.guild.id, limit, page);
                    users = leaderboard.users;
                    title = '🏆 Genel Sıralama';
                    description = 'Tüm zamanların en iyi oyuncuları';
            }

            if (users.length === 0) {
                return await interaction.editReply({
                    embeds: [EmbedHelper.info('Veri Yok', 'Henüz sıralamada kimse yok. Mesaj yazarak XP kazanmaya başla!')]
                });
            }

            // Görsel mod
            if (displayMode === 'image') {
                const attachment = await createLeaderboardCard(users, interaction.guild.name, page);
                return await interaction.editReply({ files: [attachment] });
            }

            // Metin modu
            const embed = await createTextLeaderboard(users, interaction, title, description, type, page);
            
            // Sayfalama butonları (sadece genel sıralama için)
            if (type === 'all') {
                const totalData = await UserLevel.getLeaderboard(interaction.guild.id, limit, 1);
                const totalPages = totalData.totalPages;

                if (totalPages > 1) {
                    const buttons = createPaginationButtons(page, totalPages);
                    const response = await interaction.editReply({ 
                        embeds: [embed], 
                        components: [buttons] 
                    });

                    // Buton collector
                    const collector = response.createMessageComponentCollector({
                        componentType: ComponentType.Button,
                        time: 120000 // 2 dakika
                    });

                    collector.on('collect', async i => {
                        if (i.user.id !== interaction.user.id) {
                            return i.reply({ 
                                content: 'Bu butonları sadece komutu kullanan kişi kullanabilir!', 
                                ephemeral: true 
                            });
                        }

                        if (i.customId === 'lb_prev' && page > 1) page--;
                        if (i.customId === 'lb_next' && page < totalPages) page++;
                        if (i.customId === 'lb_first') page = 1;
                        if (i.customId === 'lb_last') page = totalPages;

                        const newData = await UserLevel.getLeaderboard(interaction.guild.id, limit, page);
                        const newEmbed = await createTextLeaderboard(
                            newData.users, interaction, title, description, type, page
                        );
                        const newButtons = createPaginationButtons(page, totalPages);

                        await i.update({ embeds: [newEmbed], components: [newButtons] });
                    });

                    collector.on('end', async () => {
                        try {
                            await interaction.editReply({ components: [] });
                        } catch (e) {}
                    });
                } else {
                    await interaction.editReply({ embeds: [embed] });
                }
            } else {
                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Leaderboard hatası:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', 'Sıralama yüklenirken bir hata oluştu.')]
            });
        }
    }
};

/**
 * Metin formatında leaderboard oluştur
 */
async function createTextLeaderboard(users, interaction, title, description, type, page) {
    const medals = ['🥇', '🥈', '🥉'];
    const startRank = (page - 1) * 10;

    // Kullanıcının sıralamasını bul
    const userRank = await UserLevel.getUserRank(interaction.user.id, interaction.guild.id);

    let leaderboardText = '';

    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const globalRank = startRank + i + 1;
        const rankDisplay = globalRank <= 3 ? medals[globalRank - 1] : `\`#${globalRank}\``;
        
        let xpDisplay;
        if (type === 'daily') {
            xpDisplay = formatNumber(user.dailyXp?.amount || 0);
        } else if (type === 'weekly') {
            xpDisplay = formatNumber(user.weeklyXp?.amount || 0);
        } else {
            xpDisplay = formatNumber(user.totalXp);
        }

        const isCurrentUser = user.discordId === interaction.user.id;
        const highlight = isCurrentUser ? '**' : '';

        leaderboardText += `${rankDisplay} ${highlight}${user.displayName || user.username}${highlight}\n`;
        leaderboardText += `   └ Lvl **${user.level}** • ${xpDisplay} XP\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(config.colors.primary)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .addFields({
            name: '📊 Sıralama',
            value: leaderboardText || 'Veri yok',
            inline: false
        })
        .setFooter({ 
            text: `${interaction.guild.name} • Sayfa ${page}`, 
            iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

    // Kullanıcının kendi sıralaması
    if (userRank?.user) {
        const rank = userRank.rank;
        let userXpDisplay;
        
        if (type === 'daily') {
            userXpDisplay = formatNumber(userRank.user.dailyXp?.amount || 0);
        } else if (type === 'weekly') {
            userXpDisplay = formatNumber(userRank.user.weeklyXp?.amount || 0);
        } else {
            userXpDisplay = formatNumber(userRank.user.totalXp);
        }

        embed.addFields({
            name: '📍 Senin Sıran',
            value: `**#${rank}** • Level **${userRank.user.level}** • ${userXpDisplay} XP`,
            inline: false
        });
    }

    return embed;
}

/**
 * Sayfalama butonları oluştur
 */
function createPaginationButtons(currentPage, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('lb_first')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('lb_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('lb_page')
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('lb_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === totalPages),
            new ButtonBuilder()
                .setCustomId('lb_last')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages)
        );
}

/**
 * Sayı formatla
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('tr-TR');
}
