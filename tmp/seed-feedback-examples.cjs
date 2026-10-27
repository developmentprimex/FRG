const path = require('path');
require('../frontend/node_modules/dotenv').config({ path: path.join(__dirname, '../frontend/.env'), quiet: true });
const { PrismaClient } = require('../frontend/node_modules/@prisma/client');
const db = new PrismaClient();
const examples = [
  { name: 'TEST Feedback - Excellent', status: 'ANSWERED', resolved: 'YES', overallRating: 5, speedRating: 5, communicationRating: 5, comment: 'TEST: Sehr schnelle Bearbeitung. Das Problem wurde vollständig gelöst. Vielen Dank!' },
  { name: 'TEST Feedback - Good', status: 'ANSWERED', resolved: 'YES', overallRating: 4, speedRating: 3, communicationRating: 5, comment: 'TEST: Freundlicher Kontakt und gute Lösung. Die Terminvereinbarung hat etwas gedauert.' },
  { name: 'TEST Feedback - Partly resolved', status: 'ANSWERED', resolved: 'PARTLY', overallRating: 2, speedRating: 2, communicationRating: 3, comment: 'TEST: Ein Teil wurde repariert, aber die Schublade klemmt noch. Bitte erneut Kontakt aufnehmen.' },
  { name: 'TEST Feedback - Not resolved', status: 'ANSWERED', resolved: 'NO', overallRating: 1, speedRating: 1, communicationRating: 2, comment: 'TEST: Das Problem besteht weiterhin. Ich wünsche mir einen neuen Servicetermin.' },
  { name: 'TEST Feedback - Awaiting response', status: 'SENT' },
  { name: 'TEST Feedback - Email failed', status: 'FAILED' },
];
(async () => {
  if (process.env.NODE_ENV === 'production') throw Error('Demo data is for development only.');
  await db.$transaction(async tx => {
    for (let i = 0; i < examples.length; i++) {
      const item = examples[i];
      const id = `demo-feedback-example-${i + 1}`;
      const createdAt = new Date(Date.now() - (i + 2) * 86400000);
      const sentAt = new Date(createdAt.getTime() + 3600000);
      const submittedAt = new Date(sentAt.getTime() + 3600000);
      await tx.serviceClaim.upsert({ where: { id }, update: {}, create: {
        id, contractNumber: `670DEMO-FEEDBACK-${i + 1}`, claimSequence: 1,
        fullName: item.name, email: `feedback-demo-${i + 1}@example.invalid`,
        landlordContact: 'TEST DEMO', serialNumber: 'DEMO',
        problemDescription: 'TEST DEMO - Feedback display example. No real customer and no email delivery.',
        createdAt,
      } });
      await tx.workProcessing.upsert({ where: { workType_workId: { workType: 'CLAIM', workId: id } }, update: {}, create: {
        workType: 'CLAIM', workId: id, status: 'DONE', version: 1,
        completedAt: createdAt, completedBy: 'TEST DEMO',
      } });
      const { name, ...feedback } = item;
      await tx.claimFeedbackInvitation.upsert({ where: { claimId_completionVersion: { claimId: id, completionVersion: 1 } }, update: {}, create: {
        id: `${id}-invitation`, claimId: id, completionVersion: 1,
        recipientEmail: `feedback-demo-${i + 1}@example.invalid`,
        ...feedback, createdAt, attemptedAt: sentAt,
        sentAt: item.status !== 'FAILED' ? sentAt : null,
        submittedAt: item.status === 'ANSWERED' ? submittedAt : null,
        error: item.status === 'FAILED' ? 'TEST DEMO: Simulated email failure. No email was sent.' : null,
        tokenHash: null, expiresAt: null,
      } });
    }
  });
  const rows = await db.claimFeedbackInvitation.findMany({ where: { claimId: { in: examples.map((_, i) => `demo-feedback-example-${i + 1}`) } }, select: { status: true, overallRating: true, resolved: true } });
  console.log(JSON.stringify({ examples: rows.length, responses: rows.filter(r => r.status === 'ANSWERED').length, attention: rows.filter(r => r.status === 'ANSWERED' && (r.resolved !== 'YES' || r.overallRating <= 2)).length, emailsSentByScript: 0 }));
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
