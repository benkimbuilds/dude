# Deploying Dude Simulator

## Railway (recommended)

1. **Create a Railway project**

   Go to [railway.app](https://railway.app) and create a new project.

2. **Connect your repo**

   Link your GitHub repo (or push via Railway CLI). Railway auto-detects the Dockerfile.

3. **Add a persistent volume**

   In your service settings, add a volume:
   - Mount path: `/data`

   This keeps the SQLite database across deploys.

4. **Set environment variables**

   ```
   PORT=3333
   DATA_DIR=/data
   NODE_ENV=production
   ```

   Railway sets `PORT` automatically — it may override 3333 with its own port. The Dockerfile already reads `process.env.PORT`.

5. **Deploy**

   Railway builds from the Dockerfile automatically on push. Once deployed:
   - Web UI: `https://your-app.up.railway.app`
   - MCP endpoint: `https://your-app.up.railway.app/mcp`
   - Health check: `https://your-app.up.railway.app/health`

6. **Custom domain (optional)**

   In Railway settings, add a custom domain and point your DNS CNAME to the Railway URL.

## Docker (any host)

```bash
# Build
docker build -t dude-simulator .

# Run with persistent data
docker run -p 3333:3333 -v dude_data:/data dude-simulator
```

## After deploying

Connect your MCP client to the deployed URL:

```bash
claude mcp add dude --transport http https://your-domain.com/mcp
```

Or in `mcp.json`:

```json
{
  "mcpServers": {
    "dude": {
      "type": "http",
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

## Health check

All platforms can use `GET /health` for uptime monitoring:

```
https://your-domain.com/health
→ {"status":"ok","game":"dude-simulator","version":"0.1.0"}
```
