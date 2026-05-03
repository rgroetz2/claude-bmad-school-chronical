import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1746144000000 implements MigrationInterface {
  name = 'InitialSchema1746144000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('teacher', 'coordinator', 'admin')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                     UUID NOT NULL DEFAULT gen_random_uuid(),
        "username"               VARCHAR(100) NOT NULL,
        "email"                  VARCHAR(255) NOT NULL,
        "password_hash"          VARCHAR(255) NOT NULL,
        "role"                   "users_role_enum" NOT NULL DEFAULT 'teacher',
        "is_active"              BOOLEAN NOT NULL DEFAULT true,
        "force_password_change"  BOOLEAN NOT NULL DEFAULT false,
        "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"             TIMESTAMPTZ,
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_username" ON "users" ("username") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL`);

    // ── schools ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "schools" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(255) NOT NULL,
        "city"       VARCHAR(255) NOT NULL,
        "is_active"  BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_schools" PRIMARY KEY ("id")
      )
    `);

    // ── persons ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "persons" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "first_name"     VARCHAR(255) NOT NULL,
        "last_name"      VARCHAR(255) NOT NULL,
        "school_id"      UUID,
        "is_active"      BOOLEAN NOT NULL DEFAULT true,
        "anonymised_at"  TIMESTAMPTZ,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ,
        CONSTRAINT "PK_persons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persons_school" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_persons_school_id" ON "persons" ("school_id")`);

    // ── appointment_types ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "appointment_types" (
        "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(255) NOT NULL,
        "is_active"  BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_appointment_types" PRIMARY KEY ("id")
      )
    `);

    // ── contributions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "contributions_status_enum" AS ENUM ('draft', 'submitted')
    `);

    await queryRunner.query(`
      CREATE TABLE "contributions" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "title"               VARCHAR(255) NOT NULL,
        "description"         TEXT NOT NULL,
        "event_date"          DATE NOT NULL,
        "appointment_type_id" UUID,
        "school_id"           UUID,
        "submitted_by"        UUID NOT NULL,
        "status"              "contributions_status_enum" NOT NULL DEFAULT 'draft',
        "submitted_at"        TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMPTZ,
        CONSTRAINT "PK_contributions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contributions_appointment_type" FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_contributions_school" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_contributions_user" FOREIGN KEY ("submitted_by") REFERENCES "users"("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_contributions_submitted_by" ON "contributions" ("submitted_by")`);
    await queryRunner.query(`CREATE INDEX "IDX_contributions_status" ON "contributions" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_contributions_event_date" ON "contributions" ("event_date")`);

    // ── contribution_persons (junction) ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "contribution_persons" (
        "contribution_id" UUID NOT NULL,
        "person_id"       UUID NOT NULL,
        CONSTRAINT "PK_contribution_persons" PRIMARY KEY ("contribution_id", "person_id"),
        CONSTRAINT "FK_cp_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_cp_person" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE
      )
    `);

    // ── media_files ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "media_files" (
        "id"                UUID NOT NULL DEFAULT gen_random_uuid(),
        "contribution_id"   UUID NOT NULL,
        "original_filename" VARCHAR(255),
        "storage_key"       VARCHAR(500),
        "mime_type"         VARCHAR(100),
        "file_size_bytes"   INTEGER,
        "width_px"          INTEGER,
        "height_px"         INTEGER,
        "anonymised_at"     TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMPTZ,
        CONSTRAINT "PK_media_files" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_files_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_media_files_contribution_id" ON "media_files" ("contribution_id")`);

    // ── consent_records ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "consent_records" (
        "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"               UUID NOT NULL,
        "contribution_id"       UUID NOT NULL,
        "media_file_id"         UUID,
        "consent_text_snapshot" TEXT NOT NULL,
        "consent_text_version"  VARCHAR(20) NOT NULL DEFAULT 'v1',
        "confirmed_at"          TIMESTAMPTZ NOT NULL,
        "ip_address"            INET,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_consent_records" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_consent_records_media_file" UNIQUE ("media_file_id"),
        CONSTRAINT "FK_consent_records_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_consent_records_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id"),
        CONSTRAINT "FK_consent_records_media_file" FOREIGN KEY ("media_file_id") REFERENCES "media_files"("id") ON DELETE SET NULL
      )
    `);

    // ── audit_logs ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     UUID,
        "action"      VARCHAR(255) NOT NULL,
        "entity_type" VARCHAR(100),
        "entity_id"   UUID,
        "metadata"    JSONB,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`);

    // ── password_reset_tokens ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"     UUID NOT NULL,
        "token_hash"  VARCHAR(255) NOT NULL,
        "expires_at"  TIMESTAMPTZ NOT NULL,
        "used_at"     TIMESTAMPTZ,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prt_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_hash" ON "password_reset_tokens" ("token_hash")`);

    // ── Seed: default appointment types ──────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "appointment_types" ("id", "name") VALUES
        (gen_random_uuid(), 'School Trip'),
        (gen_random_uuid(), 'Award Ceremony'),
        (gen_random_uuid(), 'Sports Event'),
        (gen_random_uuid(), 'Cultural Event'),
        (gen_random_uuid(), 'School Festival'),
        (gen_random_uuid(), 'Graduation'),
        (gen_random_uuid(), 'Other')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consent_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contribution_persons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contributions"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contributions_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_types"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "persons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schools"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
