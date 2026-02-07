import { ProfileSchema } from '../models/ProfileModel.js'
import { getTodaysDate } from './Util.js'
import { defaultLastTestDate, defaultLastMessageReadDate, defaultTestsPerDay } from '../config.js';

export const getProfile = async (userId, profilesDBConnection) => {
  const profileModel = profilesDBConnection.model("Profile", ProfileSchema);
  var profile = await profileModel.findOne({ userId: userId });
  // console.log(`getProfile userId=${userId}, profile=${JSON.stringify(profile,2,null)}`);
  if (profile == null) {
    const newProfile =
    {
      userId: userId.trim(),
      userPreferredName: '',
      isAdmin: false,
      testsPerDay: defaultTestsPerDay,
      lastTestDate: defaultLastTestDate,
      firstVisitDate: getTodaysDate(),
      lastVisitDate: getTodaysDate(),
      lastMessagesReadDate: defaultLastMessageReadDate
    }
    profile = await profileModel.create(newProfile);
  }
  return profile;
}

export const updateProfile = async (userId, profilesDBConnection, updates) => {
  const profileModel = profilesDBConnection.model("Profile", ProfileSchema);

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

export const updateProfileLastTestDate = async (userId, profilesDBConnection) => {
  const Profile = profilesDBConnection.model("Profile", ProfileSchema);
  const profile = await Profile.findOne({ userId });
  profile.lastTestDate = getTodaysDate();
  await profile.save();
}

export const profileCount = async(profilesDBConnection) => {
  const profileModel = profilesDBConnection.model("Profile", ProfileSchema);
  var count = await profileModel.countDocuments({});
  return count;
}
