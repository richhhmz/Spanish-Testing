// backend/tools/Problem.js

import { MessageSchema } from '../models/MessageModel.js';
import { sendPlainEmail } from './email.js';

export async function runProblem(appDBConnection, {
  userEmail,
  subject,
  message,
}) {
  // Bind Message model to the app DB (same pattern as Ping.js)
  const Message =
    appDBConnection.models.MessageModel ||
    appDBConnection.model('Message', MessageSchema);

  const now = new Date();

  // Save message to DB
  const doc = new Message({
    messageType: 'problem',
    messageDateAndTime: now,
    messageFrom: userEmail,
    messageTo: 'progspanlrn@gmail.com',
    subject: subject,
    message: message,
  });

  await doc.save();

  // 2️⃣ Send notification email
  try {
    await sendPlainEmail({
      to: 'progspanlrn@gmail.com',
      subject: `Problem report from ${userEmail}`,
      message: JSON.stringify(
        { userEmail: userEmail, subject: subject, message: message },
        null,
        2   // pretty print
      )
    });
  } catch (err) {
    console.error('[runProblem] email send failed:', err);
  // We do NOT throw — DB insert already succeeded.
  }

  // 3️⃣ Return minimal result (like Ping.js pattern)
  return {
    ok: true,
    id: doc._id.toString(),
  };
}