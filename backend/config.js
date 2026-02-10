import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 8080;
export const IS_DEV = process.env.NODE_ENV !== 'production';

const {
  ATLAS_USER,
  ATLAS_PASS,
  ATLAS_HOST,
  ATLAS_APP_NAME,
  USE_ATLAS,
} = process.env;

const encodedUser = encodeURIComponent(ATLAS_USER);
const encodedPass = encodeURIComponent(ATLAS_PASS);

const atlasBase = `mongodb+srv://${encodedUser}:${encodedPass}@${ATLAS_HOST}`;
const atlasOptions = `retryWrites=true&w=majority&appName=${ATLAS_APP_NAME}`;

const localBase = 'mongodb://localhost:27017';

const connection = USE_ATLAS === 'true' ? atlasBase : localBase;

export const profilesDBURL     = `${connection}/learners?${atlasOptions}`;
export const spanishWordsDBURL = `${connection}/spanish?${atlasOptions}`;
export const spanishTestsDBURL = `${connection}/learning?${atlasOptions}`;
export const messagesDBURL     = `${connection}/app?${atlasOptions}`;

export const spanishTestingName = '_spanish_test';
export const englishTestingName = '_english_test';

export const defaultTestsPerDay = 20;
export const defaultLastTestDate = '1947-04-01';
export const defaultPreviousTestDate = '1947-04-01';
export const defaultLastMessageReadDate = '1947-04-01';

export const isDebug=false;