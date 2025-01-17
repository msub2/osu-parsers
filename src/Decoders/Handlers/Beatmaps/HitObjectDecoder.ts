import {
  Vector2,
  SampleBank,
  HitSample,
  PathPoint,
  PathType,
  HitObject,
  HitType,
  HitSound,
  SampleSet,
  Beatmap,
} from 'osu-classes';

import {
  HittableObject,
  HoldableObject,
  SlidableObject,
  SpinnableObject,
} from '../../../Objects';

import { Parsing } from '../../../Utils';

/**
 * A decoder for beatmap hit objects.
 */
export abstract class HitObjectDecoder {
  /**
   * Decodes a hit object line to get a parsed hit object.
   * @param line A hit object line.
   * @param offset The offset to apply to all time values.
   * @returns A new parsed hit object.
   */
  static handleLine(line: string, beatmap: Beatmap, offset: number): void {
    // x,y,time,type,hitSound,objectParams,hitSample

    const data = line.split(',').map((v) => v.trim());

    const hitType = Parsing.parseInt(data[3]);

    const hitObject = HitObjectDecoder.createHitObject(hitType);

    hitObject.startX = Parsing.parseInt(data[0], Parsing.MAX_COORDINATE_VALUE);
    hitObject.startY = Parsing.parseInt(data[1], Parsing.MAX_COORDINATE_VALUE);
    hitObject.startTime = Parsing.parseFloat(data[2]) + offset;
    hitObject.hitType = hitType;
    hitObject.hitSound = Parsing.parseInt(data[4]);

    const bankInfo = new SampleBank();

    HitObjectDecoder.addExtras(data.slice(5), hitObject, bankInfo, offset);

    if (hitObject.samples.length === 0) {
      hitObject.samples = this.convertSoundType(hitObject.hitSound, bankInfo);
    }

    beatmap.hitObjects.push(hitObject);
  }

  /**
   * Adds extra data to the parsed hit object.
   * @param data The data of a hit object line.
   * @param hitObject A parsed hit object.
   * @param bankInfo Sample bank.
   * @param offset The offset to apply to all time values.
   */
  static addExtras(data: string[], hitObject: HitObject, bankInfo: SampleBank, offset: number): void {
    if ((hitObject.hitType & HitType.Normal) && data.length > 0) {
      this.readCustomSampleBanks(data[0], bankInfo);
    }

    if (hitObject.hitType & HitType.Slider) {
      return HitObjectDecoder.addSliderExtras(data, hitObject as SlidableObject, bankInfo);
    }

    if (hitObject.hitType & HitType.Spinner) {
      return HitObjectDecoder.addSpinnerExtras(data, hitObject as SpinnableObject, bankInfo, offset);
    }

    if (hitObject.hitType & HitType.Hold) {
      return HitObjectDecoder.addHoldExtras(data, hitObject as HoldableObject, bankInfo, offset);
    }
  }

  /**
   * Adds slider extra data to a parsed slider.
   * @param extras Extra data of slidable object.
   * @param slider A parsed slider.
   * @param bankInfo Sample bank.
   */
  static addSliderExtras(extras: string[], slider: SlidableObject, bankInfo: SampleBank): void {
    // curveType|curvePoints,slides,length,edgeSounds,edgeSets,hitSample

    const pathString = extras[0];
    const offset = slider.startPosition;

    const repeats = Parsing.parseInt(extras[1]);

    if (slider.repeats > 9000) {
      throw new Error('Repeat count is way too high');
    }

    /**
     * osu!stable treated the first span of the slider as a repeat,
     * but no repeats are happening.
     */
    slider.repeats = Math.max(0, repeats - 1);

    slider.path.controlPoints = HitObjectDecoder.convertPathString(pathString, offset);
    slider.path.curveType = slider.path.controlPoints[0].type as PathType;

    if (extras.length > 2) {
      const length = Parsing.parseFloat(extras[2], Parsing.MAX_COORDINATE_VALUE);

      slider.path.expectedDistance = Math.max(0, length);
    }

    if (extras.length > 5) {
      this.readCustomSampleBanks(extras[5], bankInfo);
    }

    slider.samples = this.convertSoundType(slider.hitSound, bankInfo);
    slider.nodeSamples = this.getSliderNodeSamples(extras, slider, bankInfo);
  }

