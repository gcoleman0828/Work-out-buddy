import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator } from 'react-native';
import { DB_NAME } from '@/constants/bootstrap';
import { LogSource } from '@/constants/enums';
import { migrateDatabase } from '@/db/migrate';
import { RestTimerProvider } from '@/features/timer/RestTimerProvider';
import { installGlobalErrorHandlers } from '@/services/ErrorReporter';
import { logger } from '@/services/Logger';
import { ServicesProvider } from '@/services/ServicesProvider';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';
import { NoticeHost } from '@/ui/components/NoticeHost';
import { Centered } from '@/ui/components/Screen';
import { usePalette } from '@/ui/theme';

// Runs once at module load, before the first render, so even startup errors are captured.
installGlobalErrorHandlers();

function Splash() {
  const p = usePalette();
  return (
    <Centered>
      <ActivityIndicator color={p.primary} />
    </Centered>
  );
}

/** Stack navigator themed from the palette. Tabs hide the stack header (they have their own). */
function ThemedStack() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.card },
        headerTintColor: p.text,
        contentStyle: { backgroundColor: p.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="set/[id]" options={{ title: 'Edit set' }} />
      <Stack.Screen name="manage/dashboard-cards" options={{ title: 'Dashboard cards' }} />
      <Stack.Screen name="manage/logs" options={{ title: 'Diagnostics log' }} />
    </Stack>
  );
}

/**
 * Provider order matters, outermost first:
 *   ErrorBoundary  - catches render crashes anywhere below
 *   Suspense       - shows a spinner while the database opens
 *   SQLiteProvider - opens the DB and runs migrations (onInit) before children render
 *   ServicesProvider - builds services, runs startup, then renders the app
 *   RestTimerProvider - app-wide timer that survives tab switches
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Splash />}>
        <SQLiteProvider
          databaseName={DB_NAME}
          onInit={migrateDatabase}
          onError={(error) => logger.error(LogSource.Database, 'Database failed to open', error)}
          useSuspense
        >
          <ServicesProvider>
            <RestTimerProvider>
              <StatusBar style="auto" />
              <ThemedStack />
              <NoticeHost />
            </RestTimerProvider>
          </ServicesProvider>
        </SQLiteProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
