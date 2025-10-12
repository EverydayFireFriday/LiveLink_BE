/* eslint-disable no-console, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import { swaggerSpec } from '../config/swagger';

const Converter = require('openapi-to-postmanv2');

const outputDir = path.join(__dirname, '../../docs');
const outputPath = path.join(outputDir, 'postman-collection.json');

// Create docs directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert Swagger to Postman Collection
const options = {
  defaultAuth: 'bearer',
  requestNameSource: 'url',
  indentCharacter: ' ',
  collapseFolders: true,
  includeAuthInfoInExample: true,
};

Converter.convert(
  { type: 'json', data: swaggerSpec },
  options,
  (err: Error | null, conversionResult: any) => {
    if (err) {
      console.error('❌ Error converting to Postman:', err);
      process.exit(1);
    }

    if (!conversionResult.result) {
      console.error('❌ Conversion failed:', conversionResult.reason);
      process.exit(1);
    }

    // Save Postman collection
    const collection = conversionResult.output[0].data;
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log('✅ Postman collection generated successfully!');
    console.log(`📄 File: ${outputPath}`);
  },
);
