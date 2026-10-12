-- Existing unfinished work keeps its age, reminder dates and audit history.
UPDATE "WorkProcessing" SET "status" = 'OPEN', "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'IN_PROGRESS';

ALTER TABLE "WorkProcessing" DROP CONSTRAINT "WorkProcessing_status_check";
ALTER TABLE "WorkProcessing" ADD CONSTRAINT "WorkProcessing_status_check"
CHECK ("status" IN ('OPEN', 'DONE'));
