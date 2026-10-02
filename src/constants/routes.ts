/**
 * Every in-app navigation target, defined once. Screens call these helpers
 * instead of building path strings inline, so renaming a route file is a
 * one-line change here and the compiler finds every caller.
 */
export const NEW_ID = 'new';

export const Routes = {
  dashboard: '/',
  log: '/log',
  library: '/library',
  tools: '/tools',
  settings: '/settings',
  exercise: (id: number | typeof NEW_ID) => `/exercise/${id}`,
  set: (id: number) => `/set/${id}`,
  dashboardCards: '/manage/dashboard-cards',
  logs: '/manage/logs',
} as const;
