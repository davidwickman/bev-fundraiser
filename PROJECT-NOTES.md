# The Bev Fundraiser - Project Development Notes

## Project Overview

Automated Vestaboard display system for The Bev's fire relief fundraiser. Shows real-time donation totals and latest update dates, pulling from Google Sheets and displaying on two Vestaboards at the brewery.

**Deployed**: October 30, 2024
**Platform**: Digital Ocean Droplet ($4/month)
**Status**: Running in production

---

## Development Journey

### Initial Requirements

- Update 2 Vestaboards with fundraising total
- Pull data from Google Spreadsheet
- Run in the cloud (initially considered GoDaddy)
- Update automatically on a schedule

### Technical Decisions

#### 1. Vestaboard API Choice: Read/Write vs Subscription

**Initial Attempt**: Read/Write API
- Simpler authentication (one key per board)
- Text-based format: `{ text: "message" }`
- **Problem**: Could not center text properly
  - Leading/trailing spaces were stripped by the API
  - `{0}` character codes didn't work in text mode
  - Everything appeared left-aligned

**Final Solution**: Subscription API (Installable)
- Requires: API Key + API Secret + Subscription ID per board
- Uses character array format: `{ characters: [[...], [...], ...] }`
- **Benefit**: Precise 6x22 tile positioning
- Allows perfect centering with blank tiles (code 0)
- Full control over color tile placement

#### 2. Message Formatting Evolution

**Version 1**: Simple text layout
```
The Bev
Fire Relief

$612
Raised

Thank You!
```

**Version 2**: Added colors and date
```
{64} Help Rebuild {64}
{64}{64} The Bev {64}{64}
...
Raised as of Oct 29
```

**Version 3** (Final): Full-width design with precise centering
```
   🟧🟧 HELP REBUILD 🟧🟧
    🟧🟧🟧 THE BEV! 🟧🟧🟧
🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧🟧
       🟩🟩 $612 🟩🟩
   RAISED AS OF OCT 29
  🟧🟧🟧🟧 THANK YOU! 🟧🟧🟧🟧
```

Features:
- Multiple color tiles on each side (2-4 tiles)
- Full-width orange bar as divider
- Perfectly centered using character array positioning
- Green tiles highlight the dollar amount

#### 3. Scheduling Strategy

**Requirements**:
- Update every 25 minutes (not 15)
- Only run from noon to 10pm
- No updates overnight or in early morning

**Implementation**:
- Check every minute if within active window
- Update when `minutes % 25 === 0`
- Log status when outside active hours

#### 4. Hosting Platform Decision

**Considered**: GoDaddy
- User already had hosting account
- Would need cron jobs on shared hosting
- Or PM2 on VPS if available
- More complex to set up

**Chosen**: Digital Ocean
- $4/month droplet (512MB RAM, 1 CPU)
- Simple API for automated deployment
- Better suited for Node.js applications
- Web console access for easy debugging

#### 5. Deployment Automation

**Version 1**: SSH-based deployment
- Create droplet via API
- SSH in and run commands
- **Problem**: SSH authentication required

**Version 2** (Final): Cloud-init deployment
- Uses Digital Ocean's user_data feature
- Entire setup script injected at creation
- No SSH keys needed
- Fully automated from API call to running app

---

## Technical Architecture

### Google Sheets Integration

**API**: Google Sheets API v4
**Authentication**: API Key (read-only access)
**Data Structure**:
```
Column A: Dates (10/23/2025, 10/24/2025, ...)
Column H: "Total Raised" label
Column I: Dollar amount ($612.00)
```

**Data Fetching**:
1. Fetch range A1:I50 (all data)
2. Scan Column A for valid dates
3. Find most recent date
4. Search all columns for "Total Raised" label
5. Extract dollar amount from adjacent cell
6. Parse currency to number (remove $, commas)

### Vestaboard Character Encoding

**Character Code Map**:
- `0`: Blank tile
- `1-26`: A-Z
- `27-36`: 1-9, 0
- `37+`: Punctuation ($=40, ,=55, !=37)
- `63-69`: Color tiles (63=red, 64=orange, 65=yellow, 66=green, 67=blue, 68=violet, 69=white)

**Message Format**: 6x22 array
```javascript
[
  [0,0,0,64,8,5,12,16,...],  // Row 1: "HELP REBUILD" with padding
  [0,0,0,0,64,64,64,20,...], // Row 2: "THE BEV!"
  [64,64,64,64,64,...],       // Row 3: Full orange bar
  [0,0,0,0,0,66,66,40,...],  // Row 4: "$612" with green tiles
  [0,18,1,9,19,5,4,...],     // Row 5: "RAISED AS OF OCT 29"
  [0,0,64,64,64,64,20,...]   // Row 6: "THANK YOU!"
]
```

### Scheduler Design

**Logic Flow**:
```
Every minute:
  1. Get current time
  2. If hour >= 12 AND hour < 22:
     - If minutes % 25 == 0:
       - Run update
  3. Else:
     - Log "outside active hours" (once per hour)
```

