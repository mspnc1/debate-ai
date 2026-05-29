import { AppState } from 'react-native';
import { AppLifecycleService } from '@/services/lifecycle/AppLifecycleService';

describe('AppLifecycleService', () => {
  let changeHandler: ((state: 'active' | 'inactive' | 'background') => void) | undefined;
  let removeSpy: jest.Mock;

  beforeEach(() => {
    removeSpy = jest.fn();
    changeHandler = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
      changeHandler = handler as typeof changeHandler;
      return { remove: removeSpy };
    });
  });

  afterEach(() => {
    AppLifecycleService.stop();
    jest.restoreAllMocks();
  });

  it('runs background and foreground handlers for app state transitions', async () => {
    const onBackground = jest.fn();
    const onForeground = jest.fn();

    AppLifecycleService.start();
    const unregister = AppLifecycleService.register({
      id: 'test-handler',
      onBackground,
      onForeground,
    });

    changeHandler?.('background');
    await Promise.resolve();
    expect(onBackground).toHaveBeenCalledWith('background');

    changeHandler?.('active');
    await Promise.resolve();
    expect(onForeground).toHaveBeenCalledTimes(1);

    unregister();
    changeHandler?.('background');
    await Promise.resolve();
    expect(onBackground).toHaveBeenCalledTimes(1);
  });

  it('removes the native AppState subscription when stopped', () => {
    AppLifecycleService.start();
    AppLifecycleService.stop();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
