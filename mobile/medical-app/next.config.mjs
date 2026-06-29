/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para export estático (necesario para Capacitor)
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,

  // Next.js 16 usa Turbopack por defecto.
  // La config de webpack queda como fallback para `next build --webpack`.
  // turbopack: {} declara compatibilidad explícita con el nuevo bundler.
  turbopack: {},

  // Permite que el emulador Android (10.0.2.2) acceda al servidor dev
  allowedDevOrigins: ['10.0.2.2'],

  // Optimizaciones de chunks (webpack) — se aplican con `next build --webpack`
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor:  { name: 'vendor',  chunks: 'all', test: /node_modules/,                                    priority: 20, minChunks: 1 },
            ui:      { name: 'ui',      chunks: 'all', test: /[\\/]components[\\/]ui[\\/]/,                     priority: 30, minChunks: 1 },
            radix:   { name: 'radix',   chunks: 'all', test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,            priority: 25, minChunks: 1 },
            charts:  { name: 'charts',  chunks: 'all', test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,        priority: 25, minChunks: 1 },
            common:  { name: 'common',  chunks: 'all', minChunks: 2, priority: 10, reuseExistingChunk: true },
          },
        },
      }
    }
    return config
  },

  compress: true,
  productionBrowserSourceMaps: false,
}

export default nextConfig
