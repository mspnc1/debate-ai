import { AppState, type AppStateStatus } from 'react-native';
import { ErrorService } from '@/services/errors/ErrorService';

export type LifecycleTransitionReason = 'inactive' | 'background' | 'foreground';

export interface AppLifecycleHandler {
  id: string;
  onBackground?: (reason: LifecycleTransitionReason) => void | Promise<void>;
  onForeground?: () => void | Promise<void>;
  onInactive?: () => void | Promise<void>;
}

export class AppLifecycleService {
  private static handlers = new Map<string, AppLifecycleHandler>();
  private static subscription: { remove: () => void } | null = null;
  private static currentState: AppStateStatus = AppState.currentState;

  static start(): () => void {
    if (!this.subscription) {
      this.currentState = AppState.currentState;
      this.subscription = AppState.addEventListener('change', this.handleStateChange);
    }

    return () => this.stop();
  }

  static stop(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  static register(handler: AppLifecycleHandler): () => void {
    this.handlers.set(handler.id, handler);
    return () => {
      this.handlers.delete(handler.id);
    };
  }

  static async flushBackground(reason: LifecycleTransitionReason = 'background'): Promise<void> {
    await this.runHandlers(handler => handler.onBackground?.(reason), reason);
  }

  static async reconcileForeground(): Promise<void> {
    await this.runHandlers(handler => handler.onForeground?.(), 'foreground');
  }

  static getCurrentState(): AppStateStatus {
    return this.currentState;
  }

  private static handleStateChange = (nextState: AppStateStatus): void => {
    const previousState = AppLifecycleService.currentState;
    AppLifecycleService.currentState = nextState;

    if (nextState === 'active' && previousState !== 'active') {
      void AppLifecycleService.reconcileForeground();
      return;
    }

    if (nextState === 'inactive') {
      void AppLifecycleService.runHandlers(handler => handler.onInactive?.(), 'inactive');
      void AppLifecycleService.flushBackground('inactive');
      return;
    }

    if (nextState === 'background') {
      void AppLifecycleService.flushBackground('background');
    }
  };

  private static async runHandlers(
    run: (handler: AppLifecycleHandler) => void | Promise<void>,
    reason: LifecycleTransitionReason
  ): Promise<void> {
    const handlers = Array.from(this.handlers.values());
    await Promise.allSettled(
      handlers.map(async handler => {
        try {
          await run(handler);
        } catch (error) {
          ErrorService.handleSilent(error, {
            action: 'AppLifecycleService.runHandlers',
            handlerId: handler.id,
            reason,
          });
        }
      })
    );
  }
}
