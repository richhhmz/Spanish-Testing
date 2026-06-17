// backend/tools/Partner.js

import { PartnerPaymentSchema } from '../models/PartnerPaymentModel.js';
import { StripeSchema } from '../models/StripeDataModel.js';
import { getProfile } from '../tools/UserProfile.js';
import { sendPlainEmail } from '../tools/email.js';

const partnerModels = new Map();

const defaultYearMonth = '2001-01';

let appDBConnection;
let partnerDBConnection;
let profilesDBConnection;

export async function getPartnerPayments(
  partnerProfile,
  yearMonth,
  appConn,
  partnerConn,
  profilesConn
) {
  appDBConnection = appConn;
  partnerDBConnection = partnerConn;
  profilesDBConnection = profilesConn;

  await updatePartnerPaymentsFromStripe(partnerProfile);

  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  return partnerModel
    .find({
      transactionDateAndTimeISO: {
        $gte: `${yearMonth}-00T00:00:00.000Z`,
        $lte: `${yearMonth}-99T99:99:99.999Z`,
      },
    })
    .sort({ transactionDateAndTimeISO: 1 })
    .lean();
}

export async function updatePartnerPaymentsFromStripe(partnerProfile) {
  
  const StripeModel =
    appDBConnection.models.Stripe ||
    appDBConnection.model('Stripe', StripeSchema, 'stripe_payments');

  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  const latestExisting = await partnerModel
    .findOne({})
    .sort({ transactionDateAndTimeISO: -1 })
    .lean();

  const latestExistingDate =
    latestExisting?.transactionDateAndTimeISO ||
    `${defaultYearMonth}-00T00:00:00.000Z`;

  // Do this here to avoid affecting latestExistingDate prematurely.
  await insertTestPartnerPayments(partnerProfile.partnerName);

  const newStripeRows = await StripeModel.find({
    transactionDateAndTimeISO: { $gte: latestExistingDate },
  })
    .sort({ transactionDateAndTimeISO: 1 })
    .lean();



  for (const stripeDocument of newStripeRows) {
    if (!stripeDocument.subscriberEmail) continue;

    const subscriberProfile = await getProfile(
      stripeDocument.subscriberEmail,
      profilesDBConnection
    );

    if (!subscriberProfile) continue;

    const stripePartnerName = subscriberProfile.partnerName;

    if (stripePartnerName !== partnerProfile.partnerName) continue;

    await insertPartnerPaymentFromStripe(
      partnerProfile,
      stripeDocument,
      subscriberProfile
    );
  }
}

async function insertPartnerPaymentFromStripe(
  partnerProfile,
  stripeDocument,
  subscriberProfile
) {
  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  const stripeDocumentYearMonth = getYearMonthFromISODateTime(
    stripeDocument.transactionDateAndTimeISO
  );

  const monthBegin = await getPartnerMonthBegin(
    partnerProfile.partnerName,
    stripeDocumentYearMonth
  );

  if (!monthBegin) {
    await updateMonthlyBalances(partnerProfile, stripeDocumentYearMonth);
  }

  const subscriberAmount = stripeDocument.amountPaid || 0;
  const partnerPercent = partnerProfile.partnerPercent || 0;
  const partnerAmount = Math.round(subscriberAmount * partnerPercent) / 100;

  await partnerModel.updateOne(
    {
      transactionDateAndTimeISO: stripeDocument.transactionDateAndTimeISO,
      transactionType: 'subscriberPayment',
      subscriberName: stripeDocument.subscriberEmail || '',
      partnerName: partnerProfile.partnerName,
      isTestAccount: subscriberProfile.isTestAccount,
      userPreferredName: subscriberProfile.userPreferredName,
    },
    {
      $setOnInsert: {
        transactionDateAndTimeISO: stripeDocument.transactionDateAndTimeISO,
        transactionType: 'subscriberPayment',
        subscriberAmount,
        partnerPercent,
        partnerAmount,
        subscriberEmail: stripeDocument.subscriberEmail || '',
        partnerName: partnerProfile.partnerName || '',
      },
    },
    { upsert: true }
  );
}

async function updateMonthlyBalances(partnerProfile, yearMonth) {
  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  const existingBegin = await getPartnerMonthBegin(partnerProfile.partnerName, yearMonth);
  if (existingBegin) return existingBegin;

  const previousYearMonth = await getPreviousYearMonth(partnerProfile.partnerName, yearMonth);

  let beginningBalance = 0;

  if (previousYearMonth !== defaultYearMonth) {
    beginningBalance = await getPreviousMonthBalance(
      partnerProfile,
      previousYearMonth
    );
  }

  const transactionDateAndTimeISO = `${yearMonth}-00T00:00:00.000Z`;

  await partnerModel.updateOne(
    {
      transactionDateAndTimeISO,
      transactionType: 'monthBegin',
      subscriberName: '',
      partnerName: partnerProfile.partnerName,
    },
    {
      $setOnInsert: {
        transactionDateAndTimeISO,
        transactionType: 'monthBegin',
        subscriberAmount: 0,
        partnerPercent: 0,
        partnerAmount: beginningBalance,
        partnerName: partnerProfile.partnerName,
      },
    },
    { upsert: true }
  );

  return getPartnerMonthBegin(partnerProfile.partnerName, yearMonth);
}

