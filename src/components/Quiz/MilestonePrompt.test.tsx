import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestonePrompt } from './MilestonePrompt';

describe('MilestonePrompt', () => {
  it('displays milestone percentage', () => {
    render(
      <MilestonePrompt
        milestonePercent={50}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays the ready for quiz message', () => {
    render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('Ready for a quiz?')).toBeInTheDocument();
  });

  it('calls onGenerateQuiz when button clicked', async () => {
    const user = userEvent.setup();
    const onGenerateQuiz = vi.fn();
    render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={onGenerateQuiz}
        onDismiss={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /generate quiz/i }));
    expect(onGenerateQuiz).toHaveBeenCalled();
  });

  it('calls onDismiss when later clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    await user.click(screen.getByRole('button', { name: /later/i }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has role alert for accessibility', () => {
    render(
      <MilestonePrompt
        milestonePercent={75}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders different milestone percentages correctly', () => {
    const { rerender } = render(
      <MilestonePrompt
        milestonePercent={25}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('25%')).toBeInTheDocument();

    rerender(
      <MilestonePrompt
        milestonePercent={100}
        onGenerateQuiz={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
