-- One-time upgrade for databases created before schema v2.
-- Run BEFORE `prisma db push`. Converts free-text columns to enums in place
-- (db push alone would drop and recreate them, losing data) and reshapes two
-- columns. Every block is guarded, so re-running is a no-op and a fresh
-- database can skip this file entirely.

BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlaceType') THEN
    CREATE TYPE "PlaceType" AS ENUM
      ('park','beach','trail','garden','viewpoint','plaza','market','cafe','library','museum','sports','other');
    ALTER TABLE "Place" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "Place" ALTER COLUMN "type" TYPE "PlaceType" USING (
      CASE WHEN "type" IN ('park','beach','trail','garden','viewpoint','plaza','market','cafe','library','museum','sports')
           THEN "type" ELSE 'other' END
    )::"PlaceType";
    ALTER TABLE "Place" ALTER COLUMN "type" SET DEFAULT 'other';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RsvpStatus') THEN
    CREATE TYPE "RsvpStatus" AS ENUM ('going','maybe','cant');
    ALTER TABLE "Rsvp" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Rsvp" ALTER COLUMN "status" TYPE "RsvpStatus" USING (
      CASE WHEN "status" IN ('going','maybe','cant') THEN "status" ELSE 'going' END
    )::"RsvpStatus";
    ALTER TABLE "Rsvp" ALTER COLUMN "status" SET DEFAULT 'going';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberRole') THEN
    CREATE TYPE "MemberRole" AS ENUM ('member','organizer');
    ALTER TABLE "Membership" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "Membership" ALTER COLUMN "role" TYPE "MemberRole" USING (
      CASE WHEN "role" = 'organizer' THEN 'organizer' ELSE 'member' END
    )::"MemberRole";
    ALTER TABLE "Membership" ALTER COLUMN "role" SET DEFAULT 'member';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ThreadKind') THEN
    CREATE TYPE "ThreadKind" AS ENUM ('direct','group','community');
    ALTER TABLE "ChatThread" ALTER COLUMN "kind" DROP DEFAULT;
    ALTER TABLE "ChatThread" ALTER COLUMN "kind" TYPE "ThreadKind" USING (
      CASE WHEN "kind" IN ('direct','group','community') THEN "kind" ELSE 'group' END
    )::"ThreadKind";
    ALTER TABLE "ChatThread" ALTER COLUMN "kind" SET DEFAULT 'community';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageRole') THEN
    CREATE TYPE "MessageRole" AS ENUM ('user','assistant');
    ALTER TABLE "AiMessage" ALTER COLUMN "role" TYPE "MessageRole" USING (
      CASE WHEN "role" = 'assistant' THEN 'assistant' ELSE 'user' END
    )::"MessageRole";
  END IF;
END $$;

-- Communities used an emoji as their badge; they now use an icon key and tint.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Community' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'users';
    ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "tint" TEXT NOT NULL DEFAULT 'blue';
    UPDATE "Community" SET
      "icon" = CASE "emoji"
        WHEN '🥾' THEN 'mountain' WHEN '🌅' THEN 'sunset' WHEN '🧺' THEN 'basket'
        WHEN '🐕' THEN 'dog' ELSE 'users' END,
      "tint" = CASE "emoji"
        WHEN '🥾' THEN 'green' WHEN '🌅' THEN 'orange' WHEN '🧺' THEN 'pink'
        WHEN '🐕' THEN 'brown' ELSE 'blue' END;
    ALTER TABLE "Community" DROP COLUMN "emoji";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Place' AND column_name = 'photoUrl'
  ) THEN
    ALTER TABLE "Place" RENAME COLUMN "photoUrl" TO "photoRef";
  END IF;
END $$;

COMMIT;