  /**
   * Adds spinner extra data to a parsed spinner.
   * @param extras Extra data of spinnable object.
   * @param spinner A parsed spinner.
   * @param bankInfo Sample bank.
   * @param offset The offset to apply to all time values.
   */
  static addSpinnerExtras(extras: string[], spinner: SpinnableObject, bankInfo: SampleBank, offset: number): void {
    // endTime,hitSample

    spinner.endTime = Parsing.parseInt(extras[0]) + offset;

    if (extras.length > 1) {
      this.readCustomSampleBanks(extras[1], bankInfo);
    }
  }

  /**
   * Adds hold extra data to a parsed hold.
   * @param extras Extra data of a holdable object.
   * @param hold A parsed hold.
   * @param bankInfo Sample bank.
   * @param offset The offset to apply to all time values.
   */
  static addHoldExtras(extras: string[], hold: HoldableObject, bankInfo: SampleBank, offset: number): void {
    // endTime:hitSample

    hold.endTime = hold.startTime;

    if (extras.length > 0 && extras[0]) {
      const ss = extras[0].split(':');

      hold.endTime = Math.max(hold.endTime, Parsing.parseFloat(ss[0])) + offset;

      this.readCustomSampleBanks(ss.slice(1).join(':'), bankInfo);
    }
  }

  static getSliderNodeSamples(extras: string[], slider: SlidableObject, bankInfo: SampleBank): HitSample[][] {
    /**
     * One node for each repeat + the start and end nodes.
     */
    const nodes = slider.repeats + 2;

    /**
     * Populate node sample bank infos with the default hit object sample bank.
     */
    const nodeBankInfos: SampleBank[] = [];

    for (let i = 0; i < nodes; ++i) {
      nodeBankInfos.push(bankInfo.clone());
    }

    /**
     * Read any per-node sample banks.
     */
    if (extras.length > 4 && extras[4].length > 0) {
      const sets = extras[4].split('|');

      for (let i = 0; i < nodes; ++i) {
        if (i >= sets.length) break;

        this.readCustomSampleBanks(sets[i], nodeBankInfos[i]);
      }
    }

    /**
     * Populate node sound types with the default hit object sound type.
     */
    const nodeSoundTypes: HitSound[] = [];

    for (let i = 0; i < nodes; ++i) {
      nodeSoundTypes.push(slider.hitSound);
    }

    /**
     * Read any per-node sound types.
     */
    if (extras.length > 3 && extras[3].length > 0) {
      const adds = extras[3].split('|');

      for (let i = 0; i < nodes; ++i) {
        if (i >= adds.length) break;

        nodeSoundTypes[i] = parseInt(adds[i]) || HitSound.None;
      }
    }

    /**
     * Generate the final per-node samples.
     */
    const nodeSamples: HitSample[][] = [];

    for (let i = 0; i < nodes; i++) {
      nodeSamples.push(this.convertSoundType(nodeSoundTypes[i], nodeBankInfos[i]));
    }

    return nodeSamples;
  }

