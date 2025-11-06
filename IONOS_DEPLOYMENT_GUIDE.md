# IONOS VPS Deployment Guide for Inbox AI

## Pre-Deployment Checklist ✓

### 1. Required Environment Variables
You'll need to set these on your IONOS VPS:

#### Database (PostgreSQL)
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/inbox_ai
```

#### Google OAuth (Gmail & Calendar)
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

#### AI Service (Gemini)
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Application URL
```bash
APP_URL=https://yourdomain.com
# OR if using IP: APP_URL=http://your.server.ip.address
NODE_ENV=production
PORT=5000
```

---

## Step-by-Step IONOS VPS Deployment

### Step 1: Prepare Your VPS
1. SSH into your IONOS VPS:
   ```bash
   ssh root@your-server-ip
   ```

2. Update system packages:
   ```bash
   apt update && apt upgrade -y
   ```

3. Install Node.js 20.x:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   ```

4. Install PostgreSQL:
   ```bash
   apt install -y postgresql postgresql-contrib
   ```

5. Install Git:
   ```bash
   apt install -y git
   ```

### Step 2: Set Up PostgreSQL Database
1. Switch to postgres user:
   ```bash
   sudo -u postgres psql
   ```

2. Create database and user:
   ```sql
   CREATE DATABASE inbox_ai;
   CREATE USER inbox_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE inbox_ai TO inbox_user;
   \q
   ```

### Step 3: Set Up Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: Add `https://yourdomain.com/api/auth/google/callback`
7. Save your Client ID and Client Secret

### Step 4: Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Save it for your environment variables

### Step 5: Deploy Application to VPS
1. Clone your repository:
   ```bash
   cd /var/www
   git clone your-repository-url inbox-ai
   cd inbox-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   nano .env
   ```

4. Add all environment variables:
   ```env
   NODE_ENV=production
   PORT=5000
   APP_URL=https://yourdomain.com
   DATABASE_URL=postgresql://inbox_user:your_secure_password@localhost:5432/inbox_ai
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```

5. Build the application:
   ```bash
   npm run build
   ```

6. Push database schema:
   ```bash
   npm run db:push
   ```

### Step 6: Set Up Process Manager (PM2)
1. Install PM2:
   ```bash
   npm install -g pm2
   ```

2. Start the application:
   ```bash
   pm2 start npm --name "inbox-ai" -- start
   ```

3. Set PM2 to start on boot:
   ```bash
   pm2 startup
   pm2 save
   ```

### Step 7: Set Up Nginx Reverse Proxy
1. Install Nginx:
   ```bash
   apt install -y nginx
   ```

2. Create Nginx configuration:
   ```bash
   nano /etc/nginx/sites-available/inbox-ai
   ```

3. Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

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

4. Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/inbox-ai /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

### Step 8: Set Up SSL with Let's Encrypt
1. Install Certbot:
   ```bash
   apt install -y certbot python3-certbot-nginx
   ```

2. Get SSL certificate:
   ```bash
   certbot --nginx -d yourdomain.com
   ```

3. Follow the prompts to complete SSL setup

### Step 9: Configure Firewall
```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
```

### Step 10: Verify Deployment
1. Visit your domain: `https://yourdomain.com`
2. Test Google OAuth by clicking "Sync Now"
3. Test AI chat functionality
4. Check PM2 status: `pm2 status`
5. View logs: `pm2 logs inbox-ai`

---

## Maintenance Commands

### View Application Logs
```bash
pm2 logs inbox-ai
```

### Restart Application
```bash
pm2 restart inbox-ai
```

### Update Application
```bash
cd /var/www/inbox-ai
git pull
npm install
npm run build
npm run db:push
pm2 restart inbox-ai
```

### Database Backup
```bash
pg_dump -U inbox_user inbox_ai > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Issue: OAuth redirect not working
- Verify `APP_URL` in .env matches your domain exactly
- Check Google Console authorized redirect URIs
- Ensure Nginx proxy headers are set correctly

### Issue: Database connection failed
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check DATABASE_URL format
- Test connection: `psql -U inbox_user -d inbox_ai`

### Issue: Application not starting
- Check logs: `pm2 logs inbox-ai`
- Verify all environment variables are set
- Check port 5000 is not in use: `netstat -tlnp | grep 5000`

### Issue: AI chat not working
- Verify GEMINI_API_KEY is valid
- Check API quota in Google AI Studio
- Review application logs for errors

---

## Current Status ✓

✅ Application code is VPS-ready
✅ OAuth redirects support custom domains (APP_URL)
✅ Database schema is configured
✅ Build scripts are working
✅ All integrations are coded and ready

**Missing (you need to configure on VPS):**
- Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Gemini API key (GEMINI_API_KEY)
- Production database connection (DATABASE_URL)
- Domain configuration (APP_URL)

---

## Notes
- The app uses port 5000 by default
- Gmail and Calendar sync requires user OAuth authentication
- AI features use Google Gemini (free tier available)
- Database is PostgreSQL (required for production)
- All tokens are stored in memory (will be lost on restart - you may want to add persistent token storage later)
