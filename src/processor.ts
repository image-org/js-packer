import {
  AtlasInput, AtlasInputNotResolved,
  ConvertOptions, IGeneratorOutput, IImageProcessor, LoadingInformation,
  Logger, Dictionary, ICache
} from './generator';
import Queue from './Queue';
import Sprite from './Sprite';
import AtlasGroup from './AtlasGroup';
import ScaledSprite from './ScaledSprite';

function resolvePaths(input: AtlasInputNotResolved[], resolver: (arg: string | string[]) => Promise<string[]>): Promise<AtlasInput[]> {
  const atlases: AtlasInput[] = [];
  return Promise
    .all(input.map(a => {
      const atlas: AtlasInput = {
        files: [],
        layoutConfig: a.layoutConfig,
        exportConfig: a.exportConfig,
      };
      atlases.push(atlas);
      return Promise
        .all(a.files.map(file => {
          return resolver(file.path)
            .then((arr: string[]) => {
              arr.map(path => {
                atlas.files.push({
                  path: path,
                  convertOption: file.convertOption
                })
              })
            });
        }))
    }))
    .then(() => atlases);
}

function resolverExt<T>(arg: T | T[], resolver: (t: T) => Promise<T[]>): Promise<T[]> {
  const promises: Promise<T[]>[] = [];

  if (Array.isArray(arg)) {
    arg.forEach(f => {
      promises.push(resolver(f));
    })
  }
  else {
    promises.push(resolver(arg));
  }

  return Promise.all(promises)
    .then((arr2: T[][]) => {
      const items: T[] = [];
      arr2.map(arr1 => {
        arr1.map(path => {
          items.push(path);
        })
      });
      return items;
    });
}

export function spriteProcess(atlasesNR: AtlasInputNotResolved[],
                              concurrency: number,
                              cache: ICache,
                              imageProcessor: IImageProcessor,
                              log: Logger,
                              resolver?: (s: string) => Promise<string[]>): Promise<IGeneratorOutput> {

  const filesToConverts: Dictionary<ConvertOptions[]> = {};
  let filePaths: string[];
  let sprites: Sprite[];
  const atlasGroups: AtlasGroup[] = [];
  let atlases: AtlasInput[];
  const queue = new Queue(concurrency);

  return Promise.resolve()
    .then(() => {
      return resolvePaths(atlasesNR, (args) => {
        return resolverExt<string>(args, resolver ? resolver : (p) => Promise.resolve([p]))
      })
    })
    .then(a => {
      atlases = a;
      atlases.forEach(atlas => {
        atlas.files.forEach(file => {
          if (!filesToConverts[file.path]) {
            filesToConverts[file.path] = [];
          }
          const converts = filesToConverts[file.path];
          converts.push(file.convertOption);
        });
      });

      filePaths = Object.keys(filesToConverts);

      // instantiate all Sprite
      sprites = filePaths.map(filePath => {
        return new Sprite(filePath, filesToConverts[filePath], cache, imageProcessor);
      });
    })
    .then(() => {
      // process all Sprite
      return Promise.all(sprites.map(sprite => sprite.process(queue)))
    })
    .then(() => {
      // instantiate all AtlasGroup
      atlases.forEach(atlas => {
        const scaledSprites: ScaledSprite[] = [];
        atlas.files.forEach(file => {
          const sprite = sprites.find(s => s.path === file.path);
          if (sprite) {
            const scaledSprite = sprite.scaledSprites.find(s => s.convertOptions === file.convertOption);
            if (scaledSprite) {
              scaledSprites.push(scaledSprite);
            }
          }
        });
        const atlasGroup: AtlasGroup = new AtlasGroup(scaledSprites, atlas.layoutConfig,
          atlas.exportConfig, cache, imageProcessor, log);
        atlasGroups.push(atlasGroup);
      });
    })
    .then(() => {
      // process all AtlasGroup
      return Promise.all(atlasGroups.map(atlasGroup => atlasGroup.process(queue)));
    })
    .then(() => {
      // fill output model
      const output: IGeneratorOutput = {
        atlases: [] as any
      };
      atlasGroups.forEach(atlasGroup => {
        const sheets: {
          sprites: LoadingInformation[],
          path: string,
          hash: string,
          width: number,
          height: number
        }[] = [];
        atlasGroup.spritesheets.forEach(spritesheet => {
          sheets.push({
            sprites: spritesheet.loadingInformation,
            path: spritesheet.cachedImagePath,
            hash: spritesheet.hash,
            width: spritesheet.width,
            height: spritesheet.height,
          } as any);
        });
        output.atlases.push({sheets});
      });
      return output;
    });
}
