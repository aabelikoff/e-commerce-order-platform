import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOutboxEventsTable1772469000000
  implements MigrationInterface
{
  name = 'CreateOutboxEventsTable1772469000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."outbox_events_status_enum" AS ENUM('pending', 'sent', 'failed')`,
    );

    await queryRunner.query(
      `CREATE TABLE "outbox_events" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "aggregate_type" character varying(64) NOT NULL,
      "aggregate_id" uuid NOT NULL,
      "event_type" character varying(128) NOT NULL,
      "payload" jsonb NOT NULL,
      "status" "public"."outbox_events_status_enum" NOT NULL DEFAULT 'pending',
      "attempts" integer NOT NULL DEFAULT '0',
      "next_retry_at" TIMESTAMP WITH TIME ZONE,
      "last_error" text,
      "sent_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_6a4003c05ce2db37c3ad7784f97" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_status_next_retry_at" ON "outbox_events" ("status", "next_retry_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_events_aggregate" ON "outbox_events" ("aggregate_type", "aggregate_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_outbox_events_aggregate"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_outbox_events_status_next_retry_at"`,
    );
    await queryRunner.query(`DROP TABLE "outbox_events"`);
    await queryRunner.query(`DROP TYPE "public"."outbox_events_status_enum"`);
  }
}
