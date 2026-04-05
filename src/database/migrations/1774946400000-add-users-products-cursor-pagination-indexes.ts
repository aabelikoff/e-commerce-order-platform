import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersProductsCursorPaginationIndexes1774946400000 implements MigrationInterface {
  name = 'AddUsersProductsCursorPaginationIndexes1774946400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_created_at_id_desc" ON "users" ("created_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_created_at_id_desc" ON "products" ("created_at" DESC, "id" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_created_at_id_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_created_at_id_desc"`,
    );
  }
}
