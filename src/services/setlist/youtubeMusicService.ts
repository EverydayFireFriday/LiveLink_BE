import { google } from 'googleapis';
import logger from '../../utils/logger/logger';
import { ISetlistSong } from '../../models/concert/base/ConcertTypes';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

interface YouTubeMusicServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class YouTubeMusicService {
  /**
   * 곡 검색 기능 - 제목 + 아티스트로 YouTube 동영상 검색
   * @param song 검색할 곡 정보 (제목, 아티스트)
   * @returns Video ID 또는 null
   */
  static async searchSong(song: ISetlistSong): Promise<string | null> {
    try {
      const query = `${song.title} ${song.artist}`;
      logger.info(`🔍 YouTube 검색: ${query}`);

      const response = await youtube.search.list({
        part: ['id', 'snippet'],
        q: query,
        type: ['video'],
        videoCategoryId: '10', // Music category
        maxResults: 1,
      });

      if (response.data.items && response.data.items.length > 0) {
        const videoId = response.data.items[0].id?.videoId;
        if (videoId) {
          logger.info(`✅ 검색 성공: ${query} -> ${videoId}`);
          return videoId;
        }
      }

      logger.warn(`⚠️ 검색 결과 없음: ${query}`);
      return null;
    } catch (error) {
      logger.error(`❌ YouTube 검색 실패: ${song.title} - ${error}`);
      return null;
    }
  }

  /**
   * 재생목록 생성 기능
   * @param title 재생목록 제목
   * @param description 재생목록 설명
   * @returns 재생목록 ID 또는 null
   */
  static async createPlaylist(
    title: string,
    description?: string,
  ): Promise<string | null> {
    try {
      logger.info(`📝 YouTube 재생목록 생성: ${title}`);

      // OAuth2 클라이언트 설정이 필요함
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI,
      );

      // 저장된 토큰 설정 (환경변수 또는 DB에서 가져와야 함)
      oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      });

      const youtubeWithAuth = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      const response = await youtubeWithAuth.playlists.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description: description || 'Created by LiveLink',
          },
          status: {
            privacyStatus: 'public',
          },
        },
      });

      const playlistId = response.data.id;
      if (playlistId) {
        logger.info(`✅ 재생목록 생성 성공: ${playlistId}`);
        return playlistId;
      }

      logger.error('❌ 재생목록 생성 실패: ID를 받지 못했습니다.');
      return null;
    } catch (error) {
      logger.error(`❌ YouTube 재생목록 생성 실패: ${error}`);
      return null;
    }
  }

  /**
   * 재생목록에 곡 추가 기능
   * @param playlistId 재생목록 ID
   * @param videoId 추가할 비디오 ID
   * @returns 성공 여부
   */
  static async addSongToPlaylist(
    playlistId: string,
    videoId: string,
  ): Promise<boolean> {
    try {
      logger.info(
        `➕ 재생목록에 곡 추가: playlist=${playlistId}, video=${videoId}`,
      );

      // OAuth2 클라이언트 설정
      const oauth2Client = new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      });

      const youtubeWithAuth = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      await youtubeWithAuth.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      });

      logger.info(`✅ 곡 추가 성공: ${videoId}`);
      return true;
    } catch (error) {
      logger.error(`❌ 곡 추가 실패: ${videoId} - ${error}`);
      return false;
    }
  }

  /**
   * 셋리스트로부터 YouTube Music 재생목록 생성
   * @param concertTitle 콘서트 제목 (재생목록 이름으로 사용)
   * @param setlist 곡 목록
   * @returns 재생목록 URL 또는 에러
   */
  static async createPlaylistFromSetlist(
    concertTitle: string,
    setlist: ISetlistSong[],
  ): Promise<
    YouTubeMusicServiceResponse<{ playlistId: string; playlistUrl: string }>
  > {
    try {
      logger.info(
        `🎵 셋리스트 재생목록 생성 시작: ${concertTitle} (${setlist.length}곡)`,
      );

      // 1. 재생목록 생성
      const playlistId = await this.createPlaylist(
        `${concertTitle} - Setlist`,
        `Setlist for ${concertTitle}. Created by LiveLink.`,
      );

      if (!playlistId) {
        return {
          success: false,
          error: '재생목록 생성에 실패했습니다.',
        };
      }

      // 2. 각 곡을 검색하고 재생목록에 추가
      let successCount = 0;
      for (const song of setlist) {
        const videoId = await this.searchSong(song);
        if (videoId) {
          const added = await this.addSongToPlaylist(playlistId, videoId);
          if (added) {
            successCount++;
          }
        }
      }

      logger.info(
        `✅ 재생목록 생성 완료: ${successCount}/${setlist.length}곡 추가됨`,
      );

      // 3. 공유 URL 생성
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

      return {
        success: true,
        data: {
          playlistId,
          playlistUrl,
        },
      };
    } catch (error) {
      logger.error(`❌ 셋리스트 재생목록 생성 실패: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러',
      };
    }
  }

  /**
   * YouTube 공유 URL 생성
   * @param playlistId 재생목록 ID
   * @returns 공유 URL
   */
  static generatePlaylistUrl(playlistId: string): string {
    return `https://www.youtube.com/playlist?list=${playlistId}`;
  }
}
