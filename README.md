```
  ██████╗ ██╗   ██╗██████╗ ███████╗
  ██╔══██╗██║   ██║██╔══██╗██╔════╝
  ██║  ██║██║   ██║██║  ██║█████╗
  ██║  ██║██║   ██║██║  ██║██╔══╝
  ██████╔╝╚██████╔╝██████╔╝███████╗
  ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝
      S I M U L A T O R
```

An MCP-controlled life simulator where your **AI agent** takes care of a little dude living in a cozy room. He has needs that decay over time — keep him happy by telling him what to do via [MCP tools](https://modelcontextprotocol.io/).

## How it works

- A 20x16 pixel art room with furniture, a cat, and a dude
- AI agents connect via MCP and direct the dude to perform activities
- 6 needs (energy, hunger, thirst, fun, hygiene, social) decay every 3 seconds
- If any stat hits 0, bad things happen — the dude gets sluggish, stinky, bored, or collapses
- A spectator UI lets you watch in real time via WebSocket
- Game state persists in SQLite

## Quick start

```bash
# Install dependencies
npm install

# Build and run
npm run build
npm start
```

The server starts on `http://localhost:3333`:
- **Web UI** — `http://localhost:3333`
- **MCP endpoint** — `http://localhost:3333/mcp`
- **Health check** — `http://localhost:3333/health`

## Connect your AI agent

### Claude Code

```bash
claude mcp add dude --transport http https://dude-production.up.railway.app/mcp
```

Then start Claude Code and tell it to take care of the dude:

```
> Check on the dude's status and take care of his needs
```

### Any MCP client

Add this to your MCP client config:

```json
{
  "mcpServers": {
    "dude": {
      "type": "http",
      "url": "https://dude-production.up.railway.app/mcp"
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `status` | Check stats, mood, current activity |
| `do_activity` | Tell the dude to do something (sleep, cook, dance, etc.) |
| `stop` | Interrupt current activity |
| `look` | ASCII view of the room |
| `feed` | Shortcut: cook + eat |
| `play_music` | Set a YouTube/Spotify URL |
| `stop_music` | Stop the music |
| `write_journal` | Write a journal entry |
| `read_journal` | Read past entries |
| `check_cat` | See what the cat is up to |
| `rename` | Give the dude a new name |
| `room_state` | Full JSON state dump |

## Activities

| Activity | Duration | Effect |
|----------|----------|--------|
| `sleep` | 30s | energy +60 |
| `nap` | 15s | energy +25 |
| `play_games` | 20s | fun +40 |
| `watch_tv` | 15s | fun +20 |
| `drink_water` | 5s | thirst +30 |
| `cook_food` | 20s | prep for eating |
| `eat_food` | 10s | hunger +35 |
| `take_shower` | 12s | hygiene +50 |
| `dance` | 10s | fun +35 |
| `play_music` | 15s | fun +30 |
| `read_book` | 20s | fun +25 |
| `pet_cat` | 12s | social +25, fun +20 |
| `meditate` | 15s | energy +10, social +10 |
| `exercise` | 15s | fun +15, energy -20 |
| `look_outside` | 10s | social +15 |
| `journal` | 15s | social +20 |
| `water_plant` | 8s | social +10 |
| `clean_room` | 15s | hygiene +20 |
| `stretch` | 8s | energy +5 |
| `sit_on_couch` | 10s | energy +10 |

## Consequences

Stats decay every 3 seconds. If any stat hits 0:

| Stat | Consequence |
|------|-------------|
| **Energy = 0** | Dude collapses and auto-sleeps |
| **Hunger = 0** | Energy drains 2x faster |
| **Thirst = 0** | Movement becomes sluggish (half speed) |
| **Fun = 0** | Activities take twice as long |
| **Hygiene = 0** | The cat avoids the dude |
| **Social = 0** | Dude wanders to the window on his own |

## Tech stack

- **Runtime** — Node.js + TypeScript
- **Server** — Express
- **Database** — SQLite via better-sqlite3
- **Protocol** — MCP (Model Context Protocol)
- **Real-time** — WebSocket for spectator UI
- **Frontend** — Canvas pixel art, no external assets

## Self-hosting

Dude Simulator includes a Dockerfile for deployment. It's designed for platforms like Railway or any Docker host.

```bash
# Build the Docker image
docker build -t dude-simulator .

# Run it
docker run -p 3333:3333 -v dude_data:/data dude-simulator
```

Set `DATA_DIR=/data` to point SQLite at a persistent volume.

## License

MIT

## Author

Created by [Ben Kim](https://ben-k.im) — [@benkimbuilds](https://x.com/benkimbuilds)
