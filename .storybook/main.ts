import type { StorybookConfig } from "@storybook/react-webpack5"

const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-links",
    "@storybook/addon-onboarding",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  webpackFinal: async (config) => {
    // Add path alias support
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": require("path").resolve(__dirname, "../"),
      }
      // Add TypeScript extensions
      config.resolve.extensions = [...(config.resolve.extensions || []), ".ts", ".tsx"]
    }

    // Add TypeScript loader rule
    config.module = config.module || { rules: [] }
    config.module.rules = config.module.rules || []

    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve("babel-loader"),
          options: {
            presets: [
              require.resolve("@babel/preset-env"),
              [require.resolve("@babel/preset-react"), { runtime: "automatic" }],
              require.resolve("@babel/preset-typescript"),
            ],
          },
        },
      ],
    })

    // Modify existing CSS rule to add PostCSS support for Tailwind CSS v4
    const cssRule = config.module.rules.find((rule: any) => rule.test?.toString().includes("css"))

    if (cssRule && Array.isArray(cssRule.use)) {
      // Add postcss-loader to existing CSS rule
      cssRule.use.push({
        loader: require.resolve("postcss-loader"),
        options: {
          postcssOptions: {
            config: require("path").resolve(__dirname, "postcss.config.js"),
          },
        },
      })
    }

    return config
  },
}

export default config
