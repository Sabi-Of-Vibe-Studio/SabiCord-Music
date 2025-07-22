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
  TextChannel,
  User,
  ColorResolvable
} from 'discord.js';
import { Player } from '../audio/Player';
import { LoopMode } from '../audio/Enums';
import { Utils } from '../core/Utils';
import { logger } from '../core/Logger';
import { container } from 'tsyringe';
import { Settings } from '../core/Settings';

export interface IControllerOptions {
  player: Player;
  channel: TextChannel;
  user?: User;
  ephemeral?: boolean;
}

export class MusicController {
  private player: Player;
  private channel: TextChannel;
  private message: Message<boolean> | undefined;
  private settings: Settings;
  private updateInterval: NodeJS.Timeout | undefined;

  constructor(options: IControllerOptions) {
    this.player = options.player;
    this.channel = options.channel;
    this.settings = container.resolve<Settings>('Settings');
    this.setupEventListeners();
  }

  public async send(): Promise<Message<boolean>> {
    const embed = this.createEmbed();
    const components = this.createComponents();
    try {
      this.message = await this.channel.send({
        embeds: [embed],
        components,
      });
      this.setupInteractionCollector();
      this.startUpdateInterval();
      return this.message;
    } catch (error) {
      logger.error('Failed to send controller message', error as Error, 'controller');
      throw error;
    }
  }

  public async update(): Promise<void> {
    if (!this.message) return;
    const embed = this.createEmbed();
    const components = this.createComponents();
    try {
      await this.message.edit({
        embeds: [embed],
        components,
      });
    } catch (error) {
      logger.error('Failed to update controller message', error as Error, 'controller');
    }
  }

  public async destroy(): Promise<void> {
    if (this.updateInterval !== undefined) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    if (this.message) {
      try {
        await this.message.delete();
      } catch {
        logger.debug('Failed to delete controller message', 'controller');
      }
      this.message = undefined;
    }
  }

