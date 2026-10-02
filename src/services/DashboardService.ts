import { ConfigKey } from '@/config/configDefinitions';
import type { ConfigService } from '@/config/ConfigService';
import type { WeightUnit } from '@/constants/enums';
import type { DashboardCardRepository } from '@/db/repositories/DashboardCardRepository';
import type { WorkoutRepository } from '@/db/repositories/WorkoutRepository';
import { CARD_CATALOG } from '@/domain/cardCatalog';
import { daysAgo, lastDayKeys, startOfDayKey, weekdayLabel } from '@/domain/dates';
import type { DashboardCardConfig } from '@/domain/models';
import { type Averages, computeAverages, type PersonalBest, personalBests, volumeByDay } from '@/domain/stats';
import type { Affirmation, AffirmationService } from './AffirmationService';
import type { ExerciseLibraryService } from './ExerciseLibraryService';

/** Rolling window shown by the weekly cards (a calendar-week choice would be a locale setting). */
const WEEK_DAYS = 7;

export interface PersonalBestWithName extends PersonalBest {
  exerciseName: string;
}

/** Everything the dashboard cards need, loaded in one pass. */
export interface DashboardData {
  weightUnit: WeightUnit;
  affirmation: Affirmation;
  goalDays: number;
  workoutDaysThisWeek: number;
  volume: { labels: string[]; valuesKg: number[] };
  personalBests: PersonalBestWithName[];
  averages: Averages;
  averagesWindowDays: number;
}

export class DashboardService {
  constructor(
    private readonly workouts: WorkoutRepository,
    private readonly cards: DashboardCardRepository,
    private readonly library: ExerciseLibraryService,
    private readonly affirmations: AffirmationService,
    private readonly config: ConfigService,
  ) {}

  /** Idempotent: adds any catalog card the database does not have yet. */
  async ensureCards(): Promise<void> {
    for (let i = 0; i < CARD_CATALOG.length; i += 1) {
      await this.cards.insertIfAbsent(CARD_CATALOG[i].type, i);
    }
  }

  listCards(): Promise<DashboardCardConfig[]> {
    return this.cards.list();
  }

  setCardEnabled(id: number, enabled: boolean): Promise<void> {
    return this.cards.setEnabled(id, enabled);
  }

  /** Move a card one place up (-1) or down (+1) in the list. */
  async moveCard(card: DashboardCardConfig, direction: -1 | 1): Promise<void> {
    const all = await this.cards.list();
    const index = all.findIndex((c) => c.id === card.id);
    const neighbour = all[index + direction];
    if (index < 0 || !neighbour) return;
    await this.cards.swapPositions(all[index], neighbour);
  }

  async load(now: number = Date.now()): Promise<DashboardData> {
    const maxRepsFor1rm = this.config.getNumber(ConfigKey.StatsMaxRepsFor1rm);
    const lookbackDays = this.config.getNumber(ConfigKey.DashboardLookbackDays);
    const pbCount = this.config.getNumber(ConfigKey.DashboardPbCount);
    const dayKeys = lastDayKeys(WEEK_DAYS, now);

    const [weekSets, windowSets, allSets, workoutDays, exercises, affirmation] = await Promise.all([
      this.workouts.slimSetsSince(startOfDayKey(dayKeys[0])),
      this.workouts.slimSetsSince(daysAgo(lookbackDays, now)),
      this.workouts.allSlimSets(),
      this.workouts.countWorkoutDaysSince(dayKeys[0]),
      this.library.listAll(),
      this.affirmations.today(now),
    ]);

    const names = new Map(exercises.map((e) => [e.id, e.name]));
    const bests = personalBests(allSets, maxRepsFor1rm)
      .slice(0, pbCount)
      .map((pb) => ({ ...pb, exerciseName: names.get(pb.exerciseId) ?? 'Unknown exercise' }));

    return {
      weightUnit: this.config.getString<WeightUnit>(ConfigKey.UnitsWeight),
      affirmation,
      goalDays: this.config.getNumber(ConfigKey.GoalWeeklyWorkoutDays),
      workoutDaysThisWeek: workoutDays,
      volume: { labels: dayKeys.map(weekdayLabel), valuesKg: volumeByDay(weekSets, dayKeys) },
      personalBests: bests,
      averages: computeAverages(windowSets),
      averagesWindowDays: lookbackDays,
    };
  }
}
