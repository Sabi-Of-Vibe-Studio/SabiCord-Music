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
import { logger } from '../core/Logger';
export interface IHelpViewOptions {
  user: User;
  prefix?: string;
}
interface ICommandCategory {
  name: string;
  emoji: string;
  description: string;
  commands: ICommand[];
}
interface ICommand {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  examples?: string[];
}
export class HelpView {
  private user: User;
  private prefix: string;
  private message?: Message | undefined;
  private currentCategory = 'overview';
  private categories: Record<string, ICommandCategory>;
  constructor(options: IHelpViewOptions) {
    this.user = options.user;
    this.prefix = options.prefix || '/';
    this.categories = this.initializeCategories();
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
      logger.error('Failed to send help view', error as Error, 'help');
      throw error;
    }
  }
  private createEmbed(): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🤖 SabiCord Help')
      .setThumbnail('https://example.com/bot-avatar.png')
      .setFooter({
        text: 'Use the dropdown menu to navigate between categories',
      });
    if (this.currentCategory === 'overview') {
      embed.setDescription(
        'Welcome to Vocard! A powerful Discord music bot with advanced features.\n\n' +
        '**🎵 Key Features:**\n' +
        '• High-quality music playback\n' +
        '• Support for multiple sources (YouTube, Spotify, SoundCloud, etc.)\n' +
        '• Advanced queue management\n' +
        '• Audio effects and filters\n' +
        '• Playlist management\n' +
        '• Interactive music controller\n\n' +
        '**📋 Quick Start:**\n' +
        `1. Join a voice channel\n` +
        `2. Use \`${this.prefix}music play <song>\` to start playing music\n` +
        `3. Use the interactive controller to manage playback\n\n` +
        '**🔗 Links:**\n' +
        '[Support Server](https://discord.gg/support) | [Invite Bot](https://discord.com/invite)'
      );
    } else {
      const category = this.categories[this.currentCategory];
      if (category) {
        embed.setDescription(`${category.emoji} **${category.name}**\n${category.description}\n\n`);
        const commandList = category.commands
          .map(cmd => {
            let commandText = `**${this.prefix}${cmd.name}** - ${cmd.description}`;
            if (cmd.usage) {
              commandText += `\n\`Usage: ${this.prefix}${cmd.usage}\``;
            }
            if (cmd.examples && cmd.examples.length > 0) {
              commandText += `\n*Example: ${this.prefix}${cmd.examples[0]}*`;
            }
            return commandText;
          })
          .join('\n\n');
        embed.addFields([
          {
            name: 'Commands',
            value: commandList || 'No commands available',
            inline: false,
          },
        ]);
      }
    }
    return embed;
  }
  private createComponents(): ActionRowBuilder<any>[] {
    const components: ActionRowBuilder<any>[] = [];
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category to view commands');
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Overview')
        .setDescription('Bot overview and quick start guide')
        .setValue('overview')
        .setEmoji('🏠')
        .setDefault(this.currentCategory === 'overview')
    );
    Object.entries(this.categories).forEach(([key, category]) => {
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(category.name)
          .setDescription(category.description)
          .setValue(key)
          .setEmoji(category.emoji)
          .setDefault(this.currentCategory === key)
      );
    });
    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    components.push(selectRow);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>();
    buttonRow.addComponents(
      new ButtonBuilder()
        .setLabel('Support Server')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/support'),
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot'),
      new ButtonBuilder()
        .setLabel('GitHub')
        .setEmoji('📚')
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/ChocoMeow/Vocard'),
      new ButtonBuilder()
        .setCustomId('help_close')
        .setLabel('Close')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Secondary)
    );
    components.push(buttonRow);
    return components;
  }
  private setupInteractionCollector(): void {
    if (!this.message) return;
    const collector = this.message.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === this.user.id,
      time: 300000, 
    });
    collector.on('collect', async (interaction) => {
      try {
        if (interaction.isStringSelectMenu()) {
          await this.handleSelectMenu(interaction);
        } else if (interaction.isButton()) {
          await this.handleButton(interaction);
        }
      } catch (error) {
        logger.error('Error handling help interaction', error as Error, 'help');
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
        logger.debug('Failed to clear help components', 'help');
      }
    });
  }
  private async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
    this.currentCategory = interaction.values[0] || 'overview';
    await interaction.deferUpdate();
    const embed = this.createEmbed();
    const components = this.createComponents();
    await interaction.editReply({
      embeds: [embed],
      components,
    });
  }
  private async handleButton(interaction: any): Promise<void> {
    if (interaction.customId === 'help_close') {
      await interaction.deferUpdate();
      await this.destroy();
    }
  }
  private async destroy(): Promise<void> {
    if (this.message) {
      try {
        await this.message.delete();
      } catch (error) {
        logger.debug('Failed to delete help message', 'help');
      }
      this.message = undefined;
    }
  }
  private initializeCategories(): Record<string, ICommandCategory> {
    return {
      music: {
        name: 'Music Commands',
        emoji: '🎵',
        description: 'Basic music playback and control commands',
        commands: [
          {
            name: 'music play',
            description: 'Play a song or playlist from URL or search query',
            usage: 'music play <query> [start:time] [end:time]',
            examples: ['music play Never Gonna Give You Up', 'music play https://youtube.com/watch?v=dQw4w9WgXcQ']
          },
          {
            name: 'music pause',
            description: 'Pause the current track',
            usage: 'music pause',
          },
          {
            name: 'music resume',
            description: 'Resume the paused track',
            usage: 'music resume',
          },
          {
            name: 'music skip',
            description: 'Skip the current track or multiple tracks',
            usage: 'music skip [count]',
            examples: ['music skip', 'music skip 3'],
          },
          {
            name: 'music stop',
            description: 'Stop the music and clear the queue',
            usage: 'music stop',
          },
          {
            name: 'music nowplaying',
            description: 'Show information about the currently playing track',
            usage: 'music nowplaying',
          },
          {
            name: 'music volume',
            description: 'Set the volume of the music player',
            usage: 'music volume <level>',
            examples: ['music volume 50', 'music volume 100'],
          },
        ],
      },
      queue: {
        name: 'Queue Management',
        emoji: '📋',
        description: 'Commands for managing the music queue',
        commands: [
          {
            name: 'queue list',
            description: 'Show the current music queue',
            usage: 'queue list [page]',
            examples: ['queue list', 'queue list 2'],
          },
          {
            name: 'queue shuffle',
            description: 'Shuffle the music queue',
            usage: 'queue shuffle',
          },
          {
            name: 'queue clear',
            description: 'Clear the music queue',
            usage: 'queue clear',
          },
          {
            name: 'queue remove',
            description: 'Remove a track or range of tracks from the queue',
            usage: 'queue remove <position> [end]',
            examples: ['queue remove 3', 'queue remove 2 5'],
          },
          {
            name: 'queue repeat',
            description: 'Set the repeat mode for the queue',
            usage: 'queue repeat [mode]',
            examples: ['queue repeat', 'queue repeat track', 'queue repeat queue'],
          },
          {
            name: 'queue skipto',
            description: 'Jump to a specific track in the queue',
            usage: 'queue skipto <position>',
            examples: ['queue skipto 5'],
          },
          {
            name: 'queue history',
            description: 'Show your listening history',
            usage: 'queue history [page]',
          },
        ],
      },
      effects: {
        name: 'Audio Effects',
        emoji: '🎛️',
        description: 'Commands for applying audio effects and filters',
        commands: [
          {
            name: 'effects bassboost',
            description: 'Apply bass boost effect',
            usage: 'effects bassboost [level]',
            examples: ['effects bassboost', 'effects bassboost 3'],
          },
          {
            name: 'effects nightcore',
            description: 'Apply nightcore effect (faster tempo and higher pitch)',
            usage: 'effects nightcore [speed] [pitch]',
            examples: ['effects nightcore', 'effects nightcore 1.3 1.3'],
          },
          {
            name: 'effects vaporwave',
            description: 'Apply vaporwave effect (slower tempo and lower pitch)',
            usage: 'effects vaporwave [speed] [pitch]',
            examples: ['effects vaporwave', 'effects vaporwave 0.7 0.7'],
          },
          {
            name: 'effects eightd',
            description: 'Apply 8D audio effect',
            usage: 'effects eightd [speed]',
            examples: ['effects eightd', 'effects eightd 0.3'],
          },
          {
            name: 'effects karaoke',
            description: 'Apply karaoke effect (remove vocals)',
            usage: 'effects karaoke [level]',
            examples: ['effects karaoke', 'effects karaoke 0.8'],
          },
          {
            name: 'effects tremolo',
            description: 'Apply tremolo effect',
            usage: 'effects tremolo [frequency] [depth]',
            examples: ['effects tremolo', 'effects tremolo 4.0 0.7'],
          },
          {
            name: 'effects clear',
            description: 'Clear all audio effects',
            usage: 'effects clear',
          },
          {
            name: 'effects status',
            description: 'Show current audio effects',
            usage: 'effects status',
          },
        ],
      },
      settings: {
        name: 'Bot Settings',
        emoji: '⚙️',
        description: 'Commands for configuring bot settings',
        commands: [
          {
            name: 'settings prefix',
            description: 'Set or view the bot prefix for this server',
            usage: 'settings prefix [new_prefix]',
            examples: ['settings prefix', 'settings prefix !'],
          },
          {
            name: 'settings language',
            description: 'Set or view the language for this server',
            usage: 'settings language [language]',
            examples: ['settings language', 'settings language EN'],
          },
          {
            name: 'settings musicchannel',
            description: 'Set a music request channel',
            usage: 'settings musicchannel [channel]',
            examples: ['settings musicchannel #music'],
          },
          {
            name: 'settings controller',
            description: 'Toggle controller message persistence',
            usage: 'settings controller <enabled>',
            examples: ['settings controller true', 'settings controller false'],
          },
          {
            name: 'settings view',
            description: 'View current server settings',
            usage: 'settings view',
          },
          {
            name: 'settings connect',
            description: 'Connect the bot to a voice channel',
            usage: 'settings connect [channel]',
            examples: ['settings connect', 'settings connect General'],
          },
          {
            name: 'settings disconnect',
            description: 'Disconnect the bot from voice channel',
            usage: 'settings disconnect',
          },
          {
            name: 'settings info',
            description: 'Show bot information and statistics',
            usage: 'settings info',
          },
          {
            name: 'settings ping',
            description: 'Test bot latency and connection',
            usage: 'settings ping',
          },
        ],
      },
    };
  }
}
