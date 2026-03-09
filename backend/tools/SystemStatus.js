import { SystemStatusSchema } from '../models/SystemStatusModel.js';

/**
 * Bind SystemStatus model to the app DB connection.
 */
function getSystemStatusModel(appDBConnection) {
  return (
    appDBConnection.models.SystemStatus ||
    appDBConnection.model('SystemStatus', SystemStatusSchema)
  );
}

/**
 * Get the SystemStatus document.
 * Creates one if it does not exist yet.
 */
export async function getSystemStatus(appDBConnection) {
  const SystemStatus = getSystemStatusModel(appDBConnection);

  let status = await SystemStatus.findOne();

  if (!status) {
    status = await SystemStatus.create({
      lastRecordedDateUTC: null,
    });
  }

  return status;
}

/**
 * Determine if the system has moved to a new UTC day.
 *
 * @param {string} dateUTC - Date in YYYY-MM-DD format (UTC)
 * @param {object} appDBConnection - mongoose connection to app DB
 *
 * @returns {Promise<boolean>}
 *   true  -> new day detected and recorded
 *   false -> same day as already recorded
 */
export async function systemNewDay(dateUTC, appDBConnection) {
  const status = await getSystemStatus(appDBConnection);

  // First run (no date recorded yet)
  if (!status.lastRecordedDateUTC) {
    status.lastRecordedDateUTC = dateUTC;
    await status.save();
    return true;
  }

  if (status.lastRecordedDateUTC === dateUTC) {
    return false;
  }

  status.lastRecordedDateUTC = dateUTC;
  await status.save();

  return true;
}