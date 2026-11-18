import { type Locator } from '@playwright/test';

/**
 * Clicks an element that is highlighted by the Joyride spotlight.
 *
 * When a tutorial step sets `spotlightClicks: true`, Joyride leaves the spotlighted area
 * uncovered by its overlay, so the click reaches the element underneath.
 */
export const clickSpotlightedElement = async (locator: Locator) => {
  await locator.click();
};
