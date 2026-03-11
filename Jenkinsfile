pipeline {
    agent any
    
    environment {
        // Paths for the remote host
        DEPLOY_HOST = 'grimlock@web1'
        DEPLOY_DIR_BIN = '/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/bin'
        DEPLOY_DIR_LOGS = '/var/www/vhosts/api-shopfiy-price-tracker.truvis.co/logs'

        // Cloudflare auth (bound in environment credentials)
        CLOUDFLARE_API_TOKEN = credentials('cloudflare-api-token')
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
                sh "scp -o StrictHostKeyChecking=no _env.example ${DEPLOY_HOST}:${DEPLOY_DIR_BIN}/config.ini.example"
                
                // Copy the systemd unit and template config to their paths using sudo, set permissions, and restart
                sh """ssh -o StrictHostKeyChecking=no ${DEPLOY_HOST} '
                    sudo mkdir -p /etc/api-shopfiy-price-tracker.truvis.co &&
                    if [ ! -f /etc/api-shopfiy-price-tracker.truvis.co/config.ini ]; then
                        sudo cp ${DEPLOY_DIR_BIN}/config.ini.example /etc/api-shopfiy-price-tracker.truvis.co/config.ini
                    fi &&
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
