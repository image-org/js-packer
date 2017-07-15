import PromiseQueue from './PromiseQueue'

export default class Queue {
  private queue: PromiseQueue;
  private remaining: number;

  constructor(concurrency: number) {
    this.queue = new PromiseQueue(concurrency);
    this.remaining = 0;
  }

  public add<T>(generator: () => Promise<T>): Promise<T> {
    this.remaining++;
    return this.queue.add(generator)
      .then(result => {
        this.remaining--;
        return result;
      });
  }
}
