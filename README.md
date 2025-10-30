# The Bev Fire Relief Fundraiser - Vestaboard Updater

Automated Vestaboard display system that shows real-time fundraising progress for The Bev's fire relief campaign. Updates every 25 minutes from noon to 10pm daily, pulling data from Google Sheets and displaying on two Vestaboards with a beautifully centered, colorful layout.

## 🎯 What It Does

- **Fetches** live donation totals and latest date from your Google Spreadsheet
- **Formats** a beautiful centered message with color tiles (orange and green)
- **Updates** both Vestaboards simultaneously using the Subscription API
- **Runs** automatically every 25 minutes during business hours (noon - 10pm)
- **Deployed** on Digital Ocean ($4/month)

## 📊 Display Format

```
     🟧🟧 HELP REBUILD 🟧🟧
      🟧🟧🟧 THE BEV! 🟧🟧🟧
🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
         🟩🟩 $X,XXX 🟩🟩
     RAISED AS OF OCT 29
    🟧🟧🟧🟧 THANK YOU! 🟧🟧🟧🟧
```

## 🚀 Current Deployment

**Status**: ✅ Running on Digital Ocean
- **Cost**: $4/month
- **Schedule**: Updates every 25 minutes, noon to 10pm daily
- **Dashboard**: Check your Digital Ocean dashboard for droplet details

## 📁 Project Structure

```
bev-fundraiser/
├── fundraiser-updater.js          # Core script - fetches & updates boards
├── fundraiser-scheduler.js        # Scheduler with time window (noon-10pm)
├── deploy-to-digitalocean-v2.js   # Automated deployment script
├── .env                           # Environment variables (DO NOT COMMIT)
├── .env.example                   # Template for environment variables
├── package.json                   # Dependencies and scripts
├── DIGITALOCEAN-DEPLOYMENT.md     # Full deployment guide
└── README.md                      # This file
```

## 🔧 Local Development

### Install Dependencies

```bash
npm install
```

### Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- Google Sheets API (ID, Key, Range)
- Vestaboard API credentials (2 boards)
- Schedule settings (interval, hours)
- Digital Ocean token (for deployment)

### Test Locally

```bash
# Test a single update
npm run update

# Test the scheduler (Ctrl+C to stop)
npm start
```

## 🌐 Deployment

### One-Command Deployment

```bash
npm run deploy
```

This automated script will:
1. Create a $4/month Digital Ocean droplet
2. Install Node.js and dependencies
3. Deploy your code
4. Set up PM2 for 24/7 operation
5. Configure auto-start on reboot

**Total time**: ~5 minutes

See [DIGITALOCEAN-DEPLOYMENT.md](./DIGITALOCEAN-DEPLOYMENT.md) for detailed instructions.

## 📝 NPM Scripts

```bash
npm run update    # Run a single update now
npm start         # Start the scheduler locally
npm test          # Alias for update (test configuration)
npm run deploy    # Deploy to Digital Ocean
```

## ⚙️ Configuration

All configuration is managed through environment variables in `.env`:

### Schedule Settings
```env
UPDATE_INTERVAL_MINUTES=25  # How often to update
START_HOUR=12               # Start at noon
END_HOUR=22                 # Stop at 10pm (22:00)
```

### Google Sheets
```env
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_API_KEY=your_api_key
SHEET_RANGE=Sheet1!A1:I50
```

Your spreadsheet should have:
- **Column A**: Dates (10/29/2025, etc.)
- **Column H**: "Total Raised" label
- **Column I**: Dollar amount ($612.00, etc.)

### Vestaboard API
Uses **Subscription API** (Installables) for precise tile control:
- 6 environment variables (3 per board: API key, secret, subscription ID)
- Allows perfect centering and color tile positioning

## 🎨 Customizing the Display

Edit the `formatMessage()` function in `fundraiser-updater.js`:

```javascript
// Change color tiles
const line1 = textToCharCodes('Help Rebuild', CHAR_CODES.ORANGE, 2);

// Available colors: RED, ORANGE, YELLOW, GREEN, BLUE, VIOLET, WHITE
// Third parameter is number of color tiles on each side
```

## 🔍 Monitoring (Digital Ocean)

### Via Web Console
1. Go to https://cloud.digitalocean.com/droplets
2. Click on your "bev-fundraiser" droplet
3. Click "Console"
4. Login as root

### Check Status
```bash
pm2 status              # App status
pm2 logs bev-fundraiser # Live logs
pm2 restart bev-fundraiser  # Restart if needed
```

### View Setup Log
```bash
tail -f /var/log/user-data.log
```

## 🐛 Troubleshooting

### Google Sheets Issues
- Verify spreadsheet is shared publicly ("Anyone with link can view")
- Check Google Sheets API is enabled
- Ensure SHEET_RANGE includes both dates and "Total Raised"

### Vestaboard Issues
- Message duplicate error = board already showing that message (normal)
- Invalid credentials = check .env file has correct API keys
- Both boards use Subscription API, not Read/Write API

### Deployment Issues
- Check Digital Ocean API token is valid
- Ensure you have $4 available on your DO account
- Wait 5 minutes for cloud-init to complete setup

## 💰 Costs

- **Digital Ocean Droplet**: $4/month
- **Google Sheets API**: Free
- **Vestaboard API**: Free
- **Total**: $4/month

## 🔐 Security

- All credentials stored in `.env` file
- `.env` is in `.gitignore` (never committed)
- Google API key restricted to Sheets API only
- Vestaboard credentials use environment variables

## 📚 Additional Documentation

- **[DIGITALOCEAN-DEPLOYMENT.md](./DIGITALOCEAN-DEPLOYMENT.md)** - Full deployment guide with troubleshooting
- **[PROJECT-NOTES.md](./PROJECT-NOTES.md)** - Development history and decisions

## 🎉 Credits

Built for The Bev's fire relief fundraiser. Good luck with the campaign! 🍺❤️

---

**Last Updated**: October 30, 2024
**Status**: Deployed and running on Digital Ocean
