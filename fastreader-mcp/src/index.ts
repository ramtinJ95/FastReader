#!/usr/bin/env node

/**
 * FastReader MCP Server
 *
 * Provides MCP tools for AI coding assistants to interact
 * with FastReader's comprehension feature.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { tools } from "./tools.js";
import { pb, toSnakeCase, checkConnection } from "./pocketbase-client.js";

// Create MCP server
const server = new Server(
  { name: "fastreader", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    // Check PocketBase connection
    if (!(await checkConnection())) {
      return {
        content: [{
          type: "text",
          text: "Error: PocketBase is not running. Please start it with: ./pocketbase serve"
        }],
        isError: true
      };
    }

    let result: unknown;

    switch (name) {
      case "fastreader_get_current_session": {
        // Fetch session without expand (PocketBase has issues with expand on list queries)
        // Frontend now ensures only one session is active at a time
        const sessions = await pb.collection('sessions').getList(1, 1, {
          filter: 'is_active = true'
        });

        if (sessions.items.length === 0) {
          result = { error: "No active session found", hint: "The user may not have started reading yet." };
        } else {
          const session = sessions.items[0];

          // Fetch document separately
          const doc = session.document
            ? await pb.collection('documents').getOne(session.document as string)
            : null;

          const milestones = await pb.collection('session_milestones').getList(1, 100, {
            filter: `session = "${session.id}"`
          });

          result = {
            session: {
              id: session.id,
              currentWordIndex: session.current_word_index,
              totalWords: session.total_words,
              progressPercent: session.progress_percent,
              wpmSetting: session.wpm_setting,
              isActive: session.is_active
            },
            document: doc ? {
              id: doc.id,
              title: doc.title,
              content: doc.content,
              wordCount: doc.word_count,
              sourceType: doc.source_type
            } : null,
            milestones: milestones.items.map(m => ({
              percent: m.milestone_percent,
              quizPrompted: m.quiz_prompted,
              quizCompleted: m.quiz_completed
            })),
            pendingQuizMilestone: milestones.items.find(m => !m.quiz_completed)?.milestone_percent
          };
        }
        break;
      }

      case "fastreader_get_document": {
        const doc = await pb.collection('documents').getOne(args.documentId as string);
        result = {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          wordCount: doc.word_count,
          sourceType: doc.source_type,
          sourcePath: doc.source_path
        };
        break;
      }

      case "fastreader_list_documents": {
        const limit = (args.limit as number) || 50;
        const offset = (args.offset as number) || 0;
        const page = Math.floor(offset / limit) + 1;

        const docs = await pb.collection('documents').getList(page, limit, {
          fields: 'id,title,word_count,source_type'
        });

        result = {
          documents: docs.items.map(d => ({
            id: d.id,
            title: d.title,
            wordCount: d.word_count,
            sourceType: d.source_type
          })),
          totalItems: docs.totalItems,
          page: docs.page,
          perPage: docs.perPage
        };
        break;
      }

      case "fastreader_get_question_history": {
        const questions = await pb.collection('questions').getList(1, 500, {
          filter: `document = "${args.documentId}"`,
          sort: '-created'
        });

        result = {
          questions: questions.items.map(q => ({
            id: q.id,
            questionText: q.question_text,
            questionType: q.question_type,
            comprehensionType: q.comprehension_type,
            created: q.created
          })),
          totalQuestions: questions.totalItems
        };
        break;
      }

      case "fastreader_save_questions": {
        const questionArgs = args as {
          documentId: string;
          sessionId?: string;
          questions: Array<{
            questionText: string;
            questionType: string;
            comprehensionType: string;
            difficulty?: string;
            options?: Record<string, string>;
            correctAnswer: string;
            rationale: string;
          }>;
        };

        const saved: Array<{ id: string; questionText: string }> = [];

        for (const q of questionArgs.questions) {
          const record = await pb.collection('questions').create({
            document: questionArgs.documentId,
            session: questionArgs.sessionId || null,
            ...toSnakeCase(q)
          });
          saved.push({ id: record.id, questionText: q.questionText });
        }

        result = {
          saved: saved.length,
          questions: saved,
          message: `Successfully saved ${saved.length} question(s)`
        };
        break;
      }

      case "fastreader_record_answer": {
        const answerArgs = args as {
          questionId: string;
          userAnswer: string;
          isCorrect: boolean;
          rating: number;
          timeSpentMs?: number;
        };

        // Validate rating is in FSRS range (1-4)
        if (!answerArgs.rating || answerArgs.rating < 1 || answerArgs.rating > 4) {
          throw new Error(
            `Invalid rating: ${answerArgs.rating}. Rating must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).`
          );
        }

        // Validate required fields
        if (!answerArgs.questionId) {
          throw new Error('questionId is required');
        }
        if (typeof answerArgs.isCorrect !== 'boolean') {
          throw new Error('isCorrect must be a boolean');
        }

        const attempt = await pb.collection('question_attempts').create({
          question: answerArgs.questionId,
          user_answer: answerArgs.userAnswer,
          is_correct: answerArgs.isCorrect,
          rating: answerArgs.rating,
          time_spent_ms: answerArgs.timeSpentMs || null
        });

        // Fetch updated record (FSRS hook updates it)
        await new Promise(resolve => setTimeout(resolve, 100));
        const updated = await pb.collection('question_attempts').getOne(attempt.id);

        result = {
          attemptId: updated.id,
          questionId: answerArgs.questionId,
          isCorrect: updated.is_correct,
          nextReview: {
            dueAt: updated.due_at,
            stability: updated.stability,
            difficulty: updated.difficulty,
            state: updated.state
          }
        };
        break;
      }

      case "fastreader_get_due_questions": {
        const dueArgs = args as { limit?: number; documentId?: string };
        const now = new Date().toISOString();
        let filter = `due_at <= "${now}"`;

        if (dueArgs.documentId) {
          filter += ` && question.document = "${dueArgs.documentId}"`;
        }

        const attempts = await pb.collection('question_attempts').getList(1, dueArgs.limit || 20, {
          filter,
          sort: 'due_at',
          expand: 'question'
        });

        result = {
          questions: attempts.items.map(a => ({
            questionId: a.question,
            question: a.expand?.question ? {
              text: (a.expand.question as { question_text: string }).question_text,
              type: (a.expand.question as { question_type: string }).question_type,
              documentId: (a.expand.question as { document: string }).document
            } : null,
            reviewState: {
              dueAt: a.due_at,
              stability: a.stability,
              difficulty: a.difficulty,
              state: a.state,
              reps: a.reps,
              lapses: a.lapses
            }
          })),
          totalDue: attempts.totalItems
        };
        break;
      }

      case "fastreader_get_session_stats": {
        const docsCount = await pb.collection('documents').getList(1, 1);
        const questionsCount = await pb.collection('questions').getList(1, 1);
        const correctCount = await pb.collection('question_attempts').getList(1, 1, {
          filter: 'is_correct = true'
        });
        const totalAttempts = await pb.collection('question_attempts').getList(1, 1);

        result = {
          totalDocuments: docsCount.totalItems,
          totalQuestionsGenerated: questionsCount.totalItems,
          totalQuestionsAnswered: totalAttempts.totalItems,
          correctAnswers: correctCount.totalItems,
          accuracyRate: totalAttempts.totalItems > 0
            ? (correctCount.totalItems / totalAttempts.totalItems * 100).toFixed(1) + '%'
            : 'N/A'
        };
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };

  } catch (error) {
    // Log full error details to stderr for debugging
    console.error("MCP Error:", error);

    const message = error instanceof Error ? error.message : String(error);
    // Include stack trace for debugging
    const stack = error instanceof Error ? error.stack : undefined;

    return {
      content: [{
        type: "text",
        text: `Error: ${message}${stack ? `\n\nStack: ${stack}` : ''}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FastReader MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
