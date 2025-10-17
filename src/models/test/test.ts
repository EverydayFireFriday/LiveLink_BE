import { Db } from 'mongodb';
import { ConcertTestBase } from './base/ConcertTestBase';
import { ConcertSearch } from '../concert/features/ConcertSearch';
import { ConcertTicketing } from '../concert/features/ConcertTicketing';
import { ConcertLocation } from '../concert/features/ConcertLocation';
import { ConcertPricing } from '../concert/features/ConcertPricing';
import { ConcertBatch } from '../concert/features/ConcertBatch';
import { ConcertStats } from '../concert/features/ConcertStats';
import { ConcertAutomation } from '../concert/features/ConcertAutomation';

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

class ConcertTestModel extends ConcertTestBase {
  constructor(db: Db) {
    super(db);
  }
}

interface ConcertTestModel extends ConcertSearch, ConcertTicketing, ConcertLocation, ConcertPricing, ConcertBatch, ConcertStats, ConcertAutomation {}

applyMixins(ConcertTestModel, [
  ConcertSearch,
  ConcertTicketing,
  ConcertLocation,
  ConcertPricing,
  ConcertBatch,
  ConcertStats,
  ConcertAutomation,
]);

let concertTestModel: ConcertTestModel;

export const initializeConcertTestModel = (db: Db): ConcertTestModel => {
  if (!concertTestModel) {
    concertTestModel = new ConcertTestModel(db);
  }
  return concertTestModel;
};

export const getConcertTestModel = (): ConcertTestModel => {
  if (!concertTestModel) {
    throw new Error('ConcertTest 모델이 초기화되지 않았습니다. initializeConcertTestModel()을 먼저 호출하세요.');
  }
  return concertTestModel;
};

export { ConcertTestModel };
