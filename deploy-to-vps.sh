#!/bin/bash

# Deployment script for VPS
# Run this ON YOUR VPS after pushing code from Replit

set -e  # Exit on any error

echo "================================================"
echo "  InboxAI - VPS Deployment Script"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this from /var/www/InboxAI"
    exit 1
fi

echo "✓ Found package.json"
echo ""

# Pull latest code
echo "📥 Pulling latest code from Git..."
git pull origin main || {
    echo "❌ Git pull failed. Please resolve conflicts manually."
    exit 1
}
echo "✓ Code updated"
echo ""

# Install dependencies (in case any changed)
echo "📦 Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Build the application
echo "🔨 Building application..."
npm run build || {
    echo "❌ Build failed. Please check the error above."
    exit 1
}
echo "✓ Build completed"
echo ""

# Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart InboxAI
echo "✓ PM2 restarted"
echo ""

# Wait a moment for the app to start
echo "⏳ Waiting for app to start..."
sleep 3
echo ""

# Test the debug endpoint
echo "🧪 Testing debug endpoint..."
RESPONSE=$(curl -s http://localhost:5000/api/auth/debug)

if echo "$RESPONSE" | grep -q "redirectUri"; then
    echo "✓ Debug endpoint working!"
    echo ""
    echo "Redirect URI configuration:"
    echo "$RESPONSE" | grep -o '"redirectUri":"[^"]*"' | cut -d'"' -f4
else
    echo "❌ Debug endpoint returned unexpected response:"
    echo "$RESPONSE"
    echo ""
    echo "The app might not have started correctly. Check PM2 logs:"
    echo "  pm2 logs InboxAI --lines 50"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Deployment Successful!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Copy the redirect URI above"
echo "2. Add it to Google Cloud Console > Credentials"
echo "3. Wait 2-3 minutes for Google's changes to propagate"
echo "4. Test 'Sync Now' on your website"
echo ""
echo "To view logs: pm2 logs InboxAI"
echo "To check status: pm2 status"
echo ""
