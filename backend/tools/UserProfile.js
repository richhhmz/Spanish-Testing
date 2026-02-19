// backend/tools/UserProfile.js
import { ProfileSchema } from '../models/ProfileModel.js';
import { getTodaysDate } from './Util.js';

/**
 * Internal helper: ensure a profile document always has a
 * `subscription` subdocument.
 */
const ensureSubscriptionBlock = async (profile) => {
  if (!profile.subscription) {
    profile.subscription = { status: 'none' };
    await profile.save();
  }
  return profile;
};

/**
 * Helper to safely get the Profile model from a specific connection
 */
const getSafeProfileModel = (connection) => {
  return connection.models.Profile || connection.model('Profile', ProfileSchema);
};

export const getProfile = async (userId, profilesDBConnection) => {
  try {
    if (!userId || typeof userId !== 'string') {
      throw new Error('getProfile: userId is missing or invalid');
    }

    const trimmedUserId = userId.trim();
    const ProfileModel = getSafeProfileModel(profilesDBConnection);

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
  const profileModel = getSafeProfileModel(profilesDBConnection);

  // Strip immutable fields
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

export const updateProfileLastTestDate = async (userId, profilesDBConnection) => {
  const ProfileModel = getSafeProfileModel(profilesDBConnection);
  const profile = await ProfileModel.findOne({ userId });
  if (profile) {
    profile.lastTestDate = getTodaysDate();
    await profile.save();
  }
};

export const profileCount = async (profilesDBConnection) => {
  const profileModel = getSafeProfileModel(profilesDBConnection);
  return await profileModel.countDocuments({});
};

export const setSubscriptionInfo = async (
  userId,
  profilesDBConnection,
  subscriptionUpdates
) => {
  const ProfileModel = getSafeProfileModel(profilesDBConnection);

  const setDoc = {};
  if (subscriptionUpdates.status !== undefined) {
    setDoc['subscription.status'] = subscriptionUpdates.status;
  }
  if (subscriptionUpdates.plan !== undefined) {
    setDoc['subscription.plan'] = subscriptionUpdates.plan;
  }
  if (subscriptionUpdates.stripeCustomerId !== undefined) {
    setDoc['subscription.stripeCustomerId'] = subscriptionUpdates.stripeCustomerId;
  }
  if (subscriptionUpdates.stripeSubscriptionId !== undefined) {
    setDoc['subscription.stripeSubscriptionId'] = subscriptionUpdates.stripeSubscriptionId;
  }
  if (subscriptionUpdates.currentPeriodEnd !== undefined) {
    setDoc['subscription.currentPeriodEnd'] = subscriptionUpdates.currentPeriodEnd;
  }

  setDoc['subscription.lastEventAt'] = subscriptionUpdates.lastEventAt || new Date();

  const updatedProfile = await ProfileModel.findOneAndUpdate(
    { userId },
    { $set: setDoc },
    { new: true }
  );

  return updatedProfile;
};