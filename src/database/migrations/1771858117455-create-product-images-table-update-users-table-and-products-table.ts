import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductImagesTableUpdateUsersTableAndProductsTable1771858117455 implements MigrationInterface {
  name =
    'CreateProductImagesTableUpdateUsersTableAndProductsTable1771858117455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "file_id" uuid NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_product_images_product_file" UNIQUE ("product_id", "file_id"), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar_file_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_65eb1fa7df7811daaec973798ce" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_d6ca02cfa964211c9d256f3b9d2" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_images_product_id" ON "product_images" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_images_file_id" ON "product_images" ("file_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_product_images_file_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_product_images_product_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_d6ca02cfa964211c9d256f3b9d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_65eb1fa7df7811daaec973798ce"`,
    );

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_file_id"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}
