/// <reference path="../pb_data/types.d.ts" />

/**
 * Session Milestone Detection Hook
 *
 * Automatically creates milestone records when a session's
 * progress crosses 25%, 50%, 75%, or 100% thresholds.
 */

const MILESTONES = [25, 50, 75, 100];

/**
 * Check if a milestone record already exists
 * @param {string} sessionId - Session ID
 * @param {number} milestonePercent - Milestone percentage
 * @returns {boolean} True if exists
 */
function milestoneExists(sessionId, milestonePercent) {
    try {
        const records = $app.findRecordsByFilter(
            "session_milestones",
            `session = "${sessionId}" && milestone_percent = ${milestonePercent}`,
            "",
            1,
            0
        );
        return records.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Create a new milestone record
 * @param {string} sessionId - Session ID
 * @param {number} milestonePercent - Milestone percentage
 */
function createMilestone(sessionId, milestonePercent) {
    try {
        const collection = $app.findCollectionByNameOrId("session_milestones");
        const record = new Record(collection);

        record.set("session", sessionId);
        record.set("milestone_percent", milestonePercent);
        record.set("quiz_prompted", false);
        record.set("quiz_completed", false);

        $app.save(record);

        console.log(`Milestone: Created ${milestonePercent}% milestone for session ${sessionId}`);
    } catch (e) {
        console.log(`Milestone: Error creating milestone - ${e.message}`);
    }
}

// Hook: After updating a session, check for new milestones
onRecordAfterUpdateSuccess((e) => {
    const session = e.record;
    const progress = session.getFloat("progress_percent");
    const sessionId = session.id;

    if (!progress || progress <= 0) {
        return;
    }

    // Check each milestone threshold
    for (const milestone of MILESTONES) {
        if (progress >= milestone && !milestoneExists(sessionId, milestone)) {
            createMilestone(sessionId, milestone);
        }
    }
}, "sessions");

// Hook: Also check on session creation (in case created with progress > 0)
onRecordAfterCreateSuccess((e) => {
    const session = e.record;
    const progress = session.getFloat("progress_percent");
    const sessionId = session.id;

    if (!progress || progress <= 0) {
        return;
    }

    // Check each milestone threshold
    for (const milestone of MILESTONES) {
        if (progress >= milestone && !milestoneExists(sessionId, milestone)) {
            createMilestone(sessionId, milestone);
        }
    }
}, "sessions");
