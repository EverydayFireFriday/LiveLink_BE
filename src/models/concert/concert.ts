import { Db } from 'mongodb';
import { ConcertBase } from './base/ConcertBase';
import { ConcertSearch } from './features/ConcertSearch';
import { ConcertTicketing } from './features/ConcertTicketing';
import { ConcertLocation } from './features/ConcertLocation';
import { ConcertPricing } from './features/ConcertPricing';
import { ConcertBatch } from './features/ConcertBatch';
import { ConcertStats } from './features/ConcertStats';
import { ConcertAutomation } from './features/ConcertAutomation';

// Mixin helper
function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
        );
      }
    });
  });
}

class ConcertModel extends ConcertBase {
  constructor(db: Db) {
    super(db);
  }
}

interface ConcertModel extends ConcertSearch, ConcertTicketing, ConcertLocation, ConcertPricing, ConcertBatch, ConcertStats, ConcertAutomation {}

applyMixins(ConcertModel, [
  ConcertSearch,
  ConcertTicketing,
  ConcertLocation,
  ConcertPricing,
  ConcertBatch,
  ConcertStats,
  ConcertAutomation,
]);

let concertModel: ConcertModel;

export const initializeConcertModel = (db: Db): ConcertModel => {
  if (!concertModel) {
    concertModel = new ConcertModel(db);
  }
  return concertModel;
};

export const getConcertModel = (): ConcertModel => {
  if (!concertModel) {
    throw new Error('Concert 모델이 초기화되지 않았습니다. initializeConcertModel()을 먼저 호출하세요.');
  }
  return concertModel;
};

export { ConcertModel };