**Benefits**:
- Single process runs 24/7
- No external cron needed
- Time-aware (doesn't waste API calls overnight)
- Clean logging

---

## Environment Variables

All sensitive data moved to `.env`:

```env
# Google Sheets
GOOGLE_SHEET_ID=your_spreadsheet_id
GOOGLE_API_KEY=your_google_api_key
SHEET_RANGE=Sheet1!A1:I50

# Vestaboard One
VESTABOARD_ONE_API_KEY=...
VESTABOARD_ONE_API_SECRET=...
VESTABOARD_ONE_SUBSCRIPTION_ID=...

# Vestaboard Two
VESTABOARD_TWO_API_KEY=...
VESTABOARD_TWO_API_SECRET=...
VESTABOARD_TWO_SUBSCRIPTION_ID=...

# Schedule
UPDATE_INTERVAL_MINUTES=25
START_HOUR=12
END_HOUR=22

# Deployment
DIGITALOCEAN_TOKEN=dop_v1_...
```

---

## Deployment Details

### Digital Ocean Setup

**Droplet Specs**:
- Size: s-1vcpu-512mb-10gb ($4/month)
- Region: nyc3 (New York)
- Image: ubuntu-22-04-x64
- Monitoring: Enabled
- Backups: Disabled (to save cost)

**Cloud-Init Script** (simplified):
1. Update system packages
2. Install Node.js 18.x from NodeSource
3. Create `/root/bev-fundraiser` directory
4. Write all application files (package.json, .env, scripts)
5. Run `npm install`
6. Install PM2 globally
7. Start app with PM2: `pm2 start fundraiser-scheduler.js`
8. Configure PM2 startup script
9. Save PM2 process list

**Timeline**:
- Droplet creation: ~30 seconds
- Boot time: ~30 seconds
- Cloud-init execution: ~3-4 minutes
- **Total**: ~5 minutes to fully running

### Process Management

**PM2 Configuration**:
- Process name: `bev-fundraiser`
- Auto-restart on crash
- Auto-start on server reboot
- Log rotation built-in
- Status monitoring via `pm2 status`

---

## API Endpoints Used

### Digital Ocean API
```
POST /v2/droplets          # Create droplet
GET  /v2/droplets/{id}     # Check status
DELETE /v2/droplets/{id}   # Delete droplet
```

### Google Sheets API
```
GET /v4/spreadsheets/{id}/values/{range}
```

### Vestaboard Subscription API
```
GET  /subscriptions                      # List subscriptions
POST /subscriptions/{id}/message         # Update board
```

---

## Lessons Learned

### 1. API Limitations
- Read/Write API has text formatting limitations
- Subscription API gives full control but requires more setup
- Always check API docs for exact capabilities

### 2. Cloud-Init is Powerful
- Can fully automate server setup
- No SSH keys required
- Better than manual SSH deployment
- Takes longer but more reliable

### 3. Environment Variables are Essential
- Never hardcode credentials
- Makes deployment to multiple environments easier
- Security best practice

### 4. PM2 is Essential for Node.js
- Keeps app running 24/7
- Auto-restart on crashes
- Easy log management
- Simple monitoring

### 5. Schedule Logic
- Better to have app self-manage schedule
- More reliable than cron
- Easier to customize
- Can log activity when inactive

---

## Future Improvements

### Potential Enhancements

1. **Dynamic Goal Display**
   - Show progress bar
   - Display goal amount
   - Calculate percentage

2. **Multi-Day Stats**
   - Show daily totals
   - Week-over-week comparison
   - Total donations count

3. **Alerts**
   - Email notification on errors
   - Slack integration for milestones
   - SMS for critical issues

4. **Admin Dashboard**
   - Web interface to view status
   - Manual refresh button
   - Edit message without redeploying

5. **A/B Testing**
   - Different message formats
   - Vary colors
   - Test update frequency impact

### Known Limitations

1. **No Error Recovery**
   - If Google Sheets is down, app fails
   - Could add retry logic with exponential backoff

2. **Single Region**
   - Droplet in NYC only
   - Could use multiple regions for redundancy

3. **No Analytics**
   - Don't track view counts
   - No engagement metrics
   - Could add simple logging

4. **Fixed Schedule**
   - Can't change hours without redeploying
   - Could load schedule from external config

---

## Code Quality

### Best Practices Implemented

- ✅ Environment variables for all secrets
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Clear code comments
- ✅ Separation of concerns (updater vs scheduler)
- ✅ DRY principle (reusable functions)
- ✅ .gitignore for sensitive files

### Testing Strategy

- Manual testing during development
- Test with real APIs (no mocking)
- Verify display on physical boards
- Monitor logs after deployment

---

## References

### Documentation Used

- [Vestaboard API Docs](https://docs.vestaboard.com/)
- [Google Sheets API v4](https://developers.google.com/sheets/api)
- [Digital Ocean API](https://docs.digitalocean.com/reference/api/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Cloud-Init](https://cloudinit.readthedocs.io/)

### Community Resources

- Vestaboard has active developer community on Slack
- Several open-source libraries available
- Character code reference essential for formatting

---

## Timeline

**October 30, 2024**:
- Initial requirements gathering
- Google Sheets integration
- First Vestaboard API attempts (Read/Write)
- Discovered centering issues
- Switched to Subscription API
- Implemented character array formatting
- Added color tiles and design
- Built scheduler with time window
- Created deployment automation
- Deployed to Digital Ocean
- Tested and verified
- Documentation completed

**Total Development Time**: ~4 hours

---

## Contact & Support

**For The Bev**: Good luck with the fundraiser! 🍺❤️

**Technical Support**:
- Check logs: SSH into your droplet, then run `pm2 logs bev-fundraiser`
- View status: `pm2 status`
- Restart: `pm2 restart bev-fundraiser`
- Update code: Redeploy or manually upload changes

**Resources**:
- Digital Ocean Dashboard: https://cloud.digitalocean.com/
- Google Sheets API Console: https://console.cloud.google.com/
- Vestaboard Web Portal: https://web.vestaboard.com/

**Deployment Info**: Check your `.env` file or Digital Ocean dashboard for current server IP and droplet ID

---

**End of Project Notes**
