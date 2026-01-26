/**
 * Unit tests for MCP tool validation functions
 */

import { describe, it, mock } from "node:test";
import assert from "node:assert";
import {
  validateRating,
  validateDocumentId,
  validateQuestionId,
  validateQuestions,
} from "./tools.js";

describe("validateRating", () => {
  it("accepts valid FSRS ratings (1-4)", () => {
    assert.doesNotThrow(() => validateRating(1));
    assert.doesNotThrow(() => validateRating(2));
    assert.doesNotThrow(() => validateRating(3));
    assert.doesNotThrow(() => validateRating(4));
  });

  it("throws for rating below 1", () => {
    assert.throws(() => validateRating(0), /Rating must be 1 \(Again\)/);
    assert.throws(() => validateRating(-1), /Rating must be 1 \(Again\)/);
  });

  it("throws for rating above 4", () => {
    assert.throws(() => validateRating(5), /Rating must be 1 \(Again\)/);
    assert.throws(() => validateRating(100), /Rating must be 1 \(Again\)/);
  });

  it("throws for non-integer values", () => {
    assert.throws(() => validateRating(1.5), /Rating must be 1 \(Again\)/);
    assert.throws(() => validateRating(2.5), /Rating must be 1 \(Again\)/);
  });
});

describe("validateDocumentId", () => {
  it("returns valid document IDs", () => {
    assert.strictEqual(validateDocumentId("abc123"), "abc123");
    assert.strictEqual(validateDocumentId("doc-id-456"), "doc-id-456");
  });

  it("throws for empty string", () => {
    assert.throws(() => validateDocumentId(""), /documentId is required/);
  });

  it("throws for non-string values", () => {
    assert.throws(() => validateDocumentId(null), /documentId is required/);
    assert.throws(() => validateDocumentId(undefined), /documentId is required/);
    assert.throws(() => validateDocumentId(123), /documentId is required/);
    assert.throws(() => validateDocumentId({}), /documentId is required/);
  });
});

describe("validateQuestionId", () => {
  it("returns valid question IDs", () => {
    assert.strictEqual(validateQuestionId("q123"), "q123");
    assert.strictEqual(validateQuestionId("question-abc"), "question-abc");
  });

  it("throws for empty string", () => {
    assert.throws(() => validateQuestionId(""), /questionId is required/);
  });

  it("throws for non-string values", () => {
    assert.throws(() => validateQuestionId(null), /questionId is required/);
    assert.throws(() => validateQuestionId(undefined), /questionId is required/);
    assert.throws(() => validateQuestionId(456), /questionId is required/);
  });
});

describe("validateQuestions", () => {
  const validQuestion = {
    questionText: "What is the main idea?",
    questionType: "multiple_choice",
    comprehensionType: "factual_recall",
    correctAnswer: "A",
    rationale: "The answer is A because...",
  };

  it("accepts valid questions array", () => {
    assert.doesNotThrow(() => validateQuestions([validQuestion]));
    assert.doesNotThrow(() => validateQuestions([validQuestion, validQuestion]));
  });

  it("throws for empty array", () => {
    assert.throws(() => validateQuestions([]), /must be a non-empty array/);
  });

  it("throws for non-array values", () => {
    assert.throws(() => validateQuestions(null), /must be a non-empty array/);
    assert.throws(() => validateQuestions(undefined), /must be a non-empty array/);
    assert.throws(() => validateQuestions("not an array"), /must be a non-empty array/);
    assert.throws(() => validateQuestions({}), /must be a non-empty array/);
  });

  it("throws for question missing questionText", () => {
    const invalid = { ...validQuestion };
    delete (invalid as Record<string, unknown>).questionText;
    assert.throws(() => validateQuestions([invalid]), /must have questionText/);
  });

  it("throws for question missing questionType", () => {
    const invalid = { ...validQuestion };
    delete (invalid as Record<string, unknown>).questionType;
    assert.throws(() => validateQuestions([invalid]), /must have questionText/);
  });

  it("throws for question missing comprehensionType", () => {
    const invalid = { ...validQuestion };
    delete (invalid as Record<string, unknown>).comprehensionType;
    assert.throws(() => validateQuestions([invalid]), /must have questionText/);
  });

  it("throws for question missing correctAnswer", () => {
    const invalid = { ...validQuestion };
    delete (invalid as Record<string, unknown>).correctAnswer;
    assert.throws(() => validateQuestions([invalid]), /must have questionText/);
  });

  it("throws for question missing rationale", () => {
    const invalid = { ...validQuestion };
    delete (invalid as Record<string, unknown>).rationale;
    assert.throws(() => validateQuestions([invalid]), /must have questionText/);
  });
});
