# Images 폴더

이 폴더는 Swagger 로고 및 유지보수 페이지 이미지를 저장하는 곳입니다.

## 📁 필요한 이미지 파일

### Swagger 로고
- `logo.png` - Swagger 페이지에 표시될 일반 모드용 로고 (필수)
- `logo-dark.png` - Swagger 다크모드용 로고 (선택사항, 없으면 logo.png 사용)

**권장 사양:**
- 형식: PNG, SVG (투명 배경 권장)
- 크기: 150x50px
- 용량: 500KB 이하

### 유지보수 페이지 이미지
- `maintenance.png` - 점검 페이지에 표시될 이미지 (선택사항)

**권장 사양:**
- 형식: PNG, SVG
- 크기: 최대 400px (너비 기준)
- 용량: 1MB 이하

## 🚀 사용 방법

1. 로고 이미지를 이 폴더에 복사:
   ```bash
   cp /path/to/your/logo.png public/images/logo.png
   ```

2. 서버 재시작:
   ```bash
   npm run dev
   # 또는
   pm2 restart app
   ```

3. Swagger 페이지에서 로고 확인:
   ```
   http://localhost:3000/api-docs
   ```

## 📝 참고

- 이미지는 정적 파일로 제공되므로 서버 재시작 없이도 변경할 수 있습니다
- 브라우저 캐시 때문에 변경이 즉시 반영되지 않을 수 있습니다 (Ctrl+F5로 새로고침)
- 더 자세한 내용은 [MAINTENANCE_MODE.md](../../docs/MAINTENANCE_MODE.md)를 참고하세요
