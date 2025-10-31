import { DeviceInfo, DeviceType, Platform } from '../../types/auth/authTypes';
import { Request } from 'express';

/**
 * User-Agent에서 디바이스 정보를 추출하는 유틸리티
 */
export class DeviceDetector {
  /**
   * Express Request에서 디바이스 정보 추출
   */
  static detectDevice(req: Request): DeviceInfo {
    const userAgent = req.get('user-agent') || 'Unknown';
    const ipAddress = this.extractIpAddress(req);
    const platform = this.extractPlatform(req);

    return {
      name: this.getDeviceName(userAgent),
      type: this.getDeviceType(userAgent),
      platform,
      userAgent,
      ipAddress,
    };
  }

  /**
   * Request에서 플랫폼 정보 추출
   * X-Platform 헤더로 플랫폼을 지정합니다.
   * 헤더가 없거나 잘못된 값이면 WEB 플랫폼이 기본값입니다.
   */
  static extractPlatform(req: Request): Platform {
    const platformHeader = req.get('x-platform')?.toLowerCase();

    if (platformHeader === 'app') return Platform.APP;
    if (platformHeader === 'web') return Platform.WEB;

    // 기본값: WEB 플랫폼 (세션 유지: 1일)
    return Platform.WEB;
  }

  /**
   * IP 주소 추출 (프록시/로드밸런서 고려)
   */
  private static extractIpAddress(req: Request): string {
    // X-Forwarded-For 헤더 확인 (프록시/로드밸런서 사용 시)
    const forwardedFor = req.get('x-forwarded-for');
    if (forwardedFor) {
      // 첫 번째 IP가 실제 클라이언트 IP
      return forwardedFor.split(',')[0].trim();
    }

    // X-Real-IP 헤더 확인
    const realIp = req.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    // 직접 연결된 경우
    return req.ip || req.socket.remoteAddress || 'Unknown';
  }

  /**
   * User-Agent에서 디바이스 타입 감지
   */
  private static getDeviceType(userAgent: string): DeviceType {
    const ua = userAgent.toLowerCase();

    // 모바일 감지
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return DeviceType.MOBILE;
    }

    // 태블릿 감지
    if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) {
      return DeviceType.TABLET;
    }

    // 데스크톱/웹 브라우저
    if (/windows|macintosh|linux|chrome|safari|firefox|edge|opera/i.test(ua)) {
      return DeviceType.WEB;
    }

    return DeviceType.UNKNOWN;
  }

  /**
   * User-Agent에서 읽기 쉬운 디바이스 이름 생성
   */
  private static getDeviceName(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    // iOS 기기
    if (/iphone/i.test(ua)) {
      const version = this.extractiOSVersion(ua);
      return version ? `iPhone (iOS ${version})` : 'iPhone';
    }
    if (/ipad/i.test(ua)) {
      const version = this.extractiOSVersion(ua);
      return version ? `iPad (iOS ${version})` : 'iPad';
    }

    // Android 기기
    if (/android/i.test(ua)) {
      const version = this.extractAndroidVersion(ua);
      const device = this.extractAndroidDevice(ua);
      return device ? `${device} (Android ${version})` : `Android ${version}`;
    }

    // 데스크톱 브라우저
    const browser = this.getBrowserName(ua);
    const os = this.getOSName(ua);

    return `${browser} on ${os}`;
  }

  /**
   * iOS 버전 추출
   */
  private static extractiOSVersion(ua: string): string | null {
    const match = ua.match(/os (\d+)[_.](\d+)/);
    return match ? `${match[1]}.${match[2]}` : null;
  }

  /**
   * Android 버전 추출
   */
  private static extractAndroidVersion(ua: string): string {
    const match = ua.match(/android (\d+\.?\d*)/);
    return match ? match[1] : 'Unknown';
  }

  /**
   * Android 기기명 추출
   */
  private static extractAndroidDevice(ua: string): string | null {
    // Samsung
    if (/sm-[a-z0-9]+/i.test(ua)) {
      const match = ua.match(/sm-([a-z0-9]+)/i);
      return match ? `Samsung ${match[1].toUpperCase()}` : 'Samsung';
    }

    // Pixel
    if (/pixel/i.test(ua)) {
      const match = ua.match(/pixel\s*(\d+[a-z]*)/i);
      return match ? `Pixel ${match[1]}` : 'Pixel';
    }

    return null;
  }

  /**
   * 브라우저 이름 추출
   */
  private static getBrowserName(ua: string): string {
    if (/edg/i.test(ua)) return 'Edge';
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/opera|opr/i.test(ua)) return 'Opera';
    if (/msie|trident/i.test(ua)) return 'Internet Explorer';
    return 'Unknown Browser';
  }

  /**
   * OS 이름 추출
   */
  private static getOSName(ua: string): string {
    if (/windows nt 10/i.test(ua)) return 'Windows 10';
    if (/windows nt 11/i.test(ua)) return 'Windows 11';
    if (/windows nt 6.3/i.test(ua)) return 'Windows 8.1';
    if (/windows nt 6.2/i.test(ua)) return 'Windows 8';
    if (/windows nt 6.1/i.test(ua)) return 'Windows 7';
    if (/windows/i.test(ua)) return 'Windows';

    if (/mac os x 10[._](\d+)/i.test(ua)) {
      const match = ua.match(/mac os x 10[._](\d+)/i);
      return match ? `macOS 10.${match[1]}` : 'macOS';
    }
    if (/mac/i.test(ua)) return 'macOS';

    if (/linux/i.test(ua)) return 'Linux';
    if (/ubuntu/i.test(ua)) return 'Ubuntu';

    return 'Unknown OS';
  }
}