  /**
   * Converts a given path string into a set of path control points.
   * 
   * A path string takes the form: X|1:1|2:2|2:2|3:3|Y|1:1|2:2.
   * This has three segments:
   *  X: { (1,1), (2,2) } (implicit segment)
   *  X: { (2,2), (3,3) } (implicit segment)
   *  Y: { (3,3), (1,1), (2, 2) } (explicit segment)
   * 
   * @param pathString The path string.
   * @param offset The positional offset to apply to the control points.
   * @returns All control points in the resultant path.
   */
  static convertPathString(pathString: string, offset: Vector2): PathPoint[] {
    /**
     * This code takes on the responsibility of handling explicit segments of the path ("X" & "Y" from above).
     * Implicit segments are handled by calls to convertPoints().
     */
    const pathSplit = pathString.split('|').map((p) => p.trim());

    const controlPoints: PathPoint[] = [];

    let startIndex = 0;
    let endIndex = 0;
    let isFirst = true;

    while (++endIndex < pathSplit.length) {
      /**
       * Keep incrementing endIndex while it's not the start of a new segment
       * (indicated by having a type descriptor of length 1).
       */
      if (pathSplit[endIndex].length > 1) continue;

      const points = pathSplit.slice(startIndex, endIndex);

      /**
       * Multi-segmented sliders DON'T contain the end point
       * as part of the current segment as it's assumed to be the start of the next segment.
       * The start of the next segment is the index after the type descriptor.
       */
      const endPoint = endIndex < pathSplit.length - 1 ? pathSplit[endIndex + 1] : null;
      const convertedPoints = HitObjectDecoder.convertPoints(points, endPoint, isFirst, offset);

      for (const point of convertedPoints) {
        controlPoints.push(...point);
      }

      startIndex = endIndex;
      isFirst = false;
    }

    if (endIndex > startIndex) {
      const points = pathSplit.slice(startIndex, endIndex);
      const convertedPoints = HitObjectDecoder.convertPoints(points, null, isFirst, offset);

      for (const point of convertedPoints) {
        controlPoints.push(...point);
      }
    }

    return controlPoints;
  }

  /**
   * Converts a given point list into a set of path segments.
   * @param points The point list.
   * @param endPoint Any extra endpoint to consider as part of the points.
   * @param isFisrt Whether this is the first segment in the set. 
   * If true the first of the returned segments will contain a zero point.
   * @param offset The positional offset to apply to the control points.
   * @returns The set of points contained by point list as one or more segments of the path, 
   * prepended by an extra zero point if isFirst is true.
   */
  static *convertPoints(
    points: string[],
    endPoint: string | null,
    isFirst: boolean,
    offset: Vector2,
  ): Generator<PathPoint[]> {
    // First control point is zero for the first segment.
    const readOffset = isFirst ? 1 : 0;

    // Extra length if an endpoint is given that lies outside the base point span.
    const endPointLength = endPoint !== null ? 1 : 0;

    const vertices: PathPoint[] = [];

    // Fill any non-read points.
    if (readOffset === 1) {
      vertices[0] = new PathPoint();
    }

    // Parse into control points.
    for (let i = 1; i < points.length; ++i) {
      vertices[readOffset + i - 1] = readPoint(points[i], offset);
    }

    // If an endpoint is given, add it to the end.
    if (endPoint !== null) {
      vertices[vertices.length - 1] = readPoint(endPoint, offset);
    }

    let type: PathType = HitObjectDecoder.convertPathType(points[0]);

    // Edge-case rules (to match stable).
    if (type === PathType.PerfectCurve) {
      if (vertices.length !== 3) {
        type = PathType.Bezier;
      }
      else if (isLinear(vertices)) {
        // osu!stable special-cased colinear perfect curves to a linear path
        type = PathType.Linear;
      }
    }

    // The first control point must have a definite type.
    vertices[0].type = type;

    /**
     * A path can have multiple implicit segments of the same type 
     * if there are two sequential control points with the same position.
     * To handle such cases, this code may return multiple path segments 
     * with the final control point in each segment having a non-null type.
     * 
     * For the point string X|1:1|2:2|2:2|3:3, this code returns the segments:
     *  X: { (1, 1), (2, 2) }
     *  X: { (3, 3) }
     * 
     * Note: (2, 2) is not returned in the second segments, as it is implicit in the path.
     */
    let startIndex = 0;
    let endIndex = 0;

    while (++endIndex < vertices.length - endPointLength) {
      // Keep incrementing while an implicit segment doesn't need to be started
      if (!vertices[endIndex].position.equals(vertices[endIndex - 1].position)) {
        continue;
      }

      // The last control point of each segment is not allowed to start a new implicit segment.
      if (endIndex === vertices.length - endPointLength - 1) {
        continue;
      }

      // Force a type on the last point, and return the current control point set as a segment.
      vertices[endIndex - 1].type = type;

      yield vertices.slice(startIndex, endIndex);

      // Skip the current control point - as it's the same as the one that's just been returned.
      startIndex = endIndex + 1;
    }

    if (endIndex > startIndex) {
      yield vertices.slice(startIndex, endIndex);
    }

    function readPoint(point: string, offset: Vector2): PathPoint {
      const coords = point.split(':').map((v) => {
        return Parsing.parseFloat(v, Parsing.MAX_COORDINATE_VALUE);
      });

      const pos = new Vector2(coords[0], coords[1]).subtract(offset);

      return new PathPoint(pos);
    }

    function isLinear(p: PathPoint[]): boolean {
      const yx = (p[1].position.y - p[0].position.y) * (p[2].position.x - p[0].position.x);
      const xy = (p[1].position.x - p[0].position.x) * (p[2].position.y - p[0].position.y);

      const acceptableDifference = 0.001;

      return Math.abs(yx - xy) < acceptableDifference;
    }
  }

