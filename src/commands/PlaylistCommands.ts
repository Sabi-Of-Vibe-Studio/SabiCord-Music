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
import { injectable, container } from 'tsyringe';
import { getPlayer } from '../audio/index';
import { Database } from '../core/Database';
import { Utils } from '../core/Utils';
import { logger } from '../core/Logger';
@Discord()
@SlashGroup({ description: 'Queue and playlist management commands', name: 'queue' })
@SlashGroup('queue')
@injectable()
export class PlaylistCommands {
  @Slash({ description: 'Show the current music queue' })
  async list(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Page number',
      name: 'page',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
    })
    page: number = 1
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    const tracks = player.queue.getTracks();
    if (tracks.length === 0) {
      await interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
      return;
    }
    const tracksPerPage = 10;
    const totalPages = Math.ceil(tracks.length / tracksPerPage);
    const currentPage = Math.min(page, totalPages);
    const startIndex = (currentPage - 1) * tracksPerPage;
    const endIndex = startIndex + tracksPerPage;
    const pageTrack = tracks.slice(startIndex, endIndex);
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 Music Queue')
      .setDescription(
        pageTrack
          .map((track, index) => {
            const position = startIndex + index + 1;
            const duration = track.formattedLength;
            return `**${position}.** [${Utils.truncateString(track.title, 40)}](${track.uri}) - ${duration}`;
          })
          .join('\n')
      )
      .setFooter({ 
        text: `Page ${currentPage}/${totalPages} • ${tracks.length} tracks • ${player.queue.formattedLength} total duration` 
      });
    if (player.current) {
      embed.addFields([
        {
          name: '🎵 Now Playing',
          value: `[${Utils.truncateString(player.current.title, 50)}](${player.current.uri})`,
          inline: false,
        },
      ]);
    }
    await interaction.reply({ embeds: [embed] });
  }
  @Slash({ description: 'Shuffle the music queue' })
  async shuffle(interaction: CommandInteraction): Promise<void> {
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
    if (player.queue.isEmpty()) {
      await interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      player.shuffleVotes.add(interaction.user);
      const required = player.getRequiredVotes();
      if (player.shuffleVotes.size < required) {
        await interaction.reply({
          content: `🗳️ Vote to shuffle registered! (${player.shuffleVotes.size}/${required})`,
        });
        return;
      }
    }
    player.queue.shuffle();
    await interaction.reply({ content: '🔀 Queue shuffled!' });
  }
  @Slash({ description: 'Clear the music queue' })
  async clear(interaction: CommandInteraction): Promise<void> {
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
        content: '❌ You need DJ permissions to clear the queue!',
        ephemeral: true,
      });
      return;
    }
    const trackCount = player.queue.count;
    player.queue.clear();
    await interaction.reply({ content: `🗑️ Cleared **${trackCount}** tracks from the queue!` });
  }
  @Slash({ description: 'Remove a track from the queue' })
  async remove(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Track position to remove',
      name: 'position',
      required: true,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
    })
    position: number,
    @SlashOption({
      description: 'End position (for range removal)',
      name: 'end',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
    })
    end?: number
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
    if (player.queue.isEmpty()) {
      await interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
      return;
    }
    try {
      const removedTrack = player.queue.remove(position - 1);
      if (!removedTrack) {
        await interaction.reply({
          content: '❌ No track found at that position!',
          ephemeral: true
        });
        return;
      }
      const trackName = Utils.truncateString(removedTrack.title, 30);
      const message = `🗑️ Removed **${trackName}** from the queue!`;
      await interaction.reply({ content: message });
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Invalid position! Please check the queue and try again.', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Set the repeat mode for the queue' })
  async repeat(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Repeat mode (off, track, queue)',
      name: 'mode',
      required: false,
      type: ApplicationCommandOptionType.String,
    })
    mode?: string
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
    await interaction.reply({
      content: '🔁 Repeat functionality is not yet implemented!',
      ephemeral: true
    });
  }
  @Slash({ description: 'Jump to a specific track in the queue' })
  async skipto(
    @SlashOption({
      description: 'Track position to skip to',
      name: 'position',
      required: true,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
    })
    position: number,
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
        content: '❌ You need DJ permissions to skip to a specific track!',
        ephemeral: true,
      });
      return;
    }
    if (position > player.queue.count) {
      await interaction.reply({ 
        content: `❌ Invalid position! The queue only has ${player.queue.count} tracks.`, 
        ephemeral: true 
      });
      return;
    }
    try {
      player.queue.skipTo(position);
      await player.stop(); 
      await interaction.reply({ content: `⏭️ Skipped to position **${position}** in the queue!` });
    } catch (error) {
      await interaction.reply({ 
        content: '❌ Failed to skip to that position!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Show your listening history' })
  async history(
    @SlashOption({
      description: 'Page number',
      name: 'page',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
    })
    page: number = 1,
    interaction: CommandInteraction
  ): Promise<void> {
    try {
      const database = container.resolve<Database>('Database');
      const userData = await database.users.getUser(interaction.user.id);
      if (!userData.history || userData.history.length === 0) {
        await interaction.reply({ content: '❌ You have no listening history!', ephemeral: true });
        return;
      }
      const tracksPerPage = 10;
      const totalPages = Math.ceil(userData.history.length / tracksPerPage);
      const currentPage = Math.min(page, totalPages);
      const startIndex = (currentPage - 1) * tracksPerPage;
      const endIndex = startIndex + tracksPerPage;
      const pageHistory = userData.history.slice(startIndex, endIndex);
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 Your Listening History')
        .setDescription(
          pageHistory
            .map((entry, index) => {
              const position = startIndex + index + 1;
              const track = entry.track;
              const playedAt = new Date(entry.played_at).toLocaleDateString();
              return `**${position}.** ${Utils.truncateString(track.title, 40)} - ${playedAt}`;
            })
            .join('\n')
        )
        .setFooter({ text: `Page ${currentPage}/${totalPages} • ${userData.history.length} total tracks` });
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error in history command', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ An error occurred while fetching your history!', 
        ephemeral: true 
      });
    }
  }

}
