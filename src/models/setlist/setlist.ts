import { Db } from 'mongodb';
import { SetlistBase } from './SetlistBase';

class SetlistModel extends SetlistBase {
  constructor(db: Db) {
    super(db);
  }
}

let setlistModel: SetlistModel;

export const initializeSetlistModel = (db: Db): SetlistModel => {
  if (!setlistModel) {
    setlistModel = new SetlistModel(db);
  }
  return setlistModel;
};

export const getSetlistModel = (): SetlistModel => {
  if (!setlistModel) {
    throw new Error(
      'Setlist 모델이 초기화되지 않았습니다. initializeSetlistModel()을 먼저 호출하세요.',
    );
  }
  return setlistModel;
};

export { SetlistModel };
