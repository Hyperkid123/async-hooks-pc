import { defineConfig } from "@rspack/cli";
import { rspack, container } from "@rspack/core";
import { ReactRefreshRspackPlugin } from "@rspack/plugin-react-refresh";
const { ModuleFederationPlugin } = container;

const fed = new ModuleFederationPlugin({
	name: 'chrome',
	library: { type: 'global', name: 'chrome' },
	exposes: {
		'./useAsyncCounter': './src/modules/useAsyncCounter.ts',
		'./useAsyncPassThrough': './src/modules/useAsyncPassThrough.ts',
		'./Title': './src/modules/Title.tsx'
	},
	shared: {
		react: {
			singleton: true,
			requiredVersion: '*'
		},
		'react-dom': {
			singleton: true,
			requiredVersion: '*'
		}
	}
});

const isDev = process.env.NODE_ENV === "development";

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ["last 2 versions", "> 0.2%", "not dead", "Firefox ESR"];

export default defineConfig({
	entry: {
		main: "./src/main.tsx"
	},
	resolve: {
		extensions: ["...", ".ts", ".tsx", ".jsx"]
	},
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset"
			},
			{
				test: /\.(jsx?|tsx?)$/,
				use: [
					{
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "typescript",
									tsx: true
								},
								transform: {
									react: {
										runtime: "automatic",
										development: isDev,
										refresh: isDev
									}
								}
							},
							env: { targets }
						}
					}
				]
			}
		]
	},
	plugins: [
		new rspack.HtmlRspackPlugin({
			template: "./index.html"
		}),
		fed,
		isDev ? new ReactRefreshRspackPlugin() : null
	].filter(Boolean),
	optimization: {
		minimizer: [
			new rspack.SwcJsMinimizerRspackPlugin(),
			new rspack.LightningCssMinimizerRspackPlugin({
				minimizerOptions: { targets }
			})
		]
	},
	experiments: {
		css: true
	}
});
