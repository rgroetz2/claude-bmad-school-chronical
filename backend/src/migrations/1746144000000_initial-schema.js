/* eslint-disable */
/**
 * node-pg-migrate migration — Initial Schema
 * Creates all tables for SchoolCronicle v1.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = function (pgm) {
  // ── ENUMS ───────────────────────────────────────────────────────────────────
  pgm.sql(`CREATE TYPE users_role_enum AS ENUM ('teacher', 'coordinator', 'admin')`);
  pgm.sql(`CREATE TYPE contributions_status_enum AS ENUM ('draft', 'submitted')`);

  // ── users ───────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "users" (
      "id"                    UUID DEFAULT gen_random_uuid() NOT NULL,
      "username"              VARCHAR(100) NOT NULL,
      "email"                 VARCHAR(255) NOT NULL,
      "password_hash"         VARCHAR(255) NOT NULL,
      "role"                  users_role_enum NOT NULL DEFAULT 'teacher',
      "is_active"             BOOLEAN NOT NULL DEFAULT true,
      "force_password_change" BOOLEAN NOT NULL DEFAULT false,
      "created_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at"            TIMESTAMPTZ,
      CONSTRAINT "PK_users" PRIMARY KEY ("id")
    )
  `);
  pgm.sql(`CREATE UNIQUE INDEX "UQ_users_username" ON "users" ("username") WHERE deleted_at IS NULL`);
  pgm.sql(`CREATE UNIQUE INDEX "UQ_users_email"    ON "users" ("email")    WHERE deleted_at IS NULL`);

  // ── schools ─────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "schools" (
      "id"         UUID DEFAULT gen_random_uuid() NOT NULL,
      "name"       VARCHAR(255) NOT NULL,
      "city"       VARCHAR(100) NOT NULL,
      "is_active"  BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "PK_schools" PRIMARY KEY ("id")
    )
  `);

  // ── persons ─────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "persons" (
      "id"             UUID DEFAULT gen_random_uuid() NOT NULL,
      "first_name"     VARCHAR(100) NOT NULL,
      "last_name"      VARCHAR(100) NOT NULL,
      "school_id"      UUID NOT NULL,
      "is_active"      BOOLEAN NOT NULL DEFAULT true,
      "anonymised_at"  TIMESTAMPTZ,
      "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at"     TIMESTAMPTZ,
      CONSTRAINT "PK_persons" PRIMARY KEY ("id"),
      CONSTRAINT "FK_persons_school" FOREIGN KEY ("school_id") REFERENCES "schools" ("id")
    )
  `);
  pgm.sql(`CREATE INDEX "IDX_persons_school" ON "persons" ("school_id")`);

  // ── appointment_types ────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "appointment_types" (
      "id"         UUID DEFAULT gen_random_uuid() NOT NULL,
      "name"       VARCHAR(100) NOT NULL,
      "is_active"  BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at" TIMESTAMPTZ,
      CONSTRAINT "PK_appointment_types" PRIMARY KEY ("id")
    )
  `);

  // ── contributions ─────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "contributions" (
      "id"                  UUID DEFAULT gen_random_uuid() NOT NULL,
      "title"               VARCHAR(255) NOT NULL,
      "description"         TEXT,
      "event_date"          DATE NOT NULL,
      "status"              contributions_status_enum NOT NULL DEFAULT 'draft',
      "appointment_type_id" UUID NOT NULL,
      "school_id"           UUID NOT NULL,
      "submitted_by"        UUID NOT NULL,
      "submitted_at"        TIMESTAMPTZ,
      "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at"          TIMESTAMPTZ,
      CONSTRAINT "PK_contributions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_contributions_appointment_type" FOREIGN KEY ("appointment_type_id") REFERENCES "appointment_types" ("id"),
      CONSTRAINT "FK_contributions_school" FOREIGN KEY ("school_id") REFERENCES "schools" ("id"),
      CONSTRAINT "FK_contributions_user" FOREIGN KEY ("submitted_by") REFERENCES "users" ("id")
    )
  `);
  pgm.sql(`CREATE INDEX "IDX_contributions_school" ON "contributions" ("school_id")`);
  pgm.sql(`CREATE INDEX "IDX_contributions_user"   ON "contributions" ("submitted_by")`);
  pgm.sql(`CREATE INDEX "IDX_contributions_status" ON "contributions" ("status")`);

  // ── contribution_persons (junction) ──────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "contribution_persons" (
      "contribution_id" UUID NOT NULL,
      "person_id"       UUID NOT NULL,
      CONSTRAINT "PK_contribution_persons" PRIMARY KEY ("contribution_id", "person_id"),
      CONSTRAINT "FK_cp_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions" ("id") ON DELETE CASCADE,
      CONSTRAINT "FK_cp_person"       FOREIGN KEY ("person_id")       REFERENCES "persons"       ("id")
    )
  `);

  // ── media_files ───────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "media_files" (
      "id"                UUID DEFAULT gen_random_uuid() NOT NULL,
      "contribution_id"   UUID NOT NULL,
      "original_filename" VARCHAR(255) NOT NULL,
      "storage_key"       VARCHAR(500),
      "mime_type"         VARCHAR(100) NOT NULL,
      "file_size_bytes"   INTEGER NOT NULL,
      "width_px"          INTEGER,
      "height_px"         INTEGER,
      "anonymised_at"     TIMESTAMPTZ,
      "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "deleted_at"        TIMESTAMPTZ,
      CONSTRAINT "PK_media_files" PRIMARY KEY ("id"),
      CONSTRAINT "FK_media_files_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions" ("id")
    )
  `);

  // ── consent_records ───────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "consent_records" (
      "id"                    UUID DEFAULT gen_random_uuid() NOT NULL,
      "user_id"               UUID NOT NULL,
      "contribution_id"       UUID NOT NULL,
      "media_file_id"         UUID NOT NULL,
      "consent_text_snapshot" TEXT NOT NULL,
      "consent_text_version"  VARCHAR(20) NOT NULL,
      "confirmed_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "ip_address"            INET,
      CONSTRAINT "PK_consent_records" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_consent_media_file" UNIQUE ("media_file_id"),
      CONSTRAINT "FK_consent_user"        FOREIGN KEY ("user_id")        REFERENCES "users"         ("id"),
      CONSTRAINT "FK_consent_contribution" FOREIGN KEY ("contribution_id") REFERENCES "contributions" ("id"),
      CONSTRAINT "FK_consent_media_file"  FOREIGN KEY ("media_file_id")  REFERENCES "media_files"   ("id")
    )
  `);

  // ── audit_logs ────────────────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "audit_logs" (
      "id"          UUID DEFAULT gen_random_uuid() NOT NULL,
      "user_id"     UUID,
      "action"      VARCHAR(100) NOT NULL,
      "entity_type" VARCHAR(100) NOT NULL,
      "entity_id"   UUID,
      "metadata"    JSONB,
      "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
    )
  `);
  pgm.sql(`CREATE INDEX "IDX_audit_logs_user"   ON "audit_logs" ("user_id")`);
  pgm.sql(`CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id")`);

  // ── password_reset_tokens ─────────────────────────────────────────────────────
  pgm.sql(`
    CREATE TABLE "password_reset_tokens" (
      "id"         UUID DEFAULT gen_random_uuid() NOT NULL,
      "user_id"    UUID NOT NULL,
      "token_hash" VARCHAR(255) NOT NULL,
      "expires_at" TIMESTAMPTZ NOT NULL,
      "used_at"    TIMESTAMPTZ,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
      CONSTRAINT "FK_prt_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    )
  `);
  pgm.sql(`CREATE INDEX "IDX_password_reset_tokens_hash" ON "password_reset_tokens" ("token_hash")`);

  // ── Seed: appointment types ───────────────────────────────────────────────────
  pgm.sql(`
    INSERT INTO "appointment_types" ("name") VALUES
      ('Schulausflug'),
      ('Preisverleihung'),
      ('Sportveranstaltung'),
      ('Kulturveranstaltung'),
      ('Schulfest'),
      ('Abiturfeier'),
      ('Sonstiges')
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = function (pgm) {
  pgm.sql(`DROP TABLE IF EXISTS "password_reset_tokens"`);
  pgm.sql(`DROP TABLE IF EXISTS "audit_logs"`);
  pgm.sql(`DROP TABLE IF EXISTS "consent_records"`);
  pgm.sql(`DROP TABLE IF EXISTS "media_files"`);
  pgm.sql(`DROP TABLE IF EXISTS "contribution_persons"`);
  pgm.sql(`DROP TABLE IF EXISTS "contributions"`);
  pgm.sql(`DROP TABLE IF EXISTS "appointment_types"`);
  pgm.sql(`DROP TABLE IF EXISTS "persons"`);
  pgm.sql(`DROP TABLE IF EXISTS "schools"`);
  pgm.sql(`DROP TABLE IF EXISTS "users"`);
  pgm.sql(`DROP TYPE IF EXISTS "contributions_status_enum"`);
  pgm.sql(`DROP TYPE IF EXISTS "users_role_enum"`);
};
