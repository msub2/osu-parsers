import { Beatmap, Storyboard, Score, IBeatmap, IScore, HitObject, IHoldableObject, HitSample, ISlidableObject, SliderPath, ControlPointInfo, BeatmapDifficultySection, ISpinnableObject } from 'osu-classes';

/**
 * Beatmap decoder without fs functions
 */
declare class BeatmapDecoder {
  /**
   * Current section name.
   */
  private _sectionName;
  /**
   * Current offset for all time values.
   */
  private _offset;
  /**
   * Current beatmap lines.
   */
  private _lines;
  /**
   * Current storyboard lines.
   */
  private _sbLines;
  /**
   * Performs beatmap decoding from a string.
   * @param str String with beatmap data.
   * @param parseSb Should a storyboard be parsed?
   * @returns Decoded beatmap.
   */
  decodeFromString(str: string, parseSb?: boolean): Beatmap;
  /**
   * Performs beatmap decoding from a string array.
   * @param data Array of split lines.
   * @param parseSb Should a storyboard be parsed?
   * @returns Decoded beatmap.
   */
  decodeFromLines(data: string[], parseSb?: boolean): Beatmap;
  private _parseLine;
  private _parseSectionData;
}

/**
 * Storyboard decoder.
 */
declare class StoryboardDecoder {
  /**
   * Current storyboard element.
   */
  private _element;
  /**
   * Current storyboard compound.
   */
  private _compound;
  /**
   * Current storyboard command.
   */
  private _command;
  /**
   * Current storyboard lines.
   */
  private _lines;
  /**
   * Performs storyboard decoding from a string.
   * @param str String with storyboard data.
   * @returns Decoded storyboard.
   */
  decodeFromString(str: string): Storyboard;
  /**
   * Performs storyboard decoding from a string array.
   * @param data Array of split lines.
   * @returns Decoded storyboard.
   */
  decodeFromLines(data: string[]): Storyboard;
  private _parseLine;
  private _parseStoryboardData;
  private _parseDepth0;
  private _parseDepth1;
  private _parseDepth2;
}

/**
 * Score decoder.
 */
declare class ScoreDecoder {
  /**
   * Performs score decoding from a buffer.
   * @param buffer Buffer with score data.
   * @param parseReplay Should replay be parsed?
   * @returns Decoded score.
   */
  decodeFromBuffer(buffer: Buffer, parseReplay?: boolean): Promise<Score>;
  private _parseScoreId;
}

/**
 * Beatmap encoder.
 */
declare class BeatmapEncoder {
  /**
   * Performs beatmap encoding to a string.
   * @param beatmap Beatmap for encoding.
   * @returns A string with encoded beatmap data.
   */
  encodeToString(beatmap?: IBeatmap): string;
}

/**
 * Storyboard encoder.
 */
declare class StoryboardEncoder {
  /**
   * Performs storyboard encoding to a string.
   * @param storyboard Storyboard for encoding.
   * @returns A string with encoded storyboard data.
   */
  encodeToString(storyboard?: Storyboard): string;
}

/**
 * Score encoder.
 */
declare class ScoreEncoder {
  /**
   * Performs score encoding to a buffer.
   * @param score Score info for encoding.
   * @returns A buffer with encoded score & replay data.
   */
  encodeToBuffer(score: IScore): Promise<Buffer>;
}

/**
 * A hittable object.
 */
declare class HittableObject extends HitObject {
}

/**
 * A holdable object.
 */
declare class HoldableObject extends HitObject implements IHoldableObject {
  /**
   * The time at which the holdable object ends.
   */
  endTime: number;
  /**
   * The samples to be played when each node of the holdable object is hit.
   * 0: The first node.
   * 1: The first repeat.
   * 2: The second repeat.
   * ...
   * n-1: The last repeat.
   * n: The last node.
   */
  nodeSamples: HitSample[][];
  /**
   * The duration of the holdable object.
   */
  get duration(): number;
  /**
   * Creates a copy of this holdable object.
   * Non-primitive properties will be copied via their own clone() method.
   * @returns A copied holdable object.
   */
  clone(): this;
}

/**
 * A parsed slidable object.
 */
declare class SlidableObject extends HitObject implements ISlidableObject {
  /**
   * Scoring distance with a speed-adjusted beat length of 1 second
   * (ie. the speed slider balls move through their track).
   */
  static BASE_SCORING_DISTANCE: number;
  /**
   * The duration of this slidable object.
   */
  get duration(): number;
  /**
   * The time at which the slidable object ends.
   */
  get endTime(): number;
  /**
   * The amount of times the length of this slidable object spans.
   */
  get spans(): number;
  set spans(value: number);
  /**
   * The duration of a single span of this slidable object.
   */
  get spanDuration(): number;
  /**
   * The positional length of a slidable object.
   */
  get distance(): number;
  set distance(value: number);
  /**
   * The amount of times a slidable object repeats.
   */
  repeats: number;
  /**
   * Velocity of this slidable object.
   */
  velocity: number;
  /**
   * The curve of a slidable object.
   */
  path: SliderPath;
  /**
   * The last tick offset of slidable objects in osu!stable.
   */
  legacyLastTickOffset: number;
  /**
   * The samples to be played when each node of the slidable object is hit.
   * 0: The first node.
   * 1: The first repeat.
   * 2: The second repeat.
   * ...
   * n-1: The last repeat.
   * n: The last node.
   */
  nodeSamples: HitSample[][];
  applyDefaultsToSelf(controlPoints: ControlPointInfo, difficulty: BeatmapDifficultySection): void;
  /**
   * Creates a copy of this parsed slider.
   * Non-primitive properties will be copied via their own clone() method.
   * @returns A copied parsed slider.
   */
  clone(): this;
}

/**
 * A parsed spinnable object.
 */
declare class SpinnableObject extends HitObject implements ISpinnableObject {
  /**
   * The time at which the spinnable object ends.
   */
  endTime: number;
  /**
   * The duration of this spinnable object.
   */
  get duration(): number;
  /**
   * Creates a copy of this parsed spinner.
   * Non-primitive properties will be copied via their own clone() method.
   * @returns A copied parsed spinner.
   */
  clone(): this;
}

export { BeatmapDecoder, BeatmapEncoder, HittableObject, HoldableObject, ScoreDecoder, ScoreEncoder, SlidableObject, SpinnableObject, StoryboardDecoder, StoryboardEncoder };
