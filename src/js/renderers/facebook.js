'use strict';

/**
 * Facebook renderer
 *
 * It creates an <iframe> from a <div> with specific configuration.
 * @see https://developers.facebook.com/docs/plugins/embedded-video-player
 */
const FacebookApi = {

	promise: null,

	/**
	 * Create a queue to prepare the creation of <iframe>
	 *
	 * @param {Object} settings - an object with settings needed to create <iframe>
	 */
	load: (settings) => {

		if (typeof FB !== 'undefined') {
			FacebookApi._createPlayer(settings);
		} else {
			FacebookApi.promise = FacebookApi.promise || mejs.Utils.loadScript(`https://connect.facebook.net/${settings.options.lang}/sdk.js`);
			FacebookApi.promise.then(() => {
				FB.init(settings.options);

				setTimeout(() => {
					FacebookApi._createPlayer(settings);
				}, 50);
			});
		}
	},

	/**
	 * Create a new instance of Facebook API player and trigger a custom event to initialize it
	 *
	 * @param {Object} settings - the instance ID
	 */
	_createPlayer: (settings) => {
		window[`__ready__${settings.id}`]();
	}
};
const FacebookRenderer = {
	name: 'facebook',
	options: {
		prefix: 'facebook',
		facebook: {
			appId: '',
			xfbml: true,
			version: 'v2.10',
			lang: 'en_US'
		}
	},

	/**
	 * Determine if a specific element type can be played with this render
	 *
	 * @param {String} type
	 * @return {Boolean}
	 */
	canPlayType: (type) => ~['video/facebook', 'video/x-facebook'].indexOf(type.toLowerCase()),

	/**
	 * Create the player instance and add all native events/methods/properties as possible
	 *
	 * @param {MediaElement} mediaElement Instance of mejs.MediaElement already created
	 * @param {Object} options All the player configuration options passed through constructor
	 * @param {Object[]} mediaFiles List of sources with format: {src: url, type: x/y-z}
	 * @return {Object}
	 */
	create: (mediaElement, options, mediaFiles) => {
		const
			apiStack = [],
			fb = {},
			readyState = 4
		;

		let
			hasStartedPlaying = false,
			paused = true,
			ended = false,
			fbPlayer = null,
			src = '',
			poster = '',
			autoplay = mediaElement.originalNode.autoplay
		;

		fb.options = options;
		fb.id = mediaElement.id + '_' + options.prefix;
		fb.mediaElement = mediaElement;

		if (mediaElement.originalNode.getAttribute('poster')) {
			poster = mediaElement.originalNode.getAttribute('poster');
			mediaElement.originalNode.removeAttribute('poster');
		}

		// wrappers for get/set
		const
			props = mejs.html5media.properties,
			assignGettersSetters = (propName) => {

				const capName = `${propName.substring(0, 1).toUpperCase()}${propName.substring(1)}`;

				fb[`get${capName}`] = () => {

					if (fbPlayer !== null) {
						const value = null;

						// figure out how to get youtube dta here
						switch (propName) {
							case 'currentTime':
								return fbPlayer.getCurrentPosition();
							case 'duration':
								return fbPlayer.getDuration();
							case 'volume':
								return fbPlayer.getVolume();
							case 'paused':
								return paused;
							case 'ended':
								return ended;
							case 'muted':
								return fbPlayer.isMuted();
							case 'buffered':
								return {
									start: () => {
										return 0;
									},
									end: () => {
										return 0;
									},
									length: 1
								};
							case 'src':
								return src;
							case 'readyState':
								return readyState;
						}

						return value;
					} else {
						return null;
					}
				};

				fb[`set${capName}`] = (value) => {

					if (fbPlayer !== null) {

						switch (propName) {
							case 'src':
								const url = typeof value === 'string' ? value : value[0].src;
								src = url;

								// Only way is to destroy instance and all the events fired,
								// and create new one
								fbContainer.remove();
								fbContainer = document.createElement('div');
								fbContainer.id = fb.id;
								fbContainer.className = 'fb-video';
								fbContainer.setAttribute('data-href', url);
								fbContainer.setAttribute('data-allowfullscreen', 'true');
								fbContainer.setAttribute('data-controls', 'false');

								mediaElement.originalNode.parentNode.insertBefore(fbContainer, mediaElement.originalNode);
								mediaElement.originalNode.style.display = 'none';

								FacebookApi.load({
									lang: fb.options.lang,
									id: fb.id
								});

								// This method reloads video on-demand
								FB.XFBML.parse();

								if (autoplay) {
									fbPlayer.play();
								}
								break;
							case 'currentTime':
								fbPlayer.seek(value);
								break;
							case 'muted':
								if (value) {
									fbPlayer.mute();
								} else {
									fbPlayer.unmute();
								}
								setTimeout(() => {
									const event = mejs.Utils.createEvent('volumechange', fb);
									mediaElement.dispatchEvent(event);
								}, 50);
								break;
							case 'volume':
								fbPlayer.setVolume(value);
								setTimeout(() => {
									const event = mejs.Utils.createEvent('volumechange', fb);
									mediaElement.dispatchEvent(event);
								}, 50);
								break;
							case 'readyState':
								const event = mejs.Utils.createEvent('canplay', fb);
								mediaElement.dispatchEvent(event);
								break;
							default:
								console.log('facebook ' + fb.id, propName, 'UNSUPPORTED property');
								break;
						}
					} else {
						// store for after "READY" event fires
						apiStack.push({type: 'set', propName: propName, value: value});
					}
				};

			}
		;

		for (let i = 0, total = props.length; i < total; i++) {
			assignGettersSetters(props[i]);
		}

		const
			methods = mejs.html5media.methods,
			assignMethods = (methodName) => {
				fb[methodName] = () => {
					if (fbPlayer !== null) {
						switch (methodName) {
							case 'play':
								return fbPlayer.play();
							case 'pause':
								return fbPlayer.pause();
							case 'load':
								return null;
						}
					} else {
						apiStack.push({type: 'call', methodName: methodName});
					}
				};
			}
		;

		for (let i = 0, total = methods.length; i < total; i++) {
			assignMethods(methods[i]);
		}

		/**
		 * Dispatch a list of events
		 *
		 * @private
		 * @param {Array} events
		 */
		function assignEvents (events) {
			for (let i = 0, total = events.length; i < total; i++) {
				const event = mejs.Utils.createEvent(events[i], fb);
				mediaElement.dispatchEvent(event);
			}
		}

		window['__ready__' + fb.id] = () => {
			FB.Event.subscribe('xfbml.ready', (msg) => {
				if (msg.type === 'video' && fb.id === msg.id) {
					mediaElement.fbPlayer = fbPlayer = msg.instance;

					// Set proper size since player dimensions are unknown before this event
					const
						fbIframe = document.getElementById(fb.id),
						width = fbIframe.offsetWidth,
						height = fbIframe.offsetHeight,
						events = ['mouseover', 'mouseout'],
						assignIframeEvents = (e) => {
							const event = mejs.Utils.createEvent(e.type, fb);
							mediaElement.dispatchEvent(event);
						}
					;

					fb.setSize(width, height);
					if (!mediaElement.originalNode.muted) {
						fbPlayer.unmute();
					}

					if (autoplay) {
						fbPlayer.play();
					}

					for (let i = 0, total = events.length; i < total; i++) {
						fbIframe.addEventListener(events[i], assignIframeEvents);
					}

					fb.eventHandler = {};

					// remove previous listeners
					const fbEvents = ['startedPlaying', 'paused', 'finishedPlaying', 'startedBuffering', 'finishedBuffering'];
					for (let i = 0, total = fbEvents.length; i < total; i++) {
						const
							event = fbEvents[i],
							handler = fb.eventHandler[event]
						;
						if (handler !== undefined && handler !== null &&
							!mejs.Utils.isObjectEmpty(handler) && typeof handler.removeListener === 'function') {
							handler.removeListener(event);
						}
					}

					// do call stack
					if (apiStack.length) {
						for (let i = 0, total = apiStack.length; i < total; i++) {
							const stackItem = apiStack[i];

							if (stackItem.type === 'set') {
								const
									propName = stackItem.propName,
									capName = `${propName.substring(0, 1).toUpperCase()}${propName.substring(1)}`
								;

								fb[`set${capName}`](stackItem.value);

							} else if (stackItem.type === 'call') {
								fb[stackItem.methodName]();
							}
						}
					}

					assignEvents(['rendererready', 'loadeddata', 'canplay', 'progress', 'loadedmetadata', 'timeupdate']);

					let timer;

					// Custom Facebook events
					fb.eventHandler.startedPlaying = fbPlayer.subscribe('startedPlaying', () => {
						if (!hasStartedPlaying) {
							hasStartedPlaying = true;
						}
						paused = false;
						ended = false;
						assignEvents(['play', 'playing', 'timeupdate']);

						// Workaround to update progress bar
						timer = setInterval(() => {
							fbPlayer.getCurrentPosition();
							assignEvents(['timeupdate']);
						}, 250);
					});
					fb.eventHandler.paused = fbPlayer.subscribe('paused', () => {
						paused = true;
						ended = false;
						assignEvents(['pause']);
					});
					fb.eventHandler.finishedPlaying = fbPlayer.subscribe('finishedPlaying', () => {
						paused = true;
						ended = true;

						assignEvents(['ended']);
						clearInterval(timer);
						timer = null;
					});
					fb.eventHandler.startedBuffering = fbPlayer.subscribe('startedBuffering', () => {
						assignEvents(['progress', 'timeupdate']);
					});
					fb.eventHandler.finishedBuffering = fbPlayer.subscribe('finishedBuffering', () => {
						assignEvents(['progress', 'timeupdate']);
					});


				}
			});
		};

		// Create fb <iframe> markup
		src = mediaFiles[0].src;
		let fbContainer = document.createElement('div');
		fbContainer.id = fb.id;
		fbContainer.className = 'fb-video';
		fbContainer.setAttribute('data-href', src);
		fbContainer.setAttribute('data-allowfullscreen', 'true');
		fbContainer.setAttribute('data-controls', !!mediaElement.originalNode.controls);
		mediaElement.originalNode.parentNode.insertBefore(fbContainer, mediaElement.originalNode);
		mediaElement.originalNode.style.display = 'none';

		FacebookApi.load({
			options: fb.options.facebook,
			id: fb.id
		});

		fb.hide = () => {
			fb.pause();
			if (fbPlayer) {
				fbContainer.style.display = 'none';
			}
		};
		fb.setSize = (width) => {
			if (fbPlayer !== null && !isNaN(width)) {
				fbContainer.style.width = width;
			}
		};
		fb.show = () => {
			if (fbPlayer) {
				fbContainer.style.display = '';
			}
		};

		fb.destroy = () => {
			if (poster) {
				mediaElement.originalNode.setAttribute('poster', poster);
			}
		};

		return fb;
	}
};

/**
 * Register Facebook type based on URL structure
 *
 */
mejs.Utils.typeChecks.push((url) => ~(url.toLowerCase()).indexOf('//www.facebook') ? 'video/x-facebook' : null);

mejs.Renderers.add(FacebookRenderer);
