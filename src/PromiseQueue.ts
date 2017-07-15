const resolveWith = function (value: any): Promise<any> {
  if (value && typeof value.then === 'function') {
    return value;
  }

  return new Promise(function (resolve) {
    resolve(value);
  });
};

/**
 * It limits concurrently executed promises
 * @example
 *
 * var queue = new Queue(1);
 *
 * queue.add(function () {
     *     // resolve of this promise will resume next request
     *     return downloadTarballFromGithub(url, file);
     * })
 * .then(function (file) {
     *     doStuffWith(file);
     * });
 *
 * queue.add(function () {
     *     return downloadTarballFromGithub(url, file);
     * })
 * // This request will be paused
 * .then(function (file) {
     *     doStuffWith(file);
     * });
 */

export default class PromiseQueue {
  private queue: {
    promiseGenerator: () => Promise<any>,
    resolve: (data: any) => void,
    reject: (error: any) => void,
  }[];
  private maxQueuedPromises: any;
  private pendingPromises: number;
  private maxPendingPromises: number;

  /**
   * @param [maxPendingPromises=Infinity] max number of concurrently executed promises
   * @param [maxQueuedPromises=Infinity]  max number of queued promises
   */
  constructor(maxPendingPromises?: number, maxQueuedPromises?: number) {
    this.pendingPromises = 0;
    this.maxPendingPromises = typeof maxPendingPromises !== 'undefined' ? maxPendingPromises : Infinity;
    this.maxQueuedPromises = typeof maxQueuedPromises !== 'undefined' ? maxQueuedPromises : Infinity;
    this.queue = [];
  }

  public add<T>(promiseGenerator: () => Promise<T>): Promise<T> {
    const self = this;
    return new Promise<T>(function (resolve, reject) {
      // Do not queue to much promises
      if (self.queue.length >= self.maxQueuedPromises) {
        reject(new Error('Queue limit reached'));
        return;
      }

      // Add to queue
      self.queue.push({
        promiseGenerator: promiseGenerator,
        resolve: resolve,
        reject: reject
      });

      self._dequeue();
    });
  }

  /**
   * Number of simultaneously running promises (which are resolving)
   */
  public getPendingLength(): number {
    return this.pendingPromises;
  }

  /**
   * Number of queued promises (which are waiting)
   */
  public  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * @returns true if first item removed from queue
   */
  private _dequeue(): boolean {
    const self = this;
    if (this.pendingPromises >= this.maxPendingPromises) {
      return false;
    }

    // Remove from queue
    const item = this.queue.shift();
    if (!item) {
      return false;
    }

    try {
      this.pendingPromises++;

      resolveWith(item.promiseGenerator())
      // Forward all stuff
        .then(function (value: any) {
          // It is not pending now
          self.pendingPromises--;
          // It should pass values
          item.resolve(value);
          self._dequeue();
        }, function (err: any) {
          // It is not pending now
          self.pendingPromises--;
          // It should not mask errors
          item.reject(err);
          self._dequeue();
        });
    } catch (err) {
      self.pendingPromises--;
      item.reject(err);
      self._dequeue();
    }

    return true;
  }
}

