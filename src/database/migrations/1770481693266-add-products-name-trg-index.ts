import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsNameTrgIndex1770481693266 implements MigrationInterface {
  name = 'AddProductsNameTrgIndex1770481693266';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
      ON "products" USING gin ("name" gin_trgm_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "products_name_trgm_idx"`);
  }
}
