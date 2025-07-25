import dotenv from "dotenv";
import "reflect-metadata"
import { dirname, importx } from "@discordx/importer";
import type { Interaction, Message } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";

import 'module-alias/register';
import 'reflect-metadata';
import { SabiCordMusicClient } from './core/RefactoredMusicClient';


dotenv.config();

const nodeProcess = eval('process');
const nodeConsole = eval('console');

export const bot = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],
  silent: false,
  simpleCommand: {
    prefix: process.env.BOT_PREFIX?.toString() || "!",
  },
});

async function run() {

  await importx(`${dirname(import.meta.url)}/{audio,commands,core,events,interfaces,ipc,localization,services,types,views}/**/*.{ts,js}`);
  
  bot.once("ready", async () => {
  await bot.initApplicationCommands();

  // It must only be executed once
  await bot.clearApplicationCommands(
    ...bot.guilds.cache.map((g) => g.id)
  );

  console.log("Bot started");
  });

  bot.on("interactionCreate", (interaction: Interaction) => {
  bot.executeInteraction(interaction);
  });

  bot.on("messageCreate", (message: Message) => {
    void bot.executeCommand(message);
  });

  if (!process.env.DISCORD_TOKEN) {
    throw Error("Could not find DISCORD_TOKEN in your environment");
  }
  await bot.login(process.env.DISCORD_TOKEN);
}

async function main(): Promise<void> {
    try {
    nodeConsole.log('Starting SabiCord Discord Music Bot...');
    const client = new SabiCordMusicClient();
    await client.start();  
    void run();
  } catch (error) {
    nodeConsole.error('Failed to start bot:', error);
    nodeProcess.exit(1);
  }
}
main().catch((error) => {
  nodeConsole.error('Fatal error:', error);
  nodeProcess.exit(1);
});