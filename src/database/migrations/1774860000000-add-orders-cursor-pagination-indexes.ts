import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersCursorPaginationIndexes1774860000000 implements MigrationInterface {
  name = 'AddOrdersCursorPaginationIndexes1774860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_created_at_id_desc" ON "orders" ("created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_orders_user_id_created_at_id_desc" ON "orders" ("user_id", "created_at" DESC, "id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_user_id_created_at_id_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_orders_created_at_id_desc"`,
    );
  }
}
