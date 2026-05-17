/** @type {import('next').NextConfig} */
const fs = require('fs')
const path = require('path')

// Copy fontkit .trie files next to the API route so Vercel finds them at runtime
const trieDir = path.join(__dirname, 'node_modules/fontkit/src/opentype/shapers')
const destDir = path.join(__dirname, 'src/app/api/telegram')
if (fs.existsSync(trieDir)) {
  fs.readdirSync(trieDir)
    .filter(f => f.endsWith('.trie'))
    .forEach(f => {
      fs.copyFileSync(path.join(trieDir, f), path.join(destDir, f))
    })
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-project.supabase.co'],
  },
}

module.exports = nextConfig
