# Digital Ocean Deployment Guide - The Bev Fundraiser

Deploy your Vestaboard fundraiser updater on Digital Ocean for **$4/month**.

---

## 💰 Cost: $4/month

The **Basic Droplet** ($4/month, 512MB RAM, 1 CPU) is perfect for this simple Node.js scheduler.

---

## 🚀 Quick Setup (10 minutes)

### Step 1: Create a Droplet

1. Go to https://cloud.digitalocean.com/
2. Click **"Create"** → **"Droplets"**
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($4/month)
   - **CPU options**: Regular (512MB / 1 CPU)
   - **Datacenter**: Choose closest to you
   - **Authentication**: SSH key (recommended) or Password
   - **Hostname**: `bev-fundraiser`
4. Click **"Create Droplet"**

Wait 1-2 minutes for it to spin up. Copy the IP address.

---

### Step 2: Connect via SSH

```bash
ssh root@YOUR_DROPLET_IP
```

If using a password, you'll receive it via email.

---

### Step 3: Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

---

### Step 4: Upload Your Files

**Option A: Using SCP (from your local machine)**

```bash
# From your local machine, in the bev-fundraiser directory
scp -r . root@YOUR_DROPLET_IP:/root/bev-fundraiser/
```

**Option B: Using Git (recommended)**

On the droplet:
```bash
cd /root
git clone https://github.com/your-username/your-repo.git bev-fundraiser
cd bev-fundraiser
```

**Option C: Manual upload**
- Use an SFTP client like FileZilla
- Connect to `YOUR_DROPLET_IP` as `root`
- Upload the `bev-fundraiser` folder to `/root/`

---

### Step 5: Install Dependencies & Configure

```bash
cd /root/bev-fundraiser
npm install

# Create/edit .env file
nano .env
```

Paste your actual values and save (Ctrl+X, Y, Enter):
```env
GOOGLE_SHEET_ID=your_actual_spreadsheet_id
GOOGLE_API_KEY=your_actual_google_api_key
SHEET_RANGE=Sheet1!A1:I50

UPDATE_INTERVAL_MINUTES=25
START_HOUR=12
END_HOUR=22
```

---

### Step 6: Test It

```bash
# Test a single update
npm run update

# Test the scheduler (Ctrl+C to stop)
npm start
```

If both work, you're ready for production!

---

### Step 7: Install PM2 & Run 24/7

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
cd /root/bev-fundraiser
pm2 start fundraiser-scheduler.js --name bev-fundraiser

# Configure PM2 to start on boot
pm2 startup systemd
pm2 save
```

---

### Step 8: Monitor It

```bash
# View real-time logs
pm2 logs bev-fundraiser

# Check status
pm2 status

# Restart if needed
pm2 restart bev-fundraiser
```

---

## ✅ You're Done!

Your fundraiser updater is now running 24/7 on Digital Ocean for $4/month!

- Updates every **25 minutes** from noon to 10pm
- Automatically pulls latest data from Google Sheets
- Both Vestaboards update with centered, colorful displays

---

## 🔧 Common Commands

```bash
# View logs
pm2 logs bev-fundraiser

# Monitor CPU/memory
pm2 monit

# Restart app
pm2 restart bev-fundraiser

# Stop app
pm2 stop bev-fundraiser

# Update the code (if using git)
cd /root/bev-fundraiser
git pull
npm install
pm2 restart bev-fundraiser
```

---

## 🛡️ Optional: Basic Security

```bash
# Create a firewall (allows SSH and nothing else)
ufw allow OpenSSH
ufw enable

# Create a non-root user (optional but recommended)
adduser bevuser
usermod -aG sudo bevuser

# Copy SSH keys to new user
rsync --archive --chown=bevuser:bevuser ~/.ssh /home/bevuser

# Switch to new user
su - bevuser

# Move app to user directory
sudo mv /root/bev-fundraiser /home/bevuser/
cd /home/bevuser/bev-fundraiser

# Restart PM2 as this user
pm2 start fundraiser-scheduler.js --name bev-fundraiser
pm2 startup
pm2 save
```

---

## 💾 Backup Your Droplet (Optional)

1. Go to Digital Ocean dashboard
2. Click on your droplet
3. Click **"Snapshots"**
4. Click **"Take Snapshot"**

This creates a backup you can restore if anything goes wrong. Snapshots cost $0.05/GB/month (probably ~$0.20/month for this tiny app).

---

## 📊 Monitoring & Alerts

### Set Up Email Alerts

1. Go to your droplet in the Digital Ocean dashboard
2. Click **"Monitoring"**
3. Set up alerts for:
   - CPU usage > 80%
   - Memory usage > 80%
   - Disk usage > 80%

This way you'll know if something goes wrong.

---

## 🐛 Troubleshooting

### App Won't Start

```bash
# Check logs
pm2 logs bev-fundraiser --lines 100

# Check if Node.js is installed
node --version

# Reinstall dependencies
cd /root/bev-fundraiser
rm -rf node_modules
npm install
pm2 restart bev-fundraiser
```

### Can't SSH Into Droplet

1. Go to Digital Ocean dashboard
2. Click on your droplet
3. Click **"Console"** to access via web browser

### Out of Memory

The $4 droplet has 512MB RAM. If you see memory errors:
- Upgrade to the $6/month droplet (1GB RAM)
- Or add swap space:
  ```bash
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
  ```

---

## 💰 Reducing Costs Further

Already at the minimum! But here are some tips:

1. **Use a single droplet for multiple projects** - This tiny app barely uses any resources
2. **Use Digital Ocean's referral credit** - Get $200 free credit for 60 days
3. **Pause the fundraiser** - Delete the droplet when the fundraiser ends

---

## 🔄 Updating Your Code

If you make changes locally and want to deploy them:

**Method 1: Git (recommended)**
```bash
# On your local machine: commit and push changes
git add .
git commit -m "Update message"
git push

# On the droplet: pull changes
ssh root@YOUR_DROPLET_IP
cd /root/bev-fundraiser
git pull
npm install  # Only if package.json changed
pm2 restart bev-fundraiser
```

**Method 2: SCP**
```bash
# From your local machine
scp -r . root@YOUR_DROPLET_IP:/root/bev-fundraiser/

# Then SSH and restart
ssh root@YOUR_DROPLET_IP
cd /root/bev-fundraiser
pm2 restart bev-fundraiser
```

---

## 🎉 Success!

Your Bev Fundraiser is now live on Digital Ocean!

**What you have:**
- ✅ $4/month hosting
- ✅ 24/7 uptime with PM2
- ✅ Auto-restart on crashes
- ✅ Updates every 25 minutes (noon to 10pm)
- ✅ Pulls live data from Google Sheets
- ✅ Both Vestaboards display beautifully

Good luck with the fundraiser! 🍺❤️

---

## 📞 Need Help?

- **Digital Ocean Docs**: https://docs.digitalocean.com/
- **Community Tutorials**: https://www.digitalocean.com/community/tutorials
- **PM2 Docs**: https://pm2.keymetrics.io/docs/
