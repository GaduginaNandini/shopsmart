// 3.6 Jenkins pipeline: checkout, build, test, package. Trigger: GitHub webhook (Settings > Webhooks > http://<jenkins>/github-webhook/)
pipeline {
  agent any
  triggers { githubPush() }
  environment { IMAGE = "shopsmart:${env.BUILD_NUMBER}" }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build') {
      steps {
        sh 'python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt'
      }
    }
    stage('Lint & Security') {
      steps { sh '. .venv/bin/activate && pylint app --fail-under=8.0 && bandit -r app -q' }
    }
    stage('Test') {
      steps { sh '. .venv/bin/activate && pytest --cov=app --cov-report=xml --cov-fail-under=80 --junitxml=junit.xml' }
      post { always { junit 'junit.xml' } }
    }
    stage('Package') { steps { sh 'docker build -t $IMAGE .' } }
  }
  post { always { archiveArtifacts artifacts: 'coverage.xml', allowEmptyArchive: true } }
}
