const images = document.querySelectorAll(
	'head > link[rel="preload"][as="image"]'
);

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
	last_random:number = 0;
	pan_debounce:number|undefined;

	constructor(element:HTMLElement) {

		this.board = element

		// add first two cards programmatically
		this.push()
		this.push()

		// handle gestures
		this.handle()

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
			this.hammer.add(new Hammer.Tap())
			this.hammer.add(new Hammer.Pan({
				position: Hammer.position_ALL,
				threshold: 0
			}))

			// pass events data to custom callbacks
			this.hammer.on('tap', (e) => {
				this.onTap(e)
			})
			this.hammer.on('pan', (e) => {
				cancelAnimationFrame(this.pan_debounce);
				this.pan_debounce = requestAnimationFrame(() => {
					this.onPan(e);
				});
			})

		}

	}

	onTap(e) {

		// get finger position on top card
		let propX = (e.center.x - e.target.getBoundingClientRect().left) / e.target.clientWidth

		// get rotation degrees around Y axis (+/- 15) based on finger position
		let rotateY = 15 * (propX < 0.05 ? -1 : 1)

		// enable transform transition
		this.topCard.style.transition = 'transform 100ms ease-out';

		[
			'--x',
			'--y',
			'--rotate',
			'--scale',
		].forEach((e) => {
			this.topCard.style.removeProperty(e);
		});
		this.topCard.style.setProperty('--rotate-y', `${rotateY}deg`);

		this.topCard.addEventListener('transitionend', () => {
			[
				'--x',
				'--y',
				'--rotate',
				'--rotate-y',
				'--scale',
			].forEach((e) => {
				this.topCard.style.removeProperty(e);
			});
		});
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

				this.topCard.addEventListener('transitionend', () => {
					// remove swiped card
					this.board.removeChild(this.topCard);
					// add new card
					this.push();
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

	push() {

		let card = document.createElement('div')

		card.classList.add('card');

		let random = this.last_random;

		do {
			random = Math.floor(Math.random() * (images.length * 2)) % images.length;
		} while (random === this.last_random);
		this.last_random = random;
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

		card.title = `${3 == random ? 'Catte' : 'Employee'} ${d}b`;

		card.style.setProperty(
			'--image',
			`url('${(images[random] as HTMLLinkElement).href}')`
		);

		this.board.insertBefore(card, this.board.firstChild);
	}

}

export default Carousel;

export {
	Carousel,
};
