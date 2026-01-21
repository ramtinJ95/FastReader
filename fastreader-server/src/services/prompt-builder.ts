export interface PromptOptions {
  sessionId: string
  documentId: string
  count: number
}

export function buildQuestionGenerationPrompt(options: PromptOptions): string {
  return `Generate ${options.count} comprehension questions for my current FastReader session.

Instructions:
1. Use the fastreader_get_current_session tool to get the document content and reading progress
2. Use fastreader_get_question_history tool to see existing questions and avoid duplicates
3. Generate ${options.count} NEW questions that are different from existing ones
4. Save the questions using fastreader_save_questions tool with documentId: "${options.documentId}"

Question requirements:
- Include a mix of question types: multiple_choice, short_answer, and fill_in_blank
- Include different comprehension types: factual_recall, inference, and synthesis
- Vary difficulty levels: easy, medium, and hard
- For multiple choice, provide 4 options (A, B, C, D)
- Include rationale explaining why the answer is correct

IMPORTANT: You must call fastreader_save_questions to save the generated questions. Do not just output them as text.`
}
