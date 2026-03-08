// backend/tools/Ping.js
import { MessageSchema } from '../models/MessageModel.js';
import { countActiveProfiles } from './UserProfile.js';
import { systemNewDay } from './SystemStatus.js';
import { getTodaysDateUTC } from './Util.js';
import { sendPlainEmail } from './email.js';
import { isDebug } from '../config.js';

/**
 * Helper to bind the Message model to the messages DB connection.
 */
function getMessageModel(messagesDBConnection) {
  return (
    messagesDBConnection.models.Message ||
    messagesDBConnection.model('Message', MessageSchema)
  );
}

/**
 * Run the daily ping:
 * - compute active subscription profiles
 * - check SystemStatus to see if this is a new UTC day
 * - if new day, insert a "ping" message + send email
 * - return the counts
 */
export async function runPing(profilesDBConnection, appDBConnection) {
  if (isDebug) console.log('[runPing] begin');

  const Message = getMessageModel(appDBConnection);

  const todayRaw = getTodaysDateUTC(); // e.g. "2026-02-21"
  const todayYyyyMmDd = todayRaw.replace(/-/g, '/');

  if (isDebug) console.log(`[runPing] today is ${todayYyyyMmDd}`);

  const isNewDay = await systemNewDay(todayRaw, appDBConnection);
  if (isDebug) console.log(`[runPing] isNewDay=${isNewDay}`);

  const activeProfiles = await countActiveProfiles(profilesDBConnection);

  if (isNewDay) {
    const now = new Date();
    const subject = `ping for ${todayYyyyMmDd}`;

    if (isDebug) console.log('[runPing] before get payloadJson');
    const payloadJson = JSON.stringify({
      activeProfiles,
    });
    if (isDebug) console.log('[runPing] after get payloadJson');
    if (isDebug) console.log(`[runPing] payloadJson=${payloadJson}`);

    const messageDoc = new Message({
      messageType: 'ping',
      messageDateAndTime: now.toISOString(),
      messageFrom: '',
      messageTo: '',
      subject,
      message: payloadJson,
    });

    await messageDoc.save();

    if (isDebug) console.log('[runPing] before sending email');
    await sendPlainEmail({
      to: 'progspanlrn@gmail.com',
      subject: 'ping',
      message: payloadJson,
    });
    if (isDebug) console.log('[runPing] after sending email');
  }

  if (isDebug) console.log('[runPing] end');

  return {
    activeProfiles,
  };
}