async function getPreviousMonthBalance(partnerProfile, previousYearMonth) {
  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  const monthEndDocument = await getPartnerMonthEnd(
    partnerProfile.partnerName,
    previousYearMonth
  );

  if (monthEndDocument) {
    return monthEndDocument.partnerAmount;
  }

  const monthBegin = await getPartnerMonthBegin(partnerProfile.partnerName, previousYearMonth);

  let balance = 0;

  if (!monthBegin) {
    await sendPlainEmail({
      to: 'support@progspanlrn.com',
      subject: 'Code Error Report',
      message: `[getPreviousMonthBalance] Unexpected missing beginning balance for partner ${partnerProfile.partnerName} and month ${previousYearMonth}`,
    });
  } else {
    balance = monthBegin.partnerAmount;
  }

  const monthRows = await partnerModel
    .find({
      transactionDateAndTimeISO: {
        $gte: `${previousYearMonth}-00T00:00:00.000Z`,
        $lte: `${previousYearMonth}-99T99:99:99.999Z`,
      },
    })
    .lean();

  for (const row of monthRows) {
    if (row.transactionType === 'subscriberPayment') {
      balance += row.partnerAmount;
    } else if (row.transactionType === 'partnerPayment') {
      balance -= row.partnerAmount;
    }
  }

  const monthEndISO = `${previousYearMonth}-99T99:99:99.999Z`;

  await partnerModel.updateOne(
    {
      transactionDateAndTimeISO: monthEndISO,
      transactionType: 'monthEnd',
      subscriberName: '',
      partnerName: partnerProfile.partnerName,
    },
    {
      $setOnInsert: {
        transactionDateAndTimeISO: monthEndISO,
        transactionType: 'monthEnd',
        subscriberAmount: 0,
        partnerPercent: 0,
        partnerAmount: balance,
        partnerName: partnerProfile.partnerName,
      },
    },
    { upsert: true }
  );

  return balance;
}

function getPartnerModel(partnerName) {
  const partnerNameKey = getPartnerNameKey(partnerName);

  if (partnerModels.has(partnerNameKey)) {
    return partnerModels.get(partnerNameKey);
  }

  const modelName = `${partnerNameKey}_payments`;

  const partnerModel =
    partnerDBConnection.models[modelName] ||
    partnerDBConnection.model(modelName, PartnerPaymentSchema, modelName);

  partnerModels.set(partnerNameKey, partnerModel);

  return partnerModel;
}

async function getPartnerMonthBegin(partnerName, yearMonth) {
  const partnerModel = getPartnerModel(partnerName);

  return partnerModel
    .findOne({
      transactionDateAndTimeISO: {
        $gte: `${yearMonth}-00T00:00:00.000Z`,
        $lte: `${yearMonth}-99T99:99:99.999Z`,
      },
      transactionType: 'monthBegin',
    })
    .lean();
}

async function getPartnerMonthEnd(partnerName, yearMonth) {
  const partnerModel = getPartnerModel(partnerName);

  return partnerModel
    .findOne({
      transactionDateAndTimeISO: {
        $gte: `${yearMonth}-00T00:00:00.000Z`,
        $lte: `${yearMonth}-99T99:99:99.999Z`,
      },
      transactionType: 'monthEnd',
    })
    .lean();
}

function getYearMonthFromISODateTime(isoDateTime) {
  return isoDateTime.slice(0, 7);
}

function getPartnerNameKey(partnerName) {
  return partnerName.trim().replace(/[^a-zA-Z0-9]/g, '_');
}

async function getPreviousYearMonth(partnerName, yearMonth) {
  const partnerModel = getPartnerModel(partnerName);

  const minimumYearMonth = '2026-01';
  let current = subtractOneMonth(yearMonth);

  while (current >= minimumYearMonth) {
    const existing = await partnerModel.exists({
      transactionDateAndTimeISO: {
        $gte: `${current}-00T00:00:00.000Z`,
        $lte: `${current}-99T99:99:99.999Z`,
      },
    });

    if (existing) return current;

    current = subtractOneMonth(current);
  }

  return defaultYearMonth;
}

