/// <reference path="../pb_data/types.d.ts" />

/**
 * FSRS (Free Spaced Repetition Scheduler) Implementation
 *
 * This hook automatically calculates spaced repetition values
 * when a question_attempt record is created with a rating.
 */

// Hook: Before creating a question attempt, calculate FSRS values
onRecordCreate((e) => {
    // FSRS algorithm helper functions (defined inside hook for PocketBase compatibility)

    /**
     * Calculate new stability after review
     */
    function nextStability(d, s, rating) {
        if (rating === 1) {
            return Math.max(0.1, s * 0.2);
        }
        const hardPenalty = (rating === 2) ? 1.2 : 1;
        const easyBonus = (rating === 4) ? 1.3 : 1;
        return s * (1 + Math.exp(11.0) *
            Math.pow(d, -0.5) *
            (Math.pow(s, -0.2) - 1) *
            hardPenalty * easyBonus);
    }

    /**
     * Calculate new difficulty after review
     */
    function nextDifficulty(d, rating) {
        const delta = (rating - 3) * 0.5;
        return Math.min(10, Math.max(1, d + delta));
    }

    /**
     * Calculate interval in days until next review
     */
    function nextInterval(s, requestedRetention) {
        const interval = Math.round(s * Math.log(requestedRetention) / Math.log(0.9));
        return Math.max(1, interval);
    }

    /**
     * Determine new learning state
     */
    function nextState(currentState, rating) {
        if (rating === 1) {
            return currentState === 0 ? 1 : 3;
        }
        if (currentState === 0 || currentState === 1) {
            return rating >= 3 ? 2 : 1;
        }
        if (currentState === 3) {
            return rating >= 3 ? 2 : 3;
        }
        return 2;
    }

    /**
     * Get the most recent attempt for a question to inherit FSRS values
     */
    function getPreviousAttempt(questionId) {
        try {
            const records = $app.findRecordsByFilter(
                "question_attempts",
                `question = "${questionId}"`,
                "created DESC",
                1,
                0
            );
            return records.length > 0 ? records[0] : null;
        } catch (err) {
            console.log(`FSRS: No previous attempts found for question ${questionId}`);
            return null;
        }
    }

    try {
        const record = e.record;
        const rating = record.getInt("rating");

        console.log(`FSRS: Hook triggered, rating = ${rating}`);

        // Skip if no rating provided
        if (!rating || rating < 1 || rating > 4) {
            console.log(`FSRS: Skipping - no valid rating`);
            e.next();
            return;
        }

        const questionId = record.getString("question");

        // Get previous attempt to inherit FSRS values, or use defaults
        const prevAttempt = getPreviousAttempt(questionId);

        let stability = 1.0;
        let difficulty = 5.0;
        let state = 0;
        let reps = 0;
        let lapses = 0;

        if (prevAttempt) {
            stability = prevAttempt.getFloat("stability") || 1.0;
            difficulty = prevAttempt.getFloat("difficulty") || 5.0;
            state = prevAttempt.getInt("state") || 0;
            reps = prevAttempt.getInt("reps") || 0;
            lapses = prevAttempt.getInt("lapses") || 0;
        }

        console.log(`FSRS: Previous values - stability=${stability}, difficulty=${difficulty}`);

        // Calculate new FSRS values
        const newStability = nextStability(difficulty, stability, rating);
        const newDifficulty = nextDifficulty(difficulty, rating);
        const newState = nextState(state, rating);
        const interval = nextInterval(newStability, 0.9);

        console.log(`FSRS: Calculated - stability=${newStability}, difficulty=${newDifficulty}, state=${newState}, interval=${interval}`);

        // Calculate next review date
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + interval);

        // Update counters
        const newReps = reps + 1;
        const newLapses = rating === 1 ? lapses + 1 : lapses;

        // Set the FSRS values on the record
        record.set("stability", newStability);
        record.set("difficulty", newDifficulty);
        record.set("state", newState);
        record.set("due_at", dueAt.toISOString());
        record.set("reps", newReps);
        record.set("lapses", newLapses);

        console.log(`FSRS: Updated attempt - stability: ${newStability.toFixed(2)}, ` +
            `difficulty: ${newDifficulty.toFixed(2)}, state: ${newState}, ` +
            `next review: ${interval} days`);

        e.next();
    } catch (err) {
        console.log(`FSRS ERROR: ${err.message}`);
        throw err;
    }
}, "question_attempts");
