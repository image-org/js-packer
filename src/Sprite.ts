import ScaledSprite from './ScaledSprite';
import Queue from './Queue';
import {ConvertOptions, ICache, IImageProcessor, Size} from './generator';

export default class Sprite {
  public scaledSprites: ScaledSprite[];
  public hash: string;
  public width: number;
  public height: number;
  public path: string;

  private convertOptions: ConvertOptions[];
  private cache: ICache;
  private imageProcessor: IImageProcessor;

  constructor(spritePath: string, convertOptions: ConvertOptions[],
              cache: ICache, imageProcessor: IImageProcessor) {
    this.cache = cache;
    this.imageProcessor = imageProcessor;
    this.path = spritePath;
    this.convertOptions = convertOptions;
  }

  private calculateSize(): Promise<Size> {
    return this.imageProcessor.getSize(this.path);
  }

  private createAndProcessScaledVersions(queue: Queue): Promise<ScaledSprite[]> {
    this.scaledSprites = this.convertOptions.map((convertOption) => {
      return new ScaledSprite(this, convertOption, this.cache, this.imageProcessor);
    });
    return Promise.all(this.scaledSprites.map(scaledSprite => {
      return queue.add(() => scaledSprite.process());
    }));
  }

  private calculateHash(): Promise<void> {
    return this.cache.calculateHash(this.path).then(hash => {
      this.hash = hash;
    });
  }

  private cacheMiss(): Promise<{ width: number, height: number }> {
    return this.calculateSize()
      .then(size => {
        return {
          width: size.width,
          height: size.height
        };
      });
  }

  private cacheInterpret(data: { width: number, height: number }) {
    this.width = data.width;
    this.height = data.height;
  }

  public process(queue: Queue): Promise<this> {
    return this.calculateHash()
      .then(() => this.cache.lookup('sprite', this.hash, this.cacheMiss.bind(this)))
      .then(this.cacheInterpret.bind(this))
      .then(() => this.createAndProcessScaledVersions(queue))
      .then(() => this);
  }
}