  static convertPathType(type: string): PathType {
    switch (type) {
      default:
      case 'C':
        return PathType.Catmull;

      case 'B':
        return PathType.Bezier;

      case 'L':
        return PathType.Linear;

      case 'P':
        return PathType.PerfectCurve;
    }
  }

  static readCustomSampleBanks(hitSample: string, bankInfo: SampleBank): void {
    if (!hitSample) return;

    const split = hitSample.split(':');

    bankInfo.normalSet = Parsing.parseInt(split[0]);
    bankInfo.additionSet = Parsing.parseInt(split[1]);

    if (bankInfo.additionSet === SampleSet.None) {
      bankInfo.additionSet = bankInfo.normalSet;
    }

    if (split.length > 2) {
      bankInfo.customIndex = Parsing.parseInt(split[2]);
    }

    if (split.length > 3) {
      bankInfo.volume = Math.max(0, Parsing.parseInt(split[3]));
    }

    bankInfo.filename = split.length > 4 ? split[4] : '';
  }

  static convertSoundType(type: HitSound, bankInfo: SampleBank): HitSample[] {
    // TODO: This should return the normal SampleInfos if the specified sample file isn't found, but that's a pretty edge-case scenario
    if (bankInfo.filename) {
      const sample = new HitSample();

      sample.filename = bankInfo.filename;
      sample.volume = bankInfo.volume;

      return [ sample ];
    }

    const soundTypes: HitSample[] = [ new HitSample() ];

    soundTypes[0].hitSound = HitSound[HitSound.Normal];
    soundTypes[0].sampleSet = SampleSet[bankInfo.normalSet];

    /**
     * if the sound type doesn't have the Normal flag set, 
     * attach it anyway as a layered sample.
     * None also counts as a normal non-layered sample.
     */
    soundTypes[0].isLayered = type !== HitSound.None && !(type & HitSound.Normal);

    if (type & HitSound.Finish) {
      const sample = new HitSample();

      sample.hitSound = HitSound[HitSound.Finish];
      soundTypes.push(sample);
    }

    if (type & HitSound.Whistle) {
      const sample = new HitSample();

      sample.hitSound = HitSound[HitSound.Whistle];
      soundTypes.push(sample);
    }

    if (type & HitSound.Clap) {
      const sample = new HitSample();

      sample.hitSound = HitSound[HitSound.Clap];
      soundTypes.push(sample);
    }

    soundTypes.forEach((sound, i) => {
      sound.sampleSet = i !== 0
        ? SampleSet[bankInfo.additionSet]
        : SampleSet[bankInfo.normalSet];

      sound.volume = bankInfo.volume;
      sound.customIndex = 0;

      if (bankInfo.customIndex >= 2) {
        sound.customIndex = bankInfo.customIndex;
      }
    });

    return soundTypes;
  }

  /**
   * Creates a new parsed hit object based on hit type.
   * @param hitType Hit type data.
   * @returns A new parsed hit object.
   */
  static createHitObject(hitType: HitType): HitObject {
    if (hitType & HitType.Normal) {
      return new HittableObject();
    }

    if (hitType & HitType.Slider) {
      return new SlidableObject();
    }

    if (hitType & HitType.Spinner) {
      return new SpinnableObject();
    }

    if (hitType & HitType.Hold) {
      return new HoldableObject();
    }

    throw new Error(`Unknown hit object type: ${hitType}!`);
  }
}
