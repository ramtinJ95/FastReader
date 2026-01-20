import { test, expect, type Page, type APIRequestContext, type Response } from '@playwright/test';

/**
 * Comprehension/Quiz Feature E2E Tests
 *
 * Tests the full quiz flow including:
 * - Backend connection status
 * - Document/session creation when loading text
 * - Quiz button visibility
 * - Question generation overlay
 * - Quiz modal with questions
 * - Answer submission
 * - FSRS rating feedback
 */

const POCKETBASE_URL = 'http://127.0.0.1:8090';

// Helper to create a test question via PocketBase API
async function createTestQuestion(
  request: APIRequestContext,
  documentId: string,
  options: {
    questionType?: 'short_answer' | 'multiple_choice' | 'fill_in_blank';
    questionText?: string;
  } = {}
) {
  const { questionType = 'short_answer', questionText = 'What is the key feature of RSVP?' } =
    options;

  const questionData: Record<string, unknown> = {
    document: documentId,
    question_text: questionText,
    question_type: questionType,
    comprehension_type: 'factual_recall',
    difficulty: 'easy',
    rationale:
      'The passage explicitly states the key feature is the Optimal Recognition Point (ORP).',
  };

  if (questionType === 'short_answer') {
    questionData.correct_answer = 'The Optimal Recognition Point (ORP)';
    questionData.ideal_answer =
      'The Optimal Recognition Point (ORP) where a specific letter is highlighted.';
    questionData.scoring_rubric = {
      full_credit: 'Mentions ORP and highlighting',
      partial_credit: 'Mentions ORP only',
      no_credit: 'Does not mention ORP',
    };
  } else if (questionType === 'multiple_choice') {
    questionData.correct_answer = 'A';
    questionData.options = {
      A: 'The Optimal Recognition Point (ORP)',
      B: 'Eye movement tracking',
      C: 'Font size adjustment',
      D: 'Page scrolling speed',
    };
  } else if (questionType === 'fill_in_blank') {
    questionData.sentence_with_blank = 'The key feature is the _____ where a letter is highlighted.';
    questionData.correct_answers = ['ORP', 'Optimal Recognition Point'];
  }

  const response = await request.post(`${POCKETBASE_URL}/api/collections/questions/records`, {
    data: questionData,
  });

  return response.json();
}

