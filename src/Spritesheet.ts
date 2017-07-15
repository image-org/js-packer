import {ICache, IImageProcessor, LoadingInformation, SpritesheetExportConfig} from './generator';
import {BinaryTreeBin, IRect} from './MultiBinPacker';
import ScaledSprite from './ScaledSprite';
import AtlasGroup from './AtlasGroup';

export default class Spritesheet {
  public outputFilesize: number;
  public loadingInformation: LoadingInformation[];
  public cachedImagePath: string;
  public hash: string;
  public width: number;
  public height: number;

  private bin: BinaryTreeBin;
  private exportConfig: SpritesheetExportConfig;
  private cache: ICache;
  private imageProcessor: IImageProcessor;

  constructor(atlasGroup: AtlasGroup, bin: BinaryTreeBin, exportConfig: SpritesheetExportConfig,
              cache: ICache, imageProcessor: IImageProcessor) {
    this.bin = bin;
    this.exportConfig = exportConfig;
    this.cache = cache;
    this.hash = this.calculateHash(atlasGroup);
    this.imageProcessor = imageProcessor;
  }

  private createImage(cachedImagePath: string): Promise<void> {
    this.width = this.bin.width;
    this.height = this.bin.height;
    return this.imageProcessor.combine(
      this.bin.rects,
      this.width,
      this.height,
      cachedImagePath,
      this.exportConfig
    );
  }

  private createLoadingInformation(): LoadingInformation[] {
    return this.bin.rects.map((rect: IRect) => {
      const scaledSprite = (rect.data as any).data as ScaledSprite;
      const sprite = scaledSprite.sprite;
      const result: LoadingInformation = {
        path: sprite.path,
        position: {
          x: rect.x,
          y: rect.y
        },
        dimension: {
          w: scaledSprite.width,
          h: scaledSprite.height
        },
        trim: null
      };

      if (scaledSprite.trim) {
        result.trim = {
          x: scaledSprite.trim.x,
          y: scaledSprite.trim.y,
          w: scaledSprite.trim.width,
          h: scaledSprite.trim.height
        };
      }

      return result;
    });
  }

  private cacheMiss() {
    const cachedImagePath = this.cache.getCachePath(this.basename);
    return this.createImage(cachedImagePath)
      .then(() => {
        return Promise.all([
          this.createLoadingInformation()
        ]);
      })
      .then(results => {
        const loadingInformation = results[0];
        return {
          cachedImagePath, loadingInformation,
          width: this.width,
          height: this.height
        };
      });
  }

  private cacheInterpret(data: any) {
    this.cachedImagePath = data.cachedImagePath;
    this.loadingInformation = data.loadingInformation;
    this.width = data.width;
    this.height = data.height;
  }

  public get basename(): string {
    return this.hash + '.' + (this.exportConfig.ext ? this.exportConfig.ext : 'png');
  }

  private calculateHash(atlasGroup: AtlasGroup): string {
    let str = atlasGroup.hash;
    str += this.bin.rects.map(rect => {
        return ((rect.data as any).data as ScaledSprite).path + '_' + rect.x + '_' + rect.y;
      }).sort().join(' ') + '_';
    str += JSON.stringify(this.exportConfig, null, 2);
    return this.cache.createHash(str);
  }

  public process(): Promise<this> {
    return this.cache.lookup('spritesheet', this.hash, this.cacheMiss.bind(this), 3)
      .then(this.cacheInterpret.bind(this))
      .then(() => this);
  }
}
