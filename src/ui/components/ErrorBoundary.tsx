import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GENERIC_ERROR_MESSAGE } from '@/constants/bootstrap';
import { LogSource } from '@/constants/enums';
import { logger } from '@/services/Logger';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Centered } from './Screen';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Last line of defense: a crash while RENDERING any screen lands here instead
 * of a white screen. It logs the error and the React component stack, then
 * offers "Try again" (which re-renders the tree from scratch).
 * React only supports error boundaries as classes, hence the class component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(LogSource.Ui, 'Render error caught by ErrorBoundary', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <Centered>
        <AppText variant="title">Something broke</AppText>
        <AppText variant="muted" style={{ textAlign: 'center' }}>
          {GENERIC_ERROR_MESSAGE}
        </AppText>
        <AppButton label="Try again" onPress={() => this.setState({ failed: false })} />
      </Centered>
    );
  }
}
