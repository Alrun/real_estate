'use strict';

var gulp = require('gulp'),
		pug = require('gulp-pug'),
		htmlmin = require('gulp-htmlmin'),
		newer = require('gulp-newer'),
		plumber = require('gulp-plumber'),
		wiredep = require('wiredep').stream,
		sass = require('gulp-sass'),
		autoprefixer = require('gulp-autoprefixer'),
		uncss = require('gulp-uncss'),
		cssnano = require('gulp-cssnano'),
		sourcemaps = require('gulp-sourcemaps'),
		del = require('del'),
		bs = require('browser-sync').create(),
		sequence = require('gulp-sequence'),
		notify = require('gulp-notify'),
		gulpIf = require('gulp-if'),
		svgSprite	= require('gulp-svg-sprite'),
		svg2png = require('gulp-svg2png'),
		imagemin = require('gulp-imagemin'),
		pngquant = require('imagemin-pngquant'),
		rename = require('gulp-rename');


// Favicon
var realFavicon = require('gulp-real-favicon'),
		fs = require('fs');

var FAVICON_DATA_FILE = 'faviconData.json';

gulp.task('favicon:generate', function(done) {
	realFavicon.generateFavicon({
		masterPicture: 'app/img/favicon.png',
		dest: 'dist/img/favicon',
		iconsPath: 'img/favicon',
		design: {
			ios: {
				pictureAspect: 'noChange',
				assets: {
					ios6AndPriorIcons: false,
					ios7AndLaterIcons: false,
					precomposedIcons: false,
					declareOnlyDefaultIcon: true
				}
			},
			desktopBrowser: {},
			windows: {
				pictureAspect: 'noChange',
				backgroundColor: '#da532c',
				onConflict: 'override',
				assets: {
					windows80Ie10Tile: false,
					windows10Ie11EdgeTiles: {
						small: false,
						medium: true,
						big: false,
						rectangle: false
					}
				}
			},
			androidChrome: {
				pictureAspect: 'noChange',
				themeColor: '#ffffff',
				manifest: {
					display: 'standalone',
					orientation: 'notSet',
					onConflict: 'override',
					declared: true
				},
				assets: {
					legacyIcon: false,
					lowResolutionIcons: false
				}
			}//,
			// safariPinnedTab: { // for ios
			// 	pictureAspect: 'silhouette',
			// 	themeColor: '#5bbad5' // validator fail
			// }
		},
		settings: {
			compression: 1,
			scalingAlgorithm: 'Mitchell',
			errorOnImageTooSmall: false
		},
		versioning: {
			paramName: 'v',
			paramValue: '1.0.1'
		},
		markupFile: FAVICON_DATA_FILE
	}, function() {
		done();
	});
});

gulp.task('favicon:inject', function() {
	return gulp.src('dist/*.html')
		.pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code))
		.pipe(gulp.dest('dist'));
});

gulp.task('favicon:update', function(done) {
	var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
	realFavicon.checkForUpdates(currentVersion, function(err) {
		if (err) {
			throw err;
		}
	});
});


// SVG Sprite + png fallback
gulp.task('svgSprite', function () {
	return gulp.src(['app/img/*.svg', '!app/img/favicon.*'])
		.pipe(plumber())
		.pipe(svgSprite({
			shape: {
				dimension: { // max dimensions
					maxWidth: 2300,
					maxHeight: 2300
				},
				spacing: {
					padding: 5
				}
			},
			mode: {
				css: {
					dest: '.', // dest sprite.css
					bust: false,
					sprite: '../img/sprite.svg',
					layout: 'vertical', // diagonal
					//prefix: '%%svg-%s', // svg-%s,'$'' scss
					//dimensions: true,
					render: {
						scss: {
							dest: '../../app/modules/sprites/_svg-sprite.scss',
							template: 'app/modules/sprites/_sprite-tpl.scss'
						}
					}
				}
			},
			variables: {
				mapname: "icons"
			}
		}))
		.on('error', function(err){
			console.log(err);
		})
		.pipe(gulp.dest('dist/img'));
});

gulp.task('pngSprite', function() {
	return gulp.src('dist/img/sprite.svg')
		.pipe(svg2png())
		.pipe(gulp.dest('dist/img'));
});

gulp.task('sprite', sequence('svgSprite', ['pngSprite', 'sass:dev']));


