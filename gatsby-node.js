const defaultInlineSvgOptions = [
  {
    test: /\.inline.svg$/,
    svgo: true
  }
];

const defaultUrlSvgOptions = [
  {
    test: /\.svg$/,
    svgo: true
  }
];

exports.onCreateWebpackConfig = (
  { getConfig, actions, loaders, stage },
  {
    inlineSvgOptions = defaultInlineSvgOptions,
    urlSvgOptions = defaultUrlSvgOptions
  }
) => {
  const { replaceWebpackConfig, setWebpackConfig } = actions;
  const existingConfig = getConfig();

  // Run only for the specificified  build stages
  if (
    ["develop", "develop-html", "build-html", "build-javascript"].includes(
      stage
    )
  ) {
    // Remove any svg rules from existing configuration
    const rules = existingConfig.module.rules.map(rule => {
      if (
        String(rule.test) ===
        String(/\.(ico|svg|jpg|jpeg|png|gif|webp)(\?.*)?$/)
      ) {
        return { ...rule, test: /\.(ico|jpg|jpeg|png|gif|webp)(\?.*)?$/ };
      }

      return rule;
    });

    // Replace WebpackConfig with the new one without svg rules
    replaceWebpackConfig({
      ...existingConfig,
      module: {
        ...existingConfig.module,
        rules
      }
    });

    // Prepare svg rules for inline usage
    const inlineSvgRules = inlineSvgOptions.map(option => ({
      test: option.test,
      use: [
        {
          loader: require.resolve("@svgr/webpack"),
          options: {
            svgo: option.svgo === undefined ? true : option.svgo,
            svgoConfig: option.svgoConfig
          }
        }
      ],
      issuer: {
        test: /\.(js|jsx|ts|tsx)$/
      }
    }));

    const urlSvgRules = [];
    // Prepare svg rules for url loader usage with SVGO
    urlSvgOptions.forEach(option => {
      const svgoFlag = !!option.svgoConfig || option.svgo;

      const svgoLoader = {
        loader: require.resolve("svgo-loader"),
        options: {
          ...option.svgoConfig
        }
      };
      const svgUrlLoaders = [
        {
          loader: "url-loader",
          options: option.urlLoaderOptions
        }
      ];
      // Don't push svgo loader at all if it's disabled
      if (svgoFlag) svgUrlLoaders.push(svgoLoader);

      urlSvgRules.push({
        test: option.test,
        use: svgUrlLoaders,
        issuer: {
          test: /\.(js|jsx|ts|tsx)$/
        }
      });
      urlSvgRules.push({
        test: option.test,
        use: svgUrlLoaders,
        issuer: {
          test: /\.(?!(js|jsx|ts|tsx)$)([^.]+$)/
        }
      });
    });

    setWebpackConfig({
      module: {
        rules: [{ oneOf: [...inlineSvgRules, ...urlSvgRules] }]
      }
    });
  }
};
