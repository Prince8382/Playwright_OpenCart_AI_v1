pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['db', 'api', 'web', 'e2e', 'datadriven', 'sanity', 'regression', 'master'].join('\n'),
            description: 'Choose a Playwright suite to run.'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'node --version'
                sh 'npm ci'
            }
        }

        stage('Run Playwright tests') {
            steps {
                script {
                    if (params.TEST_SUITE == 'db') {
                        sh 'npx playwright test tests/db --project=chromium'
                    } else if (params.TEST_SUITE == 'e2e') {
                        sh 'npx playwright test tests/web/endToEndShoppingFlow.spec.ts --project=opencart-local --project=tutorialsninja --project=awesomeqa --workers=1'
                    } else {
                        sh "npm run test:${params.TEST_SUITE} -- --project=chromium"
                    }
                }
            }
        }
    }

    post {
        always {
            junit testResults: 'reports/results.xml', allowEmptyResults: true
            archiveArtifacts(
                artifacts: 'reports/**,custom-report/**,allure-results/**,test-results/**',
                allowEmptyArchive: true
            )
        }
    }
}
