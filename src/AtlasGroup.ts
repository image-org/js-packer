import Spritesheet from './Spritesheet';
import {MultiBinPacker} from './MultiBinPacker';
import ScaledSprite from './ScaledSprite';
import Queue from './Queue';
import {ICache, IImageProcessor, ILayoutConfig, Logger, SpritesheetExportConfig} from './generator';

export default class AtlasGroup {
  public spritesheets: Spritesheet[];
  public hash: string;

  public scaledSprites: ScaledSprite[];
  public layoutConfig: ILayoutConfig;
  public exportConfig: SpritesheetExportConfig;

  private cache: ICache;
  private imageProcessor: IImageProcessor;
  private log: Logger;

  constructor(scaledSprites: ScaledSprite[],
              layoutConfig: ILayoutConfig, exportConfig: SpritesheetExportConfig,
              cache: ICache, imageProcessor: IImageProcessor, log: Logger) {
    this.scaledSprites = scaledSprites;
    this.layoutConfig = layoutConfig;
    this.exportConfig = exportConfig;
    this.cache = cache;
    this.imageProcessor = imageProcessor;
    this.log = log;
    this.spritesheets = [];
    this.hash = this.calculateHash();
  }

  private calculateHash(): string {
    let str = this.scaledSprites.map(i => i.hash).sort().join(` `);
    str += JSON.stringify(this.layoutConfig, null, 2);
    str += JSON.stringify(this.exportConfig, null, 2);
    return this.cache.createHash(str);
  }

  public process(queue: Queue): Promise<Spritesheet[]> {

    const packer = new MultiBinPacker(
      this.layoutConfig.max_width,
      this.layoutConfig.max_height,
      this.layoutConfig.padding);

    packer.addArray(this.scaledSprites.map(scaledSprite => {
      return {
        width: scaledSprite.trim ? scaledSprite.trim.width : scaledSprite.width,
        height: scaledSprite.trim ? scaledSprite.trim.height : scaledSprite.height,
        data: scaledSprite
      };
    }));

    if (this.layoutConfig.oversized_warning) {
      packer.oversizedElements.map(bin => {
        this.log.warn('Oversized sprite: ' + (bin as any).data.sprite.path +
          ' with size ' + bin.width + 'x' + bin.height);
      })
    }

    this.spritesheets = packer.bins.map(bin => {
      return new Spritesheet(this, bin, this.exportConfig, this.cache, this.imageProcessor);
    });

    return Promise.all(this.spritesheets.map(spritesheet => {
      return queue.add(() => spritesheet.process());
    }));
  }
}

