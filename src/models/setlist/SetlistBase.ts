import { ObjectId, Collection, Db } from 'mongodb';
import logger from '../../utils/logger/logger';
import { ISetlist } from './SetlistTypes';

export class SetlistBase {
  db: Db;
  collection: Collection<ISetlist>;

  constructor(db: Db) {
    this.db = db;
    this.collection = db.collection<ISetlist>('setlists');
    void this.createIndexes();
  }

  private async createIndexes() {
    try {
      logger.info('Setlist 인덱스 생성 시작...');
      // concertId에 unique 인덱스 (한 콘서트당 하나의 셋리스트만)
      await this.collection.createIndex({ concertId: 1 }, { unique: true });
      await this.collection.createIndex({ _id: 1 });
      logger.info('🎉 Setlist 인덱스 생성 완료');
    } catch (error) {
      logger.error('❌ Setlist 인덱스 생성 중 오류:', error);
    }
  }

  // 셋리스트 생성
  async create(
    concertId: string,
    setList: { title: string; artist: string }[],
  ): Promise<ISetlist> {
    const now = new Date();
    const setlistData: ISetlist = {
      _id: new ObjectId(),
      concertId,
      setList,
      createdAt: now,
      updatedAt: now,
    };

    await this.collection.insertOne(setlistData);
    return setlistData;
  }

  // concertId로 셋리스트 조회
  async findByConcertId(concertId: string): Promise<ISetlist | null> {
    return await this.collection.findOne({ concertId });
  }

  // 셋리스트 업데이트
  async updateByConcertId(
    concertId: string,
    setList: { title: string; artist: string }[],
  ): Promise<ISetlist | null> {
    const result = await this.collection.findOneAndUpdate(
      { concertId },
      {
        $set: {
          setList,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    return result || null;
  }

  // 셋리스트 삭제
  async deleteByConcertId(concertId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ concertId });
    return result.deletedCount > 0;
  }
}
