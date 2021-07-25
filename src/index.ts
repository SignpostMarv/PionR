const images = document.querySelectorAll(
	'head > link[rel="preload"][as="image"]'
);

declare type images = {
	[key:'pioneer'|'catte'|string]: {
		any?: string[],
		0?:string[]
	}
};

class SemiRandomInt
{
	max:number;
	last:number = -1;

	constructor(max:number)
	{
		this.max = max;
	}

	fresh() : number
	{
		if (this.max === 1) {
			return 0;
		}

		let random = this.last;
		let loops = 0;

		do {
			random = Math.floor(Math.random() * (this.max * 2)) % this.max;

			if (++loops > 10) {
				throw new Error('fail');
			}
		} while (random === this.last);

		this.last = random;

		return random;
	}
}

/*
LikeCarousel (c) 2019 Simone P.M. github.com/simonepm - Licensed MIT
Modified 2021 SignpostMarv
*/
class Carousel {
	board:HTMLElement;
	cards:NodeList;
	topCard:HTMLElement|undefined;
	nextCard:HTMLElement|undefined;
	hammer:any;
	isPanning:boolean = false;
	startPosX:number = 0;
	startPosY:number = 0;
	isDraggingFrom:0|-1|1 = 0;
	pan_debounce:number|undefined;
	tap_debounce:number|undefined;
	profile:HTMLDialogElement;
	profiles:{
		pioneer: string[][],
		catte: string[][],
	}|undefined;
	images: images;
	image_types: string[];
	profile_types_randomiser:SemiRandomInt;
	image_types_randomise: {[key:string]: SemiRandomInt} = {};

	constructor(
		element:HTMLElement,
		profile:HTMLDialogElement,
		images:images
	) {
		this.board = element;
		this.profile = profile;
		this.images = images;
		this.image_types = Object.keys(images);
		this.profile_types_randomiser = new SemiRandomInt(
			this.image_types.length * 4
		);

		// add first two cards programmatically
		Promise.all([
			this.push(),
			this.push(),
		]).then(() => {
		// handle gestures
		this.handle()
		});
	}

	handle() {

		// list all cards
		this.cards = this.board.querySelectorAll('.card');

		// get top card
		this.topCard = this.cards[this.cards.length - 1] as HTMLElement|undefined;

		// get next card
		this.nextCard = this.cards[this.cards.length - 2] as HTMLElement|undefined

		// if at least one card is present
		if (this.cards.length > 0) {

			[
				'--x',
				'--y',
				'--rotate',
				'--rotate-y',
				'--scale',
			].forEach((e) => {
				this.topCard.style.removeProperty(e);
			});

			// destroy previous Hammer instance, if present
			if (this.hammer) this.hammer.destroy()

			// listen for tap and pan gestures on top card
			this.hammer = new Hammer(this.topCard)
			this.hammer.add(new Hammer.Pan({
				position: Hammer.position_ALL,
				threshold: 0
			}))

			this.hammer.on('pan', (e) => {
				cancelAnimationFrame(this.pan_debounce);
				this.pan_debounce = requestAnimationFrame(() => {
					this.onPan(e);
				});
			})

		}

	}

	onPan(e) {

		if (!this.isPanning) {

			this.isPanning = true

			// remove transition properties
			this.topCard.style.transition = null
			if (this.nextCard) this.nextCard.style.transition = null

			// get top card coordinates in pixels
			let style = window.getComputedStyle(this.topCard)
			let mx = style.transform.match(/^matrix\((.+)\)$/)
			this.startPosX = mx ? parseFloat(mx[1].split(', ')[4]) : 0
			this.startPosY = mx ? parseFloat(mx[1].split(', ')[5]) : 0

			// get top card bounds
			let bounds = this.topCard.getBoundingClientRect()

			// get finger position on top card, top (1) or bottom (-1)
			this.isDraggingFrom =
				(e.center.y - bounds.top) > this.topCard.clientHeight / 2 ? -1 : 1

		}

		// get new coordinates
		let posX = e.deltaX + this.startPosX
		let posY = e.deltaY + this.startPosY

		// get ratio between swiped pixels and the axes
		let propX = e.deltaX / this.board.clientWidth
		let propY = e.deltaY / this.board.clientHeight

		// get swipe direction, left (-1) or right (1)
		let dirX = e.deltaX < 0 ? -1 : 1

		// get degrees of rotation, between 0 and +/- 45
		let deg = this.isDraggingFrom * dirX * Math.abs(propX) * 45

		// get scale ratio, between .95 and 1
		let scale = (95 + (5 * Math.abs(propX))) / 100

		this.topCard.style.setProperty('--x', `${posX}px`);
		this.topCard.style.setProperty('--y', `${posY}px`);
		this.topCard.style.setProperty('--rotate', `${deg}deg`);
		this.topCard.style.removeProperty('--rotate-y');
		this.topCard.style.removeProperty('--scale');

		// scale up next card
		if (this.nextCard) {
			[
				'--x',
				'--y',
				'--rotate',
				'--rotate-y',
			].forEach((e) => {
				this.nextCard.style.removeProperty(e);
			});
			this.nextCard.style.setProperty('--scale', scale.toString());
		}

		if (e.isFinal) {

			this.isPanning = false

			let successful = false

			// set back transition properties
			this.topCard.style.transition = 'transform 200ms ease-out'
			if (this.nextCard) this.nextCard.style.transition = 'transform 100ms linear'

			// check threshold and movement direction
			if (propX > 0.25 && e.direction == Hammer.DIRECTION_RIGHT) {

				successful = true
				// get right border position
				posX = this.board.clientWidth

			} else if (propX < -0.25 && e.direction == Hammer.DIRECTION_LEFT) {

				successful = true
				// get left border position
				posX = -(this.board.clientWidth + this.topCard.clientWidth)

			} else if (propY < -0.25 && e.direction == Hammer.DIRECTION_UP) {

				successful = true
				// get top border position
				posY = -(this.board.clientHeight + this.topCard.clientHeight)

			}

			if (successful) {
				this.topCard.style.setProperty('--x', `${posX}px`);
				this.topCard.style.setProperty('--y', `${posY}px`);
				this.topCard.style.setProperty('--rotate', `${deg}deg`);
				this.topCard.style.removeProperty('--rotate-y');
				this.topCard.style.removeProperty('--scale');

				this.topCard.addEventListener('transitionend', async () => {
					// remove swiped card
					this.board.removeChild(this.topCard);
					// add new card
					await this.push();
					// handle gestures on new top card
					this.handle();
				});
			} else {
				[
					'--x',
					'--y',
					'--rotate',
					'--rotate-y',
					'--scale',
				].forEach((e) => {
					this.topCard.style.removeProperty(e);
				});

				if (this.nextCard) {

					[
						'--x',
						'--y',
						'--rotate',
						'--rotate-y',
					].forEach((e) => {
						this.nextCard.style.removeProperty(e);
					});

					this.nextCard.style.setProperty('--scale', '0.95');
				}
			}

		}

	}

