import {IRect as BinRect} from './MultiBinPacker';

export interface Size {
  width: number;
  height: number;
}

export interface Dictionary<T> {
  [key: string]: T
}

export interface IImageProcessor {

  getSize(path: string): Promise<Size>;

  scale(input: string, output: string, scale: { width: number, height: number }): Promise<void>;

  trim(input: string, output: string, fuzz?: string): Promise<IRect>;

  combine(rects: BinRect[], width: number, height: number, outputFileName: string,
          exportConfig: SpritesheetExportConfig): Promise<void>
}

export interface ILayoutConfig {
  max_width: number;
  max_height: number;
  padding: number;
  oversized_warning: boolean;
}

export interface ICache {
  lookup(type: string, key: string, cacheMissFunction: () => any, version?: any): Promise<any>;
  getCachePath(basename: string): string;
  calculateHash(path: string): Promise<string>;
  createHash(string: string): string;
}

export interface Logger {
  assert(value: any, message?: string, ...optionalParams: any[]): void;

  error(message?: any, ...optionalParams: any[]): void;

  info(message?: any, ...optionalParams: any[]): void;

  log(message?: any, ...optionalParams: any[]): void;

  trace(message?: any, ...optionalParams: any[]): void;

  warn(message?: any, ...optionalParams: any[]): void;
}

export interface ConvertOptions {
  scaleX?: number,
  scaleY?: number,
  dontExtent?: boolean,
  maxWidth?: number,
  maxHeight?: number,
  trim?: boolean
}

export interface IRect {
  x: number,
  y: number,
  height: number,
  width: number
}

export interface ITrim {
  width: number,
  height: number,
  trim?: IRect,
  path: string
}

export interface LoadingInformation {
  path: string,
  position: {
    x: number,
    y: number
  },
  dimension: {
    w: number,
    h: number
  },
  trim: {
    x: number,
    y: number,
    w: number,
    h: number,
  } | null
}

export interface SpritesheetExportConfig {
  ext?: 'jpeg' | 'png'
}

export interface AtlasInputNotResolved {
  files: {
    path: string | string[],
    convertOption: ConvertOptions
  }[],
  layoutConfig: ILayoutConfig,
  exportConfig: SpritesheetExportConfig,
}

export interface AtlasInput {
  files: {
    path: string,
    convertOption: ConvertOptions
  }[],
  layoutConfig: ILayoutConfig,
  exportConfig: SpritesheetExportConfig,
}

export interface AtlasOutput {
  sheets: {
    sprites: LoadingInformation[],
    path: string,
    hash: string
    width: number,
    height: number,
  }[]
}

export interface IGeneratorOutput {
  atlases: AtlasOutput[]
}
