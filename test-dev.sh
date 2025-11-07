#!/bin/bash
# 임시 테스트 스크립트 - dev 모드 에러 확인

NODE_ENV=development \
LOG_LEVEL=debug \
ts-node src/app.ts 2>&1 | tee dev-error.log
