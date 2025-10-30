/**
 * Scheduler for The Bev Fundraiser Vestaboard Updates
 *
 * Runs the updater script every 25 minutes between noon and 10pm
 */

require('dotenv').config();
const { updateVestaboards } = require('./fundraiser-updater');

// Configuration
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL_MINUTES || '25', 10);
const START_HOUR = parseInt(process.env.START_HOUR || '12', 10); // Noon
const END_HOUR = parseInt(process.env.END_HOUR || '22', 10); // 10pm
const TIMEZONE = process.env.TIMEZONE || 'America/New_York'; // EST/EDT

/**
 * Get current hour in configured timezone
 */
function getCurrentHourInTimezone() {
  const now = new Date();
  const timeString = now.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false
  });
  return parseInt(timeString, 10);
}

/**
 * Get current time info in configured timezone
 */
function getCurrentTimeInTimezone() {
  const now = new Date();
  const timeString = now.toLocaleString('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const [hour, minute, second] = timeString.split(':').map(n => parseInt(n, 10));
  return { hour, minute, second, date: now };
}

/**
 * Check if current time is within the active window (noon to 10pm in configured timezone)
 */
function isWithinActiveHours() {
  const currentHour = getCurrentHourInTimezone();
  return currentHour >= START_HOUR && currentHour < END_HOUR;
}

/**
 * Calculate minutes until the next active period starts
 */
function minutesUntilNextActive() {
  const { hour, minute } = getCurrentTimeInTimezone();

  if (hour < START_HOUR) {
    // Before noon - wait until noon
    const minutesUntilNoon = (START_HOUR - hour) * 60 - minute;
    return minutesUntilNoon;
  } else {
    // After 10pm - wait until noon tomorrow
    const hoursUntilNoon = (24 - hour) + START_HOUR;
    const minutesUntilNoon = hoursUntilNoon * 60 - minute;
    return minutesUntilNoon;
  }
}

console.log(`Starting The Bev Fundraiser Updater`);
console.log(`Update interval: ${UPDATE_INTERVAL} minutes`);
console.log(`Active hours: ${START_HOUR}:00 (${START_HOUR === 12 ? 'noon' : START_HOUR + 'am'}) to ${END_HOUR}:00 (${END_HOUR - 12}pm)`);
console.log(`Timezone: ${TIMEZONE}`);
console.log(`Current time: ${new Date().toLocaleString('en-US', { timeZone: TIMEZONE })}\n`);

// Run immediately if within active hours
if (isWithinActiveHours()) {
  console.log('Within active hours - running initial update...');
  updateVestaboards().catch(console.error);
} else {
  const minutesUntil = minutesUntilNextActive();
  console.log(`Outside active hours. Next update in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m at ${START_HOUR}:00`);
}

// Check every minute if we should run an update
setInterval(() => {
  const { hour, minute, second, date } = getCurrentTimeInTimezone();

  if (isWithinActiveHours()) {
    // Check if it's time for an update (every 25 minutes within the hour)
    // Run at :00, :25, :50 minutes past the hour
    if (minute % UPDATE_INTERVAL === 0 && second < 60) {
      const timeStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
      console.log(`\n[${timeStr}] Running scheduled update...`);
      updateVestaboards()
        .then(() => {
          const nextUpdateTime = new Date(Date.now() + UPDATE_INTERVAL * 60 * 1000);
          const nextTimeStr = nextUpdateTime.toLocaleString('en-US', {
            timeZone: TIMEZONE,
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          console.log(`Next update: ${nextTimeStr}`);
        })
        .catch(console.error);
    }
  } else {
    // Log once per hour when outside active window
    if (minute === 0 && second < 60) {
      const minutesUntil = minutesUntilNextActive();
      const timeStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
      console.log(`[${timeStr}] Outside active hours. Next update in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`);
    }
  }
}, 60 * 1000); // Check every minute

// Keep the process running
process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
