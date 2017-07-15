import Sprite from './Sprite';
import {ConvertOptions, ICache, IImageProcessor, IRect, ITrim} from './generator';

export default class ScaledSprite {
  public trim?: IRect;
  public width: number;
  public height: number;
  public sprite: Sprite;
  public path: string;
  public convertOptions: ConvertOptions;

  private cache: ICache;
  private imageProcessor: IImageProcessor;

  constructor(sprite: Sprite, convertOptions: ConvertOptions, cache: ICache, imageProcessor: IImageProcessor) {
    this.sprite = sprite;
    this.convertOptions = convertOptions;
    this.cache = cache;
    this.imageProcessor = imageProcessor;
  }

  private get scaleHash() {
    const c = this.convertOptions;
    return `${c.trim ? 't' : ''}_${c.maxHeight}_${c.maxWidth}_${c.scaleX}_${c.scaleY}_${c.dontExtent}`;
  }

  private get basename() {
    return `scaled_sprite_${this.sprite.hash}_${this.scaleHash}.png`;
  }

  private cacheMiss(): Promise<ITrim> {
    const c = this.convertOptions;
    const scaleX = c.scaleX === undefined || c.scaleY == null ? 1 : c.scaleX;
    const scaleY = c.scaleY === undefined || c.scaleY == null ? 1 : c.scaleY;
    const dontExtent = !!c.dontExtent;
    const maxWidth = c.maxWidth === undefined || c.maxWidth == null ? 0 : c.maxWidth;
    const maxHeight = c.maxHeight === undefined || c.maxHeight == null ? 0 : c.maxHeight;

    let w = this.sprite.width * scaleX;
    let h = this.sprite.height * scaleY;
    if (maxWidth > 0 && maxHeight > 0) {
      if (!dontExtent) {
        if (w < maxWidth) {
          h = maxWidth * h / w;
          w = maxWidth;
        }
        if (h < maxHeight) {
          w = maxHeight * w / h;
          h = maxHeight;
        }
      }
      if (w > maxWidth) {
        h = maxWidth * h / w;
        w = maxWidth;
      }
      if (h > maxHeight) {
        w = maxHeight * w / h;
        h = maxHeight;
      }
    }
    const width = Math.round(w);
    const height = Math.round(h);
    const path = this.cache.getCachePath(this.basename);

    return this.imageProcessor
      .scale(this.sprite.path, path, {width, height})
      .then(() => {
        if (this.convertOptions.trim) {
          return this.imageProcessor.trim(path, path);
        } else {
          return {x: 0, y: 0, height, width};
        }
      })
      .then((trim: IRect) => {
        let t: IRect | undefined = trim;
        if (trim.x === 0 && trim.y === 0 && trim.width === width && trim.height === height) {
          t = undefined;
        }
        return {width, height, trim: t, path};
      });
  }

  public get hash() {
    return `${this.sprite.hash}_${this.scaleHash}`;
  }

  private cacheInterpret(data: ITrim) {
    this.width = data.width;
    this.height = data.height;
    this.trim = data.trim;
    this.path = data.path;
  }

  public process(): Promise<this> {
    const key = `${this.sprite.hash}_${this.scaleHash}`;
    return this.cache.lookup('scaledSprite', key, this.cacheMiss.bind(this))
      .then(this.cacheInterpret.bind(this))
      .then(() => this);
  };
}
