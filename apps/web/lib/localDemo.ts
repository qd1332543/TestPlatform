export function isLocalDemo() {
  return process.env.METEORTEST_LOCAL_DEMO === '1'
}

const now = new Date()
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

export const demoProjects = [
  {
    id: 'demo-project-ios',
    key: 'ios-automation-framework',
    name: 'iOS-Automation-Framework',
    repo_url: 'https://github.com/JunchenMeteor/iOS-Automation-Framework',
    description: 'Public-safe sample automation project connected through meteortest.yml.',
    created_at: minutesAgo(240),
    test_suites: [
      { id: 'suite-api-smoke', name: 'api_smoke', suite_key: 'api_smoke', type: 'pytest', command: 'pytest -m smoke' },
      { id: 'suite-ui-smoke', name: 'ui_smoke', suite_key: 'ui_smoke', type: 'appium', command: 'pytest -m ui_smoke' },
      { id: 'suite-regression', name: 'release_regression', suite_key: 'release_regression', type: 'pytest', command: 'pytest -m regression' },
    ],
  },
  {
    id: 'demo-project-web',
    key: 'web-console-smoke',
    name: 'MeteorTest Web Console',
    repo_url: 'https://github.com/JunchenMeteor/MeteorTest',
    description: 'Demo project for Web console preview, report analysis, and AI operation flows.',
    created_at: minutesAgo(360),
    test_suites: [
      { id: 'suite-console-smoke', name: 'console_smoke', suite_key: 'console_smoke', type: 'next', command: 'npm run build' },
      { id: 'suite-preview-boundary', name: 'preview_boundary', suite_key: 'preview_boundary', type: 'next', command: 'npm run smoke:public-preview' },
    ],
  },
]

export const demoTasks = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'failed',
    environment: 'staging',
    created_at: minutesAgo(16),
    started_at: minutesAgo(15),
    finished_at: minutesAgo(11),
    projects: { name: 'iOS-Automation-Framework', key: 'ios-automation-framework' },
    test_suites: { name: 'api_smoke', suite_key: 'api_smoke', command: 'pytest -m smoke' },
    executors: { name: 'local-agent-demo' },
    parameters: {
      display_name: 'API smoke against local mock service',
      failure_category: 'environment',
      safe_demo: true,
      pytest: { passed: 5, failed: 1, deselected: 2, exit_code: 1 },
    },
    reports: [{
      summary: 'One smoke assertion failed because the target API returned a synthetic timeout response.',
      log_url: 'https://example.com/meteortest/demo-log.txt',
      allure_url: 'https://example.com/meteortest/allure',
      created_at: minutesAgo(10),
    }],
    ai_analyses: [{
      failure_reason: 'The mock API returned a timeout for the profile endpoint.',
      impact: 'Blocks confidence for the staging smoke path, but does not indicate a product regression yet.',
      suggestion: 'Rerun the suite after confirming API_BASE_URL and mock service readiness.',
      flaky_probability: 0.24,
    }],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'running',
    environment: 'dev',
    created_at: minutesAgo(8),
    started_at: minutesAgo(7),
    finished_at: null,
    projects: { name: 'MeteorTest Web Console', key: 'web-console-smoke' },
    test_suites: { name: 'preview_boundary', suite_key: 'preview_boundary', command: 'npm run smoke:public-preview' },
    executors: { name: 'local-agent-demo' },
    parameters: {
      display_name: 'Public preview boundary smoke',
      safe_demo: true,
      pytest: { passed: 0, failed: 0, deselected: 0 },
    },
    reports: [],
    ai_analyses: [],
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'succeeded',
    environment: 'dev',
    created_at: minutesAgo(42),
    started_at: minutesAgo(41),
    finished_at: minutesAgo(38),
    projects: { name: 'iOS-Automation-Framework', key: 'ios-automation-framework' },
    test_suites: { name: 'api_smoke', suite_key: 'api_smoke', command: 'pytest -m smoke' },
    executors: { name: 'local-agent-demo' },
    parameters: {
      display_name: 'API smoke baseline',
      safe_demo: true,
      pytest: { passed: 6, failed: 0, deselected: 2, exit_code: 0 },
    },
    reports: [{
      summary: 'All API smoke checks passed against the deterministic local mock API.',
      log_url: 'https://example.com/meteortest/success-log.txt',
      allure_url: 'https://example.com/meteortest/allure-success',
      created_at: minutesAgo(37),
    }],
    ai_analyses: [],
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    status: 'queued',
    environment: 'staging',
    created_at: minutesAgo(3),
    started_at: null,
    finished_at: null,
    projects: { name: 'MeteorTest Web Console', key: 'web-console-smoke' },
    test_suites: { name: 'console_regression', suite_key: 'console_regression', command: 'npm run test:e2e' },
    executors: null,
    parameters: { display_name: 'Console regression queue check', safe_demo: true },
    reports: [],
    ai_analyses: [],
  },
]

export const demoExecutors = [
  {
    id: 'executor-local-demo',
    name: 'local-agent-demo',
    type: 'local',
    status: 'offline',
    capabilities: ['pytest', 'appium', 'api-smoke'],
    last_heartbeat_at: minutesAgo(35),
  },
  {
    id: 'executor-preview-runner',
    name: 'preview-runner',
    type: 'local',
    status: 'busy',
    capabilities: ['next-smoke', 'public-preview'],
    last_heartbeat_at: minutesAgo(2),
  },
]

export const demoBuilds = [
  {
    id: 'build-ios-1024',
    platform: 'ios',
    version: '1.8.0',
    build_number: '1024',
    artifact_url: 'https://example.com/demo/ios-app.ipa',
    created_at: minutesAgo(120),
    projects: { name: 'iOS-Automation-Framework' },
  },
  {
    id: 'build-web-preview',
    platform: 'web',
    version: 'preview',
    build_number: 'b813e11',
    artifact_url: 'https://meteortest.jcmeteor.com/',
    created_at: minutesAgo(90),
    projects: { name: 'MeteorTest Web Console' },
  },
]
