import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePaymentsIdempotencyKey1773075005406 implements MigrationInterface {
  name = 'UpdatePaymentsIdempotencyKey1773075005406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" uuid`,
    );
    await queryRunner.query(
      `UPDATE "payments" SET "idempotency_key" = uuid_generate_v4() WHERE "idempotency_key" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "idempotency_key" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "UQ_payments_order_id_idempotency_key" UNIQUE ("order_id", "idempotency_key")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "UQ_payments_order_id_idempotency_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "idempotency_key"`,
    );
  }
}
