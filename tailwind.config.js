// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'def-grad': `
          radial-gradient(200px circle at 100px 185px, rgba(74,198,194,0.1), transparent),
          radial-gradient(400px circle at 75% 500px, rgba(74,198,194,0.2), transparent),
          radial-gradient(100px circle at 35% 300px, rgba(245,132,56,0.1), transparent),
          radial-gradient(400px circle at 20% 70%, rgba(74,198,194,0.1), transparent),
          radial-gradient(400px circle at 90% 50%, rgba(245,132,56,0.1), transparent),
          radial-gradient(400px circle at 10% 50%, rgba(74,198,194,0.1), transparent),
          radial-gradient(500px circle at 50% 125%, rgba(245,132,56,0.5), transparent)
        `
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    }
  },
  plugins: []
}
