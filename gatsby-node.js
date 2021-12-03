const defaultUrlLoaderOptions = {
  name: "static/[name]-[hash].[ext]",
  limit: 512,
};

const defaultInlineSvgOptions = [
  {
    test: /\.inline.svg$/,
    svgo: true,
  },
];

const defaultUrlSvgOptions = [
  {
    test: /\.svg$/,
    svgo: true,
    urlLoaderOptions: defaultUrlLoaderOptions,
  },
];

exports.onCreateWebpackConfig = (
  { getConfig, actions, stage },
  {
    inlineSvgOptions = defaultInlineSvgOptions,
    urlSvgOptions = defaultUrlSvgOptions,
  }
) => {
  const { replaceWebpackConfig, setWebpackConfig } = actions;
  const existingConfig = getConfig();

  // Run only for the specificified build stages
  if (
    ["develop", "develop-html", "build-html", "build-javascript"].includes(
      stage
    )
  ) {
    // Remove any svg rules from existing configuration
    const rules = existingConfig.module.rules.map((rule) => {
      if (
        String(rule.test) ===
        String(/\.(ico|svg|jpg|jpeg|png|gif|webp|avif)(\?.*)?$/)
      ) {
        return { ...rule, test: /\.(ico|jpg|jpeg|png|gif|webp|avif)(\?.*)?$/ };
      }

      return rule;
    });

    // Replace WebpackConfig with the new one without svg rules
    replaceWebpackConfig({
      ...existingConfig,
      module: {
        ...existingConfig.module,
        rules,
      },
    });

    // Prepare svg rules for inline usage
    const inlineSvgRules = inlineSvgOptions.map(
      ({ test, svgo, ...otherOptions }) => ({
        test: test,
        use: [
          {
            loader: require.resolve("@svgr/webpack"),
            options: {
              svgo: svgo === undefined ? true : svgo,
              ...otherOptions,
            },
          },
        ],
        issuer: /\.(js|jsx|ts|tsx)$/,
      })
    );

    const urlSvgRules = [];
    // Prepare svg rules for url loader usage with SVGO
    urlSvgOptions.forEach((option) => {
      const svgoFlag = !!option.svgoConfig || option.svgo;

      let { urlLoaderOptions = {} } = option;
      if (!urlLoaderOptions.name) {
        urlLoaderOptions.name = defaultUrlLoaderOptions.name;
      }
      if (!urlLoaderOptions.limit) {
        urlLoaderOptions.limit = defaultUrlLoaderOptions.limit;
      }

      const svgoLoader = {
        loader: require.resolve("svgo-loader"),
        options: {
          ...option.svgoConfig,
        },
      };
      const svgUrlLoaders = [
        {
          loader: "url-loader",
          options: urlLoaderOptions,
        },
      ];
      // Don't push svgo loader at all if it's disabled
      if (svgoFlag) svgUrlLoaders.push(svgoLoader);

      urlSvgRules.push({
        test: option.test,
        use: svgUrlLoaders,
        issuer: /\.(js|jsx|ts|tsx)$/,
      });
      urlSvgRules.push({
        test: option.test,
        use: svgUrlLoaders,
        issuer: /\.(?!(js|jsx|ts|tsx)$)([^.]+$)/,
      });
    });

    setWebpackConfig({
      module: {
        rules: [{ oneOf: [...inlineSvgRules, ...urlSvgRules] }],
      },
    });
  }
};
