/** @type {import('tailwindcss').Config} */
export default {
    // 手機沒有滑鼠，但點過／滑動碰到元素後，:hover 狀態會卡住不消失
    // （chung 回報：歌詞行會有一行莫名變成淡灰底，位置隨最後碰到的地方跑）。
    // 開這個選項後，所有 hover: 樣式只在真的支援滑鼠的裝置生效
    // （包進 @media (hover: hover)），電腦行為不變、手機不再有殘影。
    future: {
        hoverOnlyWhenSupported: true,
    },
    content: [
        './resources/**/*.blade.php',
        './resources/**/*.js',
        './resources/**/*.vue',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
