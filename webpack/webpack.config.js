const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
module.exports = {
    mode: "production",
    entry: {
        background: path.resolve(__dirname, "..", "src", "background.ts"),
        content: path.resolve(__dirname, "..", "src", "content.ts"),
        page: path.resolve(__dirname, "..", "src", "page.ts"),
        devtools: path.resolve(__dirname, "..", "src", "devtools", "main.ts"),
        'devtools-panel': path.resolve(__dirname, "..", "src", "devtools", "panel.ts"),
    },
    output: {
        path: path.join(__dirname, "../dist"),
        filename: "[name].js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [{
                from: ".",
                to: ".",
                context: "public",
                noErrorOnMissing: true
            }]
        }),
    ],
};
