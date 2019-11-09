// Зависимости
const {src, dest, task, watch, series} = require('gulp');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const csso = require('gulp-csso');
const sourcemaps = require("gulp-sourcemaps");
const rename = require('gulp-rename');
const htmlmin = require('gulp-htmlmin');
const posthtml = require('gulp-posthtml');
const includehtml = require('posthtml-include');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const {optipng, jpegtran, svgo} = imagemin;
const svgstore = require('gulp-svgstore');
const webp = require('gulp-webp');
const plumber = require('gulp-plumber');
const sync = require('browser-sync').create();
const del = require('del');
const concat = require('gulp-concat');
const flatten = require('gulp-flatten');

const SOURCE = './source';
const BUILD = './build';
const COMPONENTS = SOURCE + '/components';
const BLOCKS = COMPONENTS + '/blocks';

const jsFiles = [
  BLOCKS + '/example/js/script.js'
];

// HTML
task('html', function () {
  return src(SOURCE + '/*.html')
  .pipe(posthtml([
    includehtml({
      root: SOURCE
    })
  ]))
  .pipe(htmlmin({
    collapseWhitespace: true,
    removeComments: true
  }))
  .pipe(dest(BUILD));
});

// SASS в CSS
task('css', function () {
  return src(COMPONENTS + '/style.scss')
  .pipe(plumber())
  .pipe(sourcemaps.init())
  .pipe(sass())
  .pipe(postcss([
    autoprefixer()
  ]))
  .pipe(csso())
  .pipe(rename({
    suffix: '.min'
  }))
  .pipe(sourcemaps.write('.'))
  .pipe(dest(BUILD + '/css'))
  .pipe(sync.stream());
});

// JS import
task('js', function () {
  return src(jsFiles)
  .pipe(concat('script.js'))
  .pipe(uglify())
  .pipe(rename({
    suffix: '.min'
  }))
  .pipe(dest(BUILD + '/js'));
});

// Оптимизация изображений
task("image", function () {
  return src([
    COMPONENTS + '/blocks/*/img/**/*.{png,jpeg,jpg,svg,gif}'
  ])
    .pipe(imagemin([
      optipng({
        optimizationLevel: 3
      }),
      jpegtran({
        progressive: true
      }),
      svgo({
        plugins: [
          {cleanupIDs: false},
          {removeUselessDefs: false},
          {removeViewBox: true},
          {removeComments: true}
        ]
      })
    ]))
  .pipe(flatten({
    includeParents: 1
  }))
  .pipe(dest(BUILD + '/img'));
});

// Конвертация в webp
task('webp', function () {
  return src(BUILD + '/img/**/*.{png,jpg}')
  .pipe(webp({
    quality: 90
  }))
  .pipe(dest(BUILD + '/img'));
});

// SVG спрайт
task('sprite', function () {
  return src(COMPONENTS + '/blocks/*/img/**/icon-*.svg')
  .pipe(svgstore({
    inlineSvg: true
  }))
  .pipe(rename('sprite.svg'))
  .pipe(dest(SOURCE + '/includes'));
});

// Перенос файлов
task('copy', function () {
  return src([
    SOURCE + '/fonts/**/*.{woff,woff2}',
    SOURCE + '/favicons/*.{icon,png,svg}',
    SOURCE + '/site.webmanifest'
  ], {base: SOURCE})
  .pipe(dest(BUILD));
});

// Удаление сборки
task('clear', function () {
  return del(BUILD);
});

// Сборка проекта
task('build', series(
  'clear',
  'copy',
  'image',
  'webp',
  'sprite',
  'html',
  'css',
  'js'
));

// Перезапус страницы
task('reload', function (done) {
  sync.reload();
  done();
});

// Live server
task('server', function () {
  sync.init({
    server: BUILD,
    port: 3000,
    notify: false
  });

  watch(SOURCE + '/*.html', series('html')).on('change', sync.reload);
  watch(COMPONENTS + '/**/*.{sass,scss}', {usePolling: true}, series('css'));
  watch(COMPONENTS + '/**/*.js', {usePolling: true}, series('js')).on('change', sync.reload);
  watch(COMPONENTS + '/**/icon-*.svg', series('sprite', 'html', 'reload'));
});

// Запуск сборки
task('start', series('build', 'server'));
