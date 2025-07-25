# application commands
    settings (SettingsCommands.SettingsCommands)
            prefix: subcommand (SettingsCommands.prefix)
            *   prefix: string (SettingsCommands.prefix)

            language: subcommand (SettingsCommands.language)
            *   language: string (SettingsCommands.language)

            musicchannel: subcommand (SettingsCommands.musicchannel)
            *   channel: channel (SettingsCommands.musicchannel)

            controller: subcommand (SettingsCommands.controller)
            *   enabled: boolean (SettingsCommands.controller)

            view: subcommand (SettingsCommands.view)

            connect: subcommand (SettingsCommands.connect)
            *   channel: channel (SettingsCommands.connect)

            disconnect: subcommand (SettingsCommands.disconnect)

            info: subcommand (SettingsCommands.info)

            ping: subcommand (SettingsCommands.ping)

#    queue (PlaylistCommands.PlaylistCommands)
            list: subcommand (PlaylistCommands.list)
            *   page: integer (PlaylistCommands.list)

            shuffle: subcommand (PlaylistCommands.shuffle)

            clear: subcommand (PlaylistCommands.clear)

            remove: subcommand (PlaylistCommands.remove)
            *   end: integer (PlaylistCommands.remove)
            *   position: integer (PlaylistCommands.remove)

            repeat: subcommand (PlaylistCommands.repeat)
            *   mode: string (PlaylistCommands.repeat)

            skipto: subcommand (PlaylistCommands.skipto)
            *   position: integer (PlaylistCommands.skipto)

            history: subcommand (PlaylistCommands.history)
            *   page: integer (PlaylistCommands.history)

#    effects (EffectCommands.EffectCommands)
            bassboost: subcommand (EffectCommands.bassboost)
            *   level: integer (EffectCommands.bassboost)

            nightcore: subcommand (EffectCommands.nightcore)
            *   pitch: number (EffectCommands.nightcore)
            *   speed: number (EffectCommands.nightcore)

            vaporwave: subcommand (EffectCommands.vaporwave)
            *   pitch: number (EffectCommands.vaporwave)
            *   speed: number (EffectCommands.vaporwave)

            eightd: subcommand (EffectCommands.eightd)
            *   speed: number (EffectCommands.eightd)

            karaoke: subcommand (EffectCommands.karaoke)
            *   level: number (EffectCommands.karaoke)

            tremolo: subcommand (EffectCommands.tremolo)
            *   depth: number (EffectCommands.tremolo)
            *   frequency: number (EffectCommands.tremolo)

            clear: subcommand (EffectCommands.clear)

            status: subcommand (EffectCommands.status)

#    music (BasicCommands.BasicCommands)
            play: subcommand (BasicCommands.play)
            *   end: string (BasicCommands.play)
            *   start: string (BasicCommands.play)
            *   query: string (BasicCommands.play)

            pause: subcommand (BasicCommands.pause)

            resume: subcommand (BasicCommands.resume)

            skip: subcommand (BasicCommands.skip)
            *   count: integer (BasicCommands.skip)

            stop: subcommand (BasicCommands.stop)

            nowplaying: subcommand (BasicCommands.nowplaying)

            volume: subcommand (BasicCommands.volume)
            *   level: integer (BasicCommands.volume)