/**
 * MCP Tool Definitions for FastReader
 */

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const tools: Tool[] = [
  {
    name: "fastreader_get_current_session",
    description: `Get the current active reading session from FastReader.
Returns the session state, full document text, reading progress, and any pending quiz milestones.
Use this to understand what the user has been reading and how far they've progressed.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "fastreader_get_document",
    description: `Get a specific document by its ID.
Returns the full document content, metadata, and word count.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "fastreader_list_documents",
    description: `List all documents the user has loaded into FastReader.
Returns document titles, word counts, and creation dates.
Use this to help users find documents they want to review.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum documents to return (default: 50)"
        },
        offset: {
          type: "number",
          description: "Offset for pagination (default: 0)"
        }
      },
      required: []
    }
  },
  {
    name: "fastreader_get_question_history",
    description: `Get all previously generated questions for a document.
IMPORTANT: Always call this before generating new questions to avoid asking duplicate or semantically similar questions.
Returns question text, types, and whether they've been answered.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID"
        }
      },
      required: ["documentId"]
    }
  },
  {
    name: "fastreader_save_questions",
    description: `Save generated comprehension questions for a document.
Call this after generating questions to persist them to the database.
Questions will be available in FastReader's quiz interface and for spaced repetition review.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "The document ID these questions are for"
        },
        sessionId: {
          type: "string",
          description: "Optional session ID if questions are for a specific reading session"
        },
        questions: {
          type: "array",
          description: "Array of questions to save",
          items: {
            type: "object",
            properties: {
              questionText: { type: "string" },
              questionType: {
                type: "string",
                enum: ["multiple_choice", "short_answer", "fill_in_blank"]
              },
              comprehensionType: {
                type: "string",
                enum: ["factual_recall", "inference", "synthesis"]
              },
              difficulty: {
                type: "string",
                enum: ["easy", "medium", "hard"]
              },
              options: { type: "object" },
              correctAnswer: { type: "string" },
              rationale: { type: "string" }
            },
            required: ["questionText", "questionType", "comprehensionType", "correctAnswer", "rationale"]
          }
        }
      },
      required: ["documentId", "questions"]
    }
  },
  {
    name: "fastreader_record_answer",
    description: `Record the user's answer to a question.
Use this when the user answers a question in the AI CLI conversation.
The rating parameter uses FSRS scale: 1=Again (forgot), 2=Hard, 3=Good, 4=Easy.
This updates the spaced repetition schedule for the question.`,
    inputSchema: {
      type: "object",
      properties: {
        questionId: {
          type: "string",
          description: "The question ID"
        },
        userAnswer: {
          type: "string",
          description: "The user's answer"
        },
        isCorrect: {
          type: "boolean",
          description: "Whether the answer was correct"
        },
        rating: {
          type: "number",
          enum: [1, 2, 3, 4],
          description: "FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy"
        },
        timeSpentMs: {
          type: "number",
          description: "Optional time spent answering in milliseconds"
        }
      },
      required: ["questionId", "userAnswer", "isCorrect", "rating"]
    }
  },
  {
    name: "fastreader_get_due_questions",
    description: `Get questions that are due for spaced repetition review.
Returns questions scheduled for review today, sorted by due date.
Use this when the user wants to review material they've previously read.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum questions to return (default: 20)"
        },
        documentId: {
          type: "string",
          description: "Optional: filter to specific document"
        }
      },
      required: []
    }
  },
  {
    name: "fastreader_get_session_stats",
    description: `Get reading and quiz statistics.
Returns total documents, questions answered, accuracy rate, and review progress.`,
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          description: "Optional: get stats for specific document only"
        }
      },
      required: []
    }
  }
];
