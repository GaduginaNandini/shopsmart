pipeline {
  agent any

  tools {
    nodejs 'Node22'
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('TypeScript Validation') {
      steps {
        sh 'npm run typecheck'
      }
    }

    stage('Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('Automated Tests') {
      steps {
        sh 'npm run test:coverage'
      }
    }

    stage('Production Build') {
      steps {
        sh 'npm run build'
      }
    }
  }

  post {
    success {
      echo 'ShopSmart Jenkins pipeline completed successfully.'
    }
    failure {
      echo 'ShopSmart Jenkins pipeline failed. Review stage logs above.'
    }
  }
}
