pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_CREDS = credentials('dockerhub-creds')
        DOCKER_CREDS_ID = 'dockerhub-creds'
        EMAIL_CREDS = credentials('email-creds')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    def services = [
                        'auth-service': './services/auth-service',
                        'campaign-service': './services/campaign-service',
                        'assessment-service': './services/assessment-service',
                        'student-service': './services/student-service',
                        'dashboard-service': './services/dashboard-service',
                        'gateway': './services/gateway',
                        'client': './client'
                    ]

                    services.each { serviceName, path ->
                        echo "Building ${serviceName}..."
                        sh "docker build -t ${DOCKER_CREDS_USR}/${serviceName}:${BUILD_NUMBER} -t ${DOCKER_CREDS_USR}/${serviceName}:latest ${path}"
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', "${DOCKER_CREDS_ID}") {
                        def services = [
                            'auth-service',
                            'campaign-service',
                            'assessment-service',
                            'student-service',
                            'dashboard-service',
                            'gateway',
                            'client'
                        ]

                        services.each { serviceName ->
                            echo "Pushing ${serviceName}..."
                            sh "docker push ${DOCKER_CREDS_USR}/${serviceName}:${BUILD_NUMBER}"
                            sh "docker push ${DOCKER_CREDS_USR}/${serviceName}:latest"
                        }
                    }
                }
            }
        }

        stage('Trigger Ansible Deployment') {
            steps {
                echo "Triggering Ansible Playbook..."
                sh "ansible --version"
                script {
                    def emailUserB64 = sh(script: "echo -n '${EMAIL_CREDS_USR}' | base64", returnStdout: true).trim()
                    def emailPassB64 = sh(script: "echo -n '${EMAIL_CREDS_PSW}' | base64", returnStdout: true).trim()
                    sh "ansible-playbook -i inventory.ini deploy.yml --extra-vars 'docker_user=${DOCKER_CREDS_USR} email_user_b64=${emailUserB64} email_pass_b64=${emailPassB64}'"
                }
            }
        }

        stage('Port Forward Services') {
            steps {
                script {
                    echo "Setting up port forwarding..."
                    withEnv(['JENKINS_NODE_COOKIE=dontKillMe', 'BUILD_ID=dontKillMe']) {
                        // Kill existing port-forwards to avoid conflicts
                        sh "pkill -f 'kubectl.*port-forward' || true"

                        // Start new port-forwards
                        sh "nohup minikube kubectl -- port-forward svc/gateway 5000:5000 --address 0.0.0.0 > /dev/null 2>&1 &"
                        sh "nohup minikube kubectl -- port-forward svc/client 3000:3000 --address 0.0.0.0 > /dev/null 2>&1 &"
                        sh "nohup minikube kubectl -- port-forward svc/kibana 5601:5601 -n logging --address 0.0.0.0 > /dev/null 2>&1 &"
                    }
                }
            }
        }
    }

    post {
        success {
            mail to: "${EMAIL_CREDS_USR}",
                 subject: "SUCCESS: Pipeline '${env.JOB_NAME}' [${env.BUILD_NUMBER}]",
                 body: "The pipeline run was successful. Check the build log here: ${env.BUILD_URL}"
        }
        failure {
            mail to: "${EMAIL_CREDS_USR}",
                 subject: "FAILURE: Pipeline '${env.JOB_NAME}' [${env.BUILD_NUMBER}]",
                 body: "The pipeline run failed. Check the build log for errors: ${env.BUILD_URL}"
        }
    }
}
