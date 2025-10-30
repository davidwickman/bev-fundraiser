/**
 * The Bev Fundraiser - Vestaboard Updater
 *
 * This script fetches the current donation total from Google Sheets
 * and updates two Vestaboards with the fundraising progress.
 */

require('dotenv').config();
const axios = require('axios');

// Vestaboard Configuration - Subscription API (Installable)
// This API gives us precise control over every tile for perfect centering
// All credentials are loaded from environment variables for security
const VESTABOARDS = [
  {
    name: 'Vestaboard One',
    apiKey: process.env.VESTABOARD_ONE_API_KEY,
    apiSecret: process.env.VESTABOARD_ONE_API_SECRET,
    subscriptionId: process.env.VESTABOARD_ONE_SUBSCRIPTION_ID
  },
  {
    name: 'Vestaboard Two',
    apiKey: process.env.VESTABOARD_TWO_API_KEY,
    apiSecret: process.env.VESTABOARD_TWO_API_SECRET,
    subscriptionId: process.env.VESTABOARD_TWO_SUBSCRIPTION_ID
  }
];

// Google Sheets Configuration
// You'll need to set these environment variables or replace with your values
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || 'YOUR_SHEET_ID_HERE';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Sheet1!A1:B10'; // Adjust to match your sheet structure

/**
 * Fetch the total raised and latest date from Google Sheets
 */
async function fetchFundraiserData() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${SHEET_RANGE}?key=${GOOGLE_API_KEY}`;

    const response = await axios.get(url);
    const values = response.data.values;

    let totalRaised = null;
    let latestDate = null;

    console.log('Scanning spreadsheet for dates and total...');

    // Find the "Total Raised" row and track the latest date
    for (let i = 0; i < values.length; i++) {
      const row = values[i];

      // Check for dates in column A (common date formats)
      if (row[0]) {
        // Try to parse as a date
        const cellValue = row[0].toString().trim();
        const parsedDate = new Date(cellValue);

        // Check if it's a valid date and not the "Total Raised" row
        if (!isNaN(parsedDate.getTime()) &&
            parsedDate.getFullYear() > 2000 &&
            !cellValue.toLowerCase().includes('total')) {
          if (!latestDate || parsedDate > latestDate) {
            latestDate = parsedDate;
            console.log(`  Found date: ${cellValue} (parsed as ${parsedDate.toLocaleDateString()})`);
          }
        }
      }

      // Find the "Total Raised" row - check all columns for the label
      for (let j = 0; j < row.length; j++) {
        if (row[j] && row[j].toString().toLowerCase().includes('total raised')) {
          // The amount should be in the next column (j+1)
          const totalString = row[j + 1];
          if (totalString) {
            totalRaised = parseFloat(totalString.toString().replace(/[^0-9.]/g, ''));
            console.log(`  Found total raised: $${totalRaised} (column ${String.fromCharCode(65 + j)}${i + 1})`);
          }
          break;
        }
      }
    }

    if (!totalRaised) {
      throw new Error('Could not find "Total Raised" in spreadsheet');
    }

    if (latestDate) {
      console.log(`  Using latest date: ${latestDate.toLocaleDateString()}`);
    } else {
      console.log('  No dates found in column A');
    }

    return { totalRaised, latestDate };
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error.message);
    throw error;
  }
}

/**
 * Character code map for Vestaboard
 * 0 = blank, 1-26 = A-Z, 27-36 = 1-9,0, 37+ = punctuation, 63-69 = colors
 */
const CHAR_CODES = {
  ' ': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
  'J': 10, 'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18,
  'S': 19, 'T': 20, 'U': 21, 'V': 22, 'W': 23, 'X': 24, 'Y': 25, 'Z': 26,
  '1': 27, '2': 28, '3': 29, '4': 30, '5': 31, '6': 32, '7': 33, '8': 34, '9': 35, '0': 36,
  '!': 37, '@': 38, '#': 39, '$': 40, '(': 41, ')': 42, '-': 44, '+': 46,
  '&': 47, '=': 48, ';': 49, ':': 50, '\'': 52, '"': 53, '%': 54, ',': 55, '.': 56,
  '/': 59, '?': 60,
  'RED': 63, 'ORANGE': 64, 'YELLOW': 65, 'GREEN': 66, 'BLUE': 67, 'VIOLET': 68, 'WHITE': 69
};

/**
 * Convert text string to Vestaboard character codes, centered in 22 columns
 */
function textToCharCodes(text, colorCode = null, colorTileCount = 1) {
  const chars = text.toUpperCase().split('');
  const codes = chars.map(char => CHAR_CODES[char] || 0);

  // Add color tiles on sides if specified
  if (colorCode) {
    const colorTiles = Array(colorTileCount).fill(colorCode);
    codes.unshift(...colorTiles);
    codes.push(...colorTiles);
  }

  // Center in 22 columns
  const totalPadding = Math.max(0, 22 - codes.length);
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  return [
    ...Array(leftPadding).fill(0),
    ...codes,
    ...Array(rightPadding).fill(0)
  ];
}

/**
 * Format the donation amount for display with colors
 * Returns a 6x22 array of character codes for precise positioning (Subscription API format)
 * Vestaboard color codes: 63=red, 64=orange, 65=yellow, 66=green, 67=blue, 68=violet, 69=white
 */
function formatMessage(amount, date) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

  // Format date if available
  let dateString = '';
  if (date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    dateString = `as of ${month} ${day}`;
  }

  // Create centered, colorful 6-line message using character codes
  // Line 1: "Help Rebuild" with 2 orange tiles on each side
  // Line 2: "The Bev!" with 3 orange tiles on each side
  // Line 3: Full-width orange bar (all 22 tiles)
  // Line 4: Amount with 2 green tiles on each side
  // Line 5: "Raised" + date
  // Line 6: "Thank You!" with 4 orange tiles on each side

  const line1 = textToCharCodes('Help Rebuild', CHAR_CODES.ORANGE, 2);
  const line2 = textToCharCodes('The Bev!', CHAR_CODES.ORANGE, 3);

  // Line 3: Full-width orange bar (all 22 tiles)
  const line3 = Array(22).fill(CHAR_CODES.ORANGE);

  const line4 = textToCharCodes(formattedAmount, CHAR_CODES.GREEN, 2);
  const line5 = textToCharCodes(`Raised ${dateString}`);
  const line6 = textToCharCodes('Thank You!', CHAR_CODES.ORANGE, 4);

  // Return as 6x22 character array for Subscription API
  return [line1, line2, line3, line4, line5, line6];
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Post message to a Vestaboard using Subscription API (Installable)
 * This API accepts a 6x22 character array for precise tile control
 * Includes retry logic for rate limiting (503 errors)
 */
async function postToVestaboard(board, message, retryCount = 0) {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 5000; // 5 seconds

  try {
    const url = `https://platform.vestaboard.com/subscriptions/${board.subscriptionId}/message`;

    const response = await axios.post(
      url,
      { characters: message }, // Wrap the character array in an object
      {
        headers: {
          'X-Vestaboard-Api-Key': board.apiKey,
          'X-Vestaboard-Api-Secret': board.apiSecret,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✓ Successfully updated ${board.name}`);
    return response.data;
  } catch (error) {
    const errorData = error.response?.data;
    const status = error.response?.status;

    // Handle rate limiting (503 errors)
    if (status === 503 && retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff: 5s, 10s, 20s
      console.log(`⚠ ${board.name} rate limited. Retrying in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return postToVestaboard(board, message, retryCount + 1);
    }

    // Handle duplicate message (not an error - board already shows this message)
    if (errorData?.message?.includes('fingerprint matches')) {
      console.log(`ℹ ${board.name} already displaying this message (no update needed)`);
      return errorData;
    }

    console.error(`✗ Error updating ${board.name}:`, errorData || error.message);
    throw error;
  }
}

