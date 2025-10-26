#!/bin/bash
# PM2 모니터링 및 관리 유틸리티

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_menu() {
  clear
  echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   PM2 Monitoring & Management Tool   ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

  echo -e "${BLUE}1.${NC} Show Status"
  echo -e "${BLUE}2.${NC} Show Logs (Real-time)"
  echo -e "${BLUE}3.${NC} Show Logs (Last 100 lines)"
  echo -e "${BLUE}4.${NC} Show Metrics"
  echo -e "${BLUE}5.${NC} Restart Application"
  echo -e "${BLUE}6.${NC} Stop Application"
  echo -e "${BLUE}7.${NC} Start Application"
  echo -e "${BLUE}8.${NC} Reload Application (Zero-downtime)"
  echo -e "${BLUE}9.${NC} Flush Logs"
  echo -e "${BLUE}10.${NC} Show Environment Variables"
  echo -e "${BLUE}11.${NC} Memory Usage Report"
  echo -e "${BLUE}12.${NC} CPU Usage Report"
  echo -e "${BLUE}q.${NC} Quit\n"
}

while true; do
  show_menu
  echo -e "${YELLOW}Select option:${NC} "
  read -r option

  case $option in
    1)
      echo -e "\n${BLUE}═══ Application Status ═══${NC}\n"
      pm2 status
      ;;
    2)
      echo -e "\n${BLUE}═══ Real-time Logs (Ctrl+C to exit) ═══${NC}\n"
      pm2 logs livelink-backend
      ;;
    3)
      echo -e "\n${BLUE}═══ Last 100 Log Lines ═══${NC}\n"
      pm2 logs livelink-backend --lines 100 --nostream
      ;;
    4)
      echo -e "\n${BLUE}═══ Application Metrics ═══${NC}\n"
      pm2 show livelink-backend
      ;;
    5)
      echo -e "\n${YELLOW}Restarting application...${NC}"
      pm2 restart livelink-backend
      echo -e "${GREEN}✓ Application restarted${NC}"
      ;;
    6)
      echo -e "\n${YELLOW}Stopping application...${NC}"
      pm2 stop livelink-backend
      echo -e "${GREEN}✓ Application stopped${NC}"
      ;;
    7)
      echo -e "\n${YELLOW}Starting application...${NC}"
      pm2 start ecosystem.config.js
      echo -e "${GREEN}✓ Application started${NC}"
      ;;
    8)
      echo -e "\n${YELLOW}Reloading application (zero-downtime)...${NC}"
      pm2 reload livelink-backend
      echo -e "${GREEN}✓ Application reloaded${NC}"
      ;;
    9)
      echo -e "\n${YELLOW}Flushing logs...${NC}"
      pm2 flush livelink-backend
      echo -e "${GREEN}✓ Logs flushed${NC}"
      ;;
    10)
      echo -e "\n${BLUE}═══ Environment Variables ═══${NC}\n"
      pm2 show livelink-backend | grep -A 20 "env:"
      ;;
    11)
      echo -e "\n${BLUE}═══ Memory Usage Report ═══${NC}\n"
      pm2 list | grep livelink-backend
      pm2 monit livelink-backend --lines 10
      ;;
    12)
      echo -e "\n${BLUE}═══ CPU Usage Report ═══${NC}\n"
      pm2 list | grep livelink-backend
      ;;
    q|Q)
      echo -e "\n${GREEN}Goodbye!${NC}\n"
      exit 0
      ;;
    *)
      echo -e "\n${RED}Invalid option${NC}"
      ;;
  esac

  echo -e "\n${YELLOW}Press Enter to continue...${NC}"
  read -r
done
