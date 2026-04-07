module.exports = function (eleventyConfig) {
    eleventyConfig.addWatchTarget("./css/main.css");
    eleventyConfig.addWatchTarget("./assets/");
    eleventyConfig.addPassthroughCopy({ "css": "css" });
    eleventyConfig.addPassthroughCopy({ "assets": "assets" });

    eleventyConfig.addFilter("displayDate", (value) => {
        const date = value instanceof Date ? value : new Date(value);

        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(date);
    });

    eleventyConfig.addCollection("postsDesc", (collectionApi) => {
        return collectionApi.getFilteredByTag("posts").sort((left, right) => right.date - left.date);
    });

    eleventyConfig.addCollection("recentPosts", (collectionApi) => {
        return collectionApi.getFilteredByTag("posts").sort((left, right) => right.date - left.date).slice(0, 5);
    });

    return {
        dir: {
            input: "src",
            includes: "_includes",
            data: "_data",
            output: "_site"
        },
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk"
    };
};
