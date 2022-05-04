import { Storyboard } from 'osu-classes';

import {
  VariablesEncoder,
  EventsEncoder,
} from './Handlers';

/**
 * Storyboard encoder.
 */
export class StoryboardEncoder {
  /**
   * Performs storyboard encoding to a string.
   * @param storyboard Storyboard for encoding.
   * @returns A string with encoded storyboard data.
   */
  encodeToString(storyboard?: Storyboard): string {
    if (!(storyboard instanceof Storyboard)) return '';

    const encoded: string[] = [];

    encoded.push(VariablesEncoder.encodeVariables(storyboard));
    encoded.push(EventsEncoder.encodeStoryboard(storyboard));

    return encoded.filter((x) => x).join('\n\n');
  }
}
