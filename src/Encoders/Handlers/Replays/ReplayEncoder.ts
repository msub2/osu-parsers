import { LZMA } from 'lzma-native';
import { IReplayFrame } from 'osu-classes';
import { ParsedReplayFrame } from '../../../Replays';

export abstract class ReplayEncoder {
  static async compressReplayFrames(data: string): Promise<Buffer> {
    const lzma = LZMA();

    return new Promise((res, rej) => {
      try {
        lzma.compress(data, 6, (result) => res(result));
      }
      catch (err) {
        rej(err);
      }
    });
  }

  static encodeReplayFrames(frames: IReplayFrame[]): string {
    const encoded = [];

    if (frames) {
      let lastTime = 0;

      frames.forEach((frame) => {
        /**
         * Rounding because stable could only parse integral values.
         */
        const time = Math.round(frame.startTime);

        const parsedFrame = frame as ParsedReplayFrame;

        const encodedData = [
          time - lastTime,
          parsedFrame?.mouseX ?? 0,
          parsedFrame?.mouseY ?? 0,
          frame.buttonState,
        ];

        encoded.push(encodedData.join('|'));

        lastTime = time;
      });
    }

    encoded.push('-12345|0|0|0');

    return encoded.join(',');
  }
}
