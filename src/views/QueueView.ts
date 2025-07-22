/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ButtonInteraction,
  ComponentType,
  Message,
  User,
} from 'discord.js';
import { Player } from '../audio/Player';
import { Track } from '../audio/Track';
import { LoopMode } from '../audio/Enums';
import { Utils } from '../core/Utils';
import { logger } from '../core/Logger';
export interface IQueueViewOptions {
  player: Player;
  user: User;
  page?: number;
  tracksPerPage?: number;
}
export class QueueView {
  private player: Player;
  private user: User;
  private currentPage: number;
  private tracksPerPage: number;
  private message?: Message | undefined;
  private totalPages: number;
  constructor(options: IQueueViewOptions) {
    this.player = options.player;
    this.user = options.user;
    this.currentPage = options.page || 1;
    this.tracksPerPage = options.tracksPerPage || 10;
    this.totalPages = Math.ceil(this.player.queue.count / this.tracksPerPage) || 1;
  }
  public async send(channel: any): Promise<Message> {
    const embed = this.createEmbed();
    const components = this.createComponents();
    try {
      this.message = await channel.send({
        embeds: [embed],
        components,
      });
      this.setupInteractionCollector();
      return this.message!;
    } catch (error) {
      logger.error('Failed to send queue view', error as Error, 'queue');
      throw error;
    }
  }
  public async update(): Promise<void> {
    if (!this.message) return;
    this.totalPages = Math.ceil(this.player.queue.count / this.tracksPerPage) || 1;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    const embed = this.createEmbed();
    const components = this.createComponents();
    try {
      await this.message.edit({
        embeds: [embed],
        components,
      });
    } catch (error) {
      logger.error('Failed to update queue view', error as Error, 'queue');
    }
  }
  private createEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📋 Music Queue');
    const tracks = this.player.queue.getTracks();
    if (tracks.length === 0) {
      embed.setDescription('The queue is empty!');
      return embed;
    }
    const startIndex = (this.currentPage - 1) * this.tracksPerPage;
    const endIndex = startIndex + this.tracksPerPage;
    const pageTrack = tracks.slice(startIndex, endIndex);
    const trackList = pageTrack
      .map((track: Track, index: number) => {
        const position = startIndex + index + 1;
        const duration = track.formattedLength;
        const title = Utils.truncateString(track.title, 40);
        const author = Utils.truncateString(track.author, 20);
        return `**${position}.** [${title}](${track.uri}) - ${author} \`${duration}\``;
      })
      .join('\n');
    embed.setDescription(trackList);
    if (this.player.current) {
      const current = this.player.current;
      const progress = this.createProgressBar();
      const position = Utils.formatTime(this.player.position);
      const duration = current.formattedLength;
      embed.addFields([
        {
          name: '🎵 Now Playing',
          value: `[${Utils.truncateString(current.title, 50)}](${current.uri})\n${progress}\n${position} / ${duration}`,
          inline: false,
        },
      ]);
    }
    const queueLength = this.player.queue.formattedLength;
    const repeatMode = this.getLoopModeString();
    embed.addFields([
      {
        name: '📊 Queue Stats',
        value: `**Tracks:** ${tracks.length}\n**Duration:** ${queueLength}\n**Repeat:** ${repeatMode}`,
        inline: true,
      },
    ]);
    embed.setFooter({
      text: `Page ${this.currentPage}/${this.totalPages} • ${tracks.length} total tracks`,
    });
    return embed;
  }
  private createComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>();
    const row2 = new ActionRowBuilder<ButtonBuilder>();
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId('queue_first')
        .setEmoji('⏪')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.currentPage === 1),
      new ButtonBuilder()
        .setCustomId('queue_previous')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.currentPage === 1),
      new ButtonBuilder()
        .setCustomId('queue_refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('queue_next')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.currentPage === this.totalPages),
      new ButtonBuilder()
        .setCustomId('queue_last')
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.currentPage === this.totalPages)
    );
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('queue_shuffle')
        .setEmoji('🔀')
        .setLabel('Shuffle')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.player.queue.isEmpty()),
      new ButtonBuilder()
        .setCustomId('queue_clear')
        .setEmoji('🗑️')
        .setLabel('Clear')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(this.player.queue.isEmpty()),
      new ButtonBuilder()
        .setCustomId('queue_save')
        .setEmoji('💾')
        .setLabel('Save')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.player.queue.isEmpty()),
      new ButtonBuilder()
        .setCustomId('queue_close')
        .setEmoji('❌')
        .setLabel('Close')
        .setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
  }
  private setupInteractionCollector(): void {
    if (!this.message) return;
    const collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (interaction) => interaction.user.id === this.user.id,
      time: 300000, 
    });
    collector.on('collect', async (interaction: ButtonInteraction) => {
      try {
        await this.handleButtonInteraction(interaction);
      } catch (error) {
        logger.error('Error handling queue interaction', error as Error, 'queue');
      }
    });
    collector.on('end', async () => {
      try {
        if (this.message) {
          await this.message.edit({
            components: [],
          });
        }
      } catch (error) {
        logger.debug('Failed to clear queue components', 'queue');
      }
    });
  }
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    const action = interaction.customId.replace('queue_', '');
    switch (action) {
      case 'first':
        this.currentPage = 1;
        await interaction.deferUpdate();
        await this.update();
        break;
      case 'previous':
        this.currentPage = Math.max(1, this.currentPage - 1);
        await interaction.deferUpdate();
        await this.update();
        break;
      case 'next':
        this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
        await interaction.deferUpdate();
        await this.update();
        break;
      case 'last':
        this.currentPage = this.totalPages;
        await interaction.deferUpdate();
        await this.update();
        break;
      case 'refresh':
        await interaction.deferUpdate();
        await this.update();
        break;
      case 'shuffle':
        await this.handleShuffle(interaction);
        break;
      case 'clear':
        await this.handleClear(interaction);
        break;
      case 'save':
        await this.handleSave(interaction);
        break;
      case 'close':
        await this.handleClose(interaction);
        break;
    }
  }
  private async handleShuffle(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${this.player.channel} to shuffle the queue!`,
        ephemeral: true,
      });
      return;
    }
    if (!this.player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to shuffle the queue!',
        ephemeral: true,
      });
      return;
    }
    this.player.queue.shuffle();
    await interaction.reply({
      content: '🔀 Queue shuffled!',
      ephemeral: true,
    });
    await this.update();
  }
  private async handleClear(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${this.player.channel} to clear the queue!`,
        ephemeral: true,
      });
      return;
    }
    if (!this.player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to clear the queue!',
        ephemeral: true,
      });
      return;
    }
    const trackCount = this.player.queue.count;
    this.player.queue.clear();
    await interaction.reply({
      content: `🗑️ Cleared **${trackCount}** tracks from the queue!`,
      ephemeral: true,
    });
    await this.update();
  }
  private async handleSave(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({
      content: '💾 Save queue functionality coming soon!',
      ephemeral: true,
    });
  }
  private async handleClose(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    await this.destroy();
  }
  private async destroy(): Promise<void> {
    if (this.message) {
      try {
        await this.message.delete();
      } catch (error) {
        logger.debug('Failed to delete queue message', 'queue');
      }
      this.message = undefined;
    }
  }
  private createProgressBar(): string {
    if (!this.player.current) return '▱'.repeat(20);
    const progress = Math.floor((this.player.position / this.player.current.length) * 20);
    return '▰'.repeat(Math.max(0, progress)) + '▱'.repeat(Math.max(0, 20 - progress));
  }
  private getLoopModeString(): string {
    switch (this.player.loopMode) {
      case LoopMode.NONE:
        return 'Off';
      case LoopMode.TRACK:
        return 'Track';
      case LoopMode.QUEUE:
        return 'Queue';
      default:
        return 'Off';
    }
  }
}
