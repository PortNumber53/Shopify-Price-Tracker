pipeline {
    agent any
    
    environment {
        // Paths for the remote host
        DEPLOY_HOST = 'grimlock@web1'
        DEPLOY_DIR_BIN = '/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/bin'
        DEPLOY_DIR_LOGS = '/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/logs'

        // Cloudflare auth (bound in environment credentials)
        CLOUDFLARE_API_TOKEN = credentials('cloudflare-api-token')

        // App Secrets bound in environment credentials
        DATABASE_URL = credentials('database-url-shopify-price-tracker')
        BACKEND_URL = credentials('backend-url-shopify-price-tracker')
        FRONTEND_URL = credentials('frontend-url-shopify-price-tracker')
        STRIPE_SECRET_KEY = credentials('stripe-secret-key-shopify-price-tracker')
        STRIPE_WEBHOOK_SECRET = credentials('stripe-webhook-secret-shopify-price-tracker')
        STRIPE_WEBHOOK_URL_PATH = credentials('stripe-webhook-url-path-shopify-price-tracker')
        JWT_SECRET = credentials('jwt-secret-shopify-price-tracker')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend & Deploy to Cloudflare') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                    
                    // Deploy to cloudflare workers using wrangler inside the frontend dir
                    // Assumes wrangler is installed globally or as a devDependency in frontend package.json
                    sh 'npx wrangler deploy --name shopify-price-tracker'
                }
            }
        }

        stage('Build Backend') {
            steps {
                dir('backend') {
                    // Build the go binary specifically for Linux architecture if host is Linux
                    sh 'GOOS=linux GOARCH=amd64 go build -o bin/api main.go'
                }
            }
        }

        stage('Deploy Backend (SSH)') {
            steps {
                // Ensure target directories exist on the server
                sh "ssh -o StrictHostKeyChecking=no ${DEPLOY_HOST} 'mkdir -p ${DEPLOY_DIR_BIN} ${DEPLOY_DIR_LOGS}'"

                // Secure copy the newly built binary and systemd service file to grimlock@web1
                sh "scp -o StrictHostKeyChecking=no backend/bin/api ${DEPLOY_HOST}:${DEPLOY_DIR_BIN}/api"
                sh "scp -o StrictHostKeyChecking=no backend/api-shopify-price-tracker.service ${DEPLOY_HOST}:${DEPLOY_DIR_BIN}/api-shopify-price-tracker.service"
                
                // Generate config.ini securely using Jenkins variables
                sh '''cat <<EOF > backend/config.ini
PORT=20911
GIN_MODE=release
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
STRIPE_METADATA_SAAS_ID=shopify_price_tracker
STRIPE_WEBHOOK_URL_PATH=${STRIPE_WEBHOOK_URL_PATH}
STRIPE_DEFAULT_PLAN_TYPE=base
FRONTEND_URL=${FRONTEND_URL}
ALLOWED_ORIGINS=${FRONTEND_URL}
LOG_DIR=${DEPLOY_DIR_LOGS}
CONFIG_PATH=/etc/api-shopfiy-price-tracker.truvis.co/config.ini
EOF'''

                // Copy over the generated real configuration
                sh "scp -o StrictHostKeyChecking=no backend/config.ini ${DEPLOY_HOST}:${DEPLOY_DIR_BIN}/config.ini"

                // Copy the systemd unit and template config to their paths using sudo, set permissions, and restart
                sh """ssh -o StrictHostKeyChecking=no ${DEPLOY_HOST} '
                    sudo mkdir -p /etc/api-shopfiy-price-tracker.truvis.co &&
                    sudo cp ${DEPLOY_DIR_BIN}/config.ini /etc/api-shopfiy-price-tracker.truvis.co/config.ini &&
                    sudo rm ${DEPLOY_DIR_BIN}/config.ini &&
                    sudo cp ${DEPLOY_DIR_BIN}/api-shopify-price-tracker.service /etc/systemd/system/api-shopify-price-tracker.service &&
                    sudo chmod 644 /etc/systemd/system/api-shopify-price-tracker.service &&
                    sudo systemctl daemon-reload &&
                    sudo systemctl enable api-shopify-price-tracker.service &&
                    sudo systemctl restart api-shopify-price-tracker.service
                '"""
            }
        }
    }

    post {
        success {
            echo "🚀 Deployment completed successfully!"
        }
        failure {
            echo "❌ Deployment failed. Please review the logs."
        }
    }
}
