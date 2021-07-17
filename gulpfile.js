const gulp = require('gulp');
const postcss = require('gulp-postcss');
const postcss_plugins = {
	nested: require('postcss-nested'),
	cssnano: require('cssnano'),
};
const rename = require('gulp-rename');
const {rollup} = require('rollup');
const rollup_typescript = require('@rollup/plugin-typescript');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

gulp.task('css', () => {
	return gulp.src('./src/**.postcss').pipe(postcss([
		postcss_plugins.nested(),
		postcss_plugins.cssnano(),
	])).pipe(
		rename({
			extname: '.css'
		})
	).pipe(gulp.dest('./src/'));
});

gulp.task('hammer', () => {
	return gulp.src('./node_modules/hammerjs/hammer.min.*').pipe(
		gulp.dest('./src/')
	);
});

gulp.task('typescript', async () => {
	const bundle = await rollup({
		input: './src/index.ts',
		plugins: [
			rollup_typescript(),
			nodeResolve(),
		]
	});

	return await bundle.write({
		sourcemap: true,
		format: 'es',
		file: './src/index.js',
		compact: false,
	});
});

gulp.task('default', gulp.series(...[
	gulp.parallel(...[
		'css',
		'typescript',
		'hammer',
	]),
]));
