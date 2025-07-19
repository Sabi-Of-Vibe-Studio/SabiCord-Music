/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { 
  CommandInteraction, 
  ApplicationCommandOptionType, 
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  VoiceChannel,
  TextChannel
} from 'discord.js';
import { Discord, Slash, SlashOption, SlashGroup } from '@discordx/discordx';
import { injectable, container } from 'tsyringe';
import { getPlayer } from '@voicelink/index';
import { Database } from '@core/Database';
import { Settings } from '@core/Settings';
import { logger } from '@core/Logger';

@Discord()
@SlashGroup({ description: 'Bot configuration and settings commands', name: 'settings' })
@SlashGroup('settings')
@injectable()
export class SettingsCommands {

  @Slash({ description: 'Set the bot prefix for this server' })
  async prefix(
    @SlashOption({
      description: 'New prefix (leave empty to view current)',
      name: 'prefix',
      required: false,
      type: ApplicationCommandOptionType.String,
      maxLength: 5,
    })
    prefix: string | undefined,
    interaction: CommandInteraction
  ): Promise<void> {
    const validation = await this.validateGuildAndPermissions(interaction);
    if (!validation.isValid) {
      await interaction.reply({ content: validation.errorMessage!, ephemeral: true });
      return;
    }

    try {
      const database = container.resolve<Database>('Database');
      const settings = container.resolve<Settings>('Settings');
      
      if (!prefix) {
        // Show current prefix
        const guildSettings = await database.settings.getSettings(interaction.guild.id);
        const currentPrefix = guildSettings.prefix || settings.prefix;
        
        await interaction.reply({ 
          content: `🔧 Current prefix: \`${currentPrefix}\`` 
        });
        return;
      }

      // Update prefix
      await database.settings.updateSettings(interaction.guild.id, {
        $set: { prefix }
      });

      await interaction.reply({ 
        content: `🔧 Prefix updated to: \`${prefix}\`` 
      });
    } catch (error) {
      logger.error('Error updating prefix', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to update prefix!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Set the language for this server' })
  async language(
    @SlashOption({
      description: 'Language code',
      name: 'language',
      required: false,
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: 'English', value: 'EN' },
        { name: 'Spanish', value: 'ES' },
        { name: 'French', value: 'FR' },
        { name: 'German', value: 'DE' },
        { name: 'Japanese', value: 'JA' },
        { name: 'Korean', value: 'KO' },
        { name: 'Chinese', value: 'CH' },
        { name: 'Russian', value: 'RU' },
        { name: 'Polish', value: 'PL' },
        { name: 'Ukrainian', value: 'UA' },
      ],
    })
    interaction: CommandInteraction,
    language?: string
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ 
        content: '❌ You need the "Manage Server" permission to change settings!', 
        ephemeral: true 
      });
      return;
    }

    try {
      const database = container.resolve<Database>('Database');
      
      if (!language) {
        // Show current language
        const guildSettings = await database.settings.getSettings(interaction.guild.id);
        const currentLang = guildSettings.lang || 'EN';
        
        await interaction.reply({ 
          content: `🌐 Current language: **${currentLang}**` 
        });
        return;
      }

      // Update language
      await database.settings.updateSettings(interaction.guild.id, {
        $set: { lang: language }
      });

      await interaction.reply({ 
        content: `🌐 Language updated to: **${language}**` 
      });
    } catch (error) {
      logger.error('Error updating language', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to update language!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Set a music request channel' })
  async musicchannel(
    @SlashOption({
      description: 'Text channel for music requests',
      name: 'channel',
      required: false,
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
    })
    channel?: TextChannel,
    interaction: CommandInteraction
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ 
        content: '❌ You need the "Manage Server" permission to change settings!', 
        ephemeral: true 
      });
      return;
    }

    try {
      const database = container.resolve<Database>('Database');
      
      if (!channel) {
        // Remove music request channel
        await database.settings.updateSettings(interaction.guild.id, {
          $unset: { music_request_channel: '' }
        });

        await interaction.reply({ 
          content: '🎵 Music request channel removed!' 
        });
        return;
      }

      // Set music request channel
      await database.settings.updateSettings(interaction.guild.id, {
        $set: { 
          music_request_channel: {
            text_channel_id: parseInt(channel.id)
          }
        }
      });

      await interaction.reply({ 
        content: `🎵 Music request channel set to ${channel}!` 
      });
    } catch (error) {
      logger.error('Error updating music channel', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to update music request channel!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Toggle controller message persistence' })
  async controller(
    @SlashOption({
      description: 'Enable or disable controller messages',
      name: 'enabled',
      required: true,
      type: ApplicationCommandOptionType.Boolean,
    })
    enabled: boolean,
    interaction: CommandInteraction
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ 
        content: '❌ You need the "Manage Server" permission to change settings!', 
        ephemeral: true 
      });
      return;
    }

    try {
      const database = container.resolve<Database>('Database');
      
      await database.settings.updateSettings(interaction.guild.id, {
        $set: { controller_msg: enabled }
      });

      await interaction.reply({ 
        content: `🎛️ Controller messages ${enabled ? 'enabled' : 'disabled'}!` 
      });
    } catch (error) {
      logger.error('Error updating controller setting', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to update controller setting!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'View current server settings' })
  async view(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    try {
      const database = container.resolve<Database>('Database');
      const globalSettings = container.resolve<Settings>('Settings');
      const guildSettings = await database.settings.getSettings(interaction.guild.id);

      const prefix = guildSettings.prefix || globalSettings.prefix;
      const language = guildSettings.lang || 'EN';
      const musicChannel = guildSettings.music_request_channel?.text_channel_id 
        ? `<#${guildSettings.music_request_channel.text_channel_id}>`
        : 'Not set';
      const controllerEnabled = guildSettings.controller_msg !== false;

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔧 Server Settings')
        .addFields([
          { name: 'Prefix', value: `\`${prefix}\``, inline: true },
          { name: 'Language', value: language, inline: true },
          { name: 'Music Channel', value: musicChannel, inline: true },
          { name: 'Controller Messages', value: controllerEnabled ? 'Enabled' : 'Disabled', inline: true },
        ])
        .setFooter({ text: `Server: ${interaction.guild.name}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error viewing settings', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to load server settings!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Connect the bot to a voice channel' })
  async connect(
    @SlashOption({
      description: 'Voice channel to connect to',
      name: 'channel',
      required: false,
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildVoice],
    })
    channel?: VoiceChannel,
    interaction: CommandInteraction
  ): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    try {
      const player = await connectChannel(interaction, channel);
      
      await interaction.reply({ 
        content: `🔗 Connected to ${player.channel}!` 
      });
    } catch (error) {
      await interaction.reply({ 
        content: `❌ ${error}`, 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Disconnect the bot from voice channel' })
  async disconnect(interaction: CommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in servers!', ephemeral: true });
      return;
    }

    const player = getPlayer(interaction.guild.id);
    
    if (!player) {
      await interaction.reply({ content: '❌ Bot is not connected to any voice channel!', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageChannels) && 
        !player.isUserInChannel(interaction.user)) {
      await interaction.reply({ 
        content: '❌ You need to be in the voice channel or have "Manage Channels" permission!', 
        ephemeral: true 
      });
      return;
    }

    const channelName = player.channel.name;
    await player.disconnect();
    
    await interaction.reply({ 
      content: `🔌 Disconnected from **${channelName}**!` 
    });
  }

  @Slash({ description: 'Show bot information and statistics' })
  async info(interaction: CommandInteraction): Promise<void> {
    try {
      const settings = container.resolve<Settings>('Settings');
      const client = interaction.client;
      
      const uptime = process.uptime();
      const uptimeString = this.formatUptime(uptime);
      const memoryUsage = process.memoryUsage();
      const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🤖 Vocard Bot Information')
        .setThumbnail(client.user?.displayAvatarURL() || '')
        .addFields([
          { name: 'Version', value: '2.0.0', inline: true },
          { name: 'Uptime', value: uptimeString, inline: true },
          { name: 'Memory Usage', value: `${memoryUsed} MB`, inline: true },
          { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
          { name: 'Users', value: `${client.users.cache.size}`, inline: true },
          { name: 'Node.js', value: process.version, inline: true },
        ])
        .setFooter({ text: 'Vocard - Discord Music Bot' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error showing bot info', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to load bot information!', 
        ephemeral: true 
      });
    }
  }

  @Slash({ description: 'Test bot latency and connection' })
  async ping(interaction: CommandInteraction): Promise<void> {
    const start = Date.now();
    
    await interaction.deferReply();
    
    const apiLatency = Date.now() - start;
    const wsLatency = interaction.client.ws.ping;
    
    const player = getPlayer(interaction.guildId!);
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🏓 Pong!')
      .addFields([
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true },
        { name: 'WebSocket Latency', value: `${wsLatency}ms`, inline: true },
      ]);

    if (player) {
      embed.addFields([
        { name: 'Lavalink Latency', value: `${player.ping}ms`, inline: true },
        { name: 'Node', value: player.node.identifier, inline: true },
      ]);
    }

    await interaction.editReply({ embeds: [embed] });
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Validates guild context and user permissions for settings commands
   */
  private async validateGuildAndPermissions(interaction: CommandInteraction): Promise<{ isValid: boolean; errorMessage?: string }> {
    if (!interaction.guild) {
      return { isValid: false, errorMessage: '❌ This command can only be used in servers!' };
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return {
        isValid: false,
        errorMessage: '❌ You need the "Manage Server" permission to change settings!'
      };
    }

    return { isValid: true };
  }

  /**
   * Validates guild context only (for read-only commands)
   */
  private async validateGuildOnly(interaction: CommandInteraction): Promise<{ isValid: boolean; errorMessage?: string }> {
    if (!interaction.guild) {
      return { isValid: false, errorMessage: '❌ This command can only be used in servers!' };
    }

    return { isValid: true };
  }

  /**
   * Handles common error responses for settings commands
   */
  private async handleSettingsError(interaction: CommandInteraction, message: string): Promise<void> {
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    } catch (error) {
      logger.error('Error handling settings command error', error as Error, 'SettingsCommands');
    }
  }
}
