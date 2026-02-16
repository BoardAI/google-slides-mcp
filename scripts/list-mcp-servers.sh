#!/bin/bash
# List all MCP servers and their status

echo "=== Personal MCP Servers ==="
echo ""

MCP_DIR="$HOME/Development/mcp-servers"

if [ -d "$MCP_DIR" ]; then
  for server in "$MCP_DIR"/*; do
    if [ -d "$server" ]; then
      name=$(basename "$server")
      if [ -f "$server/package.json" ]; then
        version=$(node -p "require('$server/package.json').version" 2>/dev/null || echo "unknown")
        echo "📦 $name (v$version)"
        echo "   Path: $server"

        if [ -f "$server/dist/index.js" ]; then
          echo "   Status: ✅ Built"
        else
          echo "   Status: ⚠️  Not built (run: cd $server && npm run build)"
        fi
        echo ""
      fi
    fi
  done
else
  echo "No MCP servers directory found at $MCP_DIR"
fi
