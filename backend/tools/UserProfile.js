import { ProfileSchema } from '../models/ProfileModel.js';
import { getTodaysDate } from './Util.js';
import {
  defaultLastTestDate,
  defaultLastMessageReadDate,
  defaultTestsPerDay,
} from '../config.js';

/**
 * Internal helper: ensure a profile document always has a
 * `subscription` subdocument, even for records created before
 * we added that field to the schema.
 */
const ensureSubscriptionBlock = async (profile) => {
  if (!profile.subscription) {
    profile.subscription = { status: 'none' };
    await profile.save();
  }
  return profile;
};

export const getProfile = async (userId, profilesDBConnection) => {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('getProfile: userId is missing or invalid');
    }

    const trimmedUserId = userId.trim();

    // ✅ SAFE REGISTRATION:
    // This looks for the model on the connection first. 
    // If it's not found, it registers it using your ProfileSchema.
    const ProfileModel =
      profilesDBConnection.models.Profile ||
      profilesDBConnection.model('Profile', ProfileSchema);

    const profile = await ProfileModel.findOne({
      userId: trimmedUserId,
    }).lean();

    return profile;
  } catch (err) {
    console.error('❌ getProfile failed:', err);
    throw err;
  }
};

export const updateProfile = async (userId, profilesDBConnection, updates) => {
  const profileModel = profilesDBConnection.model('Profile', ProfileSchema);

  // 🔥 Strip immutable fields
  const { _id, __v, userId: ignoredUserId, ...safeUpdates } = updates;

  try {
    const updatedProfile = await profileModel.findOneAndUpdate(
      { userId },
      { $set: safeUpdates },
      { new: true }
    );

    return { status: 200, data: updatedProfile };
  } catch (err) {
    console.error('💥 Error updating the profile:', err);
    throw err;
  }
};

export const updateProfileLastTestDate = async (
  userId,
  profilesDBConnection
) => {
  const Profile = profilesDBConnection.model('Profile', ProfileSchema);
  const profile = await Profile.findOne({ userId });
  profile.lastTestDate = getTodaysDate();
  await profile.save();
};

export const profileCount = async (profilesDBConnection) => {
  const profileModel = profilesDBConnection.model('Profile', ProfileSchema);
  const count = await profileModel.countDocuments({});
  return count;
};

/**
 * Set subscription fields for a user.
 *
 * This is useful later for:
 *  - Stripe webhooks (checkout.session.completed, etc.)
 *  - Admin tools to manually mark someone as active/canceled
 *
 * Pass only the fields you want to change in `subscriptionUpdates`.
 * Example:
 *  await setSubscriptionInfo(userId, conn, {
 *    status: 'active',
 *    plan: 'monthly',
 *    stripeCustomerId: 'cus_123',
 *    stripeSubscriptionId: 'sub_456',
 *    currentPeriodEnd: new Date(....),
 *  });
 */
export const setSubscriptionInfo = async (
  userId,
  profilesDBConnection,
  subscriptionUpdates
) => {
  const Profile = profilesDBConnection.model('Profile', ProfileSchema);

  // Build a $set object only with defined fields
  const setDoc = {};

  if (subscriptionUpdates.status !== undefined) {
    setDoc['subscription.status'] = subscriptionUpdates.status;
  }
  if (subscriptionUpdates.plan !== undefined) {
    setDoc['subscription.plan'] = subscriptionUpdates.plan;
  }
  if (subscriptionUpdates.stripeCustomerId !== undefined) {
    setDoc['subscription.stripeCustomerId'] =
      subscriptionUpdates.stripeCustomerId;
  }
  if (subscriptionUpdates.stripeSubscriptionId !== undefined) {
    setDoc['subscription.stripeSubscriptionId'] =
      subscriptionUpdates.stripeSubscriptionId;
  }
  if (subscriptionUpdates.currentPeriodEnd !== undefined) {
    setDoc['subscription.currentPeriodEnd'] =
      subscriptionUpdates.currentPeriodEnd;
  }

  // Always bump lastEventAt when we explicitly touch subscription info
  setDoc['subscription.lastEventAt'] =
    subscriptionUpdates.lastEventAt || new Date();

  const updatedProfile = await Profile.findOneAndUpdate(
    { userId },
    { $set: setDoc },
    { new: true }
  );

  return updatedProfile;
};
