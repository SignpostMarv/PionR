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
const glob = require('glob');
const {
	writeFileSync,
} = require('fs');

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

gulp.task('images-compile', async (cb) => {
	const pioneer = await new Promise((yup, nope) => {
		glob('./data/images/pioneer/any/*.{webp,webm}', (err, files) => {
			if (err) {
				nope(err);
			} else {
				yup(files.map(
					(file) => {
						return file.replace('./data/', './');
					}
				));
			}
		});
	});
	const catte = await new Promise((yup, nope) => {
		glob('./data/images/catte/any/*.{webp,webm}', (err, files) => {
			if (err) {
				nope(err);
			} else {
				yup(files.map(
					(file) => {
						return file.replace('./data/', './');
					}
				));
			}
		});
	});
	const secret = await new Promise((yup, nope) => {
		glob('./data/secret-images/*/*/*.{webp,webm}', (err, files) => {
			if (err) {
				nope(err);
			} else {
				yup(files.map(
					(file) => {
						return file.replace(
							'./data/secret-images/',
							'./images/'
						);
					}
				));
			}
		});
	});

	console.log(secret);

	const images = {
		pioneer: {
			any: pioneer,
		},
		catte: {
			any: catte,
		}
	};

	secret.forEach((file) => {
		const parts = file.split('/');

		console.log(parts);

		if ( ! (parts[2] in images)) {
			images[parts[2]] = {};
		}

		if ( ! (parts[3] in images[parts[2]])) {
			images[parts[2]][parts[3]] = [];
		}

		images[parts[2]][parts[3]].push(file);
	});

	writeFileSync('./src/images.json', JSON.stringify(images));

	cb();
});

gulp.task('images-known', () => {
	return gulp.src('./data/images/**/*.{webp,webm}').pipe(gulp.dest('./src/images/'));
});
gulp.task('images-secret', () => {
	return gulp.src('./data/secret-images/**/*.{webp,webm}').pipe(gulp.dest('./src/images/'));
});

gulp.task('profiles-compile', (cb) => {
	const known = require('./data/profiles.json');
	const secret = require('./data/secret-profiles.json');

	const profiles = [];

	profiles.push(...Object.entries(known));
	profiles.push(...Object.entries(secret));

	writeFileSync(
		'./src/profiles.json',
		JSON.stringify(
			Object.fromEntries(profiles)
		)
	);

	cb();
});

gulp.task('default', gulp.series(...[
	gulp.parallel(...[
		'images-compile',
		'images-known',
		'images-secret',
	]),
	gulp.parallel(...[
		'css',
		'typescript',
		'hammer',
	]),
]));
