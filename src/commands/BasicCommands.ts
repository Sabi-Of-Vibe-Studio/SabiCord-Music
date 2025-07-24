/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import {
  CommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder
} from 'discord.js';
import { Discord, Slash, SlashOption, SlashGroup } from 'discordx';
import { injectable } from 'tsyringe';
import { connectChannel, getPlayer, searchTracks } from '../audio/index';
import { Track, SearchType } from '../audio/index';
import { Utils } from '../core/Utils';
import { logger } from '../core/Logger';
@Discord()
@SlashGroup({ description: 'Basic music commands', name: 'music' })
@SlashGroup('music')
@injectable()
export class BasicCommands {
  @Slash({ description: 'Play a song or playlist from a URL or search query' })
  async play(
    interaction: CommandInteraction,
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
    end?: string
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in servers!', ephemeral: true });
      return;
    }
    try {
      await interaction.deferReply();
      const player = await connectChannel(interaction);
      if (!player.isUserInChannel(interaction.user)) {
        await interaction.editReply({
          content: `❌ You must be in ${player.channel} to use this command!`,
        });
        return;
      }
      const searchResult = await searchTracks(query, interaction.user, this.detectSearchType(query));
      if (!searchResult || (!searchResult.tracks && !searchResult.playlist)) {
        await interaction.editReply({ content: '❌ No tracks found for your query!' });
        return;
      }
      const startTime = start ? Utils.parseTime(start) : 0;
      const endTime = end ? Utils.parseTime(end) : 0;

      if (searchResult.playlist) {
        const playlist = searchResult.playlist;
        let addedCount = 0;
        for (const track of playlist.tracks) {
          if (startTime > 0) track.setStartTime(startTime);
          if (endTime > 0) track.setEndTime(endTime);
          player.queue.add(track);
          addedCount++;
        }
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('📋 Playlist Added')
          .setDescription(`Added **${playlist.tracks.length}** tracks from **${playlist.name}**`)
          .addFields([
            { name: 'Queue Position', value: `${player.queue.size()}`, inline: true },
            { name: 'Requested by', value: `${interaction.user}`, inline: true },
          ]);
        await interaction.editReply({ embeds: [embed] });
      } else {
        const track = searchResult.tracks[0];
        if (startTime > 0) track.setStartTime(startTime);
        if (endTime > 0) track.setEndTime(endTime);
        player.queue.add(track);
        const position = player.queue.size();
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('🎵 Track Added')
          .setDescription(`**[${track.title}](${track.uri})**`)
          .addFields([
            { name: 'Artist', value: track.author, inline: true },
            { name: 'Duration', value: track.formattedDuration, inline: true },
            { name: 'Queue Position', value: position > 0 ? `${position}` : 'Now Playing', inline: true },
            { name: 'Requested by', value: `${interaction.user}`, inline: true },
          ]);
        if (track.thumbnail) {
          embed.setThumbnail(track.thumbnail);
        }
        await interaction.editReply({ embeds: [embed] });
      }
      if (!player.playing && !player.current) {
        const nextTrack = player.queue.poll();
        if (nextTrack) {
          await player.play(nextTrack);
        }
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
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Number of tracks to skip',
      name: 'count',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 10,
    })
    count: number = 1
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
      const required = player.getRequiredVotes();
      if (player.skipVotes.size < required) {
        await interaction.reply({
          content: `🗳️ Vote to skip registered! (${player.skipVotes.size}/${required})`,
        });
        return;
      }
    }
    const currentTrack = player.current;
    if (count > 1) {
      for (let i = 0; i < count - 1; i++) {
        player.queue.poll();
      }
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
      const required = player.getRequiredVotes();
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
    const duration = track.formattedDuration;
    const progress = Math.floor((player.position / track.length) * 20);
    const progressBar = '▰'.repeat(progress) + '▱'.repeat(20 - progress);
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${track.title}](${track.uri})**`)
      .addFields([
        { name: 'Artist', value: track.author, inline: true },
        { name: 'Requested by', value: `${track.requester}`, inline: true },
        { name: 'Volume', value: `${player.currentVolume}%`, inline: true },
        { name: 'Progress', value: `${progressBar}\n${position} / ${duration}`, inline: false },
      ]);
    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }
    await interaction.reply({ embeds: [embed] });
  }
  @Slash({ description: 'Set the volume of the music player' })
  async volume(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Volume level (0-100)',
      name: 'level',
      required: true,
      type: ApplicationCommandOptionType.Integer,
      minValue: 0,
      maxValue: 100,
    })
    level: number
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
  private async handleVoting(player: any, interaction: CommandInteraction, action: string): Promise<{ shouldExecute: boolean; message?: string }> {
    const voteSet = action === 'pause' ? player.pauseVotes :
                   action === 'resume' ? player.resumeVotes :
                   action === 'skip' ? player.skipVotes :
                   player.stopVotes;
    voteSet.add(interaction.user);
    const required = player.getRequiredVotes();
    if (voteSet.size < required) {
      return {
        shouldExecute: false,
        message: `🗳️ Vote to ${action} registered! (${voteSet.size}/${required})`
      };
    }
    return { shouldExecute: true };
  }
  public createTrackEmbed(track: Track, title: string, color: number = 0x00ff00): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`**[${track.title}](${track.uri})**`)
      .addFields([
        { name: 'Artist', value: track.author, inline: true },
        { name: 'Duration', value: track.formattedDuration, inline: true },
        { name: 'Requested by', value: `${track.requester}`, inline: true },
      ]);
    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }
    return embed;
  }
  public async handleCommandError(interaction: CommandInteraction, message: string): Promise<void> {
    if (interaction.deferred) {
      await interaction.editReply({ content: message });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
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