  private createEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder();
    const track = this.player.current;
    if (track) {
      const progress = this.createProgressBar();
      const position = Utils.formatTime(this.player.position);
      const duration = track.formattedLength;
      embed
        .setColor(this.getTrackColor(track.source))
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.uri})**`)
        .addFields([
          { name: 'Artist', value: track.author, inline: true },
          { name: 'Requested by', value: `${track.requester}`, inline: true },
          { name: 'Duration', value: `${position} / ${duration}`, inline: true },
          { name: 'Volume', value: `${this.player.currentVolume}%`, inline: true },
          { name: 'Queue', value: `${this.player.queue.count} tracks`, inline: true },
          { name: 'Loop', value: this.getLoopModeString(), inline: true },
          { name: 'Progress', value: progress, inline: false },
        ]);
      if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
      }
    } else {
      embed
        .setColor('#b3b3b3')
        .setTitle('🎵 Music Player')
        .setDescription('No music is currently playing')
        .setImage('https://example.com/default-music.png');
    }

    const iconURL = this.player.guild.iconURL();
    if (iconURL) {
      embed.setFooter({
        text: `Connected to ${this.player.channel.name}`,
        iconURL,
      });
    } else {
      embed.setFooter({ text: `Connected to ${this.player.channel.name}` });
    }

    return embed;
  }

  private createComponents(): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>();
    const row2 = new ActionRowBuilder<ButtonBuilder>();
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId('controller_previous')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!this.player.current),
      new ButtonBuilder()
        .setCustomId('controller_playpause')
        .setEmoji(this.player.isPaused ? '▶️' : '⏸️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!this.player.current),
      new ButtonBuilder()
        .setCustomId('controller_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!this.player.current),
      new ButtonBuilder()
        .setCustomId('controller_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!this.player.current),
      new ButtonBuilder()
        .setCustomId('controller_queue')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
    );
    row2.addComponents(
      new ButtonBuilder()
        .setCustomId('controller_shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.player.queue.isEmpty()),
      new ButtonBuilder()
        .setCustomId('controller_repeat')
        .setEmoji(this.getRepeatEmoji())
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('controller_volume_down')
        .setEmoji('🔉')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('controller_volume_up')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('controller_disconnect')
        .setEmoji('🔌')
        .setStyle(ButtonStyle.Danger)
    );
    return [row1, row2];
  }

  private setupInteractionCollector(): void {
    if (!this.message) return;
    const collector = this.message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
    });
    collector.on('collect', async (interaction: ButtonInteraction) => {
      try {
        await this.handleButtonInteraction(interaction);
      } catch (error) {
        logger.error('Error handling controller interaction', error as Error, 'controller');
      }
    });
    collector.on('end', () => {
      logger.debug('Controller collector ended', 'controller');
    });
  }

  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isUserInChannel(interaction.user)) {
      await interaction.reply({ content: `❌ You must be in ${this.player.channel} to use the controller!`, ephemeral: true });
      return;
    }
    const action = interaction.customId.replace('controller_', '');
    switch (action) {
      case 'playpause':
        await this.handlePlayPause(interaction);
        break;
      case 'skip':
        await this.handleSkip(interaction);
        break;
      case 'previous':
        await this.handlePrevious(interaction);
        break;
      case 'stop':
        await this.handleStop(interaction);
        break;
      case 'shuffle':
        await this.handleShuffle(interaction);
        break;
      case 'repeat':
        await this.handleRepeat(interaction);
        break;
      case 'volume_up':
        await this.handleVolumeUp(interaction);
        break;
      case 'volume_down':
        await this.handleVolumeDown(interaction);
        break;
      case 'queue':
        await this.handleQueue(interaction);
        break;
      case 'disconnect':
        await this.handleDisconnect(interaction);
        break;
      default:
        await interaction.reply({ content: '❌ Unknown action!', ephemeral: true });
    }
  }

  private async handlePlayPause(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.current) {
      await interaction.reply({ content: '❌ No track is currently playing!', ephemeral: true });
      return;
    }
    if (this.player.isPaused) {
      if (!this.player.isPrivileged(interaction.user)) {
        this.player.resumeVotes.add(interaction.user);
        const required = this.player.requiredVotes();
        if (this.player.resumeVotes.size < required) {
          await interaction.reply({ content: `🗳️ Vote to resume registered! (${this.player.resumeVotes.size}/${required})`, ephemeral: true });
          return;
        }
      }
      await this.player.resume();
      await interaction.reply({ content: '▶️ Music resumed!', ephemeral: true });
    } else {
      if (!this.player.isPrivileged(interaction.user)) {
        this.player.pauseVotes.add(interaction.user);
        const required = this.player.requiredVotes();
        if (this.player.pauseVotes.size < required) {
          await interaction.reply({ content: `🗳️ Vote to pause registered! (${this.player.pauseVotes.size}/${required})`, ephemeral: true });
          return;
        }
      }
      await this.player.pause();
      await interaction.reply({ content: '⏸️ Music paused!', ephemeral: true });
    }
  }

  private async handleSkip(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.current) {
      await interaction.reply({ content: '❌ No track is currently playing!', ephemeral: true });
      return;
    }
    if (!this.player.isPrivileged(interaction.user)) {
      this.player.skipVotes.add(interaction.user);
      const required = this.player.requiredVotes();
      if (this.player.skipVotes.size < required) {
        await interaction.reply({ content: `🗳️ Vote to skip registered! (${this.player.skipVotes.size}/${required})`, ephemeral: true });
        return;
      }
    }
    const title = this.player.current.title;
    await this.player.stop();
    await interaction.reply({ content: `⏭️ Skipped **${Utils.truncateString(title, 30)}**!`, ephemeral: true });
  }

  private async handlePrevious(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({ content: '⏮️ Previous track functionality coming soon!', ephemeral: true });
  }

  private async handleStop(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isPrivileged(interaction.user)) {
      this.player.stopVotes.add(interaction.user);
      const required = this.player.requiredVotes();
      if (this.player.stopVotes.size < required) {
        await interaction.reply({ content: `🗳️ Vote to stop registered! (${this.player.stopVotes.size}/${required})`, ephemeral: true });
        return;
      }
    }
    await this.player.stop();
    this.player.queue.clear();
    await interaction.reply({ content: '⏹️ Music stopped and queue cleared!', ephemeral: true });
  }

  private async handleShuffle(interaction: ButtonInteraction): Promise<void> {
    if (this.player.queue.isEmpty()) {
      await interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
      return;
    }
    if (!this.player.isPrivileged(interaction.user)) {
      this.player.shuffleVotes.add(interaction.user);
      const required = this.player.requiredVotes();
      if (this.player.shuffleVotes.size < required) {
        await interaction.reply({ content: `🗳️ Vote to shuffle registered! (${this.player.shuffleVotes.size}/${required})`, ephemeral: true });
        return;
      }
    }
    this.player.queue.shuffle();
    await interaction.reply({ content: '🔀 Queue shuffled!', ephemeral: true });
  }

  private async handleRepeat(interaction: ButtonInteraction): Promise<void> {
    const oldMode = this.player.loopMode;
    const next = this.getNextLoopMode(oldMode);
    this.player.setLoop(next);
    await interaction.reply({ content: `🔁 Repeat mode: **${this.getLoopModeString()}**`, ephemeral: true });
  }

  private async handleVolumeUp(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isPrivileged(interaction.user)) {
      await interaction.reply({ content: '❌ You need DJ permissions to change volume!', ephemeral: true });
      return;
    }
    const vol = Math.min(this.player.currentVolume + 10, 100);
    await this.player.setVolume(vol);
    await interaction.reply({ content: `🔊 Volume: **${vol}%**`, ephemeral: true });
  }

  private async handleVolumeDown(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isPrivileged(interaction.user)) {
      await interaction.reply({ content: '❌ You need DJ permissions to change volume!', ephemeral: true });
      return;
    }
    const vol = Math.max(this.player.currentVolume - 10, 0);
    await this.player.setVolume(vol);
    await interaction.reply({ content: `🔉 Volume: **${vol}%**`, ephemeral: true });
  }

  private async handleQueue(interaction: ButtonInteraction): Promise<void> {
    await interaction.reply({ content: '📋 Queue view coming soon!', ephemeral: true });
  }

  private async handleDisconnect(interaction: ButtonInteraction): Promise<void> {
    if (!this.player.isPrivileged(interaction.user)) {
      await interaction.reply({ content: '❌ You need DJ permissions to disconnect the bot!', ephemeral: true });
      return;
    }
    await this.player.disconnect();
    await interaction.reply({ content: '🔌 Disconnected from voice channel!', ephemeral: true });
  }

  private createProgressBar(): string {
    if (!this.player.current) return '▱'.repeat(20);
    const prog = Math.floor((this.player.position / this.player.current.length) * 20);
    return '▰'.repeat(Math.max(0, prog)) + '▱'.repeat(Math.max(0, 20 - prog));
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

  private getNextLoopMode(mode: LoopMode): LoopMode {
    switch (mode) {
      case LoopMode.NONE:
        return LoopMode.TRACK;
      case LoopMode.TRACK:
        return LoopMode.QUEUE;
      case LoopMode.QUEUE:
        return LoopMode.NONE;
      default:
        return LoopMode.NONE;
    }
  }

  private getTrackColor(source: string): ColorResolvable {
    const info = Utils.getSourceInfo(source, this.settings.sources_settings);
    return (info?.color ?? '#ffffff') as ColorResolvable;
  }

  private getRepeatEmoji(): string {
    switch (this.player.loopMode) {
      case LoopMode.NONE:
        return '🔁';
      case LoopMode.TRACK:
        return '🔂';
      case LoopMode.QUEUE:
        return '🔁';
      default:
        return '🔁';
    }
  }

  private setupEventListeners(): void {
    this.player.on('trackStart', () => this.update());
    this.player.on('trackEnd', () => this.update());
    this.player.on('playerUpdate', () => this.update());
    this.player.on('disconnect', () => this.destroy());
  }

  private startUpdateInterval(): void {
    this.updateInterval = setInterval(() => {
      if (this.player.playing && this.player.current) {
        this.update();
      }
    }, 10000);
  }
}
