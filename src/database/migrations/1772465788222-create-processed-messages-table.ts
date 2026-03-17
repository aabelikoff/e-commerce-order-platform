import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProcessedMessagesTable1772465788222 implements MigrationInterface {
  name = 'CreateProcessedMessagesTable1772465788222';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "processed_messages" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "message_id" uuid NOT NULL,
      "processed_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
      "handler" character varying,
      "order_id" uuid NOT NULL,
      CONSTRAINT "UQ_e357ddfac536c6c9708130ec3bc" UNIQUE ("message_id"),
      CONSTRAINT "PK_61d06681389f1e78ca233e08d55" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD "processed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'paid', 'shipped', 'cancelled', 'processed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);

    await queryRunner.query(
      `ALTER TABLE "processed_messages" ADD CONSTRAINT "FK_7654836ab3cbee1299680cd9ee8" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "processed_messages" DROP CONSTRAINT "FK_7654836ab3cbee1299680cd9ee8"`,
    );

    await queryRunner.query(
      `UPDATE "orders" SET "status" = 'pending' WHERE "status" = 'processed'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum_old" AS ENUM('pending', 'paid', 'shipped', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`,
    );

    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "processed_at"`);
    await queryRunner.query(`DROP TABLE "processed_messages"`);
  }
}
