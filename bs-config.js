module.exports = {
  files: [
    "./public/**/*.html",  // watch HTML files
    "./public/**/*.css",   // watch compiled Tailwind CSS
    "./public/**/*.js",    // watch JS files
  ],
  server: {
    baseDir: "./public"    // serve your static files
  },
  port: 2222,
  open: true,
  notify: true
};
