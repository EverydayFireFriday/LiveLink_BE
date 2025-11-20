import axios, { AxiosError } from 'axios';
import logger from '../../utils/logger/logger';
import { ISetlistSong } from '../../models/concert/base/ConcertTypes';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SpotifyTrack {
  uri: string;
  name: string;
  artists: { name: string }[];
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

interface SpotifyPlaylistResponse {
  id: string;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SpotifyService {
  private static accessToken: string | null = null;
  private static tokenExpiryTime: number = 0;

  /**
   * Access Token 자동 갱신 로직
   * @returns Access Token 또는 null
   */
  private static async getAccessToken(): Promise<string | null> {
    try {
      // 토큰이 유효한 경우 재사용 (만료 5분 전에 갱신)
      const now = Date.now();
      if (this.accessToken && this.tokenExpiryTime > now + 5 * 60 * 1000) {
        return this.accessToken;
      }

      logger.info('🔄 Spotify Access Token 갱신 중...');

      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        logger.error(
          '❌ Spotify 환경변수가 설정되지 않았습니다 (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)',
        );
        return null;
      }

      // Base64 인코딩
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await axios.post<SpotifyTokenResponse>(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${authString}`,
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiryTime = now + response.data.expires_in * 1000;

      logger.info('✅ Spotify Access Token 갱신 완료');
      return this.accessToken;
    } catch (error) {
      logger.error('❌ Spotify Access Token 갱신 실패:', error);
      this.accessToken = null;
      this.tokenExpiryTime = 0;
      return null;
    }
  }

  /**
   * 곡 검색 기능 - Track URI 획득
   * @param song 검색할 곡 정보 (제목, 아티스트)
   * @returns Track URI 또는 null
   */
  static async searchSong(song: ISetlistSong): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        logger.error('❌ Access Token을 가져올 수 없습니다');
        return null;
      }

      const query = `track:${song.title} artist:${song.artist}`;
      logger.info(`🔍 Spotify 검색: ${query}`);

      const response = await axios.get<SpotifySearchResponse>(
        'https://api.spotify.com/v1/search',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            q: query,
            type: 'track',
            limit: 1,
          },
        },
      );

      if (response.data.tracks.items.length > 0) {
        const track = response.data.tracks.items[0];
        logger.info(
          `✅ 검색 성공: ${track.name} by ${track.artists.map((a) => a.name).join(', ')} -> ${track.uri}`,
        );
        return track.uri;
      }

      logger.warn(`⚠️ 검색 결과 없음: ${query}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Rate Limiting 처리 (429 응답)
        if (axiosError.response?.status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          logger.warn(
            `⚠️ Spotify API Rate Limit 도달. ${retryAfter}초 후 재시도 가능`,
          );
        }

        // 토큰 만료 처리 (401 응답)
        if (axiosError.response?.status === 401) {
          logger.warn('⚠️ Access Token 만료됨. 토큰 갱신 필요');
          this.accessToken = null;
          this.tokenExpiryTime = 0;
        }
      }

      logger.error(`❌ Spotify 검색 실패: ${song.title} - ${error}`);
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
  ): Promise<{ id: string; url: string } | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        logger.error('❌ Access Token을 가져올 수 없습니다');
        return null;
      }

      const userId = process.env.SPOTIFY_USER_ID;
      if (!userId) {
        logger.error('❌ SPOTIFY_USER_ID 환경변수가 설정되지 않았습니다');
        return null;
      }

      logger.info(`📝 Spotify 재생목록 생성: ${title}`);

      const response = await axios.post<SpotifyPlaylistResponse>(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: title,
          description: description || 'Created by stagelives',
          public: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      logger.info(
        `✅ 재생목록 생성 성공: ${response.data.id} (${response.data.external_urls.spotify})`,
      );
      return {
        id: response.data.id,
        url: response.data.external_urls.spotify,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          logger.warn(
            `⚠️ Spotify API Rate Limit 도달. ${retryAfter}초 후 재시도 가능`,
          );
        }

        if (axiosError.response?.status === 401) {
          logger.warn('⚠️ Access Token 만료됨. 토큰 갱신 필요');
          this.accessToken = null;
          this.tokenExpiryTime = 0;
        }
      }

      logger.error(`❌ Spotify 재생목록 생성 실패: ${error}`);
      return null;
    }
  }

  /**
   * 재생목록에 곡 추가 기능
   * @param playlistId 재생목록 ID
   * @param trackUris 추가할 트랙 URI 배열 (최대 100개)
   * @returns 성공 여부
   */
  static async addTracksToPlaylist(
    playlistId: string,
    trackUris: string[],
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        logger.error('❌ Access Token을 가져올 수 없습니다');
        return false;
      }

      // Spotify API는 한 번에 최대 100개의 트랙만 추가 가능
      const batchSize = 100;
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);

        logger.info(
          `➕ 재생목록에 곡 추가: playlist=${playlistId}, tracks=${batch.length}개 (${i + 1}-${i + batch.length}/${trackUris.length})`,
        );

        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            uris: batch,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        logger.info(`✅ 곡 추가 성공: ${batch.length}개`);
      }

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          logger.warn(
            `⚠️ Spotify API Rate Limit 도달. ${retryAfter}초 후 재시도 가능`,
          );
        }

        if (axiosError.response?.status === 401) {
          logger.warn('⚠️ Access Token 만료됨. 토큰 갱신 필요');
          this.accessToken = null;
          this.tokenExpiryTime = 0;
        }
      }

      logger.error(`❌ 곡 추가 실패: ${error}`);
      return false;
    }
  }

  /**
   * 재생목록의 모든 트랙 삭제
   * @param playlistId 재생목록 ID
   * @returns 성공 여부
   */
  static async clearPlaylist(playlistId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        logger.error('❌ Access Token을 가져올 수 없습니다');
        return false;
      }

      logger.info(`🗑️ Spotify 재생목록 비우기: ${playlistId}`);

      // 1. 현재 재생목록의 트랙 가져오기
      const response = await axios.get<{
        items: Array<{ track: { uri: string } }>;
      }>(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const trackUris = response.data.items.map((item) => ({
        uri: item.track.uri,
      }));

      if (trackUris.length === 0) {
        logger.info('ℹ️ 재생목록이 이미 비어있습니다.');
        return true;
      }

      // 2. 모든 트랙 삭제 (최대 100개씩)
      const batchSize = 100;
      for (let i = 0; i < trackUris.length; i += batchSize) {
        const batch = trackUris.slice(i, i + batchSize);

        await axios.delete(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            data: {
              tracks: batch,
            },
          },
        );

        logger.info(
          `✅ ${batch.length}개 트랙 삭제됨 (${i + batch.length}/${trackUris.length})`,
        );
      }

      logger.info(`✅ 재생목록 비우기 완료: ${trackUris.length}개 트랙 삭제됨`);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          const retryAfter = axiosError.response.headers['retry-after'];
          logger.warn(
            `⚠️ Spotify API Rate Limit 도달. ${retryAfter}초 후 재시도 가능`,
          );
        }

        if (axiosError.response?.status === 401) {
          logger.warn('⚠️ Access Token 만료됨. 토큰 갱신 필요');
          this.accessToken = null;
          this.tokenExpiryTime = 0;
        }
      }

      logger.error(`❌ 재생목록 비우기 실패: ${error}`);
      return false;
    }
  }

  /**
   * 셋리스트로부터 Spotify 재생목록 생성
   * @param concertTitle 콘서트 제목 (재생목록 이름으로 사용)
   * @param setlist 곡 목록
   * @returns 재생목록 URL 또는 에러
   */
  static async createPlaylistFromSetlist(
    concertTitle: string,
    setlist: ISetlistSong[],
  ): Promise<
    SpotifyServiceResponse<{ playlistId: string; playlistUrl: string }>
  > {
    try {
      logger.info(
        `🎵 Spotify 셋리스트 재생목록 생성 시작: ${concertTitle} (${setlist.length}곡)`,
      );

      // 1. 재생목록 생성
      const playlist = await this.createPlaylist(
        `${concertTitle} - Setlist`,
        `Setlist for ${concertTitle}. Created by stagelives.`,
      );

      if (!playlist) {
        return {
          success: false,
          error: '재생목록 생성에 실패했습니다.',
        };
      }

      // 2. 각 곡을 검색하고 Track URI 수집
      const trackUris: string[] = [];
      let successCount = 0;

      for (const song of setlist) {
        const trackUri = await this.searchSong(song);
        if (trackUri) {
          trackUris.push(trackUri);
          successCount++;
        }
      }

      if (trackUris.length === 0) {
        logger.warn('⚠️ 검색된 곡이 없습니다');
        return {
          success: false,
          error: '검색된 곡이 없습니다.',
        };
      }

      // 3. 재생목록에 곡 추가
      const added = await this.addTracksToPlaylist(playlist.id, trackUris);
      if (!added) {
        return {
          success: false,
          error: '재생목록에 곡 추가에 실패했습니다.',
        };
      }

      logger.info(
        `✅ Spotify 재생목록 생성 완료: ${successCount}/${setlist.length}곡 추가됨`,
      );

      return {
        success: true,
        data: {
          playlistId: playlist.id,
          playlistUrl: playlist.url,
        },
      };
    } catch (error) {
      logger.error(`❌ Spotify 셋리스트 재생목록 생성 실패: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러',
      };
    }
  }
}
