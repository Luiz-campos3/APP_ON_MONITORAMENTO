const fs = require('node:fs');
const path = require('node:path');

const privacyManifestPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'ReactCommon',
  'react',
  'timing',
  'PrivacyInfo.xcprivacy',
);

const privacyManifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSPrivacyAccessedAPITypes</key>
\t<array/>
\t<key>NSPrivacyCollectedDataTypes</key>
\t<array/>
\t<key>NSPrivacyTracking</key>
\t<false/>
</dict>
</plist>
`;

fs.mkdirSync(path.dirname(privacyManifestPath), { recursive: true });

if (!fs.existsSync(privacyManifestPath)) {
  fs.writeFileSync(privacyManifestPath, privacyManifest);
  console.log(`Created ${path.relative(process.cwd(), privacyManifestPath)}`);
}
