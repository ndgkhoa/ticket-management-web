import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';

const localesDir = path.resolve(__dirname, 'data');
const outputDir = path.resolve(__dirname, '../src/i18n/locales');

function convertYamlToTs(lang: string) {
  const yamlPath = path.join(localesDir, `${lang}.yaml`);
  const tsPath = path.join(outputDir, `${lang}/index.ts`);

  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const jsonContent = yaml.load(yamlContent);

  fs.mkdirSync(path.dirname(tsPath), { recursive: true });

  const tsCode =
    `const ${lang} = ${JSON.stringify(jsonContent, null, 2)} as const;\n` +
    `export default ${lang};\n`;

  fs.writeFileSync(tsPath, tsCode, 'utf8');
  console.log(`✅ Generated: ${tsPath}`);
}

['vi', 'en'].forEach(convertYamlToTs);
