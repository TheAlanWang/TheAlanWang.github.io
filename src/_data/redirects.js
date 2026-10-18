// Old URLs that should keep working. Each entry generates a redirect page via src/redirects.njk.
module.exports = [
  {
    from: "/table-of-contents/",
    to: "/posts/",
    title: "Posts",
    message: 'The table of contents is now part of <a href="/posts/">Posts</a>.',
  },
];
