/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-project.supabase.co'],
  },
  outputFileTracingIncludes: {
    '/api/telegram': [
      './node_modules/fontkit/src/opentype/shapers/*.trie',
      './public/fonts/Amiri-Regular.ttf',
    ],
  },
}
module.exports = nextConfig
