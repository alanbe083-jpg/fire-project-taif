import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'نظام متابعة مكافحة الحريق',
    short_name: 'مكافحة الحريق',
    description: 'نظام متابعة مشروع مكافحة الحريق - الطائف',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#ea580c',
    orientation: 'portrait',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}