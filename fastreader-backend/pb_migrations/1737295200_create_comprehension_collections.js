/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create all comprehension feature collections
 *
 * Collections:
 * 1. documents - Stores document content and metadata
 * 2. sessions - Reading sessions linked to documents
 * 3. questions - Quiz questions generated from documents
 * 4. question_attempts - User answers and FSRS scheduling data
 * 5. session_milestones - Progress milestones (25%, 50%, 75%, 100%)
 */

migrate((app) => {
    // ==========================================
    // Collection 1: documents
    // ==========================================
    const documents = new Collection({
        name: "documents",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                type: "text",
                name: "title",
                required: true,
                max: 500
            },
            {
                type: "text",
                name: "content",
                required: true
            },
            {
                type: "select",
                name: "source_type",
                required: true,
                values: ["paste", "file", "url"],
                maxSelect: 1
            },
            {
                type: "text",
                name: "source_path",
                required: false,
                max: 2000
            },
            {
                type: "select",
                name: "file_type",
                required: false,
                values: ["txt", "md", "pdf"],
                maxSelect: 1
            },
            {
                type: "number",
                name: "word_count",
                required: true,
                min: 0
            }
        ]
    });
    app.save(documents);

    // ==========================================
    // Collection 2: sessions
    // ==========================================
    const sessions = new Collection({
        name: "sessions",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                type: "relation",
                name: "document",
                required: true,
                collectionId: documents.id,
                cascadeDelete: false,
                maxSelect: 1
            },
            {
                type: "number",
                name: "current_word_index",
                required: false
            },
            {
                type: "number",
                name: "total_words",
                required: true
            },
            {
                type: "number",
                name: "progress_percent",
                required: false
            },
            {
                type: "number",
                name: "wpm_setting",
                required: false
            },
            {
                type: "number",
                name: "chunk_size",
                required: false
            },
            {
                type: "bool",
                name: "is_active",
                required: false
            },
            {
                type: "date",
                name: "completed_at",
                required: false
            }
        ]
    });
    app.save(sessions);

    // ==========================================
    // Collection 3: questions
    // ==========================================
    const questions = new Collection({
        name: "questions",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                type: "relation",
                name: "document",
                required: true,
                collectionId: documents.id,
                cascadeDelete: false,
                maxSelect: 1
            },
            {
                type: "relation",
                name: "session",
                required: false,
                collectionId: sessions.id,
                cascadeDelete: false,
                maxSelect: 1
            },
            {
                type: "text",
                name: "question_text",
                required: true
            },
            {
                type: "select",
                name: "question_type",
                required: true,
                values: ["multiple_choice", "short_answer", "fill_in_blank"],
                maxSelect: 1
            },
            {
                type: "select",
                name: "comprehension_type",
                required: true,
                values: ["factual_recall", "inference", "synthesis"],
                maxSelect: 1
            },
            {
                type: "select",
                name: "difficulty",
                required: false,
                values: ["easy", "medium", "hard"],
                maxSelect: 1
            },
            {
                type: "json",
                name: "options",
                required: false
            },
            {
                type: "text",
                name: "correct_answer",
                required: true
            },
            {
                type: "json",
                name: "distractor_explanations",
                required: false
            },
            {
                type: "text",
                name: "ideal_answer",
                required: false
            },
            {
                type: "json",
                name: "acceptable_variations",
                required: false
            },
            {
                type: "json",
                name: "required_concepts",
                required: false
            },
            {
                type: "json",
                name: "scoring_rubric",
                required: false
            },
            {
                type: "text",
                name: "sentence_with_blank",
                required: false
            },
            {
                type: "json",
                name: "correct_answers",
                required: false
            },
            {
                type: "text",
                name: "context_hint",
                required: false
            },
            {
                type: "text",
                name: "rationale",
                required: true
            },
            {
                type: "text",
                name: "passage_evidence",
                required: false
            },
            {
                type: "text",
                name: "passage_location",
                required: false
            },
            {
                type: "number",
                name: "chunk_start_index",
                required: false
            },
            {
                type: "number",
                name: "chunk_end_index",
                required: false
            }
        ]
    });
    app.save(questions);

    // ==========================================
    // Collection 4: question_attempts
    // ==========================================
    const questionAttempts = new Collection({
        name: "question_attempts",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                type: "relation",
                name: "question",
                required: true,
                collectionId: questions.id,
                cascadeDelete: false,
                maxSelect: 1
            },
            {
                type: "text",
                name: "user_answer",
                required: false
            },
            {
                type: "bool",
                name: "is_correct",
                required: false
            },
            {
                type: "number",
                name: "time_spent_ms",
                required: false
            },
            {
                type: "number",
                name: "rating",
                required: false
            },
            {
                type: "number",
                name: "stability",
                required: false
            },
            {
                type: "number",
                name: "difficulty",
                required: false
            },
            {
                type: "date",
                name: "due_at",
                required: false
            },
            {
                type: "number",
                name: "state",
                required: false
            },
            {
                type: "number",
                name: "reps",
                required: false
            },
            {
                type: "number",
                name: "lapses",
                required: false
            }
        ]
    });
    app.save(questionAttempts);

    // ==========================================
    // Collection 5: session_milestones
    // ==========================================
    const sessionMilestones = new Collection({
        name: "session_milestones",
        type: "base",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
        fields: [
            {
                type: "relation",
                name: "session",
                required: true,
                collectionId: sessions.id,
                cascadeDelete: false,
                maxSelect: 1
            },
            {
                type: "number",
                name: "milestone_percent",
                required: true
            },
            {
                type: "bool",
                name: "quiz_prompted",
                required: false
            },
            {
                type: "bool",
                name: "quiz_completed",
                required: false
            }
        ],
        indexes: [
            "CREATE UNIQUE INDEX idx_session_milestone ON session_milestones (session, milestone_percent)"
        ]
    });
    app.save(sessionMilestones);

    console.log("Created all comprehension feature collections");
}, (app) => {
    // Revert migration - delete collections in reverse order
    const collections = [
        "session_milestones",
        "question_attempts",
        "questions",
        "sessions",
        "documents"
    ];

    for (const name of collections) {
        const collection = app.findCollectionByNameOrId(name);
        if (collection) {
            app.delete(collection);
        }
    }
});
