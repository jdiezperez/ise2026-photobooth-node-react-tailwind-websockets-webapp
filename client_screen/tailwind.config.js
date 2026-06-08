/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                alphabet: ['Alphabet', 'sans-serif'],
                mono: ['B612Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
