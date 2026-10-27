
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'joshithachilukuri/food-order-management:v1'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/joshi440/FoodOrderManagement.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t %DOCKER_IMAGE% .'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_TOKEN'
                )]) {
                    bat 'echo %DOCKER_TOKEN% | docker login -u %DOCKER_USER% --password-stdin'
                }
            }
        }

        stage('Push Image to Docker Hub') {
            steps {
                bat 'docker push %DOCKER_IMAGE%'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl apply -f deployment.yaml'
                bat 'kubectl apply -f service.yaml'
                bat 'kubectl rollout status deployment/food-order-deployment --timeout=120s'
            }
        }
    }

    post {
        success {
            echo 'FoodOrderManagement pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the Console Output.'
        }

        always {
            echo 'Pipeline execution finished.'
        }
    }
}
