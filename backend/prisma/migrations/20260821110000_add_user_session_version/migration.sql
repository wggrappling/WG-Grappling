-- Add a monotonic session version so critical account changes invalidate existing JWTs.
ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
