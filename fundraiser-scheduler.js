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

/**
 * Check if current time is within the active window (noon to 10pm)
 */
function isWithinActiveHours() {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= START_HOUR && currentHour < END_HOUR;
}

/**
 * Calculate minutes until the next active period starts
 */
function minutesUntilNextActive() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour < START_HOUR) {
    // Before noon - wait until noon
    const minutesUntilNoon = (START_HOUR - currentHour) * 60 - now.getMinutes();
    return minutesUntilNoon;
  } else {
    // After 10pm - wait until noon tomorrow
    const hoursUntilNoon = (24 - currentHour) + START_HOUR;
    const minutesUntilNoon = hoursUntilNoon * 60 - now.getMinutes();
    return minutesUntilNoon;
  }
}

console.log(`Starting The Bev Fundraiser Updater`);
console.log(`Update interval: ${UPDATE_INTERVAL} minutes`);
console.log(`Active hours: ${START_HOUR}:00 (${START_HOUR === 12 ? 'noon' : START_HOUR + 'am'}) to ${END_HOUR}:00 (${END_HOUR - 12}pm)`);
console.log(`Current time: ${new Date().toLocaleTimeString()}\n`);

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
  const now = new Date();

  if (isWithinActiveHours()) {
    // Check if it's time for an update (every 25 minutes within the hour)
    const minutes = now.getMinutes();

    // Run at :00, :25, :50 minutes past the hour
    if (minutes % UPDATE_INTERVAL === 0 && now.getSeconds() < 60) {
      console.log(`\n[${now.toLocaleString()}] Running scheduled update...`);
      updateVestaboards()
        .then(() => {
          console.log(`Next update: ${new Date(Date.now() + UPDATE_INTERVAL * 60 * 1000).toLocaleTimeString()}`);
        })
        .catch(console.error);
    }
  } else {
    // Log once per hour when outside active window
    if (now.getMinutes() === 0 && now.getSeconds() < 60) {
      const minutesUntil = minutesUntilNextActive();
      console.log(`[${now.toLocaleString()}] Outside active hours. Next update in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`);
    }
  }
}, 60 * 1000); // Check every minute

// Keep the process running
process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});
