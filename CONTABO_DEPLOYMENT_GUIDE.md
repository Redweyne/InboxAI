# Complete Beginner's Guide: Deploy Inbox AI to Contabo VPS

## 🎯 What You'll Accomplish
By the end of this guide, you'll have your Inbox AI application running on your Contabo VPS, accessible via your own domain with SSL security.

---

## 📋 BEFORE YOU START: Get These Ready

### 1. Your Contabo VPS Access Details
After purchasing, Contabo will email you:
- **Server IP Address** (e.g., 123.45.67.89)
- **Root Password**
- **SSH Port** (usually 22)

### 2. Domain Name (Optional but Recommended)
- Buy a domain from Namecheap, GoDaddy, or Cloudflare
- Point it to your Contabo IP address (we'll explain how)

### 3. Google OAuth Credentials (for Gmail/Calendar sync)
We'll get these together in Step 5.

### 4. Gemini API Key (for AI features)
We'll get this together in Step 6.

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Connect to Your VPS

**On Windows:**
1. Download [PuTTY](https://www.putty.org/)
2. Open PuTTY
3. Enter your server IP in "Host Name"
4. Port: 22
5. Click "Open"
6. Login as: `root`
7. Password: (paste the password from Contabo's email)

**On Mac/Linux:**
1. Open Terminal
2. Type: `ssh root@YOUR_SERVER_IP`
3. Enter password when prompted

✅ **You're now connected!** You should see a command prompt like `root@vps-name:~#`

---

### Step 2: Update Your Server

Copy and paste these commands one at a time:

```bash
# Update package lists
apt update

# Upgrade all packages (this may take a few minutes)
apt upgrade -y
```

⏱️ **Wait time:** 2-5 minutes

---

### Step 3: Install Required Software

#### 3.1 Install Node.js 20
```bash
# Download Node.js installer
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node --version
npm --version
```

✅ **Should show:** v20.x.x and npm version

#### 3.2 Install PostgreSQL Database
```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql
```

#### 3.3 Install Git
```bash
# Install Git
apt install -y git

# Verify installation
git --version
```

#### 3.4 Install Nginx (Web Server)
```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx
```

#### 3.5 Install PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2
```

---

### Step 4: Set Up the Database

#### 4.1 Create Database and User
```bash
# Switch to PostgreSQL user
sudo -u postgres psql
```

You're now in the PostgreSQL shell. Run these commands:

```sql
CREATE DATABASE inbox_ai;
CREATE USER inbox_user WITH ENCRYPTED PASSWORD 'ChangeThisToASecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE inbox_ai TO inbox_user;
\q
```

**💡 IMPORTANT:** Replace `ChangeThisToASecurePassword123!` with your own strong password. Save it - you'll need it later!

✅ **Database created!**

---

### Step 5: Get Google OAuth Credentials

#### 5.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Inbox AI" → Click "Create"
4. Wait for the project to be created (30 seconds)

#### 5.2 Enable Required APIs
1. In the search bar, type "Gmail API" → Click it → Click "Enable"
2. In the search bar, type "Google Calendar API" → Click it → Click "Enable"

#### 5.3 Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Configure Consent Screen"
   - User Type: **External** → Click "Create"
   - App name: **Inbox AI**
   - User support email: **Your email**
   - Developer contact: **Your email**
   - Click "Save and Continue"
   - Scopes: Click "Save and Continue" (skip for now)
   - Test users: Click "Save and Continue"
   - Click "Back to Dashboard"

3. Click "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: **Inbox AI Web Client**
   - Authorized redirect URIs: Click "Add URI"
     - If using domain: `https://yourdomain.com/api/auth/google/callback`
     - If using IP only: `http://YOUR_SERVER_IP/api/auth/google/callback`
   - Click "Create"

4. **SAVE THESE!** You'll see:
   - **Client ID:** (looks like: 123456789-abc.apps.googleusercontent.com)
   - **Client Secret:** (looks like: GOCSPX-abc123...)

📝 **Save both in a notepad!**

---

### Step 6: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select "Create API key in new project"
4. Click "Create API Key in New Project"
5. **Copy the API key** (looks like: AIzaSy...)

📝 **Save this key in your notepad!**

---

### Step 7: Download Your Application

```bash
# Create directory for web applications
mkdir -p /var/www

# Go to that directory
cd /var/www

# Clone your application (you'll need to upload it to GitHub first)
# OR download from Replit
```

**📥 Getting Your Code to the VPS:**

**Option A: From GitHub**
1. On Replit, click "Version Control" → "Connect to GitHub"
2. Push your code to a new repository
3. On VPS, run: `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git inbox-ai`

**Option B: Direct Upload from Replit**
1. On Replit, click the three dots menu → "Download as zip"
2. Use an SFTP client like [FileZilla](https://filezilla-project.org/) to upload to `/var/www/inbox-ai`
3. Or use this command on VPS: `cd /var/www && wget YOUR_DOWNLOAD_LINK -O inbox-ai.zip && unzip inbox-ai.zip && mv FOLDER_NAME inbox-ai`

**For now, let's assume you'll use GitHub (easier). I'll help you set that up if needed.**

Once your code is in `/var/www/inbox-ai`:

```bash
# Go to application directory
cd /var/www/inbox-ai

# Install dependencies
npm install
```

⏱️ **Wait time:** 2-3 minutes

---

### Step 8: Configure Environment Variables

#### 8.1 Create .env file
```bash
nano .env
```

#### 8.2 Paste this (replace the values!)

```env
NODE_ENV=production
PORT=5000

# Replace with your domain OR server IP
APP_URL=http://YOUR_SERVER_IP
# If you have a domain: APP_URL=https://yourdomain.com

# Database - use the password you created in Step 4
DATABASE_URL=postgresql://inbox_user:ChangeThisToASecurePassword123!@localhost:5432/inbox_ai

# Google OAuth - paste from Step 5
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Gemini API - paste from Step 6
GEMINI_API_KEY=your_gemini_api_key_here
```

**To save in nano:**
1. Press `Ctrl + X`
2. Press `Y`
3. Press `Enter`

---

### Step 9: Build and Start the Application

```bash
# Build the production version
npm run build
```

⏱️ **Wait time:** 1-2 minutes

```bash
# Push database schema
npm run db:push
```

✅ **Database schema created!**

```bash
# Start the application with PM2
pm2 start npm --name "inbox-ai" -- start

# Make PM2 start on server reboot
pm2 startup
pm2 save
```

✅ **Your app is now running!**

Check if it's working:
```bash
pm2 status
```

You should see `inbox-ai` with status `online`.

---

### Step 10: Configure Nginx Reverse Proxy

#### 10.1 Create Nginx configuration
```bash
nano /etc/nginx/sites-available/inbox-ai
```

#### 10.2 Paste this configuration

**If using a domain:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**If using IP only:**
```nginx
server {
    listen 80 default_server;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save: `Ctrl + X`, then `Y`, then `Enter`

#### 10.3 Enable the site
```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Enable your site
ln -s /etc/nginx/sites-available/inbox-ai /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

### Step 11: Configure Firewall

```bash
# Allow SSH (important - don't lock yourself out!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Enable firewall
ufw enable

# Check status
ufw status
```

**⚠️ Important:** Make sure SSH (22) is allowed before enabling firewall!

---

### Step 12: Set Up SSL (HTTPS) - Domain Only

**Skip this if you're using IP address only**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
1. Enter your email
2. Agree to terms: `Y`
3. Share email: `N` (or `Y` if you want)
4. Redirect HTTP to HTTPS: `2` (recommended)

✅ **SSL installed!** Your site now uses HTTPS

---

### Step 13: Point Your Domain to VPS (If Using Domain)

**On Namecheap:**
1. Log in → Domain List → Manage
2. Advanced DNS
3. Add/Edit A Record:
   - Host: `@`
   - Value: `YOUR_SERVER_IP`
   - TTL: Automatic
4. Add/Edit A Record:
   - Host: `www`
   - Value: `YOUR_SERVER_IP`
   - TTL: Automatic

**On Cloudflare:**
1. DNS → Records
2. Add record:
   - Type: `A`
   - Name: `@`
   - IPv4: `YOUR_SERVER_IP`
   - Proxy: Orange cloud (enabled)
3. Add record:
   - Type: `A`
   - Name: `www`
   - IPv4: `YOUR_SERVER_IP`
   - Proxy: Orange cloud (enabled)

⏱️ **Wait time:** 5 minutes to 24 hours for DNS propagation

---

## 🎉 TESTING YOUR DEPLOYMENT

### Test 1: Access Your Application
- **With domain:** Open browser → `https://yourdomain.com`
- **With IP:** Open browser → `http://YOUR_SERVER_IP`

You should see the Inbox AI dashboard!

### Test 2: Check Application Status
```bash
pm2 status
pm2 logs inbox-ai
```

### Test 3: Test Google OAuth
1. Click "Sync Now" button
2. You should be redirected to Google login
3. After login, you should return to the dashboard

### Test 4: Test AI Chat
1. Click "Chat" in sidebar
2. Send a message
3. AI should respond

---

## 🔧 MAINTENANCE COMMANDS

### View Application Logs
```bash
pm2 logs inbox-ai
```

### Restart Application
```bash
pm2 restart inbox-ai
```

### Stop Application
```bash
pm2 stop inbox-ai
```

### Check Application Status
```bash
pm2 status
```

### View Server Resources
```bash
htop
# Press Q to exit
```

---

## 🆘 TROUBLESHOOTING

### Issue: Can't access the site

**Check if app is running:**
```bash
pm2 status
```

If stopped, restart:
```bash
pm2 restart inbox-ai
```

**Check if Nginx is running:**
```bash
systemctl status nginx
```

If not running:
```bash
systemctl start nginx
```

**Check logs:**
```bash
pm2 logs inbox-ai --lines 50
```

---

### Issue: OAuth redirect not working

1. **Verify APP_URL in .env:**
```bash
cd /var/www/inbox-ai
cat .env | grep APP_URL
```

Should match your actual domain or IP.

2. **Update .env:**
```bash
nano .env
# Change APP_URL
# Save: Ctrl+X, Y, Enter
pm2 restart inbox-ai
```

3. **Verify Google Console redirect URI:**
- Go to Google Cloud Console
- Credentials → Your OAuth Client
- Authorized redirect URIs should match: `YOUR_APP_URL/api/auth/google/callback`

---

### Issue: Database connection failed

**Check PostgreSQL status:**
```bash
systemctl status postgresql
```

**Test database connection:**
```bash
psql -U inbox_user -d inbox_ai
# Enter password when prompted
# Type \q to exit
```

---

### Issue: Port 5000 already in use

**Find what's using port 5000:**
```bash
netstat -tlnp | grep 5000
```

**Kill the process:**
```bash
pm2 stop inbox-ai
pm2 start inbox-ai
```

---

### Issue: Application crashes immediately

**View error logs:**
```bash
pm2 logs inbox-ai --err --lines 100
```

**Common fixes:**
1. Missing environment variables
2. Database connection string wrong
3. Database schema not pushed

**Rebuild and restart:**
```bash
cd /var/www/inbox-ai
npm run db:push
pm2 restart inbox-ai
```

---

## 📊 MONITORING YOUR APPLICATION

### Check Resource Usage
```bash
# CPU and Memory
pm2 monit

# Detailed system info
htop
```

### Set Up Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔄 UPDATING YOUR APPLICATION

When you make changes to your code:

```bash
# Go to app directory
cd /var/www/inbox-ai

# Pull latest changes (if using Git)
git pull

# Or upload new files via SFTP

# Install any new dependencies
npm install

# Rebuild
npm run build

# Update database if needed
npm run db:push

# Restart
pm2 restart inbox-ai
```

---

## 💾 BACKUP YOUR DATABASE

Create a backup:
```bash
pg_dump -U inbox_user inbox_ai > /root/backup_$(date +%Y%m%d).sql
```

Restore from backup:
```bash
psql -U inbox_user inbox_ai < /root/backup_20250108.sql
```

---

## 🎯 WHAT'S NEXT?

### Optional Improvements:

1. **Add More Storage** (if you run out)
   - Contabo allows easy storage upgrades

2. **Set Up Automated Backups**
   ```bash
   crontab -e
   # Add this line to backup daily at 2 AM:
   0 2 * * * pg_dump -U inbox_user inbox_ai > /root/backups/backup_$(date +\%Y\%m\%d).sql
   ```

3. **Monitor Uptime**
   - Use services like UptimeRobot (free)
   - Get alerts if your site goes down

4. **Add Persistent Token Storage**
   - Currently, Google OAuth tokens are stored in memory
   - They'll be lost on restart
   - Consider adding database storage for tokens

---

## 📞 GETTING HELP

**Application Logs:**
```bash
pm2 logs inbox-ai
```

**Nginx Logs:**
```bash
tail -f /var/log/nginx/error.log
```

**PostgreSQL Logs:**
```bash
tail -f /var/log/postgresql/postgresql-*.log
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Connected to VPS via SSH
- [ ] Updated system packages
- [ ] Installed Node.js 20
- [ ] Installed PostgreSQL
- [ ] Created database and user
- [ ] Installed Git, Nginx, PM2
- [ ] Obtained Google OAuth credentials
- [ ] Obtained Gemini API key
- [ ] Downloaded application code to `/var/www/inbox-ai`
- [ ] Installed npm dependencies
- [ ] Created .env file with all credentials
- [ ] Built application (`npm run build`)
- [ ] Pushed database schema (`npm run db:push`)
- [ ] Started application with PM2
- [ ] Configured Nginx
- [ ] Configured firewall
- [ ] (Optional) Set up domain DNS
- [ ] (Optional) Installed SSL certificate
- [ ] Tested application access
- [ ] Tested Google OAuth
- [ ] Tested AI chat

---

## 🎉 CONGRATULATIONS!

Your Inbox AI application is now live and running on your Contabo VPS!

**Your app is accessible at:**
- With domain: `https://yourdomain.com`
- With IP: `http://YOUR_SERVER_IP`

---

**Need help? Check the troubleshooting section or review the logs!**
