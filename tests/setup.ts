/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import 'reflect-metadata';

// Mock Discord.js for testing
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    user: { id: 'test-bot-id', username: 'TestBot' },
    guilds: { cache: new Map() },
    users: { cache: new Map() },
    channels: { cache: new Map() },
    ws: { ping: 50 },
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    GuildVoiceStates: 4,
    MessageContent: 8,
    GuildMembers: 16,
  },
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
    Competing: 5,
  },
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
  })),
  ActionRowBuilder: jest.fn().mockImplementation(() => ({
    addComponents: jest.fn().mockReturnThis(),
  })),
  ButtonBuilder: jest.fn().mockImplementation(() => ({
    setCustomId: jest.fn().mockReturnThis(),
    setLabel: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
    setEmoji: jest.fn().mockReturnThis(),
    setDisabled: jest.fn().mockReturnThis(),
  })),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  },
  PermissionFlagsBits: {
    Connect: 1n << 20n,
    Speak: 1n << 21n,
    ManageChannels: 1n << 4n,
    ManageGuild: 1n << 5n,
  },
  ChannelType: {
    GuildText: 0,
    GuildVoice: 2,
  },
  ApplicationCommandOptionType: {
    String: 3,
    Integer: 4,
    Boolean: 5,
    User: 6,
    Channel: 7,
    Role: 8,
    Mentionable: 9,
    Number: 10,
  },
  ComponentType: {
    Button: 2,
    StringSelect: 3,
  },
}));

// Mock WebSocket
jest.mock('ws', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1,
  })),
}));

// Mock MongoDB
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    close: jest.fn(),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        countDocuments: jest.fn(),
      }),
      command: jest.fn(),
    }),
  })),
}));

// Mock Axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock file system operations
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readdirSync: jest.fn().mockReturnValue(['en.json']),
  mkdirSync: jest.fn(),
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// Mock process.env
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DISCORD_TOKEN: 'test-token',
  DISCORD_CLIENT_ID: 'test-client-id',
  MONGODB_URL: 'mongodb://localhost:27017',
  MONGODB_NAME: 'vocard_test',
  LAVALINK_HOST: 'localhost',
  LAVALINK_PORT: '2333',
  LAVALINK_PASSWORD: 'test-password',
  BOT_PREFIX: '!',
  EMBED_COLOR: '0xb3b3b3',
  LOG_LEVEL: 'error',
};

// Global test utilities
global.createMockGuild = () => ({
  id: 'test-guild-id',
  name: 'Test Guild',
  members: {
    cache: new Map(),
    me: {
      permissions: {
        has: jest.fn().mockReturnValue(true),
      },
    },
  },
  channels: {
    cache: new Map(),
  },
  roles: {
    cache: new Map(),
  },
  iconURL: jest.fn(),
  voiceAdapterCreator: jest.fn(),
});

global.createMockUser = () => ({
  id: 'test-user-id',
  username: 'TestUser',
  displayName: 'Test User',
  bot: false,
  toString: () => '<@test-user-id>',
});

global.createMockChannel = () => ({
  id: 'test-channel-id',
  name: 'test-channel',
  type: 2, // Voice channel
  members: new Map(),
  permissionsFor: jest.fn().mockReturnValue({
    has: jest.fn().mockReturnValue(true),
  }),
  send: jest.fn(),
  toString: () => '<#test-channel-id>',
});

global.createMockInteraction = () => ({
  guild: global.createMockGuild(),
  user: global.createMockUser(),
  channel: global.createMockChannel(),
  reply: jest.fn(),
  editReply: jest.fn(),
  deferReply: jest.fn(),
  deferUpdate: jest.fn(),
  isButton: jest.fn().mockReturnValue(false),
  isStringSelectMenu: jest.fn().mockReturnValue(false),
  customId: 'test-custom-id',
  values: [],
});

// Setup test timeout
jest.setTimeout(10000);

// Suppress console logs during tests unless explicitly needed
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
