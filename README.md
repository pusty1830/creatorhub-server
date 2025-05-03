✨ Features
✅ User Authentication

JWT-based registration/login

Role-based access (User & Admin)

✅ Credit Points System

Users earn credits for:

Daily logins

Profile completion

Interacting with posts

Admins can manage user balances

✅ Multi-Platform Feed Aggregation

Fetches posts from Reddit and Twitter

Users can:

Save posts

Share content

Report inappropriate posts

✅ Dashboard

User View: Credit stats, saved posts, activity log

Admin View: Analytics, user management

🛠 Tech Stack
Category	Technology
Backend	Node.js, Express
Database	MongoDB (Atlas)
Cache	Redis
Auth	JWT
APIs	Reddit API, Twitter API
Deployment	AWS EC2
📋 Prerequisites
Before starting, ensure you have:

Node.js v16+ (Download)

MongoDB Atlas account (Sign Up)

Twitter Developer Account (Apply)

Reddit API Access (Docs)

AWS Account (for deployment)

💻 Local Setup
1. Clone the Repository
bash
https://github.com/pusty1830/creatorhub-server
3. Install Dependencies
bash
npm install
🔑 Environment Variables
Create a .env file in the root directory:

env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/feed-aggregator
TWITTER_BEARER_TOKEN=your_twitter_api_bearer_token
JWT_SECRET_KEY=your_jwt_secret_key_here
REDIS_URL=redis://localhost:6379
CACHE_TTL=900  # Cache expires in 15 minutes
🚀 Running the Server
bash
npm start
Access the API at: http://localhost:3000

☁ AWS Deployment
1. EC2 Setup
Go to AWS Console → EC2 → Launch Instance

Choose Ubuntu 22.04 LTS

Select t2.micro (Free Tier)

Configure Security Group:

Allow HTTP (80), HTTPS (443), SSH (22)

Launch and download the .pem key

2. SSH & Install Dependencies
bash
# Connect to EC2
chmod 400 your-key.pem
ssh -i "your-key.pem" ubuntu@ec2-xx-xx-xx-xx.compute-1.amazonaws.com

# Update & Install Dependencies
sudo apt update
sudo apt install -y nodejs npm redis-server
3. Clone & Configure the App
bash
git clone https://github.com/yourusername/social-feed-aggregator.git
cd social-feed-aggregator
npm install --production

# Set up .env (use nano/vim)
sudo nano .env
Paste your production credentials (MongoDB URI, Twitter token, etc.).

4. Run with PM2 (Process Manager)
bash
sudo npm install -g pm2
pm2 start src/index.js --name "feed-aggregator"
pm2 save
pm2 startup  # Auto-start on reboot
5. Nginx Reverse Proxy (Optional)
bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/feed-aggregator
Add:

nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
Enable the config:

bash
sudo ln -s /etc/nginx/sites-available/feed-aggregator /etc/nginx/sites-enabled
sudo nginx -t  # Test config
sudo systemctl restart nginx
