import { MigrationInterface, QueryRunner } from 'typeorm';

export class FilesTable1771774693056 implements MigrationInterface {
  name = 'FilesTable1771774693056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."files_owner_type_enum" AS ENUM('user', 'order', 'product', 'payment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."files_status_enum" AS ENUM('pending', 'ready', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."files_visibility_enum" AS ENUM('private', 'public')`,
    );

    await queryRunner.query(
        `
        CREATE TABLE "files"
            ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "owner_type" "public"."files_owner_type_enum" NOT NULL,
            "owner_id" uuid NOT NULL,
            "uploaded_by_user_id" uuid,
            "bucket" text NOT NULL, "key" text NOT NULL,
            "mime_type" text NOT NULL,
            "size" bigint NOT NULL,
            "status" "public"."files_status_enum" NOT NULL DEFAULT 'pending',
            "original_name" text NOT NULL,
            "checksum" text,
            "visibility" "public"."files_visibility_enum" NOT NULL DEFAULT 'private',
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            "deleted_at" TIMESTAMP WITH TIME ZONE,
            CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_files_object_key" ON "files" ("bucket", "key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_files_status" ON "files" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_files_uploaded_by_user_id" ON "files" ("uploaded_by_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_files_owner" ON "files" ("owner_type", "owner_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_eae5327e9069c824467f9e746ae" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_eae5327e9069c824467f9e746ae"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_files_owner"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_files_uploaded_by_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_files_status"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_files_object_key"`);
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`DROP TYPE "public"."files_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."files_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."files_owner_type_enum"`);
  }
}
