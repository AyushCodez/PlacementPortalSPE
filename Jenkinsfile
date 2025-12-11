pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_CREDS = credentials('dockerhub-creds')
        DOCKER_CREDS_ID = 'dockerhub-creds'
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
                sh "ansible-playbook -i inventory.ini deploy.yml --extra-vars 'docker_user=${DOCKER_CREDS_USR}'"
            }
        }
    }

    post {
        always {
            script {
                echo 'Cleaning up Docker images...'
            }
        }
        success {
            echo 'Pipeline executed successfully!'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
