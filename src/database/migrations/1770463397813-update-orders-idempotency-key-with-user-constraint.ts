import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrdersIdempotencyKeyWithUserConstraint1770463397813 implements MigrationInterface {
  name = 'UpdateOrdersIdempotencyKeyWithUserConstraint1770463397813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT IF EXISTS "UQ_59d6b7756aeb6cbb43a093d15a1"`);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "orders_user_id_idempotency_key_uq"
      UNIQUE ("user_id", "idempotency_key")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP CONSTRAINT IF EXISTS "orders_user_id_idempotency_key_uq"`);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "UQ_59d6b7756aeb6cbb43a093d15a1"
      UNIQUE ("idempotency_key")`);
  }
}
