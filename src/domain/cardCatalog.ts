import { DashboardCardType } from '@/constants/enums';

/**
 * Metadata for every dashboard card type. The array ORDER is the default order
 * a fresh install gets. Rendering lives in the UI layer; this file is pure data
 * so the services (seeding) and the manage screen can both use it.
 */
export interface CardCatalogEntry {
  type: DashboardCardType;
  title: string;
  description: string;
}

export const CARD_CATALOG: readonly CardCatalogEntry[] = [
  {
    type: DashboardCardType.Affirmation,
    title: 'Daily affirmation',
    description: 'A short encouragement for today (the first version of the Virtual Coach).',
  },
  {
    type: DashboardCardType.WeeklyGoalGauge,
    title: 'Weekly goal',
    description: 'Workout days in the last 7 days against your goal.',
  },
  {
    type: DashboardCardType.WeeklyVolumeChart,
    title: 'Volume this week',
    description: 'Total weight lifted per day for the last 7 days.',
  },
  {
    type: DashboardCardType.PersonalBests,
    title: 'Personal bests',
    description: 'Your best recent lifts and efforts, by exercise.',
  },
  {
    type: DashboardCardType.Averages,
    title: 'Averages',
    description: 'Average reps, weight and time per set over your selected window.',
  },
  {
    type: DashboardCardType.AiGuidance,
    title: 'Where to focus next',
    description: 'AI guidance based on your history (coming in a later phase).',
  },
];

export function catalogEntry(type: DashboardCardType): CardCatalogEntry | undefined {
  return CARD_CATALOG.find((c) => c.type === type);
}
