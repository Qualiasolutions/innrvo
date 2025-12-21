/**
 * Creates a debounced function that delays invoking the provided function
 * until after `wait` milliseconds have elapsed since the last time it was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per `wait` milliseconds, on the leading edge.
 *
 * This is ideal for preventing duplicate API calls from rapid button clicks.
 * The function fires immediately, then blocks subsequent calls for `wait` ms.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to wait between invocations
 * @returns A throttled version of the function
 */
export function throttleLeading<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let isThrottled = false;

  return (...args: Parameters<T>) => {
    if (isThrottled) return;

    func(...args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
    }, wait);
  };
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per `wait` milliseconds, on the trailing edge.
 *
 * The function fires after `wait` ms have passed since the last call.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to wait between invocations
 * @returns A throttled version of the function
 */
export function throttleTrailing<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;

    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
        }
        timeoutId = null;
        lastArgs = null;
      }, wait);
    }
  };
}

/**
 * Creates a debounced async function that returns a promise.
 * Only the last call within the wait period will execute.
 *
 * @param func - The async function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((reason?: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        // Reject the pending promise
        if (pendingReject) {
          pendingReject(new Error('Debounced: superseded by newer call'));
        }
      }

      pendingResolve = resolve;
      pendingReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (pendingResolve) {
            pendingResolve(result);
          }
        } catch (error) {
          if (pendingReject) {
            pendingReject(error);
          }
        } finally {
          timeoutId = null;
          pendingResolve = null;
          pendingReject = null;
        }
      }, wait);
    });
  };
}
