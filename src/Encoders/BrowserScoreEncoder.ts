import { IScore } from 'osu-classes';
import { SerializationWriter } from './Handlers';

/**
 * Score encoder.
 */
export class ScoreEncoder {
  /**
   * Performs score encoding to a buffer.
   * @param score Score info for encoding.
   * @returns A buffer with encoded score & replay data.
   */
  async encodeToBuffer(score: IScore): Promise<Buffer> {
    const encoded: Buffer = Buffer.from([]);

    if (typeof score?.info?.id !== 'number') {
      return encoded;
    }

    const writer = new SerializationWriter(encoded);

    writer.writeByte(score.info.rulesetId);

    if (score.replay) {
      writer.writeInteger(score.replay.gameVersion);
    }

    writer.writeString(score.info.beatmapHashMD5 ?? '');
    writer.writeString(score.info.username);

    if (score.replay) {
      writer.writeString(score.replay.hashMD5);
    }

    writer.writeShort(score.info.count300);
    writer.writeShort(score.info.count100);
    writer.writeShort(score.info.count50);
    writer.writeShort(score.info.countGeki);
    writer.writeShort(score.info.countKatu);
    writer.writeShort(score.info.countMiss);

    writer.writeInteger(score.info.totalScore);
    writer.writeShort(score.info.maxCombo);

    writer.writeByte(Number(score.info.perfect));
    writer.writeInteger(score.info.mods?.bitwise ?? 0);

    /**
     * Life frames (HP graph). Not implemented.
     */
    writer.writeString('');

    writer.writeDate(score.info.date);

    writer.writeLong(BigInt(score.info.id));

    return encoded;
  }
}
