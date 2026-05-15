const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function (eleventyConfig) {
    eleventyConfig.addPlugin(syntaxHighlight, {
        preAttributes: {
            "data-language": ({ language }) => language || "text"
        }
    });
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

    eleventyConfig.addCollection("knowledgeMap", (collectionApi) => {
        const posts = collectionApi.getFilteredByTag("posts").sort((left, right) => {
            const categoryCompare = (left.data.category || "").localeCompare(right.data.category || "");
            if (categoryCompare) return categoryCompare;

            const subcategoryCompare = (left.data.subcategory || "").localeCompare(right.data.subcategory || "");
            if (subcategoryCompare) return subcategoryCompare;

            const topicCompare = (left.data.topic || "").localeCompare(right.data.topic || "");
            if (topicCompare) return topicCompare;

            return right.date - left.date;
        });

        const categories = new Map();

        posts.forEach((post) => {
            const categoryName = post.data.category || "Uncategorized";
            const subcategoryName = post.data.subcategory || "General";

            if (!categories.has(categoryName)) {
                categories.set(categoryName, {
                    name: categoryName,
                    count: 0,
                    subcategories: new Map()
                });
            }

            const category = categories.get(categoryName);
            category.count += 1;

            if (!category.subcategories.has(subcategoryName)) {
                category.subcategories.set(subcategoryName, {
                    name: subcategoryName,
                    count: 0,
                    posts: []
                });
            }

            const subcategory = category.subcategories.get(subcategoryName);
            subcategory.count += 1;
            subcategory.posts.push(post);
        });

        return Array.from(categories.values()).map((category) => ({
            ...category,
            subcategories: Array.from(category.subcategories.values())
        }));
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