function subtractOneMonth(yearMonth) {
  const [yearString, monthString] = yearMonth.split('-');

  let year = Number(yearString);
  let month = Number(monthString);

  month -= 1;

  if (month === 0) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

async function insertTestPartnerPayments(partnerName) {
  let payments = [];
  if (partnerName == 'The Snow White Channel') payments = [
    { paymentDate: '2026-06-05', partnerAmount: 900 },
    { paymentDate: '2026-05-03', partnerAmount: 450 },
    { paymentDate: '2026-04-07', partnerAmount: 450 },
    { paymentDate: '2026-03-04', partnerAmount: 150 },
  ];

  const partnerModel = getPartnerModel(partnerName);

  for (const { paymentDate, partnerAmount } of payments) {
    const transactionDateAndTimeISO = `${paymentDate}T00:00:00.000Z`;

    await partnerModel.updateOne(
      {
        transactionDateAndTimeISO,
        transactionType: 'partnerPayment',
        partnerName,
      },
      {
        $set: {
          partnerAmount,
          partnerName,
        },
      },
      {
        upsert: true,
      }
    );
  }
}

export async function getPartnerPaidStatusAndBalance(
  userId,
  appConn,
  partnerConn,
  profilesConn
) {
  const partnerProfile = await getProfile(
    userId,
    profilesConn
  );

  if (!partnerProfile) {
    return {
      paid: false,
      balance: 0,
    };
  }

  const yearMonth = getYearMonthFromISODateTime(
    new Date().toISOString()
  );

  const payments = await getPartnerPayments(
    partnerProfile,
    yearMonth,
    appConn,
    partnerConn,
    profilesConn
  );

  let paid = false;
  let paidAmount = 0;
  let balance = 0;

  const monthBegin = payments.find(
    row => row.transactionType === 'monthBegin'
  );

  if (monthBegin) {
    balance = monthBegin.partnerAmount || 0;
  }

  for (const row of payments) {
    if (row.transactionType === 'monthBegin') {
      continue;
    }

    if (row.transactionType === 'subscriberPayment') {
      balance += row.partnerAmount || 0;
    } else if (row.transactionType === 'partnerPayment') {
      balance -= row.partnerAmount || 0;
      paid = true;
      paidAmount = row.partnerAmount;
    }
  }

  return {
    paid,
    paidAmount,
    balance,
  };
}

export async function getPartnersListForAdmin(
  appConn,
  partnerConn,
  profilesConn
) {
  const profileModel =
    profilesConn.models.Profile ||
    profilesConn.model('Profile', ProfileSchema);

  const partnerProfiles = await profileModel
    .find({ isPartner: true })
    .select('userId partnerName')
    .sort({ partnerName: 1, userId: 1 })
    .lean();

  const partners = [];

  for (const partnerProfile of partnerProfiles) {
    const { paid, paidAmount, balance } =
      await getPartnerPaidStatusAndBalance(
        partnerProfile.userId,
        appConn,
        partnerConn,
        profilesConn
      );

    partners.push({
      partnerName: partnerProfile.partnerName || '',
      partnerUserId: partnerProfile.userId,
      paid,
      paidAmount,
      balance,
    });
  }

  return partners;
}

export async function payPartner(
  partnerProfile,
  partnerConn,
  amountInCents
) {
  partnerDBConnection = partnerConn;

  const partnerModel = getPartnerModel(partnerProfile.partnerName);

  const currentISO = new Date().toISOString();
  const yearMonth = getYearMonthFromISODateTime(currentISO);

  await partnerModel.findOneAndUpdate(
    {
      transactionDateAndTimeISO: {
        $gte: `${yearMonth}-00T00:00:00.000Z`,
        $lte: `${yearMonth}-99T99:99:99.999Z`,
      },
      transactionType: 'partnerPayment',
      partnerName: partnerProfile.partnerName,
    },
    {
      $set: {
        transactionDateAndTimeISO: currentISO,
        partnerAmount: amountInCents,
        partnerName: partnerProfile.partnerName,
      },
      $setOnInsert: {
        transactionType: 'partnerPayment',
        subscriberName: '',
        subscriberAmount: 0,
        partnerPercent: 0,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  return amountInCents;
}

export async function getPartnerCounts(partnerName, profilesConn) {
  const ProfileModel =
    profilesConn.models.Profile ||
    profilesConn.model('Profile', ProfileSchema, 'profiles');

  const now = new Date();
  const trialCutoffDate = new Date(now);
  trialCutoffDate.setDate(trialCutoffDate.getDate() - 30);

  const trialCutoff = trialCutoffDate.toISOString().slice(0, 10);

  const baseQuery = {
    partnerName,
    isPartner: { $ne: true },
  };

  const totalMembers = await ProfileModel.countDocuments(baseQuery);

  const totalSubscribed = await ProfileModel.countDocuments({
    ...baseQuery,
    'subscription.status': 'active',
  });

  const totalInTrial = await ProfileModel.countDocuments({
    ...baseQuery,
    trialStartDate: { $gte: trialCutoff },
  });

  const totalTrialExpiredAndNotSubscribed = await ProfileModel.countDocuments({
    ...baseQuery,
    trialStartDate: { $lt: trialCutoff },
    'subscription.status': { $nin: ['active', 'canceled'] },
  });

  const totalCanceled = await ProfileModel.countDocuments({
    ...baseQuery,
    'subscription.status': 'canceled',
  });

  return {
    totalMembers,
    totalSubscribed,
    totalInTrial,
    totalTrialExpiredAndNotSubscribed,
    totalCanceled,
  };
}
