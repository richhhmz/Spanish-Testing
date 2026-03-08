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
  const SystemStatus = getSystemStatusModel(appDBConnection);

  let status = await SystemStatus.findOne();

  // If no document exists yet, create it
  if (!status) {
    await SystemStatus.create({
      lastRecordedDateUTC: dateUTC,
    });
    return true;
  }

  if (status.lastRecordedDateUTC === dateUTC) {
    return false;
  }

  status.lastRecordedDateUTC = dateUTC;
  await status.save();

  return true;
}