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

    // Posts that share a `series` name, in reading order (`seriesOrder`). Used for the
    // previous / next links at the bottom of a post.
    eleventyConfig.addFilter("seriesNav", (posts, name, url) => {
        const list = (posts || []).filter((post) => post.data.series === name)
            .sort((left, right) => (left.data.seriesOrder ?? 0) - (right.data.seriesOrder ?? 0));
        const i = list.findIndex((post) => post.url === url);
        return { hub: list[0], prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, isHub: i === 0 };
    });

    eleventyConfig.addFilter("displayDate", (value) => {
        const date = value instanceof Date ? value : new Date(value);

        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(date);
    });

    eleventyConfig.addCollection("postsDesc", (collectionApi) => {
        // Overview (hub) posts stay pinned at the top, in their `order`; everything else is newest first.
        const pinned = (post) => post.data.topic === "Overviews";
        return collectionApi.getFilteredByTag("posts").sort((left, right) => {
            if (pinned(left) !== pinned(right)) return pinned(left) ? -1 : 1;
            if (pinned(left)) return (left.data.order ?? 0) - (right.data.order ?? 0);
            return right.date - left.date;
        });
    });

    // Homepage category cards: name, one-line blurb, and a filtered /posts/ link.
    eleventyConfig.addCollection("categoryCards", () => {
        const cards = [
            { name: "Knowledge", blurb: "Notes on AI systems, backend, data, and cloud." },
            { name: "Projects", blurb: "What I built, how it works, and what I measured." },
            { name: "System Design & Algorithms", label: "System Design &<br>Algorithms", blurb: "Design questions and algorithm walkthroughs." }
        ];
        return cards.map((card) => ({
            ...card,
            url: `/posts/?category=${encodeURIComponent(card.name)}`
        }));
    });

    eleventyConfig.addCollection("recentPosts", (collectionApi) => {
        return collectionApi.getFilteredByTag("posts").sort((left, right) => right.date - left.date).slice(0, 5);
    });

    // Reading order for topics within a subcategory; unlisted topics follow, alphabetically.
    const topicOrder = {
        "Knowledge/AI": ["Overviews", "Foundations", "Models & Training", "Inference & Serving", "Agents & RAG", "Evals & Production"]
    };
    const topicRank = (post) => {
        const order = topicOrder[`${post.data.category}/${post.data.subcategory}`] || [];
        const index = order.indexOf(post.data.topic);
        return index === -1 ? order.length : index;
    };

    eleventyConfig.addCollection("tableOfContents", (collectionApi) => {
        const posts = collectionApi.getFilteredByTag("posts").sort((left, right) => {
            const categoryCompare = (left.data.category || "").localeCompare(right.data.category || "");
            if (categoryCompare) return categoryCompare;

            const subcategoryCompare = (left.data.subcategory || "").localeCompare(right.data.subcategory || "");
            if (subcategoryCompare) return subcategoryCompare;

            const topicRankCompare = topicRank(left) - topicRank(right);
            if (topicRankCompare) return topicRankCompare;

            const topicCompare = (left.data.topic || "").localeCompare(right.data.topic || "");
            if (topicCompare) return topicCompare;

            // Posts with an explicit `order` (reading sequence) come first, ascending.
            const leftOrder = left.data.order;
            const rightOrder = right.data.order;
            if (leftOrder != null || rightOrder != null) {
                if (leftOrder == null) return 1;
                if (rightOrder == null) return -1;
                if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            }

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
