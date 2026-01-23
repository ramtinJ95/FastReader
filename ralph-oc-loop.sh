#!/bin/bash
set -e
set -o pipefail

MAX_ITERATIONS=${1:-20}
PROMPT_FILE=${2:-"ralph-loop.txt"}
LOG_DIR="$(pwd)/ralph-logs"
mkdir -p "$LOG_DIR"

# Read prompt from file
if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "Error: Prompt file not found: $PROMPT_FILE"
    echo "   Create the file or specify a different path as the second argument."
    echo "   Usage: $0 [max_iterations] [prompt_file]"
    exit 1
fi

PROMPT=$(cat "$PROMPT_FILE")

echo "Starting Ralph Loop (OpenCode)"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Prompt file: $PROMPT_FILE"
echo "   Logs: $LOG_DIR/"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    LOG_FILE="$LOG_DIR/oc-iteration-${i}-${TIMESTAMP}.log"

    echo ""
    echo "==========================================="
    echo "  Iteration $i of $MAX_ITERATIONS"
    echo "  Started: $(date)"
    echo "  Log: $LOG_FILE"
    echo "==========================================="
    echo ""

    # Run opencode with auto-approve permissions and stream output to both terminal and log file
    # Pipe through jq for human-readable formatting
    # OPENCODE_PERMISSION='{"*":"allow"}' auto-approves all tool calls (equivalent to --dangerously-skip-permissions)
    OPENCODE_PERMISSION='{"*":"allow"}' opencode run "$PROMPT" --format json 2>&1 | \
        tee "$LOG_FILE" | \
        jq --unbuffered -r '
            if .type == "text" and .part.text then
                ">> " + .part.text
            elif .type == "tool_use" and .part.tool then
                if .part.state.status == "completed" then
                    "[v] " + .part.tool + ": Done"
                elif .part.state.status == "running" then
                    "[*] Using: " + .part.tool
                elif .part.state.status == "error" then
                    "[x] " + .part.tool + ": " + (.part.state.error // "Error")
                else
                    empty
                end
            elif .type == "step_start" then
                "--- Step started ---"
            elif .type == "step_finish" then
                "--- Step finished ---"
            else
                empty
            end
        ' 2>/dev/null || true

    # Check log file for completion marker
    if grep -qi "IM DONE" "$LOG_FILE"; then
        echo ""
        echo "==========================================="
        echo "  All tasks complete!"
        echo "  Total iterations: $i"
        echo "  Finished: $(date)"
        echo "==========================================="
        exit 0
    fi

    echo ""
    echo "--- Iteration $i complete, starting next in 2s ---"
    sleep 2
done

echo ""
echo "Warning: Max iterations ($MAX_ITERATIONS) reached"
exit 1
