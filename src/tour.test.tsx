import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDefineAppContext } from '@openmrs/esm-framework';
import { type ExtendedStep, type TutorialContext } from './types';
import RootComponent from './root.component';

// These tests render the real react-joyride component and drive the tour through the tutorial
// context, the same way the tutorial modal does.

const mockUseDefineAppContext = vi.mocked(useDefineAppContext);

const steps: ExtendedStep[] = [
  { target: '#step-one', title: 'First step', content: 'Step one content' },
  { target: '#step-two', title: 'Second step', content: 'Step two content' },
  { target: '#step-three', title: 'Third step', content: 'Step three content' },
];

function getTutorialContext() {
  const calls = mockUseDefineAppContext.mock.calls;
  return calls[calls.length - 1][1] as TutorialContext;
}

function addTarget(id: string) {
  const element = document.createElement('div');
  element.id = id;
  document.body.appendChild(element);
}

function startTour(tourSteps: ExtendedStep[] = steps) {
  act(() => {
    getTutorialContext().setSteps(tourSteps);
    getTutorialContext().setShowTutorial(true);
  });
}

async function expectStep(content: string, progress: string) {
  await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveTextContent(content), { timeout: 5000 });
  expect(screen.getByRole('alertdialog')).toHaveTextContent(progress);
}

describe('Onboarding tour', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows the first step when a tour starts', async () => {
    ['step-one', 'step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);

    startTour();

    await expectStep('Step one content', '1 of 3');
    expect(screen.getByRole('alertdialog')).toHaveTextContent('First step');
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('moves forward and back through the steps', async () => {
    const user = userEvent.setup();
    ['step-one', 'step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);
    startTour();
    await expectStep('Step one content', '1 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await expectStep('Step two content', '2 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await expectStep('Step three content', '3 of 3');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await expectStep('Step two content', '2 of 3');

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await expectStep('Step one content', '1 of 3');
  });

  it('finishes the tour from the last step and starts the next run from the first step', async () => {
    const user = userEvent.setup();
    ['step-one', 'step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);
    startTour();
    await expectStep('Step one content', '1 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await expectStep('Step two content', '2 of 3');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await expectStep('Step three content', '3 of 3');

    const finishButton = screen.getByRole('button', { name: 'Last' });
    expect(finishButton).toHaveTextContent('Finish');
    await user.click(finishButton);

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(getTutorialContext().showTutorial).toBe(false);

    startTour();
    await expectStep('Step one content', '1 of 3');
  });

  it('ends the tour when the close button is pressed and starts the next run from the first step', async () => {
    const user = userEvent.setup();
    ['step-one', 'step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);
    startTour();
    await expectStep('Step one content', '1 of 3');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await expectStep('Step two content', '2 of 3');

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(getTutorialContext().showTutorial).toBe(false);

    startTour();
    await expectStep('Step one content', '1 of 3');
  });

  it("waits for the first step's target to appear before showing the tour", async () => {
    ['step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);

    startTour();

    await waitFor(() => expect(getTutorialContext().showTutorial).toBe(false), { timeout: 5000 });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    addTarget('step-one');

    await expectStep('Step one content', '1 of 3');
    expect(getTutorialContext().showTutorial).toBe(true);
  });

  it('pauses on a step whose target is missing and resumes on that step once it appears', async () => {
    const user = userEvent.setup();
    ['step-one', 'step-three'].forEach(addTarget);
    render(<RootComponent />);
    startTour();
    await expectStep('Step one content', '1 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(getTutorialContext().showTutorial).toBe(false), { timeout: 5000 });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    addTarget('step-two');

    await expectStep('Step two content', '2 of 3');
    expect(getTutorialContext().showTutorial).toBe(true);
  });

  it('advances to the next step when the autoNextOn element appears', async () => {
    ['step-one', 'step-two', 'step-three'].forEach(addTarget);
    render(<RootComponent />);
    startTour([
      {
        ...steps[0],
        hideFooter: true,
        hideCloseButton: true,
        data: { autoNextOn: '#auto-next-trigger' },
      },
      steps[1],
      steps[2],
    ]);

    const tooltip = await screen.findByRole('alertdialog', {}, { timeout: 5000 });
    expect(tooltip).toHaveTextContent('Step one content');
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();

    addTarget('auto-next-trigger');

    await expectStep('Step two content', '2 of 3');
  });
});
