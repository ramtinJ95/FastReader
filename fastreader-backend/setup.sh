#!/bin/bash
set -e

echo "FastReader Backend Setup"
echo "========================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for PocketBase
if ! command -v pocketbase &> /dev/null && [ ! -f "./pocketbase" ]; then
    echo "Downloading PocketBase..."

    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
    esac

    VERSION="${POCKETBASE_VERSION:-0.23.4}"
    URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip"

    curl -L "$URL" -o pocketbase.zip
    unzip pocketbase.zip pocketbase
    rm pocketbase.zip
    chmod +x pocketbase
    echo "PocketBase downloaded successfully."
else
    echo "PocketBase already installed."
fi

# Run migrations
echo ""
echo "Running migrations..."
./pocketbase migrate up

echo ""
echo "Setup complete! Start the server with:"
echo "  ./start.sh"
echo ""
echo "Or run directly:"
echo "  ./pocketbase serve"
