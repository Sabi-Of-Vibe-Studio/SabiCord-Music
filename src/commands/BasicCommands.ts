/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import {
  CommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  User
} from 'discord.js';
import { Discord, Slash, SlashOption, SlashGroup } from '@discordx/discordx';
import { injectable } from 'tsyringe';
import { connectChannel, getPlayer } from '@voicelink/index';
import { Track, Playlist, SearchType, LoopType } from '@voicelink/index';
import { Utils } from '@core/Utils';
import { logger } from '@core/Logger';

@Discord()
@SlashGroup({ description: 'Basic music commands', name: 'music' })
@SlashGroup('music')
@injectable()
export class BasicCommands {
  
  @Slash({ description: 'Play a song or playlist from a URL or search query' })
  async play(
    @SlashOption({
      description: 'Song URL or search query',
      name: 'query',
      required: true,
      type: ApplicationCommandOptionType.String,
    })
    query: string,
    @SlashOption({
      description: 'Start time (e.g., 1:30)',
      name: 'start',
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    start?: string,
    @SlashOption({
      description: 'End time (e.g., 3:45)',
      name: 'end',
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    end: string | undefined,
    interaction: CommandInteraction
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in servers!', ephemeral: true });
      return;
    }

    try {
      await interaction.deferReply();

      // Get or create player
      const player = await connectChannel(interaction);

      // Check if user is in voice channel
      if (!player.isUserInChannel(interaction.user)) {
        await interaction.editReply({
          content: `❌ You must be in ${player.channel} to use this command!`,
        });
        return;
      }

      // Get tracks
      const tracks = await player.getTracks(query, { 
        requester: interaction.user,
        searchType: this.detectSearchType(query)
      });

      if (!tracks) {
        await interaction.editReply({ content: '❌ No tracks found for your query!' });
        return;
      }

      const startTime = start ? Utils.parseTime(start) : 0;
      const endTime = end ? Utils.parseTime(end) : 0;

      if (tracks instanceof Playlist) {
        // Handle playlist
        const addedCount = await player.addTrack(tracks.tracks, { 
          startTime, 
          endTime 
        });

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('📋 Playlist Added')
          .setDescription(`Added **${tracks.tracks.length}** tracks from **${tracks.name}**`)
          .addFields([
            { name: 'Queue Position', value: `${addedCount}`, inline: true },
            { name: 'Requested by', value: `${interaction.user}`, inline: true },
          ]);

        await interaction.editReply({ embeds: [embed] });
      } else {
        // Handle single track or search results
        const track = tracks[0];
        const position = await player.addTrack(track, { startTime, endTime });

        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('🎵 Track Added')
          .setDescription(`**[${track.title}](${track.uri})**`)
          .addFields([
            { name: 'Artist', value: track.author, inline: true },
            { name: 'Duration', value: track.formattedLength, inline: true },
            { name: 'Queue Position', value: position > 0 ? `${position}` : 'Now Playing', inline: true },
            { name: 'Requested by', value: `${interaction.user}`, inline: true },
          ]);

        if (track.thumbnail) {
          embed.setThumbnail(track.thumbnail);
        }

        await interaction.editReply({ embeds: [embed] });
      }

      // Start playing if not already playing
      if (!player.isPlaying && !player.current) {
        await player.doNext();
      }

    } catch (error) {
      logger.error('Error in play command', error as Error, 'commands');
      await interaction.editReply({ 
        content: '❌ An error occurred while trying to play the track!' 
      });
    }
  }

  @Slash({ description: 'Pause the current track' })
  async pause(interaction: CommandInteraction): Promise<void> {
    const validation = await this.validateMusicCommand(interaction);
    if (!validation.isValid) {
      await interaction.reply({ content: validation.errorMessage!, ephemeral: true });
      return;
    }

    const player = getPlayer(interaction.guildId!)!;

    if (player.isPaused) {
      await interaction.reply({ content: '❌ The music is already paused!', ephemeral: true });
      return;
    }

    if (!player.isPrivileged(interaction.user)) {
      const voteResult = await this.handleVoting(player, interaction, 'pause');
      if (!voteResult.shouldExecute) {
        await interaction.reply({ content: voteResult.message! });
        return;
      }
    }

    await player.pause();
    await interaction.reply({ content: '⏸️ Music paused!' });
  }

  @Slash({ description: 'Resume the current track' })
  async resume(interaction: CommandInteraction): Promise<void> {
    const validation = await this.validateMusicCommand(interaction);
    if (!validation.isValid) {
      await interaction.reply({ content: validation.errorMessage!, ephemeral: true });
      return;
    }

    const player = getPlayer(interaction.guildId!)!;

    if (!player.isPaused) {
      await interaction.reply({ content: '❌ The music is not paused!', ephemeral: true });
      return;
    }

    if (!player.isPrivileged(interaction.user)) {
      const voteResult = await this.handleVoting(player, interaction, 'resume');
      if (!voteResult.shouldExecute) {
        await interaction.reply({ content: voteResult.message! });
        return;
      }
    }

    await player.resume();
    await interaction.reply({ content: '▶️ Music resumed!' });
  }

  @Slash({ description: 'Skip the current track' })
  async skip(
    @SlashOption({
      description: 'Number of tracks to skip',
      name: 'count',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 10,
    })
    count: number = 1,
    interaction: CommandInteraction
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    
    if (!player) {
      await interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
      return;
    }

    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }

    if (!player.current) {
      await interaction.reply({ content: '❌ No track is currently playing!', ephemeral: true });
      return;
    }

    if (!player.isPrivileged(interaction.user)) {
      player.skipVotes.add(interaction.user);
      const required = player.requiredVotes();
      
      if (player.skipVotes.size < required) {
        await interaction.reply({
          content: `🗳️ Vote to skip registered! (${player.skipVotes.size}/${required})`,
        });
        return;
      }
    }

    const currentTrack = player.current;
    
    if (count > 1) {
      player.queue.skipTo(count - 1);
    }

    await player.stop();
    await interaction.reply({ 
      content: `⏭️ Skipped **${currentTrack.title}**${count > 1 ? ` and ${count - 1} more tracks` : ''}!` 
    });
  }

  @Slash({ description: 'Stop the music and clear the queue' })
  async stop(interaction: CommandInteraction): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    
    if (!player) {
      await interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
      return;
    }

    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }

    if (!player.isPrivileged(interaction.user)) {
      player.stopVotes.add(interaction.user);
      const required = player.requiredVotes();
      
      if (player.stopVotes.size < required) {
        await interaction.reply({
          content: `🗳️ Vote to stop registered! (${player.stopVotes.size}/${required})`,
        });
        return;
      }
    }

    await player.stop();
    player.queue.clear();
    
    await interaction.reply({ content: '⏹️ Music stopped and queue cleared!' });
  }

