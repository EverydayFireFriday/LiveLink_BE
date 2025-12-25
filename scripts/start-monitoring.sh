#!/bin/bash

# Grafana & Prometheus 모니터링 스택 실행 스크립트

set -e  # 에러 발생 시 스크립트 중단

echo "🔍 Grafana & Prometheus 모니터링 스택 시작..."
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
    echo "Docker를 설치한 후 다시 시도해주세요: https://www.docker.com/get-started"
    exit 1
fi

# Docker Compose 설치 확인
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# .env.production 파일 확인
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production 파일이 없습니다.${NC}"
    echo "기본 설정으로 계속 진행합니다..."
fi

# 기존 컨테이너 확인
RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)

if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  일부 서비스가 이미 실행 중입니다.${NC}"
    read -p "기존 서비스를 재시작하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 기존 서비스 중지 중..."
        docker-compose down
    fi
fi

echo ""
echo -e "${BLUE}📦 모니터링 서비스 시작 중...${NC}"
echo ""

# 모니터링 스택만 실행 (로컬 개발 서버와 함께 사용)
docker-compose up -d prometheus grafana mongodb-exporter redis-exporter

echo ""
echo -e "${GREEN}✅ 모니터링 스택이 성공적으로 시작되었습니다!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 접속 정보${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Grafana:${NC}"
echo "  URL:      http://localhost:3001"
echo "  Username: admin"
echo "  Password: changeme_in_production (변경 권장!)"
echo ""
echo -e "${GREEN}Prometheus:${NC}"
echo "  URL:      http://localhost:9090"
echo ""
echo -e "${GREEN}메트릭 엔드포인트:${NC}"
echo "  Node.js:  http://localhost:3000/metrics"
echo "  MongoDB:  http://localhost:9216/metrics"
echo "  Redis:    http://localhost:9121/metrics"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🚀 다음 단계${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Grafana 대시보드 확인:"
echo "   http://localhost:3001"
echo ""
echo "2. Prometheus 메트릭 확인:"
echo "   http://localhost:9090/targets"
echo ""
echo "3. 로그 확인:"
echo "   docker-compose logs -f prometheus grafana"
echo ""
echo "4. 중지:"
echo "   docker-compose down"
echo ""
echo -e "${YELLOW}💡 자세한 사용법은 MONITORING_GUIDE.md를 참고하세요!${NC}"
echo ""

# 서비스 헬스체크 (5초 대기)
echo -e "${BLUE}🔍 서비스 상태 확인 중...${NC}"
sleep 5

# Grafana 상태 확인
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Grafana: 정상${NC}"
else
    echo -e "${RED}❌ Grafana: 시작 중... (잠시 후 재시도)${NC}"
fi

# Prometheus 상태 확인
if curl -s http://localhost:9090/-/ready > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Prometheus: 정상${NC}"
else
    echo -e "${RED}❌ Prometheus: 시작 중... (잠시 후 재시도)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 모니터링 준비 완료!${NC}"
