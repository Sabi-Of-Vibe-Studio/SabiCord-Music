# SabiCord - Discord Music Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue)](https://discord.js.org/)
<a href="https://discord.gg/d243bVfCGY">
    <img src="https://img.shields.io/discord/811542332678996008?color=7289DA&label=Support&logo=discord&style=for-the-badge" alt="Discord">
</a>

A modern, feature-rich Discord music bot built with TypeScript, featuring high-quality audio playback, advanced queue management, and comprehensive audio effects.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0 or higher
- **MongoDB** 4.4 or higher
- **Lavalink** server
- **Discord Bot Token**

### Installation

1. **Clone the repository**
   ```bash
   git clone git https://github.com/Sabi-Of-Vibe-Studio/SabiCord-Music.git
   cd SabiCord-Music
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## 🎮 Commands

### Music Commands
- `/music play <query>` - Play a song or playlist
- `/music pause` - Pause the current track
- `/music resume` - Resume playback
- `/music skip [count]` - Skip track(s)
- `/music stop` - Stop and clear queue
- `/music volume <level>` - Set volume (0-100)
- `/music nowplaying` - Show current track info

### Queue Management
- `/queue list [page]` - Show the music queue
- `/queue shuffle` - Shuffle the queue
- `/queue clear` - Clear the queue
- `/queue remove <position>` - Remove track from queue
- `/queue repeat [mode]` - Set repeat mode
- `/queue skipto <position>` - Jump to track

### Audio Effects
- `/effects bassboost [level]` - Apply bass boost
- `/effects nightcore [speed] [pitch]` - Nightcore effect
- `/effects vaporwave [speed] [pitch]` - Vaporwave effect
- `/effects eightd [speed]` - 8D audio effect
- `/effects clear` - Clear all effects

### Settings
- `/settings prefix [prefix]` - Set server prefix
- `/settings language [lang]` - Set server language
- `/settings musicchannel [channel]` - Set music request channel
- `/settings info` - Show bot information

## 🔧 Development

### Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run build` - Build the project
- `npm run start` - Start production server
- `npm run dev` - Start development server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Lavalink](https://github.com/lavalink-devs/Lavalink) - Audio delivery platform
- [Discord.js](https://discord.js.org/) - Discord API library
- [DiscordX](https://discordx.js.org/) - Discord bot framework
- Original Python version contributors

## 📞 Support

- [Discord Server](https://invite.sabicoder.xyz/discord)
- [GitHub Issues](https://github.com/Sabi-Of-Vibe-Studio/SabiCord-Music/issues)
- [Documentation](https://docs.sabicoder.xyz)

## 🔗 Links

- [Invite Bot](https://botdiscord.sabicoder.xyz)
- [Dashboard](https://dashboard.sabicoder.xyz/app) (Coming Soon)
- [Status Page](https://status.sabicoder.xyz) (Coming Soon)

---

<div align="center">
  <strong>Made with ❤️ by the SabiOfVibe Team.  <p>thanks for using our bot!</strong>
</div>

