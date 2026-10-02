import type { SQLiteDatabase } from 'expo-sqlite';
import type { DashboardCardType } from '@/constants/enums';
import type { DashboardCardConfig } from '@/domain/models';

type CardRow = Omit<DashboardCardConfig, 'enabled'> & { enabled: number };

const toModel = (row: CardRow): DashboardCardConfig => ({ ...row, enabled: row.enabled === 1 });

/** Which dashboard cards exist, their order and whether they are shown. */
export class DashboardCardRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async list(): Promise<DashboardCardConfig[]> {
    const rows = await this.db.getAllAsync<CardRow>(
      'SELECT id, card_type AS cardType, position, enabled FROM dashboard_cards ORDER BY position, id',
    );
    return rows.map(toModel);
  }

  async insertIfAbsent(cardType: DashboardCardType, position: number): Promise<void> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO dashboard_cards (card_type, position, enabled) VALUES (?, ?, 1)',
      cardType,
      position,
    );
  }

  async setEnabled(id: number, enabled: boolean): Promise<void> {
    await this.db.runAsync('UPDATE dashboard_cards SET enabled = ? WHERE id = ?', enabled ? 1 : 0, id);
  }

  /** Swap the positions of two cards atomically (move up / move down). */
  async swapPositions(a: DashboardCardConfig, b: DashboardCardConfig): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('UPDATE dashboard_cards SET position = ? WHERE id = ?', b.position, a.id);
      await this.db.runAsync('UPDATE dashboard_cards SET position = ? WHERE id = ?', a.position, b.id);
    });
  }
}
