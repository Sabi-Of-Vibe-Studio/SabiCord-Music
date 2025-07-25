import { Pagination } from 'pagination.djs';

import { Client, ColorResolvable } from 'discord.js';
import {  
    EmbedBuilder,
    Message, 
    ChatInputCommandInteraction
} from 'discord.js';
import { Discord, Slash } from 'discordx';

@Discord()
export class Test{
    @Slash({ description: "test the bot command to check if it's responsive." })
    async test(interaction: ChatInputCommandInteraction, color: ColorResolvable, message: Message) {
    try {
  const pagination = new Pagination(interaction);
  pagination.setDescriptions(['This is a description.', 'This is a second description.']);
  pagination.render();
    } catch (error) {
        console.error('Error in test command', error as Error, 'commands');
        await interaction.reply({ content: '❌ Failed to execute command!' });
    };



    
try {
    let Embed = new EmbedBuilder()
	.setColor('#0099ff')
	.setTitle('Some title')
	.setURL('https://discord.js.org/')
	.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
	.setDescription('Some description here')
	.setThumbnail('https://i.imgur.com/AfFp7pu.png')
	.addFields(
		{ name: 'Regular field title', value: 'Some value here' },
		{ name: '\u200B', value: '\u200B' },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
	)
	.addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
	.setImage('https://i.imgur.com/AfFp7pu.png')
	.setTimestamp()
	.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });
    
    const channel = interaction;
    await channel.reply({ embeds: [Embed] });
} catch (error) {
    console.error('Error in test command', error as Error, 'commands');
    const channel = interaction;
    await channel.reply({ content: '❌ Failed to execute command!' });
    }
    }
}