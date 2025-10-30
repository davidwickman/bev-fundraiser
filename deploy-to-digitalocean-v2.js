#!/usr/bin/env node
/**
 * Automated Digital Ocean Deployment Script (v2 - Cloud-Init)
 *
 * This version uses cloud-init to set up everything automatically
 * No SSH keys needed!
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const DO_API_TOKEN = process.env.DIGITALOCEAN_TOKEN;
const DROPLET_NAME = process.env.DROPLET_NAME || 'bev-fundraiser';
const REGION = process.env.DROPLET_REGION || 'nyc3';
const SIZE = process.env.DROPLET_SIZE || 's-1vcpu-512mb-10gb'; // $4/month
const IMAGE = process.env.DROPLET_IMAGE || 'ubuntu-22-04-x64';

const doAPI = axios.create({
  baseURL: 'https://api.digitalocean.com/v2',
  headers: {
    'Authorization': `Bearer ${DO_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Read .env file and create startup script
const envContent = fs.readFileSync('.env', 'utf8');

// Create cloud-init user data script
const userData = `#!/bin/bash

# Log everything
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting The Bev Fundraiser setup..."

# Update system
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs git

# Create app directory
mkdir -p /root/bev-fundraiser
cd /root/bev-fundraiser

# Create package.json
cat > package.json << 'PACKAGE_JSON_EOF'
${fs.readFileSync('package.json', 'utf8')}
PACKAGE_JSON_EOF

# Create .env file
cat > .env << 'ENV_EOF'
${envContent}
ENV_EOF

# Create fundraiser-updater.js
cat > fundraiser-updater.js << 'UPDATER_EOF'
${fs.readFileSync('fundraiser-updater.js', 'utf8')}
UPDATER_EOF

# Create fundraiser-scheduler.js
cat > fundraiser-scheduler.js << 'SCHEDULER_EOF'
${fs.readFileSync('fundraiser-scheduler.js', 'utf8')}
SCHEDULER_EOF

# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Start the application
pm2 start fundraiser-scheduler.js --name bev-fundraiser

# Configure PM2 to start on boot
pm2 startup systemd -u root --hp /root
pm2 save

echo "Setup complete! The Bev Fundraiser is now running."
echo "IP Address: $(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)"
`;

async function deploy() {
  console.log('🎉 Starting Digital Ocean Deployment for The Bev Fundraiser\n');
  console.log('⚠️  This will create a $4/month droplet on your Digital Ocean account.');
  console.log('    Press Ctrl+C within 5 seconds to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    if (!DO_API_TOKEN) {
      throw new Error('DIGITALOCEAN_TOKEN not found in .env file');
    }

    console.log('✓ Digital Ocean API token found\n');

    console.log('🚀 Creating droplet with auto-setup...');
    console.log(`   Name: ${DROPLET_NAME}`);
    console.log(`   Size: ${SIZE} ($4/month)`);
    console.log(`   Region: ${REGION}`);
    console.log(`   Using cloud-init for automatic setup\n`);

    const response = await doAPI.post('/droplets', {
      name: DROPLET_NAME,
      region: REGION,
      size: SIZE,
      image: IMAGE,
      backups: false,
      ipv6: false,
      monitoring: true,
      tags: ['bev-fundraiser'],
      user_data: userData
    });

    const droplet = response.data.droplet;
    console.log(`✓ Droplet created! ID: ${droplet.id}`);

    // Wait for droplet to get an IP
    console.log('\n⏳ Waiting for droplet to boot and get IP address...');
    let ip = null;
    let attempts = 0;

    while (!ip && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await doAPI.get(`/droplets/${droplet.id}`);
      const updatedDroplet = statusResponse.data.droplet;

      if (updatedDroplet.status === 'active' && updatedDroplet.networks.v4.length > 0) {
        ip = updatedDroplet.networks.v4[0].ip_address;
      } else {
        process.stdout.write('.');
        attempts++;
      }
    }

    if (!ip) {
      throw new Error('Failed to get droplet IP address');
    }

    console.log(`\n✓ Droplet is active! IP: ${ip}`);

    console.log('\n⏳ Setting up application via cloud-init...');
    console.log('   This takes ~3-5 minutes. The script is running automatically.');
    console.log('   Node.js is being installed, code is being deployed, PM2 is starting...\n');

    // Wait for setup to complete
    console.log('   Waiting for setup to complete...');
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      process.stdout.write('.');
    }

    console.log('\n\n🎉 ✅ DEPLOYMENT COMPLETE! ✅ 🎉\n');
    console.log('Your Bev Fundraiser droplet has been created and is setting itself up!');
    console.log('\n📊 Droplet Details:');
    console.log(`   Name: ${DROPLET_NAME}`);
    console.log(`   IP Address: ${ip}`);
    console.log(`   Cost: $4/month`);
    console.log(`   Dashboard: https://cloud.digitalocean.com/droplets/${droplet.id}`);

    console.log('\n⏰ Timeline:');
    console.log('   NOW:      Droplet is running, installing software automatically');
    console.log('   ~5 mins:  Application should be fully running');
    console.log('   Noon:     First Vestaboard update will occur');

    console.log('\n🔍 To Check Progress:');
    console.log('   1. Go to: https://cloud.digitalocean.com/droplets/' + droplet.id);
    console.log('   2. Click "Console" to access the droplet');
    console.log('   3. Login as root (no password needed in console)');
    console.log('   4. Run: tail -f /var/log/user-data.log');
    console.log('   5. Run: pm2 status  (to check if app is running)');

    console.log('\n📝 Useful Commands (via Console):');
    console.log('   View setup log:     tail -f /var/log/user-data.log');
    console.log('   Check PM2 status:   pm2 status');
    console.log('   View app logs:      pm2 logs bev-fundraiser');
    console.log('   Restart app:        pm2 restart bev-fundraiser');

    console.log('\n💡 Next Steps:');
    console.log('   1. Wait ~5 minutes for setup to complete');
    console.log('   2. Access console and run: pm2 status');
    console.log('   3. If running, you\'re all set!');
    console.log('   4. If not, check: tail -f /var/log/user-data.log for errors');

    console.log('\n🎯 Your app will update Vestaboards:');
    console.log('   - Every 25 minutes');
    console.log('   - From noon to 10pm daily');
    console.log('   - Automatically pulling from Google Sheets');

  } catch (error) {
    console.error('\n\n❌ Deployment failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

deploy();
