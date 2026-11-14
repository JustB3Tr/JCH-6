-- Run AFTER `prisma db push`. Backfills the new columns and tables and adds
-- integrity checks Prisma cannot express. Safe to re-run.

BEGIN;

-- Thread access is now decided by ThreadMember alone, so give every existing
-- community member a row for their community's threads.
INSERT INTO "ThreadMember" ("threadId", "userId", "joinedAt", "lastReadAt")
SELECT t."id", m."userId", m."joinedAt", now()
FROM "ChatThread" t
JOIN "Membership" m ON m."communityId" = t."communityId"
WHERE t."kind" = 'community'
ON CONFLICT DO NOTHING;

INSERT INTO "ThreadMember" ("threadId", "userId", "joinedAt", "lastReadAt")
SELECT t."id", t."createdById", t."createdAt", now()
FROM "ChatThread" t
WHERE t."kind" <> 'community' AND t."createdById" IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE "ChatThread" t SET "lastMessageAt" = s.latest
FROM (SELECT "threadId", max("createdAt") AS latest FROM "ChatMessage" GROUP BY 1) s
WHERE s."threadId" = t."id" AND t."lastMessageAt" IS DISTINCT FROM s.latest;

UPDATE "AiChat" c SET "updatedAt" = s.latest
FROM (SELECT "chatId", max("createdAt") AS latest FROM "AiMessage" GROUP BY 1) s
WHERE s."chatId" = c."id" AND c."updatedAt" < s.latest;

UPDATE "Place" p SET "ratingAvg" = s.avg, "ratingCount" = s.n
FROM (
  SELECT "placeId", avg("rating")::float8 AS avg, count(*)::int AS n
  FROM "Feedback" WHERE "placeId" IS NOT NULL GROUP BY 1
) s
WHERE s."placeId" = p."id";

ALTER TABLE "Feedback" DROP CONSTRAINT IF EXISTS "Feedback_rating_range";
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "Place" DROP CONSTRAINT IF EXISTS "Place_coordinates_range";
ALTER TABLE "Place" ADD CONSTRAINT "Place_coordinates_range"
  CHECK ("lat" BETWEEN -90 AND 90 AND "lng" BETWEEN -180 AND 180);

ALTER TABLE "Event" DROP CONSTRAINT IF EXISTS "Event_ends_after_start";
ALTER TABLE "Event" ADD CONSTRAINT "Event_ends_after_start"
  CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");

COMMIT;

ANALYZE;
