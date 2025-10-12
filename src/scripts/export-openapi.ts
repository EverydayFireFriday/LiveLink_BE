/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { swaggerSpec } from '../config/swagger';

const outputDir = path.join(__dirname, '../../docs');
const outputPath = path.join(outputDir, 'openapi.json');
const outputYamlPath = path.join(outputDir, 'openapi.yaml');

// Create docs directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Export as JSON
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log('✅ OpenAPI JSON exported successfully!');
console.log(`📄 File: ${outputPath}`);

// Export as YAML
fs.writeFileSync(outputYamlPath, yaml.dump(swaggerSpec, { lineWidth: -1 }));
console.log('✅ OpenAPI YAML exported successfully!');
console.log(`📄 File: ${outputYamlPath}`);