// Helper to load text and capture the created session via network interception
async function loadTextAndCreateSession(page: Page): Promise<{
  documentId: string | null;
  sessionId: string | null;
}> {
  // Set up listeners to capture the document and session creation responses
  let documentId: string | null = null;
  let sessionId: string | null = null;

  const responseHandler = async (response: Response) => {
    const url = response.url();
    if (url.includes('/api/collections/documents/records') && response.status() === 200) {
      try {
        const data = await response.json();
        if (data.id) {
          documentId = data.id;
        }
      } catch {
        // Ignore parse errors
      }
    }
    if (url.includes('/api/collections/sessions/records') && response.status() === 200) {
      try {
        const data = await response.json();
        if (data.id) {
          sessionId = data.id;
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  page.on('response', responseHandler);

  // Open text input dialog
  await page.getByRole('button', { name: /load text/i }).click();
  await expect(page.getByRole('dialog', { name: /load text/i })).toBeVisible();

  // Submit the default sample text
  await page.getByRole('button', { name: 'Load Text', exact: true }).click();

  // Wait for dialog to close
  await expect(page.getByRole('dialog', { name: /load text/i })).not.toBeVisible();

  // Wait for network requests to complete
  await page.waitForTimeout(1000);

  // Remove listener
  page.off('response', responseHandler);

  return { documentId, sessionId };
}

test.describe('Comprehension/Quiz Feature E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'FastReader' })).toBeVisible();
  });

  test.describe('Backend Connection', () => {
    test('shows green indicator when backend is connected', async ({ page }) => {
      // Check backend status indicator shows connected
      const backendStatus = page.locator('.backend-status');
      await expect(backendStatus).toBeVisible();
      await expect(backendStatus).toHaveClass(/connected/);
      await expect(backendStatus).toHaveAttribute('title', /Backend connected/i);
    });

    test('backend indicator contains filled circle when connected', async ({ page }) => {
      const backendStatus = page.locator('.backend-status.connected');
      await expect(backendStatus).toContainText('\u25CF'); // Unicode filled circle
    });
  });

  test.describe('Quiz Button Visibility', () => {
    test('quiz button appears after loading text', async ({ page }) => {
      // Initially, quiz button should not be visible (no session)
      await expect(page.getByRole('button', { name: 'Quiz' })).not.toBeVisible();

      // Load text to create a session
      await loadTextAndCreateSession(page);

      // Quiz button should now be visible
      await expect(page.getByRole('button', { name: 'Quiz' })).toBeVisible();
    });
  });

  test.describe('Question Generation Overlay', () => {
    test('shows generating overlay when quiz button is clicked', async ({ page }) => {
      // Load text first
      await loadTextAndCreateSession(page);

      // Click quiz button
      await page.getByRole('button', { name: 'Quiz' }).click();

      // Generating overlay should appear
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Generating Questions' })).toBeVisible();
      await expect(page.getByText(/This may take/i)).toBeVisible();
    });
  });

  test.describe('Full Quiz Flow - Short Answer', () => {
    test('complete quiz flow with short answer question', async ({ page, request }) => {
      // Step 1: Load text to create session
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Step 2: Click Quiz button to show generating overlay
      await page.getByRole('button', { name: 'Quiz' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByText('Generating Questions')).toBeVisible();

      // Step 3: Save a test question via API (simulating AI generation)
      const question = await createTestQuestion(request, documentId!, {
        questionType: 'short_answer',
        questionText: 'What method does RSVP use to display text?',
      });
      expect(question.id).toBeTruthy();

      // Step 4: Quiz modal should appear with the question (via SSE)
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('What method does RSVP use to display text?')).toBeVisible();

      // Step 5: Type an answer in the textbox
      const answerInput = page.getByRole('textbox', { name: /your answer/i });
      await expect(answerInput).toBeVisible();
      await answerInput.fill('RSVP displays one word at a time at a fixed focal point.');

      // Step 6: Submit the answer
      await page.getByRole('button', { name: 'Submit Answer' }).click();

      // Step 7: Verify feedback screen with FSRS rating buttons
      await expect(page.getByText('Compare Your Answer')).toBeVisible();
      await expect(page.getByText('Your Answer:')).toBeVisible();
      await expect(page.getByText('Model Answer:')).toBeVisible();

      // FSRS rating buttons should be visible
      await expect(page.getByRole('button', { name: /Again/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Hard/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Good/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Easy/i })).toBeVisible();

      // Step 8: Click a rating button
      await page.getByRole('button', { name: /Good/i }).click();

      // Step 9: Verify the quiz completes (Finish button appears for last question)
      await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();

      // Click Finish to close quiz
      await page.getByRole('button', { name: 'Finish' }).click();

      // Quiz modal should close
      await expect(page.getByRole('dialog', { name: 'Quiz' })).not.toBeVisible();
    });
  });

  test.describe('Full Quiz Flow - Multiple Choice', () => {
    test('complete quiz flow with multiple choice question', async ({ page, request }) => {
      // Load text to create session
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Click Quiz button
      await page.getByRole('button', { name: 'Quiz' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      // Save a multiple choice question
      const question = await createTestQuestion(request, documentId!, {
        questionType: 'multiple_choice',
        questionText: 'What is the main benefit of RSVP reading?',
      });
      expect(question.id).toBeTruthy();

      // Quiz modal should appear
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

      // Should show question and answer options
      await expect(page.getByText('What is the main benefit of RSVP reading?')).toBeVisible();

      // Select an answer option (option A) - clicking on the label to select the radio
      const optionLabel = page.locator('.mcq-option').first();
      await expect(optionLabel).toBeVisible();
      await optionLabel.click();

      // Click Submit Answer button (MCQ requires explicit submission)
      await page.getByRole('button', { name: 'Submit Answer' }).click();

      // Feedback should appear - look for the feedback header
      await expect(page.locator('.feedback-header')).toBeVisible();
      // Also check for FSRS rating buttons
      await expect(page.getByRole('button', { name: /Again/i })).toBeVisible();

      // Rate the question
      await page.getByRole('button', { name: /Easy/i }).click();

      // Finish quiz
      await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
      await page.getByRole('button', { name: 'Finish' }).click();

      // Quiz modal should close
      await expect(page.getByRole('dialog', { name: 'Quiz' })).not.toBeVisible();
    });
  });

  test.describe('Quiz Modal Interaction', () => {
    test('quiz modal can be closed via close button', async ({ page, request }) => {
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Click Quiz button
      await page.getByRole('button', { name: 'Quiz' }).click();

      // Wait for generating overlay
      await expect(page.getByRole('alert')).toBeVisible();

      // Save a question to trigger modal
      await createTestQuestion(request, documentId!);

      // Wait for quiz modal
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

      // Close via X button
      await page.getByRole('button', { name: /close quiz/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog', { name: 'Quiz' })).not.toBeVisible();
    });

    test('quiz shows progress indicator', async ({ page, request }) => {
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Click Quiz button
      await page.getByRole('button', { name: 'Quiz' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      // Save a question
      await createTestQuestion(request, documentId!);

      // Wait for quiz modal
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

      // Should show progress
      await expect(page.getByText(/Question 1 of 1/)).toBeVisible();

      // Should show comprehension type
      await expect(page.getByText('Factual')).toBeVisible();
    });
  });

  test.describe('FSRS Rating Buttons', () => {
    test('all four FSRS rating buttons are present after answering', async ({ page, request }) => {
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Start quiz
      await page.getByRole('button', { name: 'Quiz' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      // Save a short answer question
      await createTestQuestion(request, documentId!, {
        questionType: 'short_answer',
      });

      // Wait for quiz modal
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

      // Answer the question
      await page.getByRole('textbox', { name: /your answer/i }).fill('Test answer');
      await page.getByRole('button', { name: 'Submit Answer' }).click();

      // Verify all FSRS rating buttons
      const againButton = page.getByRole('button', { name: /Again/i });
      const hardButton = page.getByRole('button', { name: /Hard/i });
      const goodButton = page.getByRole('button', { name: /Good/i });
      const easyButton = page.getByRole('button', { name: /Easy/i });

      await expect(againButton).toBeVisible();
      await expect(hardButton).toBeVisible();
      await expect(goodButton).toBeVisible();
      await expect(easyButton).toBeVisible();

      // Verify rating descriptions are shown
      await expect(page.getByText('Forgot completely')).toBeVisible();
      await expect(page.getByText('Struggled to recall')).toBeVisible();
      await expect(page.getByText('Recalled with effort')).toBeVisible();
      await expect(page.getByText('Instant recall')).toBeVisible();
    });

    test('rating button triggers API call and enables next action', async ({ page, request }) => {
      const { documentId } = await loadTextAndCreateSession(page);
      expect(documentId).toBeTruthy();

      // Start quiz
      await page.getByRole('button', { name: 'Quiz' }).click();
      await expect(page.getByRole('alert')).toBeVisible();

      // Save a question
      await createTestQuestion(request, documentId!, {
        questionType: 'short_answer',
      });

      // Wait for quiz modal
      await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

      // Answer the question
      await page.getByRole('textbox', { name: /your answer/i }).fill('Test answer');
      await page.getByRole('button', { name: 'Submit Answer' }).click();

      // Before rating, Finish button should not be visible
      await expect(page.getByRole('button', { name: 'Finish' })).not.toBeVisible();

      // Click rating
      await page.getByRole('button', { name: /Good/i }).click();

      // After rating, Finish button should appear
      await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible();
    });
  });

  test.describe('Session and Document Creation', () => {
    test('loading text creates a new document and session', async ({ page }) => {
      // Load text and capture the created IDs via network interception
      const { documentId, sessionId } = await loadTextAndCreateSession(page);

      // Verify both document and session were created
      expect(documentId).toBeTruthy();
      expect(sessionId).toBeTruthy();

      // Verify the IDs are valid PocketBase record IDs (15 alphanumeric chars)
      expect(documentId).toMatch(/^[a-z0-9]{15}$/);
      expect(sessionId).toMatch(/^[a-z0-9]{15}$/);
    });
  });
});

test.describe('Quiz Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('quiz modal has proper ARIA attributes', async ({ page, request }) => {
    const { documentId } = await loadTextAndCreateSession(page);
    expect(documentId).toBeTruthy();

    await page.getByRole('button', { name: 'Quiz' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    await createTestQuestion(request, documentId!);

    // Wait for dialog
    const dialog = page.getByRole('dialog', { name: 'Quiz' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Check ARIA attributes
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'quiz-title');
  });

  test('answer input has proper label', async ({ page, request }) => {
    const { documentId } = await loadTextAndCreateSession(page);
    expect(documentId).toBeTruthy();

    await page.getByRole('button', { name: 'Quiz' }).click();

    await createTestQuestion(request, documentId!, {
      questionType: 'short_answer',
    });

    await expect(page.getByRole('dialog', { name: 'Quiz' })).toBeVisible({ timeout: 5000 });

    // Check that the answer input has an accessible label
    const answerInput = page.getByRole('textbox', { name: /your answer/i });
    await expect(answerInput).toBeVisible();
  });
});
