// Caller holds the same advisory transaction lock used by completion/reminders.
export async function findOpenClaim(tx, contractNumber) {
  const rows = await tx.$queryRaw`
    SELECT sc."id", sc."ticketNumber", sc."claimSequence", sc."attachmentsJson"
    FROM "ServiceClaim" sc
    LEFT JOIN "WorkProcessing" wp ON wp."workType" = 'CLAIM' AND wp."workId" = sc."id"
    WHERE sc."contractNumber" = ${contractNumber} AND COALESCE(wp."status", 'OPEN') <> 'DONE'
    ORDER BY sc."createdAt", sc."id"
    LIMIT 2
  `;
  if (rows.length > 1) {
    throw Object.assign(new Error("This contract has several open tickets. Please contact customer service so the existing cases can be reviewed before submitting again."), { status: 409 });
  }
  return rows[0] || null;
}

export async function saveClaimSubmission(tx, payload, claim, isFollowUp) {
  const previousFiles = isFollowUp ? JSON.parse(claim.attachmentsJson || "[]") : [];
  const files = JSON.parse(payload.attachmentsJson || "[]");
  const attachmentStart = previousFiles.length;
  await tx.$executeRaw`
    INSERT INTO "ServiceClaimSubmission" ("id", "claimId", "payload", "attachmentStart")
    VALUES (${payload.id}, ${claim.id}, ${JSON.stringify(payload)}::jsonb, ${attachmentStart})
  `;
  if (isFollowUp && files.length) {
    await tx.$executeRaw`
      UPDATE "ServiceClaim" SET "attachmentsJson" = ${JSON.stringify([...previousFiles, ...files])}
      WHERE "id" = ${claim.id}
    `;
  }
  return { id: claim.id, ticketNumber: claim.ticketNumber, claimSequence: claim.claimSequence,
    submissionId: payload.id, attachmentStart, isFollowUp };
}