	async push() {

		let card = document.createElement('div')

		card.classList.add('card');

		const random = this.profile_types_randomiser.fresh() % this.image_types.length;
		const a = Math.floor(Math.random() * Math.pow(16, 9)).toString(16).padStart(9, '0');
		const b = Math.floor(Math.random() * Math.pow(16, 9)).toString(16).padStart(9, '0');
		const c = a + b;
		const d = [
			[c[0], c[1], c[2], c[3], c[4]].join(''),
			[c[5], c[6]].join(''),
			[c[7], c[8], c[9], c[10]].join(''),
			[c[11], c[12], c[13]].join(''),
			[c[14]].join(''),
			[c[15], c[16], c[17]].join(''),
		].join('.');

		const type = this.image_types[random];

		const name = `${type.slice(0, 1).toUpperCase() + type.slice(1)} ${d}b`;

		const images = [];

		if ('any' in this.images[type]) {
			if ( ! (type in this.image_types_randomise)) {
				this.image_types_randomise[type] = new SemiRandomInt(
					this.images[type].any.length
				);
			}

			const random_image = this.image_types_randomise[type].fresh();

			images.push(this.images[type].any[random_image]);
		} else if (0 in this.images[type]) {
			images.push(...this.images[type][0]);
		}

		card.innerHTML = `
			<header>
				<h1>${name}</h1>
				<button type="button" data-action="nope">❌</button>
				<button type="button" data-action="yup">💓</button>
				<button
					type="button"
					data-action="profile"
					data-seed="${d}"
					data-catte="${'catte' === type ? 'true' : 'false'}"
				>ℹ️</button>
			</header>
			<section data-show="0">
				${images.map((url) => {
					if (/\.webm/.test(url)) {
						return `
							<video
								width="300"
								height="500"
								autoplay
								muted
								loop
								src="${url}"
							></video>
						`;
					}

					return `<img width="300" height="500" src="${
						url
					}" alt="Profile photo">`;
				}).join('')}
				${
					images.length > 1
						? `
							<button
								data-action="back"
								aria-label="Previous"
							>◀</button><button
								data-action="next"
								aria-label="Next"
							>▶</button>`
						: ''
				}
			</section>
			<section hidden></section>
		`;

		card.querySelector('section[hidden]').append(
			(await this.generate_profile_text(d, type))
		);

		const div = document.createElement('div');

		this.board.insertBefore(card, this.board.firstChild);
	}

	async generate_profile_text(seed:string, type:string) : Promise<HTMLElement>
	{
		if ( undefined === this.profiles) {
			this.profiles = await (await fetch('./profiles.json')).json();
		}

		const fragment = document.createDocumentFragment();

		if ( ! (type in this.profiles)) {
			throw new Error(`Profile type "${type}" not found in profiles!`);
		}

		const source = this.profiles[type];

		const profile = source[Math.floor(Math.random() * source.length)];

		profile.forEach((e, i) => {
			if (i > 0) {
				fragment.appendChild(document.createElement('br'));
			}

			fragment.appendChild(document.createTextNode(e));
		});

		const wrapped = document.createElement('section');
		const header_title = document.createElement('h1');

		header_title.textContent = `${
			type.slice(0, 1).toUpperCase() + type.slice(1)
		} ${seed}b`;
		wrapped.appendChild(header_title);

		wrapped.appendChild(fragment);

		return wrapped;
	}
}

export default Carousel;

export {
	Carousel,
};
