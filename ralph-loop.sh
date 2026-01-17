#!/bin/bash
set -e
set -o pipefail

MAX_ITERATIONS=${1:-20}
LOG_DIR="$(pwd)/ralph-logs"
mkdir -p "$LOG_DIR"

PROMPT='READ all of MASTER_IMPLEMENTATION_GUIDE.md this is master document.
Read all of plans/PHASE-1-PROJECT-SETUP.md Pick ONE task, Start from the Top of the Document.
Verify via web/code search. Complete task, verify via CLI/Test output. Commit change. ONLY do one task.
Update plans/PHASE-1-PROJECT-SETUP with marking a task as completed. If you learn a critical
operational detail (e.g. how to build), update AGENTS.md. If all tasks done, output exactly: IM DONE
NEVER GIT PUSH. ONLY COMMIT. DONT USE EGENSKRIVEN TO DO ANYTHING WITH TASKS.'

echo "🚀 Starting Ralph Loop"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Logs: $LOG_DIR/"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    LOG_FILE="$LOG_DIR/iteration-${i}-${TIMESTAMP}.log"

    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Iteration $i of $MAX_ITERATIONS"
    echo "  Started: $(date)"
    echo "  Log: $LOG_FILE"
    echo "═══════════════════════════════════════════"
    echo ""

    # Run claude and stream output to both terminal and log file
    # Pipe through jq for human-readable formatting
    claude -p "$PROMPT" --dangerously-skip-permissions --output-format stream-json --verbose 2>&1 | \
        tee "$LOG_FILE" | \
        jq --unbuffered -r '
            if .type == "assistant" and .message.content then
                .message.content[] | select(.type == "text") | "💬 " + .text
            elif .type == "content_block_start" and .content_block.type == "tool_use" then
                "🔧 Using: " + .content_block.name
            elif .type == "content_block_delta" and .delta.partial_json then
                empty
            elif .type == "content_block_delta" and .delta.text then
                .delta.text
            elif .type == "tool_result" then
                "✓ Done"
            elif .type == "result" then
                "\n📋 Result: " + (.result // "completed")
            else
                empty
            end
        ' 2>/dev/null || true

    # Check log file for completion marker
    if grep -qi "IM DONE" "$LOG_FILE"; then
        echo ""
        echo "═══════════════════════════════════════════"
        echo "  ✅ All tasks complete!"
        echo "  Total iterations: $i"
        echo "  Finished: $(date)"
        echo "═══════════════════════════════════════════"
        exit 0
    fi

    echo ""
    echo "--- Iteration $i complete, starting next in 2s ---"
    sleep 2
done

echo ""
echo "⚠️  Max iterations ($MAX_ITERATIONS) reached"
exit 1
