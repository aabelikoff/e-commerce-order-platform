import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserWithPasswordRolesScopes1771440944225 implements MigrationInterface {
    name = 'UpdateUserWithPasswordRolesScopes1771440944225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "roles" text array NOT NULL DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "users" ADD "scopes" text array NOT NULL DEFAULT ARRAY[]::text[]`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "scopes"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
    }

}
