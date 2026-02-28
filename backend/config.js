import dotenv from 'dotenv';
dotenv.config();

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
export const appDBURL          = `${connection}/app?${atlasOptions}`;

export const spanishTestingName = '_spanish_test';
export const englishTestingName = '_english_test';

export const defaultTestsPerDay = 20;
export const defaultLastTestDate = '1947-04-01';
export const defaultLastTestTime = '00:00:00';
export const defaultPreviousTestDate = '1947-04-01';
export const defaultLastMessageReadDate = '1947-04-01';

export const isDebug=false;

export const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY;
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
export const STRIPE_PRICE_ID        = process.env.STRIPE_PRICE_ID;

export const SENDGRID_API_KEY   = process.env.SENDGRID_API_KEY;
export const SENDGRID_EMAIL_FROM = process.env.SENDGRID_EMAIL_FROM;

export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

export const isProd = false;
export const PORT = isProd?'':8080;

