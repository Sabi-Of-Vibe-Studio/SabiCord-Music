/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  StringSelectMenuInteraction,

  Message,
  User,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Track } from '../audio/Track';
import { Player } from '../audio/Player';
import { Utils } from '../core/Utils';
import { logger } from '../core/Logger';
export interface ISearchViewOptions {
  tracks: Track[];
  player: Player;
  user: User;
  query: string;
  maxResults?: number;
}
export class SearchView {
  private tracks: Track[];
  private player: Player;
  private user: User;
  private query: string;

  private message?: Message | undefined;
  private selectedTracks: Track[] = [];
  constructor(options: ISearchViewOptions) {
    this.tracks = options.tracks.slice(0, options.maxResults || 10);
    this.player = options.player;
    this.user = options.user;
    this.query = options.query;

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
      logger.error('Failed to send search view', error as Error, 'search');
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
      logger.error('Failed to update search view', error as Error, 'search');
    }
  }
  private createEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🔍 Search Results')
      .setDescription(`Search query: **${Utils.truncateString(this.query, 50)}**`)
      .setFooter({
        text: `${this.tracks.length} results • Select tracks to add to queue`,
      });
    if (this.selectedTracks.length > 0) {
      embed.addFields([
        {
          name: '✅ Selected Tracks',
          value: this.selectedTracks
            .map((track, index) => `${index + 1}. ${Utils.truncateString(track.title, 40)}`)
            .join('\n'),
          inline: false,
        },
      ]);
    }
    return embed;
  }
  private createComponents(): ActionRowBuilder<any>[] {
    const components: ActionRowBuilder<any>[] = [];
    if (this.tracks.length > 0) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_select')
        .setPlaceholder('Select tracks to add to queue')
        .setMinValues(1)
        .setMaxValues(Math.min(this.tracks.length, 10));
      this.tracks.forEach((track, index) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(Utils.truncateString(track.title, 100))
          .setDescription(
            `${Utils.truncateString(track.author, 50)} • ${track.formattedLength}`
          )
          .setValue(index.toString())
          .setEmoji(this.getSourceEmoji(track.source));
        selectMenu.addOptions(option);
      });
      const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      components.push(selectRow);
    }
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();
    buttonRow.addComponents(
      new ButtonBuilder()
        .setCustomId('search_add')
        .setLabel('Add Selected')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success)
        .setDisabled(this.selectedTracks.length === 0),
      new ButtonBuilder()
        .setCustomId('search_add_all')
        .setLabel('Add All')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(this.tracks.length === 0),
      new ButtonBuilder()
        .setCustomId('search_clear')
        .setLabel('Clear Selection')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.selectedTracks.length === 0),
      new ButtonBuilder()
        .setCustomId('search_cancel')
        .setLabel('Cancel')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );
    components.push(buttonRow);
    return components;
  }
  private setupInteractionCollector(): void {
    if (!this.message) return;
    const collector = this.message.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === this.user.id,
      time: 60000, 
    });
    collector.on('collect', async (interaction) => {
      try {
        if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenu(interaction);
        } else if (interaction.isButton()) {
          await this.handleButton(interaction);
        }
      } catch (error) {
        logger.error('Error handling search interaction', error as Error, 'search');
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
        logger.debug('Failed to clear search components', 'search');
      }
    });
  }
  private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    const selectedIndices = interaction.values.map(value => parseInt(value));
    this.selectedTracks = selectedIndices.map(index => this.tracks[index]).filter(track => track !== undefined);
    await interaction.deferUpdate();
    await this.update();
  }
  private async handleButton(interaction: any): Promise<void> {
    const action = interaction.customId.replace('search_', '');
    switch (action) {
      case 'add':
        await this.handleAddSelected(interaction);
        break;
      case 'add_all':
        await this.handleAddAll(interaction);
        break;
      case 'clear':
        await this.handleClear(interaction);
        break;
      case 'cancel':
        await this.handleCancel(interaction);
        break;
    }
  }
  private async handleAddSelected(interaction: any): Promise<void> {
    if (this.selectedTracks.length === 0) {
      await interaction.reply({
        content: '❌ No tracks selected!',
        ephemeral: true,
      });
      return;
    }
    try {
      let addedCount = 0;
      for (const track of this.selectedTracks) {
        this.player.queue.add(track);
        addedCount++;
      }
      const trackList = this.selectedTracks
        .slice(0, 3)
        .map(track => Utils.truncateString(track.title, 30))
        .join(', ');
      const message = this.selectedTracks.length === 1
        ? `✅ Added **${trackList}** to the queue!`
        : `✅ Added **${this.selectedTracks.length}** tracks to the queue! (${trackList}${this.selectedTracks.length > 3 ? '...' : ''})`;
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
      if (!this.player.playing && !this.player.current) {
        await this.player.play();
      }
      await this.destroy();
    } catch (error) {
      logger.error('Error adding selected tracks', error as Error, 'search');
      await interaction.reply({
        content: '❌ Failed to add tracks to queue!',
        ephemeral: true,
      });
    }
  }
  private async handleAddAll(interaction: any): Promise<void> {
    if (this.tracks.length === 0) {
      await interaction.reply({
        content: '❌ No tracks available!',
        ephemeral: true,
      });
      return;
    }
    try {
      let addedCount = 0;
      for (const track of this.tracks) {
        this.player.queue.add(track);
        addedCount++;
      }
      await interaction.reply({
        content: `✅ Added **${addedCount}** tracks to the queue!`,
        ephemeral: true,
      });
      if (!this.player.playing && !this.player.current) {
        await this.player.play();
      }
      await this.destroy();
    } catch (error) {
      logger.error('Error adding all tracks', error as Error, 'search');
      await interaction.reply({
        content: '❌ Failed to add tracks to queue!',
        ephemeral: true,
      });
    }
  }
  private async handleClear(interaction: any): Promise<void> {
    this.selectedTracks = [];
    await interaction.deferUpdate();
    await this.update();
  }
  private async handleCancel(interaction: any): Promise<void> {
    await interaction.reply({
      content: '❌ Search cancelled.',
      ephemeral: true,
    });
    await this.destroy();
  }
  private async destroy(): Promise<void> {
    if (this.message) {
      try {
        await this.message.delete();
      } catch (error) {
        logger.debug('Failed to delete search message', 'search');
      }
      this.message = undefined;
    }
  }
  private getSourceEmoji(source: string): string {
    const sourceMap: Record<string, string> = {
      youtube: '🎵',
      youtubemusic: '🎵',
      spotify: '🎵',
      soundcloud: '🎵',
      twitch: '🎵',
      bandcamp: '🎵',
      vimeo: '🎵',
      applemusic: '🎵',
      reddit: '🎵',
      tiktok: '🎵',
    };
    return sourceMap[source.toLowerCase()] || '🔗';
  }
}
