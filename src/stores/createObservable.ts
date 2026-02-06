/**
 * Observable implementation to replace Svelte stores for React Native
 * Provides subscribe/set pattern compatible with Svelte store interface
 */

export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;

export class Observable<T> {
  private value: T;
  private subscribers = new Set<Subscriber<T>>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  /**
   * Subscribe to value changes
   * @param callback Function called immediately with current value and on each change
   * @returns Unsubscribe function
   */
  subscribe(callback: Subscriber<T>): Unsubscriber {
    this.subscribers.add(callback);
    // Immediately call with current value (Svelte store behavior)
    callback(this.value);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update the value and notify all subscribers
   * @param newValue New value to set
   */
  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.subscribers.forEach(cb => cb(newValue));
    }
  }

  /**
   * Get current value without subscribing
   * @returns Current value
   */
  get(): T {
    return this.value;
  }
}

/**
 * Create a writable observable (compatible with Svelte's writable store)
 * @param initialValue Initial value
 * @returns Observable instance
 */
export function writable<T>(initialValue: T): Observable<T> {
  return new Observable(initialValue);
}

/**
 * TypeScript type compatibility with Svelte stores
 */
export type Writable<T> = Observable<T>;