/**
 * Main function to update all Vestaboards
 */
async function updateVestaboards() {
  try {
    console.log('Fetching fundraiser data from Google Sheets...');
    const { totalRaised, latestDate } = await fetchFundraiserData();

    console.log(`Total raised: $${totalRaised.toLocaleString()}`);
    if (latestDate) {
      console.log(`Latest date: ${latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
    }

    const message = formatMessage(totalRaised, latestDate);
    console.log('\nMessage to display (6x22 character array):');
    console.log('---');
    // Print a visual representation
    message.forEach((row, i) => {
      const text = row.map(code => {
        if (code === 0) return ' ';
        if (code >= 63 && code <= 69) return '█';
        if (code >= 1 && code <= 26) return String.fromCharCode(64 + code);
        if (code >= 27 && code <= 36) return code === 36 ? '0' : String(code - 26);
        if (code === 37) return '!';
        if (code === 40) return '$';
        if (code === 55) return ',';
        return '?';
      }).join('');
      console.log(`Line ${i + 1}: |${text}|`);
    });
    console.log('---\n');

    console.log('Updating Vestaboards...');
    const updates = VESTABOARDS.map(board =>
      postToVestaboard(board, message)
    );

    await Promise.all(updates);

    console.log('\n✓ All Vestaboards updated successfully!');
  } catch (error) {
    console.error('\n✗ Update failed:', error.message);
    process.exit(1);
  }
}

// Run the update
if (require.main === module) {
  updateVestaboards();
}

module.exports = { updateVestaboards, fetchFundraiserData, formatMessage };
