import { getSetlistModel } from '../../models/setlist/setlist';
import { getConcertModel } from '../../models/concert/concert';
import logger from '../../utils/logger/logger';
import { ISetlist } from '../../models/setlist/SetlistTypes';

export interface CreateSetlistRequest {
  concertId: string;
  setList: Array<{
    title: string;
    artist: string;
  }>;
}

export interface SetlistServiceResponse {
  success: boolean;
  data?: ISetlist | null;
  error?: string;
  statusCode?: number;
}

export class SetlistService {
  /**
   * concertId로 셋리스트 조회
   * 이미 생성된 셋리스트가 있으면 반환
   */
  async getSetlistByConcertId(
    concertId: string,
  ): Promise<SetlistServiceResponse> {
    try {
      // 콘서트가 존재하는지 확인
      const concertModel = getConcertModel();
      const concert = await concertModel.findByUid(concertId);

      if (!concert) {
        logger.warn(`콘서트를 찾을 수 없습니다: ${concertId}`);
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      // 셋리스트 조회
      const setlistModel = getSetlistModel();
      const setlist = await setlistModel.findByConcertId(concertId);

      if (!setlist) {
        return {
          success: true,
          data: null,
          statusCode: 200,
        };
      }

      logger.info(`셋리스트 조회 성공: ${concertId}`);
      return {
        success: true,
        data: setlist,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('셋리스트 조회 중 오류:', error);
      return {
        success: false,
        error: '셋리스트 조회 중 오류가 발생했습니다.',
        statusCode: 500,
      };
    }
  }

  /**
   * 셋리스트 생성 또는 업데이트
   * 이미 존재하면 업데이트, 없으면 새로 생성
   */
  async createOrUpdateSetlist(
    request: CreateSetlistRequest,
  ): Promise<SetlistServiceResponse> {
    try {
      const { concertId, setList } = request;

      // 유효성 검사
      if (
        !concertId ||
        !setList ||
        !Array.isArray(setList) ||
        setList.length === 0
      ) {
        return {
          success: false,
          error: 'concertId와 setList는 필수입니다.',
          statusCode: 400,
        };
      }

      // setList 항목 검증
      for (const song of setList) {
        if (!song.title || !song.artist) {
          return {
            success: false,
            error: '각 곡은 title과 artist가 필요합니다.',
            statusCode: 400,
          };
        }
      }

      // 콘서트가 존재하는지 확인
      const concertModel = getConcertModel();
      const concert = await concertModel.findByUid(concertId);

      if (!concert) {
        logger.warn(`콘서트를 찾을 수 없습니다: ${concertId}`);
        return {
          success: false,
          error: '콘서트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      const setlistModel = getSetlistModel();

      // 기존 셋리스트가 있는지 확인
      const existingSetlist = await setlistModel.findByConcertId(concertId);

      let result: ISetlist | null;

      if (existingSetlist) {
        // 업데이트
        result = await setlistModel.updateByConcertId(concertId, setList);
        logger.info(`셋리스트 업데이트 성공: ${concertId}`);
      } else {
        // 새로 생성
        result = await setlistModel.create(concertId, setList);
        logger.info(`셋리스트 생성 성공: ${concertId}`);
      }

      return {
        success: true,
        data: result,
        statusCode: existingSetlist ? 200 : 201,
      };
    } catch (error: unknown) {
      // MongoDB unique index 에러 (동시 생성 시도)
      if (error instanceof Error && 'code' in error && error.code === 11000) {
        logger.warn(`셋리스트 중복 생성 시도: ${request.concertId}`);
        // 재시도: 업데이트로 처리
        try {
          const setlistModel = getSetlistModel();
          const result = await setlistModel.updateByConcertId(
            request.concertId,
            request.setList,
          );
          return {
            success: true,
            data: result,
            statusCode: 200,
          };
        } catch (retryError) {
          logger.error('셋리스트 재시도 중 오류:', retryError);
          return {
            success: false,
            error: '셋리스트 저장 중 오류가 발생했습니다.',
            statusCode: 500,
          };
        }
      }

      logger.error('셋리스트 생성/업데이트 중 오류:', error);
      return {
        success: false,
        error: '셋리스트 저장 중 오류가 발생했습니다.',
        statusCode: 500,
      };
    }
  }

  /**
   * 셋리스트 삭제
   */
  async deleteSetlist(concertId: string): Promise<SetlistServiceResponse> {
    try {
      const setlistModel = getSetlistModel();
      const deleted = await setlistModel.deleteByConcertId(concertId);

      if (!deleted) {
        return {
          success: false,
          error: '셋리스트를 찾을 수 없습니다.',
          statusCode: 404,
        };
      }

      logger.info(`셋리스트 삭제 성공: ${concertId}`);
      return {
        success: true,
        statusCode: 200,
      };
    } catch (error) {
      logger.error('셋리스트 삭제 중 오류:', error);
      return {
        success: false,
        error: '셋리스트 삭제 중 오류가 발생했습니다.',
        statusCode: 500,
      };
    }
  }
}

export const setlistService = new SetlistService();
