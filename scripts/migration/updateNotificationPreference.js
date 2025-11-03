#!/usr/bin/env ts-node
"use strict";
/**
 * Migration Script: Update NotificationPreference
 *
 * 목적:
 * - 기존 사용자의 notificationPreference 구조를 새로운 배열 형식으로 변경
 * - 기존: { ticketOpenNotification: boolean, notifyBefore: number[] }
 * - 변경: { ticketOpenNotification: number[], concertStartNotification: number[] }
 *
 * 실행 방법:
 * - Dry-run (실제 업데이트 없이 확인만): npm run migrate:notification-preference -- --dry-run
 * - 실제 마이그레이션: npm run migrate:notification-preference
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// 환경 변수에서 MongoDB URI 가져오기
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DATABASE || 'livelink';
// Dry-run 모드 확인
const isDryRun = process.argv.includes('--dry-run');
/**
 * 기존 notificationPreference를 새로운 형식으로 변환
 */
function transformNotificationPreference(old) {
    // notificationPreference가 없는 경우
    if (!old) {
        return {
            ticketOpenNotification: [10, 30, 60, 1440],
            concertStartNotification: [60, 180, 1440],
        };
    }
    // 이미 새로운 형식인지 확인 (ticketOpenNotification이 배열인 경우)
    if (Array.isArray(old.ticketOpenNotification)) {
        console.log('  ℹ️  Already in new format, skipping...');
        return old;
    }
    // 기존 형식에서 새로운 형식으로 변환
    const oldPref = old;
    // ticketOpenNotification이 false인 경우 빈 배열
    if (oldPref.ticketOpenNotification === false) {
        return {
            ticketOpenNotification: [],
            concertStartNotification: [60, 180, 1440], // 신규 추가
        };
    }
    // ticketOpenNotification이 true이거나 없는 경우
    // notifyBefore 배열에 1440(하루) 추가
    const notifyBefore = oldPref.notifyBefore || [10, 30, 60];
    const ticketOpenNotification = notifyBefore.includes(1440)
        ? notifyBefore
        : [...notifyBefore, 1440];
    return {
        ticketOpenNotification,
        concertStartNotification: [60, 180, 1440], // 신규 추가
    };
}
/**
 * 마이그레이션 실행
 */
async function runMigration() {
    let client = null;
    try {
        console.log('🚀 Starting notification preference migration...\n');
        console.log(`Mode: ${isDryRun ? '🔍 DRY-RUN (no changes will be made)' : '✏️  WRITE (changes will be applied)'}\n`);
        console.log(`MongoDB URI: ${MONGO_URI}`);
        console.log(`Database: ${DB_NAME}\n`);
        // MongoDB 연결
        client = new mongodb_1.MongoClient(MONGO_URI);
        await client.connect();
        console.log('✅ Connected to MongoDB\n');
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        // 전체 사용자 수 조회
        const totalUsers = await usersCollection.countDocuments();
        console.log(`📊 Total users in database: ${totalUsers}\n`);
        // notificationPreference가 없거나 기존 형식인 사용자 조회
        const usersToMigrate = await usersCollection.find({}).toArray();
        console.log(`🔎 Found ${usersToMigrate.length} users to check\n`);
        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        for (const user of usersToMigrate) {
            try {
                const oldPref = user.notificationPreference;
                // 이미 새로운 형식인지 확인
                if (oldPref &&
                    Array.isArray(oldPref.ticketOpenNotification)) {
                    skippedCount++;
                    continue;
                }
                const newPref = transformNotificationPreference(oldPref);
                console.log(`\n👤 User: ${user.email} (${user.username})`);
                console.log(`  📥 Old: ${JSON.stringify(oldPref || 'undefined')}`);
                console.log(`  📤 New: ${JSON.stringify(newPref)}`);
                if (!isDryRun) {
                    // 실제 업데이트 수행
                    const result = await usersCollection.updateOne({ _id: user._id }, {
                        $set: {
                            notificationPreference: newPref,
                            updatedAt: new Date(),
                        },
                    });
                    if (result.modifiedCount > 0) {
                        console.log('  ✅ Updated successfully');
                        migratedCount++;
                    }
                    else {
                        console.log('  ⚠️  No changes made');
                    }
                }
                else {
                    console.log('  ℹ️  Would be updated (dry-run mode)');
                    migratedCount++;
                }
            }
            catch (error) {
                console.error(`  ❌ Error processing user ${user.email}:`, error);
                errorCount++;
            }
        }
        // 결과 요약
        console.log('\n' + '='.repeat(60));
        console.log('📋 Migration Summary');
        console.log('='.repeat(60));
        console.log(`Total users checked: ${usersToMigrate.length}`);
        console.log(`Users migrated: ${migratedCount}`);
        console.log(`Users skipped (already in new format): ${skippedCount}`);
        console.log(`Errors: ${errorCount}`);
        console.log('='.repeat(60));
        if (isDryRun) {
            console.log('\n⚠️  This was a DRY-RUN. No changes were made to the database.');
            console.log('To apply these changes, run the script without --dry-run flag.\n');
        }
        else {
            console.log('\n✅ Migration completed successfully!\n');
        }
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        if (client) {
            await client.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    }
}
// 스크립트 실행
runMigration()
    .then(() => {
    console.log('\n✨ Migration script finished.');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
