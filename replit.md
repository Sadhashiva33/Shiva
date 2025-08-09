# Overview

Maestro is an all-in-one Discord bot built with Node.js and the Discord.js library. The bot provides comprehensive server functionality including music playback, moderation tools, games, utility commands, and text-to-speech announcements. It's designed to be a complete server management and entertainment solution, similar to popular bots like Dyno but with additional features like voice state announcements and interactive games.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Architecture
The bot follows a modular command-handler pattern built on Discord.js v14:

- **Command System**: Slash commands organized by category (moderation, music, games, utility) with automatic registration
- **Event-Driven Architecture**: Separate event handlers for Discord events (ready, interactionCreate, voiceStateUpdate, messageCreate)
- **Collection-Based Storage**: In-memory collections for commands, music queues, and voice connections
- **Configuration Management**: Centralized config file for bot settings, permissions, and feature toggles

## Command Structure
Commands are organized into functional modules:
- **Moderation Commands**: Kick, ban, mute with permission checking and role management
- **Music System**: YouTube audio streaming with queue management and voice channel integration
- **Games**: Interactive features like dice rolling, magic 8-ball, and counting games
- **Utility Commands**: Server info, user info, and administrative tools

## Audio Architecture
The bot uses Discord.js/voice for audio functionality:
- **Voice Connection Management**: Per-guild voice connections with automatic cleanup
- **Audio Players**: Individual audio players for music and TTS with queue systems
- **TTS Integration**: Google TTS (gTTS) for voice state announcements with temporary file management
- **Music Streaming**: YouTube audio streaming via ytdl-core with metadata extraction

## Data Management
Simple JSON-based persistence for bot data:
- **File-Based Storage**: JSON file system for guild settings, channel configurations, and user data
- **Async Data Operations**: Promise-based data loading/saving with error handling
- **Default Data Structure**: Hierarchical data organization for guilds, channels, and users

## Permission System
Multi-layered permission checking:
- **Role-Based Permissions**: Discord permission integration with administrator override
- **Bot Owner Privileges**: Special permissions for configured owner IDs
- **Moderation Hierarchy**: Role position checking for moderation commands
- **Bot Permission Validation**: Ensures bot has necessary permissions before executing commands

# External Dependencies

## Core Discord Integration
- **discord.js v14**: Primary Discord API wrapper with gateway intents for guilds, messages, voice states, and members
- **@discordjs/voice**: Voice connection and audio streaming capabilities
- **@discordjs/builders**: Command and embed construction utilities

## Audio Services
- **ytdl-core**: YouTube audio extraction and streaming for music functionality
- **gtts (Google Text-to-Speech)**: Text-to-speech generation for voice announcements

## System Dependencies
- **Node.js File System**: JSON-based data persistence and temporary file management
- **Environment Variables**: Configuration management for tokens, IDs, and sensitive settings

## Media Processing
- **Temporary File System**: Audio file generation and cleanup for TTS functionality
- **Stream Processing**: Real-time audio streaming and resource management