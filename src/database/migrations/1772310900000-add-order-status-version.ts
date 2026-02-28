import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStatusVersion1772310900000 implements MigrationInterface {
  name = 'AddOrderStatusVersion1772310900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "status_version" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "status_version"
    `);
  }
}

