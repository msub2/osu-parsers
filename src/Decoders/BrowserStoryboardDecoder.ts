import {
  Storyboard,
  StoryboardSample,
  Command,
  Compound,
  CommandLoop,
  CommandTrigger,
  IStoryboardElement,
  IHasCommands,
  CompoundType,
  LayerType,
} from 'osu-classes';

import {
  StoryboardDataDecoder,
  VariableDecoder,
} from './Handlers';

/**
 * Storyboard decoder.
 */
export class StoryboardDecoder {
  /**
   * Current storyboard element.
   */
  private _element: IStoryboardElement | IHasCommands | null = null;

  /**
   * Current storyboard compound.
   */
  private _compound: CommandLoop | CommandTrigger | null = null;

  /**
   * Current storyboard command.
   */
  private _command: Command | null = null;

  /**
   * Current storyboard lines.
   */
  private _lines: string[] | null = null;

  /**
   * Performs storyboard decoding from a string.
   * @param str String with storyboard data.
   * @returns Decoded storyboard.
   */
  decodeFromString(str: string): Storyboard {
    const data = str.toString()
      .replace(/\r/g, '')
      .split('\n');

    return this.decodeFromLines(data);
  }

  /**
   * Performs storyboard decoding from a string array.
   * @param data Array of split lines.
   * @returns Decoded storyboard.
   */
  decodeFromLines(data: string[]): Storyboard {
    const storyboard = new Storyboard();

    this._lines = null;

    if (data.constructor === Array) {
      this._lines = data.map((l) => l.toString().trimEnd());
    }

    if (!this._lines || !this._lines.length) {
      throw new Error('Storyboard data not found!');
    }

    this._element = null;
    this._compound = null;
    this._command = null;

    // Get all variables before processing.
    storyboard.variables = VariableDecoder.getVariables(this._lines);

    // Parse storyboard lines.
    this._lines.forEach((line) => this._parseLine(line, storyboard));

    return storyboard;
  }

  private _parseLine(line: string, storyboard: Storyboard): void {
    // Skip empty lines and comments.
    if (!line || line.startsWith('//')) return;

    // .osb file section
    if (line.startsWith('[') && line.endsWith(']')) return;

    // Preprocess variables in the current line.
    line = VariableDecoder.preProcess(line, storyboard.variables);

    let depth = 0;

    while (line.startsWith(' ') || line.startsWith('_')) {
      line = line.substring(1);
      ++depth;
    }

    try {
      // Storyboard data.
      this._parseStoryboardData(line, storyboard, depth);
    }
    catch {
      return;
    }
  }

  private _parseStoryboardData(line: string, storyboard: Storyboard, depth: number): void {
    switch (depth) {
      // Storyboard element
      case 0: return this._parseDepth0(line, storyboard);

      // Storyboard element command
      case 1: return this._parseDepth1(line);

      // Storyboard element compounded command
      case 2: return this._parseDepth2(line);
    }
  }

  private _parseDepth0(line: string, storyboard: Storyboard): void {
    this._element = StoryboardDataDecoder.handleElement(line);

    // Force push Samples to their own layer.
    if (this._element instanceof StoryboardSample) {
      storyboard.getLayer(LayerType.Samples).push(this._element);

      return;
    }

    storyboard.getLayer(this._element.layer).push(this._element);
  }

  private _parseDepth1(line: string): void {
    // Compound command or default command
    switch (line[0]) {
      case CompoundType.Loop:
        this._compound = StoryboardDataDecoder.handleLoop(line);
        (this._element as IHasCommands).loops.push(this._compound);
        break;

      case CompoundType.Trigger:
        this._compound = StoryboardDataDecoder.handleTrigger(line);
        (this._element as IHasCommands).triggers.push(this._compound);
        break;

      default:
        this._command = StoryboardDataDecoder.handleCommand(line);
        (this._element as IHasCommands).commands.push(this._command);
    }
  }

  private _parseDepth2(line: string): void {
    this._command = StoryboardDataDecoder.handleCommand(line);
    (this._compound as Compound).commands.push(this._command);
  }
}
