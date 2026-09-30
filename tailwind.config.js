/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        skydash: {
          primary: '#4B49AC',        // Deep Royal Indigo
          primaryHover: '#3D3B94',
          primaryLight: '#98BDFF',   // Soft Periwinkle Blue
          accentBlue: '#7DA0FA',     // Cerulean Blue
          accentPurple: '#7978E9',   // Lavender Purple
          accentCoral: '#F3797E',    // Coral / Salmon Pink
          bg: '#F5F7FF',             // Canvas background
          card: '#FFFFFF',           // Card surface
          sidebar: '#FFFFFF',
          border: '#ECEEF5',
          borderLight: '#F0F3F9',
          textDark: '#1F1F2C',
          textMuted: '#6C7383',
          textSubtle: '#8F93A0',
        },
        primary: {
          50: '#F5F7FF',
          100: '#E6EAFF',
          200: '#C8D4FF',
          300: '#98BDFF',
          400: '#7DA0FA',
          500: '#6563D9',
          600: '#4B49AC',
          700: '#3D3B94',
          800: '#312F7C',
          900: '#262463',
          950: '#16153F',
        },
        coral: {
          50: '#FEF3F3',
          100: '#FDE4E5',
          200: '#FCC7C9',
          300: '#FA9BA0',
          400: '#F3797E',
          500: '#EA4C53',
          600: '#D53037',
          700: '#B4242A',
          800: '#942126',
          900: '#7B2024',
        },
        lavender: {
          50: '#F7F6FE',
          100: '#EFEFFD',
          200: '#DFE0FB',
          300: '#C2C4F7',
          400: '#9D9FF2',
          500: '#7978E9',
          600: '#625DE0',
          700: '#524BC8',
          800: '#443FA2',
          900: '#3A3781',
        },
        cerulean: {
          50: '#F3F6FE',
          100: '#E6EDFD',
          200: '#CDDCFC',
          300: '#A4C3FA',
          400: '#7DA0FA',
          500: '#557DF6',
          600: '#395EEB',
          700: '#2A46D8',
          800: '#263AAF',
          900: '#24348A',
        }
      },
      boxShadow: {
        'skydash': '0 4px 20px 0 rgba(75, 73, 172, 0.07), 0 2px 6px 0 rgba(0, 0, 0, 0.02)',
        'skydash-lg': '0 8px 30px 0 rgba(75, 73, 172, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.03)',
        'skydash-primary': '0 4px 15px 0 rgba(75, 73, 172, 0.35)',
        'skydash-blue': '0 4px 15px 0 rgba(125, 160, 250, 0.35)',
        'skydash-purple': '0 4px 15px 0 rgba(121, 120, 233, 0.35)',
        'skydash-coral': '0 4px 15px 0 rgba(243, 121, 126, 0.35)',
      },
      fontFamily: {
        sans: ['Nunito Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
