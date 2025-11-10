/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import { swaggerSpec } from '../config/swagger';
import logger from '../utils/logger/logger';
import * as Converter from 'openapi-to-postmanv2';

const outputDir = path.join(__dirname, '../../docs');
const outputPath = path.join(outputDir, 'postman-collection.json');

// Create docs directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert Swagger to Postman Collection
const options = {
  requestNameSource: 'URL' as const,
  indentCharacter: 'Space' as const,
  collapseFolders: true,
  includeAuthInfoInExample: false, // Session-based auth uses cookies
};

Converter.convert(
  { type: 'json', data: JSON.stringify(swaggerSpec) },
  options,
  (err: unknown, conversionResult: any) => {
    if (err) {
      logger.error('❌ Error converting to Postman:', err);
      process.exit(1);
    }

    if (!conversionResult.result) {
      logger.error('❌ Conversion failed:', conversionResult.reason);
      process.exit(1);
    }

    // Save Postman collection
    const collection = conversionResult.output[0].data;
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    logger.info('✅ Postman collection generated successfully!');
    logger.info(`📄 File: ${outputPath}`);
  },
);