// Pug
gulp.task('pug', function() {
	return gulp.src(['app/*.pug', '!app/html/**/_*.pug'])
		.pipe(plumber({
			errorHandler: notify.onError(function(err) {
				return {
					title: 'Pug',
					message: err.message
				};
			})
		}))
		.pipe(newer('app/**/*.pug'))
		.pipe(pug({
			pretty: '\t' // false - default, true - space, '\t' - tab
		}))
		.pipe(gulp.dest('dist'))
		.pipe(bs.stream());
});


// Sass
gulp.task('sass:dev', function() {
	return gulp.src('app/css/*.scss')
		.pipe(plumber({
			errorHandler: notify.onError(function(err) {
				return {
					title: 'Sass Develop',
					message: err.message
				};
			})
		}))
		.pipe(newer('app/css/*.scss'))
		.pipe(sourcemaps.init())
		.pipe(sass())
		.pipe(autoprefixer({
			browsers: ['last 10 versions'], // last 2 versions - default
			cascade: true
		}))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('dist/css'))
		.pipe(bs.stream());
});


// Clean
gulp.task('clean:dist', function () {
	return del('dist');
});

gulp.task('clean:fonts', function () {
	return del('dist/fonts');
});

gulp.task('clean:prod', function () {
  return del('prod');
});


// Fonts
gulp.task('fonts:dev', function() {
	return gulp.src([
			'app/fonts/**/*.{svg,ttf,woff}', // eot for ie8
			'!app/fonts/**/_*/*.*'
		], {base: 'app'})
		.pipe(rename(function (path) {
			path.basename = path.basename.toLowerCase();
		}))
		.pipe(gulp.dest('dist'))
		.pipe(bs.stream());
});

gulp.task('fonts', sequence('clean:fonts', 'fonts:dev'));


// Image
gulp.task('image', function() {
	return gulp.src([
			'app/img/**/*.{jpg,png}',
			'!app/img/favicon/*.*', '!app/img/favicon.*'
		], {base: 'app'})
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()],
			interlaced: true
		}))
		.pipe(gulp.dest('dist'))
		.pipe(bs.stream());
});


// Server + Watch
gulp.task('server', ['default'], function() {
	bs.init({
		server: 'dist'
	});

	gulp.watch(['app/html/**/*.*', 'app/*.pug'], ['pug']);
	gulp.watch('app/css/**/*.*', ['sass:dev']);
	gulp.watch(['app/img/**/*.{jpg,png}', '!app/img/**/favicon.*'], ['image'])
		.on('change', bs.reload);
});

// Watch
gulp.task('watch', function() {
	gulp.watch('app/**/*.pug', ['pug']);
	gulp.watch('app/**/*.scss', ['sass:dev']);
  gulp.watch('app/**/*.js', ['scripts']);
	gulp.watch(['app/img/**/*.{jpg,png}', '!app/img/**/favicon.*'], ['image']);
	gulp.watch();
});


// PRODUCTION
// html
gulp.task('htmlmin', function() {
	return gulp.src('dist/*.html')
		.pipe(htmlmin({collapseWhitespace: true}))
		.pipe(gulp.dest('prod'));
});

// css
gulp.task('sass:prod', function() {
	return gulp.src(['app/css/*.scss', '!app/css/*_.scss'])
		.pipe(plumber({
			errorHandler: notify.onError(function(err) {
				return {
					title: 'Sass Product',
					message: err.message
				};
			})
		}))
		.pipe(sass())
		.pipe(uncss({
			html: ['dist/**/*.html']
		}))
		.pipe(autoprefixer({
			browsers: ['last 15 versions'], // last 2 versions - default
			cascade: false
		}))
		.pipe(cssnano())
		.pipe(gulp.dest('prod/css'))
});

// app
gulp.task('app:prod', function() {
	return gulp.src([
			'dist/fonts/**/*.*',
			'dist/img/**/*.*'
		], {base: 'dist'})
		.pipe(gulp.dest('prod'));
});


// Build
gulp.task('default', sequence('clean:dist', ['pug', 'sprite', 'image', 'favicon:generate', 'fonts:dev'], 'favicon:inject'));

gulp.task('build:prod', sequence('clean:prod', ['htmlmin', 'sass:prod', 'app:prod']));