/**
 * Script to check and fix support inquiries data
 * 고객 문의 데이터 확인 및 수정 스크립트
 */

/* eslint-disable no-console */

import dotenv from 'dotenv';
// 환경변수 먼저 로드
dotenv.config();

import { connectDatabase } from '../utils/database/db.js';

async function checkSupportInquiries() {
  try {
    console.log('Connecting to database...');
    const db = await connectDatabase();
    const collection = db.collection('supportInquiries');

    console.log('\n=== Checking Support Inquiries ===\n');

    // 모든 문의 조회 (삭제되지 않은 것만)
    const inquiries = await collection
      .find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${inquiries.length} inquiries\n`);

    for (const inquiry of inquiries) {
      console.log(`\n--- Inquiry ID: ${String(inquiry._id)} ---`);
      console.log(`Subject: ${inquiry.subject}`);
      console.log(`Status: ${inquiry.status}`);
      console.log(`Category: ${inquiry.category}`);
      console.log(`Priority: ${inquiry.priority}`);
      console.log(`Created At: ${inquiry.createdAt}`);
      console.log(`Admin Response:`, inquiry.adminResponse || 'None');

      // 문제 체크: adminResponse가 빈 객체거나 content가 없는 경우
      if (inquiry.adminResponse) {
        if (
          !inquiry.adminResponse.content ||
          inquiry.adminResponse.content.trim() === ''
        ) {
          console.log(
            '⚠️  WARNING: adminResponse exists but content is empty!',
          );
          console.log('   This will prevent the response form from showing.');
        }
      }
    }

    console.log('\n=== Statistics ===');
    const stats = await collection
      .aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    console.log('\nInquiries by status:');
    for (const stat of stats) {
      console.log(`  ${stat._id}: ${stat.count}`);
    }

    // 답변이 있는 문의 vs 없는 문의
    const withResponse = await collection.countDocuments({
      isDeleted: false,
      'adminResponse.content': { $exists: true, $ne: '' },
    });

    const withoutResponse = await collection.countDocuments({
      isDeleted: false,
      $or: [
        { adminResponse: { $exists: false } },
        { 'adminResponse.content': { $exists: false } },
        { 'adminResponse.content': '' },
      ],
    });

    console.log(`\nWith admin response: ${withResponse}`);
    console.log(`Without admin response: ${withoutResponse}`);

    console.log('\n=== Check Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error checking support inquiries:', error);
    process.exit(1);
  }
}

void checkSupportInquiries();
