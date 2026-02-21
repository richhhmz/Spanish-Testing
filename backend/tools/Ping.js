// backend/tools/Ping.js
import { MessageSchema } from '../models/MessageModel.js';
import { ProfileSchema } from '../models/ProfileModel.js';
import { getDodaysDate } from './Utils.js';
import { profileCount } from './UserProfile.js';

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
 * Helper to bind the Profile model to the profiles DB connection.
 */
function getProfileModel(profilesDBConnection) {
  return (
    profilesDBConnection.models.Profile ||
    profilesDBConnection.model('Profile', ProfileSchema)
  );
}

/**
 * Run the daily ping:
 * - compute total profile count
 * - compute active subscription profiles
 * - if today's ping not yet logged, insert a "ping" message
 * - return the counts
 */
export async function runPing(profilesDBConnection, appDBConnection) {
  const Message = getMessageModel(appDBConnection);
  const Profile = getProfileModel(profilesDBConnection);

  // Your existing "today" helper
  const todayRaw = getDodaysDate();

  // Normalize to yyyy/mm/dd for subject + search key
  const todayYyyyMmDd = todayRaw.replace(/-/g, '/');

  // Check if there is already a ping message for today's date.
  // messageDateAndTime is a date+time string, so we just match on the date prefix.
  const existingPing = await Message.findOne({
    messageType: 'ping',
    messageDateAndTime: { $regex: `^${todayYyyyMmDd}` },
  });

  // Active subscription profiles
  const activeProfiles = await Profile.countDocuments({
    'subscription.status': 'active',
  });

  // Only insert a new message if we haven't logged today's ping yet
  if (!existingPing) {
    const now = new Date();
    const timePart = now.toTimeString().split(' ')[0]; // "HH:MM:SS"

    const messageDoc = new Message({
      messageNew: '',
      messageType: 'ping',        // ping
      messageDateAndTime: `${todayYyyyMmDd} ${timePart}`, // yyyy/mm/dd HH:MM:SS
      messageFrom: '',            // blank as requested
      messageTo: '',              // blank as requested
      subject: `ping for ${todayYyyyMmDd}`, // subject "ping for yyyy/mm/dd"
      message: JSON.stringify({
        activeProfiles, // JSON format: { "activeProfiles": <number> }
      }),
    });

    await messageDoc.save();
  }

  return {
    activeProfileCount: activeProfiles
  };
}