  @Slash({ description: 'Show information about the currently playing track' })
  async nowplaying(interaction: CommandInteraction): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    
    if (!player || !player.current) {
      await interaction.reply({ content: '❌ No music is currently playing!', ephemeral: true });
      return;
    }

    const track = player.current;
    const position = Utils.formatTime(player.position);
    const duration = track.formattedLength;
    const progress = Math.floor((player.position / track.length) * 20);
    const progressBar = '▰'.repeat(progress) + '▱'.repeat(20 - progress);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${track.title}](${track.uri})**`)
      .addFields([
        { name: 'Artist', value: track.author, inline: true },
        { name: 'Requested by', value: `${track.requester}`, inline: true },
        { name: 'Volume', value: `${player.volume}%`, inline: true },
        { name: 'Progress', value: `${progressBar}\n${position} / ${duration}`, inline: false },
      ]);

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    await interaction.reply({ embeds: [embed] });
  }

  @Slash({ description: 'Set the volume of the music player' })
  async volume(
    @SlashOption({
      description: 'Volume level (0-100)',
      name: 'level',
      required: true,
      type: ApplicationCommandOptionType.Integer,
      minValue: 0,
      maxValue: 100,
    })
    level: number,
    interaction: CommandInteraction
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }

    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }

    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to change the volume!',
        ephemeral: true,
      });
      return;
    }

    await player.setVolume(level);
    await interaction.reply({ content: `🔊 Volume set to **${level}%**!` });
  }

  /**
   * Validates if the interaction can be processed for music commands
   */
  private async validateMusicCommand(interaction: CommandInteraction): Promise<{ isValid: boolean; errorMessage?: string }> {
    if (!interaction.guild) {
      return { isValid: false, errorMessage: '❌ This command can only be used in servers!' };
    }

    const player = getPlayer(interaction.guildId!);
    if (!player) {
      return { isValid: false, errorMessage: '❌ No music is currently playing!' };
    }

    if (!player.isUserInChannel(interaction.user)) {
      return { isValid: false, errorMessage: '❌ You need to be in a voice channel to use this command!' };
    }

    return { isValid: true };
  }

  /**
   * Handles voting logic for music commands
   */
  private async handleVoting(player: any, interaction: CommandInteraction, action: string): Promise<{ shouldExecute: boolean; message?: string }> {
    const voteSet = action === 'pause' ? player.pauseVotes :
                   action === 'resume' ? player.resumeVotes :
                   action === 'skip' ? player.skipVotes :
                   player.stopVotes;

    voteSet.add(interaction.user);
    const required = player.requiredVotes();

    if (voteSet.size < required) {
      return {
        shouldExecute: false,
        message: `🗳️ Vote to ${action} registered! (${voteSet.size}/${required})`
      };
    }

    return { shouldExecute: true };
  }

  /**
   * Creates an embed for track information
   */
  private createTrackEmbed(track: Track, title: string, color: string = '#00ff00'): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`**[${track.title}](${track.uri})**`)
      .addFields([
        { name: 'Artist', value: track.author, inline: true },
        { name: 'Duration', value: track.formattedLength, inline: true },
        { name: 'Requested by', value: `${track.requester}`, inline: true },
      ]);

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    return embed;
  }

  /**
   * Handles common error responses for commands
   */
  private async handleCommandError(interaction: CommandInteraction, message: string): Promise<void> {
    if (interaction.deferred) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }

  /**
   * Detects the search type based on the query URL
   */
  private detectSearchType(query: string): SearchType {
    if (!Utils.isValidUrl(query)) {
      return SearchType.YOUTUBE;
    }

    const urlPatterns = {
      [SearchType.YOUTUBE]: ['youtube.com', 'youtu.be'],
      [SearchType.SOUNDCLOUD]: ['soundcloud.com'],
      [SearchType.SPOTIFY]: ['spotify.com'],
    };

    for (const [searchType, patterns] of Object.entries(urlPatterns)) {
      if (patterns.some(pattern => query.includes(pattern))) {
        return searchType as SearchType;
      }
    }

    return SearchType.YOUTUBE;
  }
}
