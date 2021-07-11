'use strict';

import window from 'global/window';
import document from 'global/document';
import mejs from './core/mejs';
import MediaElement from './core/mediaelement';
import DefaultPlayer from './player/default';
import i18n from './core/i18n';
import {
	IS_FIREFOX,
	IS_IPAD,
	IS_IPHONE,
	IS_ANDROID,
	IS_IOS,
	IS_STOCK_ANDROID,
	HAS_TRUE_NATIVE_FULLSCREEN,
	SUPPORT_PASSIVE_EVENT
} from './utils/constants';
import {splitEvents, isNodeAfter, createEvent, isString} from './utils/general';
import {calculateTimeFormat} from './utils/time';
import {getTypeFromFile} from './utils/media';
import * as dom from './utils/dom';

mejs.mepIndex = 0;

mejs.players = {};

// default player values
export const config = {
	// url to poster (to fix iOS 3.x)
	poster: '',
	// When the video is ended, show the poster.
	showPosterWhenEnded: false,
	// When the video is paused, show the poster.
	showPosterWhenPaused: false,
	// Default if the <video width> is not specified
	defaultVideoWidth: 480,
	// Default if the <video height> is not specified
	defaultVideoHeight: 270,
	// If set, overrides <video width>
	videoWidth: -1,
	// If set, overrides <video height>
	videoHeight: -1,
	// Default if the user doesn't specify
	defaultAudioWidth: 400,
	// Default if the user doesn't specify
	defaultAudioHeight: 40,
	// Default amount to move back when back key is pressed
	defaultSeekBackwardInterval: (media) => media.getDuration() * 0.05,
	// Default amount to move forward when forward key is pressed
	defaultSeekForwardInterval: (media) => media.getDuration() * 0.05,
	// Set dimensions via JS instead of CSS
	setDimensions: true,
	// Width of audio player
	audioWidth: -1,
	// Height of audio player
	audioHeight: -1,
	// Useful for <audio> player loops
	loop: false,
	// Rewind to beginning when media ends
	autoRewind: true,
	// Resize to media dimensions
	enableAutosize: true,
	/*
	 * Time format to use. Default: 'mm:ss'
	 * Supported units:
	 *   h: hour
	 *   m: minute
	 *   s: second
	 *   f: frame count
	 * When using 'hh', 'mm', 'ss' or 'ff' we always display 2 digits.
	 * If you use 'h', 'm', 's' or 'f' we display 1 digit if possible.
	 *
	 * Example to display 75 seconds:
	 * Format 'mm:ss': 01:15
	 * Format 'm:ss': 1:15
	 * Format 'm:s': 1:15
	 */
	timeFormat: '',
	// Force the hour marker (##:00:00)
	alwaysShowHours: false,
	// Show framecount in timecode (##:00:00:00)
	showTimecodeFrameCount: false,
	// Used when showTimecodeFrameCount is set to true
	framesPerSecond: 25,
	// Hide controls when playing and mouse is not over the video
	alwaysShowControls: false,
	// Display the video control when media is loading
	hideVideoControlsOnLoad: false,
	// Display the video controls when media is paused
	hideVideoControlsOnPause: false,
	// Enable click video element to toggle play/pause
	clickToPlayPause: true,
	// Time in ms to hide controls
	controlsTimeoutDefault: 1500,
	// Time in ms to trigger the timer when mouse moves
	controlsTimeoutMouseEnter: 2500,
	// Time in ms to trigger the timer when mouse leaves
	controlsTimeoutMouseLeave: 1000,
	// Force iPad's native controls
	iPadUseNativeControls: false,
	// Force iPhone's native controls
	iPhoneUseNativeControls: false,
	// Force Android's native controls
	AndroidUseNativeControls: false,
	// Features to show
	features: ['playpause', 'current', 'progress', 'duration', 'tracks', 'volume', 'fullscreen'],
	// If set to `true`, all the default control elements listed in features above will be used, and the features will
	// add other features
	useDefaultControls: false,
	// Only for dynamic
	isVideo: true,
	// Stretching modes (auto, fill, responsive, none)
	stretching: 'auto',
	// Prefix class names on elements
	classPrefix: 'mejs__',
	// Turn keyboard support on and off for this instance
	enableKeyboard: true,
	// When this player starts, it will pause other players
	pauseOtherPlayers: true,
	// Number of decimal places to show if frames are shown
	secondsDecimalLength: 0,
	// If error happens, set up HTML message via string or function
	customError: null,
	// Array of keyboard actions such as play/pause
	keyActions: [
		{
			keys: [
				32, // SPACEBAR
				179 // GOOGLE play/pause button
			],
			action: (player) => {

				if (!IS_FIREFOX) {
					if (player.paused || player.ended) {
						player.play();
					} else {
						player.pause();
					}
				}
			}
		}
	]
};

mejs.MepDefaults = config;

/**
 * Wrap a MediaElement object in player controls
 *
 * @constructor
 * @param {HTMLElement|String} node
 * @param {Object} o
 * @return {?MediaElementPlayer}
 */
class MediaElementPlayer {

	constructor (node, o) {

		const
			t = this,
			element = typeof node === 'string' ? document.getElementById(node) : node
		;

		// enforce object, even without "new" (via John Resig)
		if (!(t instanceof MediaElementPlayer)) {
			return new MediaElementPlayer(element, o);
		}

		// these will be reset after the MediaElement.success fires
		// t.media will be the fake node to emulate all HTML5 events, methods, etc
		// t.node will be the node to be restored
		t.node = t.media = element;

		if (!t.node) {
			return;
		}

		// check for existing player
		if (t.media.player) {
			return t.media.player;
		}

		t.hasFocus = false;

		t.controlsAreVisible = true;

		t.controlsEnabled = true;

		t.controlsTimer = null;

		t.currentMediaTime = 0;

		t.proxy = null;

		// try to get options from data-mejsoptions
		if (o === undefined) {
			const options = t.node.getAttribute('data-mejsoptions');
			o = options ? JSON.parse(options) : {};
		}

		// extend default options
		t.options = Object.assign({}, config, o);

		// Check `loop` attribute to modify options
		if (t.options.loop && !t.media.getAttribute('loop')) {
			t.media.loop = true;
			t.node.loop = true;
		} else if (t.media.loop) {
			t.options.loop = true;
		}

		if (!t.options.timeFormat) {
			// Generate the time format according to options
			t.options.timeFormat = 'mm:ss';
			if (t.options.alwaysShowHours) {
				t.options.timeFormat = 'hh:mm:ss';
			}
			if (t.options.showTimecodeFrameCount) {
				t.options.timeFormat += ':ff';
			}
		}

		calculateTimeFormat(0, t.options, t.options.framesPerSecond || 25);

		// unique ID
		t.id = `mep_${mejs.mepIndex++}`;

		// add to player array (for focus events)
		mejs.players[t.id] = t;

		t.init();

		return t;
	}

	getElement (element) {
		return element;
	}

	// Added method for WP compatibility
	init () {
		const
			t = this,
			playerOptions = Object.assign({}, t.options, {
				success: (media, domNode) => {
					t._meReady(media, domNode);
				},
				error: (e) => {
					t._handleError(e);
				}
			}),
			tagName = t.node.tagName.toLowerCase()
		;

		// get video from src or href?
		t.isDynamic = (tagName !== 'audio' && tagName !== 'video' && tagName !== 'iframe');
		t.isVideo = (t.isDynamic) ? t.options.isVideo : (tagName !== 'audio' && t.options.isVideo);
		t.mediaFiles = null;
		t.trackFiles = null;

		// use native controls in iPad, iPhone, and Android
		if ((IS_IPAD && t.options.iPadUseNativeControls) || (IS_IPHONE && t.options.iPhoneUseNativeControls)) {

			// add controls and stop
			t.node.setAttribute('controls', true);

			// override Apple's autoplay override for iPads
			if (IS_IPAD && t.node.getAttribute('autoplay')) {
				t.play();
			}

		} else if ((t.isVideo || (!t.isVideo && (t.options.features.length || t.options.useDefaultControls))) && !(IS_ANDROID && t.options.AndroidUseNativeControls)) {

			// DESKTOP: use MediaElementPlayer controls

			// remove native controls
			t.node.removeAttribute('controls');
			const videoPlayerTitle = t.isVideo ? i18n.t('mejs.video-player') : i18n.t('mejs.audio-player');
			// insert description for screen readers
			const offscreen = document.createElement('span');
			offscreen.className = `${t.options.classPrefix}offscreen`;
			offscreen.innerText = videoPlayerTitle;
			t.media.parentNode.insertBefore(offscreen, t.media);

			// build container
			t.container = document.createElement('div');
			t.getElement(t.container).id = t.id;
			t.getElement(t.container).className = `${t.options.classPrefix}container ${t.options.classPrefix}container-keyboard-inactive ${t.media.className}`;
			t.getElement(t.container).tabIndex = 0;
			t.getElement(t.container).setAttribute('role', 'application');
			t.getElement(t.container).setAttribute('aria-label', videoPlayerTitle);
			t.getElement(t.container).innerHTML = `<div class="${t.options.classPrefix}inner">` +
				`<div class="${t.options.classPrefix}mediaelement"></div>` +
				`<div class="${t.options.classPrefix}layers"></div>` +
				`<div class="${t.options.classPrefix}controls"></div>` +
				`</div>`;
			t.getElement(t.container).addEventListener('focus', (e) => {
				if (!t.controlsAreVisible && !t.hasFocus && t.controlsEnabled) {
					t.showControls(true);

					// If e.relatedTarget appears before container, send focus to play button,
					// else send focus to last control button.
					const
						btnSelector = isNodeAfter(e.relatedTarget, t.getElement(t.container)) ?
							`.${t.options.classPrefix}controls .${t.options.classPrefix}button:last-child > button` :
							`.${t.options.classPrefix}playpause-button > button`,
						button = t.getElement(t.container).querySelector(btnSelector)
					;

					button.focus();
				}
			});
			t.node.parentNode.insertBefore(t.getElement(t.container), t.node);

			// When no elements in controls, hide bar completely
			if (!t.options.features.length && !t.options.useDefaultControls) {
				t.getElement(t.container).style.background = 'transparent';
				t.getElement(t.container).querySelector(`.${t.options.classPrefix}controls`).style.display = 'none';
			}

			if (t.isVideo && t.options.stretching === 'fill' && !dom.hasClass(t.getElement(t.container).parentNode, `${t.options.classPrefix}fill-container`)) {
				// outer container
				t.outerContainer = t.media.parentNode;

				const wrapper = document.createElement('div');
				wrapper.className = `${t.options.classPrefix}fill-container`;
				t.getElement(t.container).parentNode.insertBefore(wrapper, t.getElement(t.container));
				wrapper.appendChild(t.getElement(t.container));
			}

			// add classes for user and content
			if (IS_ANDROID) {
				dom.addClass(t.getElement(t.container), `${t.options.classPrefix}android`);
			}
			if (IS_IOS) {
				dom.addClass(t.getElement(t.container), `${t.options.classPrefix}ios`);
			}
			if (IS_IPAD) {
				dom.addClass(t.getElement(t.container), `${t.options.classPrefix}ipad`);
			}
			if (IS_IPHONE) {
				dom.addClass(t.getElement(t.container), `${t.options.classPrefix}iphone`);
			}
			dom.addClass(t.getElement(t.container), (t.isVideo ? `${t.options.classPrefix}video` : `${t.options.classPrefix}audio`));

			// move the `video`/`audio` tag into the right spot
			t.getElement(t.container).querySelector(`.${t.options.classPrefix}mediaelement`).appendChild(t.node);

			// needs to be assigned here, after iOS remap
			t.media.player = t;

			// find parts
			t.controls = t.getElement(t.container).querySelector(`.${t.options.classPrefix}controls`);
			t.layers = t.getElement(t.container).querySelector(`.${t.options.classPrefix}layers`);

			// determine the size

			/* size priority:
			 (1) videoWidth (forced),
			 (2) style="width;height;"
			 (3) width attribute,
			 (4) defaultVideoWidth (for unspecified cases)
			 */

			const
				tagType = (t.isVideo ? 'video' : 'audio'),
				capsTagName = tagType.substring(0, 1).toUpperCase() + tagType.substring(1)
			;

			if (t.options[tagType + 'Width'] > 0 || t.options[tagType + 'Width'].toString().indexOf('%') > -1) {
				t.width = t.options[tagType + 'Width'];
			} else if (t.node.style.width !== '' && t.node.style.width !== null) {
				t.width = t.node.style.width;
			} else if (t.node.getAttribute('width')) {
				t.width = t.node.getAttribute('width');
			} else {
				t.width = t.options['default' + capsTagName + 'Width'];
			}

			if (t.options[tagType + 'Height'] > 0 || t.options[tagType + 'Height'].toString().indexOf('%') > -1) {
				t.height = t.options[tagType + 'Height'];
			} else if (t.node.style.height !== '' && t.node.style.height !== null) {
				t.height = t.node.style.height;
			} else if (t.node.getAttribute('height')) {
				t.height = t.node.getAttribute('height');
			} else {
				t.height = t.options['default' + capsTagName + 'Height'];
			}

			t.initialAspectRatio = (t.height >= t.width) ? t.width / t.height : t.height / t.width;

			// set the size, while we wait for the plugins to load below
			t.setPlayerSize(t.width, t.height);

			// create MediaElementShim
			playerOptions.pluginWidth = t.width;
			playerOptions.pluginHeight = t.height;
		}
		// Hide media completely for audio that doesn't have any features
		else if (!t.isVideo && !t.options.features.length && !t.options.useDefaultControls) {
			t.node.style.display = 'none';
		}

		mejs.MepDefaults = playerOptions;

		// create MediaElement shim
		new MediaElement(t.media, playerOptions, t.mediaFiles);

		if (t.getElement(t.container) !== undefined && t.options.features.length && t.controlsAreVisible && !t.options.hideVideoControlsOnLoad) {
			// controls are shown when loaded
			const event = createEvent('controlsshown', t.getElement(t.container));
			t.getElement(t.container).dispatchEvent(event);
		}
	}

	showControls (doAnimation) {
		const t = this;

		doAnimation = doAnimation === undefined || doAnimation;

		if (t.controlsAreVisible || !t.isVideo) {
			return;
		}

		if (doAnimation) {
			dom.fadeIn(t.getElement(t.controls), 200, () => {
				dom.removeClass(t.getElement(t.controls), `${t.options.classPrefix}offscreen`);
				const event = createEvent('controlsshown', t.getElement(t.container));
				t.getElement(t.container).dispatchEvent(event);
			});

			// any additional controls people might add and want to hide
			const controls = t.getElement(t.container).querySelectorAll(`.${t.options.classPrefix}control`);
			for (let i = 0, total = controls.length; i < total; i++) {
				dom.fadeIn(controls[i], 200, () => {
					dom.removeClass(controls[i], `${t.options.classPrefix}offscreen`);
				});
			}
		} else {
			dom.removeClass(t.getElement(t.controls), `${t.options.classPrefix}offscreen`);
			t.getElement(t.controls).style.display = '';
			t.getElement(t.controls).style.opacity = 1;

			// any additional controls people might add and want to hide
			const controls = t.getElement(t.container).querySelectorAll(`.${t.options.classPrefix}control`);
			for (let i = 0, total = controls.length; i < total; i++) {
				dom.removeClass(controls[i], `${t.options.classPrefix}offscreen`);
				controls[i].style.display = '';
			}

			const event = createEvent('controlsshown', t.getElement(t.container));
			t.getElement(t.container).dispatchEvent(event);
		}

		t.controlsAreVisible = true;
		t.setControlsSize();
	}

	hideControls (doAnimation, forceHide) {
		const t = this;

		doAnimation = doAnimation === undefined || doAnimation;

		if (forceHide !== true && (!t.controlsAreVisible || t.options.alwaysShowControls ||
			(t.paused && t.readyState === 4 && ((!t.options.hideVideoControlsOnLoad &&
			t.currentTime <= 0) || (!t.options.hideVideoControlsOnPause && t.currentTime > 0))) ||
			(t.isVideo && !t.options.hideVideoControlsOnLoad && !t.readyState) ||
			t.ended)) {
			return;
		}

		if (doAnimation) {
			// fade out main controls
			dom.fadeOut(t.getElement(t.controls), 200, () => {
				dom.addClass(t.getElement(t.controls), `${t.options.classPrefix}offscreen`);
				t.getElement(t.controls).style.display = '';
				const event = createEvent('controlshidden', t.getElement(t.container));
				t.getElement(t.container).dispatchEvent(event);
			});

			// any additional controls people might add and want to hide
			const controls = t.getElement(t.container).querySelectorAll(`.${t.options.classPrefix}control`);
			for (let i = 0, total = controls.length; i < total; i++) {
				dom.fadeOut(controls[i], 200, () => {
					dom.addClass(controls[i], `${t.options.classPrefix}offscreen`);
					controls[i].style.display = '';
				});
			}
		} else {

			// hide main controls
			dom.addClass(t.getElement(t.controls), `${t.options.classPrefix}offscreen`);
			t.getElement(t.controls).style.display = '';
			t.getElement(t.controls).style.opacity = 0;

			// hide others
			const controls = t.getElement(t.container).querySelectorAll(`.${t.options.classPrefix}control`);
			for (let i = 0, total = controls.length; i < total; i++) {
				dom.addClass(controls[i], `${t.options.classPrefix}offscreen`);
				controls[i].style.display = '';
			}

			const event = createEvent('controlshidden', t.getElement(t.container));
			t.getElement(t.container).dispatchEvent(event);
		}

		t.controlsAreVisible = false;
	}

	startControlsTimer (timeout) {
		const t = this;

		timeout = typeof timeout !== 'undefined' ? timeout : t.options.controlsTimeoutDefault;

		t.killControlsTimer('start');

		t.controlsTimer = setTimeout(() => {
			t.hideControls();
			t.killControlsTimer('hide');
		}, timeout);
	}

	killControlsTimer () {
		const t = this;

		if (t.controlsTimer !== null) {
			clearTimeout(t.controlsTimer);
			delete t.controlsTimer;
			t.controlsTimer = null;
		}
	}

	disableControls () {
		const t = this;

		t.killControlsTimer();
		t.controlsEnabled = false;
		t.hideControls(false, true);
	}

	enableControls () {
		const t = this;

		t.controlsEnabled = true;
		t.showControls(false);
	}

	_setDefaultPlayer () {
		const t = this;
		if (t.proxy) {
			t.proxy.pause();
		}
		t.proxy = new DefaultPlayer(t);
		t.media.addEventListener('loadedmetadata', () => {
			if (t.getCurrentTime() > 0 && t.currentMediaTime > 0) {
				t.setCurrentTime(t.currentMediaTime);
				if (!IS_IOS && !IS_ANDROID) {
					t.play();
				}
			}
		});
	}

	/**
	 * Set up all controls and events
	 *
	 * @param media
	 * @param domNode
	 * @private
	 */
	_meReady (media, domNode) {
		const
			t = this,
			autoplayAttr = domNode.getAttribute('autoplay'),
			autoplay = !(autoplayAttr === undefined || autoplayAttr === null || autoplayAttr === 'false'),
			isNative = media.rendererName !== null && /(native|html5)/i.test(media.rendererName)
		;

		if (t.getElement(t.controls)) {
			t.enableControls();
		}

		if (t.getElement(t.container) && t.getElement(t.container).querySelector(`.${t.options.classPrefix}overlay-play`)) {
			t.getElement(t.container).querySelector(`.${t.options.classPrefix}overlay-play`).style.display = '';
		}

		// make sure it can't create itself again if a plugin reloads
		if (t.created) {
			return;
		}

		t.created = true;
		t.media = media;
		t.domNode = domNode;

		if (!(IS_ANDROID && t.options.AndroidUseNativeControls) && !(IS_IPAD && t.options.iPadUseNativeControls) && !(IS_IPHONE && t.options.iPhoneUseNativeControls)) {

			// In the event that no features are specified for audio,
			// create only MediaElement instance rather than
			// doing all the work to create a full player
			if (!t.isVideo && !t.options.features.length && !t.options.useDefaultControls) {
				// force autoplay for HTML5
				if (autoplay && isNative) {
					t.play();
				}

				if (t.options.success) {

					if (typeof t.options.success === 'string') {
						window[t.options.success](t.media, t.domNode, t);
					} else {
						t.options.success(t.media, t.domNode, t);
					}
				}

				return;
			}

			// cache container to store control elements' original position
			t.featurePosition = {};

			// Enable default actions
			t._setDefaultPlayer();

			t.buildposter(t, t.getElement(t.controls), t.getElement(t.layers), t.media);
			t.buildkeyboard(t, t.getElement(t.controls), t.getElement(t.layers), t.media);
			t.buildoverlays(t, t.getElement(t.controls), t.getElement(t.layers), t.media);

			if (t.options.useDefaultControls) {
				const defaultControls = ['playpause', 'current', 'progress', 'duration', 'tracks', 'volume', 'fullscreen'];
				t.options.features = defaultControls.concat(t.options.features.filter((item) => defaultControls.indexOf(item) === -1));
			}

			t.buildfeatures(t, t.getElement(t.controls), t.getElement(t.layers), t.media);

			const event = createEvent('controlsready', t.getElement(t.container));
			t.getElement(t.container).dispatchEvent(event);

			// reset all layers and controls
			t.setPlayerSize(t.width, t.height);
			t.setControlsSize();

			// controls fade
			if (t.isVideo) {

				// create callback here since it needs access to current
				// MediaElement object
				t.clickToPlayPauseCallback = () => {

					if (t.options.clickToPlayPause) {
						const
							button = t.getElement(t.container)
							.querySelector(`.${t.options.classPrefix}overlay-button`),
							pressed = button.getAttribute('aria-pressed')
						;

						if (t.paused && pressed) {
							t.pause();
						} else if (t.paused) {
							t.play();
						} else {
							t.pause();
						}

						button.setAttribute('aria-pressed', !(pressed));
						t.getElement(t.container).focus();
					}
				};

				t.createIframeLayer();

				// click to play/pause
				t.media.addEventListener('click', t.clickToPlayPauseCallback);

				if ((IS_ANDROID || IS_IOS) && !t.options.alwaysShowControls) {

					// for touch devices (iOS, Android)
					// show/hide without animation on touch
					t.node.addEventListener('touchstart', () => {

						// toggle controls
						if (t.controlsAreVisible) {
							t.hideControls(false);
						} else {
							if (t.controlsEnabled) {
								t.showControls(false);
							}
						}
					}, SUPPORT_PASSIVE_EVENT ? { passive: true } : false);
				} else {
					// show/hide controls
					t.getElement(t.container).addEventListener('mouseenter', () => {
						if (t.controlsEnabled) {
							if (!t.options.alwaysShowControls) {
								t.killControlsTimer('enter');
								t.showControls();
								t.startControlsTimer(t.options.controlsTimeoutMouseEnter);
							}
						}
					});
					t.getElement(t.container).addEventListener('mousemove', () => {
						if (t.controlsEnabled) {
							if (!t.controlsAreVisible) {
								t.showControls();
							}
							if (!t.options.alwaysShowControls) {
								t.startControlsTimer(t.options.controlsTimeoutMouseEnter);
							}
						}
					});
					t.getElement(t.container).addEventListener('mouseleave', () => {
						if (t.controlsEnabled) {
							if (!t.paused && !t.options.alwaysShowControls) {
								t.startControlsTimer(t.options.controlsTimeoutMouseLeave);
							}
						}
					});
				}

				if (t.options.hideVideoControlsOnLoad) {
					t.hideControls(false);
				}

				if (t.options.enableAutosize) {
					t.media.addEventListener('loadedmetadata', (e) => {
						// if the `height` attribute and `height` style and `options.videoHeight`
						// were not set, resize to the media's real dimensions
						const target = (e !== undefined) ? (e.detail.target || e.target) : t.media;
						if (t.options.videoHeight <= 0 && !t.domNode.getAttribute('height') &&
							!t.domNode.style.height &&
							target !== null && !isNaN(target.videoHeight)) {
							t.setPlayerSize(target.videoWidth, target.videoHeight);
							t.setControlsSize();
							t.media.setSize(target.videoWidth, target.videoHeight);
						}
					});
				}
			}

			// EVENTS

			// FOCUS: when a video starts playing, it takes focus from other players (possibly pausing them)
			t.media.addEventListener('play', () => {
				t.hasFocus = true;

				// go through all other players
				for (const playerIndex in mejs.players) {
					if (mejs.players.hasOwnProperty(playerIndex)) {
						const p = mejs.players[playerIndex];

						if (p.id !== t.id && t.options.pauseOtherPlayers && !p.paused && !p.ended && p.options.ignorePauseOtherPlayersOption !== true) {
							p.pause();
							p.hasFocus = false;
						}
					}
				}

				// check for autoplay
				if (!(IS_ANDROID || IS_IOS) && !t.options.alwaysShowControls && t.isVideo) {
					t.hideControls();
				}
			});

			// ended for all
			t.media.addEventListener('ended', () => {
				if (t.options.autoRewind) {
					try {
						// Fixing an Android stock browser bug, where "seeked" isn't fired correctly after
						// ending the video and jumping to the beginning
						setTimeout(() => {
							t.setCurrentTime(0);
							const loadingElement = t.getElement(t.container).querySelector(`.${t.options.classPrefix}overlay-loading`);
							if (loadingElement && loadingElement.parentNode) {
								loadingElement.parentNode.style.display = 'none';
							}
						}, 20);
					} catch (exp) {
						console.log(exp);
					}
				}

				if (typeof t.media.renderer.stop === 'function') {
					t.media.renderer.stop();
				} else {
					t.pause();
				}

				if (t.setProgressRail) {
					t.setProgressRail();
				}
				if (t.setCurrentRail) {
					t.setCurrentRail();
				}

				if (t.options.loop) {
					t.play();
				} else if (!t.options.alwaysShowControls && t.controlsEnabled) {
					t.showControls();
				}
			});

			// resize on the first play
			t.media.addEventListener('loadedmetadata', () => {

				calculateTimeFormat(t.getDuration(), t.options, t.options.framesPerSecond || 25);

				if (t.updateDuration) {
					t.updateDuration();
				}
				if (t.updateCurrent) {
					t.updateCurrent();
				}

				if (!t.isFullScreen) {
					t.setPlayerSize(t.width, t.height);
					t.setControlsSize();
				}
			});

			// Only change the time format when necessary
			let duration = null;
			t.media.addEventListener('timeupdate', () => {
				if (!isNaN(t.getDuration()) && duration !== t.getDuration()) {
					duration = t.getDuration();
					calculateTimeFormat(duration, t.options, t.options.framesPerSecond || 25);

					// make sure to fill in and resize the controls (e.g., 00:00 => 01:13:15
					if (t.updateDuration) {
						t.updateDuration();
					}
					if (t.updateCurrent) {
						t.updateCurrent();
					}

					t.setControlsSize();
				}
			});

			// Disable focus outline to improve look-and-feel for regular users
			t.getElement(t.container).addEventListener('click', function (e) {
				dom.addClass(e.currentTarget, `${t.options.classPrefix}container-keyboard-inactive`);
			});

			// Enable focus outline for Accessibility purposes
			t.getElement(t.container).addEventListener('focusin', function (e) {
				dom.removeClass(e.currentTarget, `${t.options.classPrefix}container-keyboard-inactive`);
				if (t.isVideo && !IS_ANDROID && !IS_IOS && t.controlsEnabled && !t.options.alwaysShowControls) {
					t.killControlsTimer('enter');
					t.showControls();
					t.startControlsTimer(t.options.controlsTimeoutMouseEnter);
				}
			});

			t.getElement(t.container).addEventListener('focusout', (e) => {
				setTimeout(() => {
					//FF is working on supporting focusout https://bugzilla.mozilla.org/show_bug.cgi?id=687787
					if (e.relatedTarget) {
						if (t.keyboardAction && !e.relatedTarget.closest(`.${t.options.classPrefix}container`)) {
							t.keyboardAction = false;
							if (t.isVideo && !t.options.alwaysShowControls && !t.paused) {
								t.startControlsTimer(t.options.controlsTimeoutMouseLeave);
							}
						}
					}
				}, 0);
			});

			// webkit has trouble doing this without a delay
			setTimeout(() => {
				t.setPlayerSize(t.width, t.height);
				t.setControlsSize();
			}, 0);

			t.globalResizeCallback = () => {
				// don't resize for fullscreen mode
				if (!(t.isFullScreen || (HAS_TRUE_NATIVE_FULLSCREEN && document.webkitIsFullScreen))) {
					t.setPlayerSize(t.width, t.height);
				}

				// always adjust controls
				t.setControlsSize();
			};


			// adjust controls whenever window sizes (used to be in fullscreen only)
			t.globalBind('resize', t.globalResizeCallback);
		}

		// force autoplay for HTML5
		if (autoplay && isNative) {
			t.play();
		}

		if (t.options.success) {
			if (typeof t.options.success === 'string') {
				window[t.options.success](t.media, t.domNode, t);
			} else {
				t.options.success(t.media, t.domNode, t);
			}
		}
	}

	/**
	 *
	 * @param {CustomEvent} e
	 * @param {MediaElement} media
	 * @param {HTMLElement} node
	 * @private
	 */
	_handleError (e, media, node) {
		const
			t = this,
			play = t.getElement(t.layers).querySelector(`.${t.options.classPrefix}overlay-play`)
		;

		if (play) {
			play.style.display = 'none';
		}

		// Tell user that the file cannot be played
		if (t.options.error) {
			t.options.error(e, media, node);
		}

		// Remove prior error message
		if (t.getElement(t.container).querySelector(`.${t.options.classPrefix}cannotplay`)) {
			t.getElement(t.container).querySelector(`.${t.options.classPrefix}cannotplay`).remove();
		}

		const errorContainer = document.createElement('div');
		errorContainer.className = `${t.options.classPrefix}cannotplay`;
		errorContainer.style.width = '100%';
		errorContainer.style.height = '100%';

		let
			errorContent = typeof t.options.customError === 'function' ? t.options.customError(t.media, t.media.originalNode) : t.options.customError,
			imgError = ''
		;

		if (!errorContent) {
			const poster = t.media.originalNode.getAttribute('poster');
			if (poster) {
				imgError = `<img src="${poster}" alt="${mejs.i18n.t('mejs.download-file')}">`;
			}

			if (e.message) {
				errorContent = `<p>${e.message}</p>`;
			}

			if (e.urls) {
				for (let i = 0, total = e.urls.length; i < total; i++) {
					const url = e.urls[i];
					errorContent += `<a href="${url.src}" data-type="${url.type}"><span>${mejs.i18n.t('mejs.download-file')}: ${url.src}</span></a>`;
				}
			}
		}

		if (errorContent && t.getElement(t.layers).querySelector(`.${t.options.classPrefix}overlay-error`)) {
			errorContainer.innerHTML = errorContent;
			t.getElement(t.layers).querySelector(`.${t.options.classPrefix}overlay-error`).innerHTML = `${imgError}${errorContainer.outerHTML}`;
			t.getElement(t.layers).querySelector(`.${t.options.classPrefix}overlay-error`).parentNode.style.display = 'block';
		}

		if (t.controlsEnabled) {
			t.disableControls();
		}
	}

	setPlayerSize (width, height) {
		const t = this;

		if (!t.options.setDimensions) {
			return false;
		}

		if (typeof width !== 'undefined') {
			t.width = width;
		}

		if (typeof height !== 'undefined') {
			t.height = height;
		}

		// check stretching modes
		switch (t.options.stretching) {
			case 'fill':
				// The 'fill' effect only makes sense on video; for audio we will set the dimensions
				if (t.isVideo) {
					t.setFillMode();
				} else {
					t.setDimensions(t.width, t.height);
				}
				break;
			case 'responsive':
				t.setResponsiveMode();
				break;
			case 'none':
				t.setDimensions(t.width, t.height);
				break;
			// This is the 'auto' mode
			default:
				if (t.hasFluidMode() === true) {
					t.setResponsiveMode();
				} else {
					t.setDimensions(t.width, t.height);
				}
				break;
		}
	}

	hasFluidMode () {
		const t = this;

		// detect 100% mode - use currentStyle for IE since css() doesn't return percentages
		return (t.height.toString().indexOf('%') !== -1 || (t.node && t.node.style.maxWidth && t.node.style.maxWidth !== 'none' &&
		t.node.style.maxWidth !== t.width) || (t.node && t.node.currentStyle && t.node.currentStyle.maxWidth === '100%'));
	}

	setResponsiveMode () {
		const
			t = this,
			parent = (() => {

				let parentEl, el = t.getElement(t.container);

				// traverse parents to find the closest visible one
				while (el) {
					try {
						// Firefox has an issue calculating dimensions on hidden iframes
						if (IS_FIREFOX && el.tagName.toLowerCase() === 'html' && window.self !== window.top && window.frameElement !== null) {
							return window.frameElement;
						} else {
							parentEl = el.parentElement;
						}
					} catch (e) {
						parentEl = el.parentElement;
					}

					if (parentEl && dom.visible(parentEl)) {
						return parentEl;
					}
					el = parentEl;
				}

				return null;

			})(),
			parentStyles = parent ? getComputedStyle(parent, null) : getComputedStyle(document.body, null),
			nativeWidth = (() => {
				if (t.isVideo) {
					if (t.node.videoWidth && t.node.videoWidth > 0) {
						return t.node.videoWidth;
					} else if (t.node.getAttribute('width')) {
						return t.node.getAttribute('width');
					} else {
						return t.options.defaultVideoWidth;
					}
				} else {
					return t.options.defaultAudioWidth;
				}
			})(),
			nativeHeight = (() => {
				if (t.isVideo) {
					if (t.node.videoHeight && t.node.videoHeight > 0) {
						return t.node.videoHeight;
					} else if (t.node.getAttribute('height')) {
						return t.node.getAttribute('height');
					} else {
						return t.options.defaultVideoHeight;
					}
				} else {
					return t.options.defaultAudioHeight;
				}
			})(),
			aspectRatio = (() => {
				//enableAutosize == false maintain original ratio
				if(!t.options.enableAutosize){
					return  t.initialAspectRatio;
				}
				let ratio = 1;
				if (!t.isVideo) {
					return ratio;
				}

				if (t.node.videoWidth && t.node.videoWidth > 0 && t.node.videoHeight && t.node.videoHeight > 0) {
					ratio = (t.height >= t.width) ? t.node.videoWidth / t.node.videoHeight :
						t.node.videoHeight / t.node.videoWidth;
				} else {
					ratio = t.initialAspectRatio;
				}

				if (isNaN(ratio) || ratio < 0.01 || ratio > 100) {
					ratio = 1;
				}

				return ratio;
			})(),
			parentHeight = parseFloat(parentStyles.height)
		;

		let
			newHeight,
			parentWidth = parseFloat(parentStyles.width)
		;

		if (t.isVideo) {
			// Responsive video is based on width: 100% and height: 100%
			if (t.height === '100%') {
				newHeight = parseFloat(parentWidth * nativeHeight / nativeWidth, 10);
			} else {
				newHeight = t.height >= t.width ? parseFloat(parentWidth / aspectRatio, 10) : parseFloat(parentWidth * aspectRatio, 10);
			}
		} else {
			newHeight = nativeHeight;
		}

		// If we were unable to compute newHeight, get the container height instead
		if (isNaN(newHeight)) {
			newHeight = parentHeight;
		}

		if (t.getElement(t.container).parentNode.length > 0 && t.getElement(t.container).parentNode.tagName.toLowerCase() === 'body') {
			parentWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
			newHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		}

		if (newHeight && parentWidth) {

			// set outer container size
			t.getElement(t.container).style.width = `${parentWidth}px`;
			t.getElement(t.container).style.height = `${newHeight}px`;

			// set native <video> or <audio> and shims
			t.node.style.width = '100%';
			t.node.style.height = '100%';

			// if shim is ready, send the size to the embedded plugin
			if (t.isVideo && t.media.setSize) {
				t.media.setSize(parentWidth, newHeight);
			}

			// set the layers
			const layerChildren = t.getElement(t.layers).children;
			for (let i = 0, total = layerChildren.length; i < total; i++) {
				layerChildren[i].style.width = '100%';
				layerChildren[i].style.height = '100%';
			}
		}
	}

	setFillMode () {
		const t = this;
		const isIframe = window.self !== window.top && window.frameElement !== null;
		const parent = (() => {
			let parentEl, el = t.getElement(t.container);

			// traverse parents to find the closest visible one
			while (el) {
				try {
					// Firefox has an issue calculating dimensions on hidden iframes
					if (IS_FIREFOX && el.tagName.toLowerCase() === 'html' && window.self !== window.top && window.frameElement !== null) {
						return window.frameElement;
					} else {
						parentEl = el.parentElement;
					}
				} catch (e) {
					parentEl = el.parentElement;
				}

				if (parentEl && dom.visible(parentEl)) {
					return parentEl;
				}
				el = parentEl;
			}

			return null;
		})();
		let parentStyles = parent ? getComputedStyle(parent, null) : getComputedStyle(document.body, null);

		// Remove the responsive attributes in the event they are there
		if (t.node.style.height !== 'none' && t.node.style.height !== t.height) {
			t.node.style.height = 'auto';
		}
		if (t.node.style.maxWidth !== 'none' && t.node.style.maxWidth !== t.width) {
			t.node.style.maxWidth = 'none';
		}

		if (t.node.style.maxHeight !== 'none' && t.node.style.maxHeight !== t.height) {
			t.node.style.maxHeight = 'none';
		}

		if (t.node.currentStyle) {
			if (t.node.currentStyle.height === '100%') {
				t.node.currentStyle.height = 'auto';
			}
			if (t.node.currentStyle.maxWidth === '100%') {
				t.node.currentStyle.maxWidth = 'none';
			}
			if (t.node.currentStyle.maxHeight === '100%') {
				t.node.currentStyle.maxHeight = 'none';
			}
		}

		// Avoid overriding width/height if element is inside an iframe
		if (!isIframe && !parseFloat(parentStyles.width)) {
			parent.style.width = `${t.media.offsetWidth}px`;
		}

		if (!isIframe && !parseFloat(parentStyles.height)) {
			parent.style.height = `${t.media.offsetHeight}px`;
		}

		parentStyles = getComputedStyle(parent);

		const
			parentWidth = parseFloat(parentStyles.width),
			parentHeight = parseFloat(parentStyles.height)
		;

		t.setDimensions('100%', '100%');

		// This prevents an issue when displaying poster
		const poster = t.getElement(t.container).querySelector(`.${t.options.classPrefix}poster>img`);
		if (poster) {
			poster.style.display = '';
		}

		const
			targetElement = t.getElement(t.container).querySelectorAll('object, embed, iframe, video'),
			initHeight = t.height,
			initWidth = t.width,
			// scale to the target width
			scaleX1 = parentWidth,
			scaleY1 = (initHeight * parentWidth) / initWidth,
			// scale to the target height
			scaleX2 = (initWidth * parentHeight) / initHeight,
			scaleY2 = parentHeight,
			// now figure out which one we should use
			bScaleOnWidth = scaleX2 > parentWidth === false,
			finalWidth = bScaleOnWidth ? Math.floor(scaleX1) : Math.floor(scaleX2),
			finalHeight = bScaleOnWidth ? Math.floor(scaleY1) : Math.floor(scaleY2),
			width = bScaleOnWidth ? `${parentWidth}px` : `${finalWidth}px`,
			height = bScaleOnWidth ? `${finalHeight}px` : `${parentHeight}px`
		;

		for (let i = 0, total = targetElement.length; i < total; i++) {
			targetElement[i].style.height = height;
			targetElement[i].style.width = width;
			if (t.media.setSize) {
				t.media.setSize(width, height);
			}

			targetElement[i].style.marginLeft = `${Math.floor((parentWidth - finalWidth) / 2)}px`;
			targetElement[i].style.marginTop = 0;
		}
	}

	setDimensions (width, height) {
		const t = this;

		width = isString(width) && width.indexOf('%') > -1 ? width : `${parseFloat(width)}px`;
		height = isString(height) && height.indexOf('%') > -1 ? height : `${parseFloat(height)}px`;

		t.getElement(t.container).style.width = width;
		t.getElement(t.container).style.height = height;

		const layers = t.getElement(t.layers).children;
		for (let i = 0, total = layers.length; i < total; i++) {
			layers[i].style.width = width;
			layers[i].style.height = height;
		}
	}

	setControlsSize () {
		const t = this;

		// skip calculation if hidden
		if (!dom.visible(t.getElement(t.container))) {
			return;
		}

		if (t.rail && dom.visible(t.rail)) {
			const
				totalStyles = t.total ? getComputedStyle(t.total, null) : null,
				totalMargin = totalStyles ? parseFloat(totalStyles.marginLeft) + parseFloat(totalStyles.marginRight) : 0,
				railStyles = getComputedStyle(t.rail),
				railMargin = parseFloat(railStyles.marginLeft) + parseFloat(railStyles.marginRight)
			;

			let siblingsWidth = 0;

			const siblings = dom.siblings(t.rail, (el) => el !== t.rail), total = siblings.length;
			for (let i = 0; i < total; i++) {
				siblingsWidth += siblings[i].offsetWidth;
			}

			siblingsWidth += totalMargin + ((totalMargin === 0) ? (railMargin * 2) : railMargin) + 1;

			t.getElement(t.container).style.minWidth = `${siblingsWidth}px`;

			const event = createEvent('controlsresize', t.getElement(t.container));
			t.getElement(t.container).dispatchEvent(event);
		} else {
			const children = t.getElement(t.controls).children;
			let minWidth = 0;

			for (let i = 0, total = children.length; i < total; i++) {
				minWidth += children[i].offsetWidth;
			}

			t.getElement(t.container).style.minWidth = `${minWidth}px`;
		}
	}

	/**
	 * Add featured control element and cache its position in case features are reset
	 *
	 * @param {HTMLElement} element
	 * @param {String} key
	 */
	addControlElement (element, key) {

		const t = this;

		if (t.featurePosition[key] !== undefined) {
			const child = t.getElement(t.controls).children[t.featurePosition[key] - 1];
			child.parentNode.insertBefore(element, child.nextSibling);
		} else {
			t.getElement(t.controls).appendChild(element);
			const children = t.getElement(t.controls).children;
			for (let i = 0, total = children.length; i < total; i++) {
				if (element === children[i]) {
					t.featurePosition[key] = i;
					break;
				}
			}
		}
	}

	/**
	 * Append layer to manipulate `<iframe>` elements safely.
	 *
	 * This allows the user to trigger events properly given that mouse/click don't get lost in the `<iframe>`.
	 */
	createIframeLayer () {
		const t = this;

		if (t.isVideo && t.media.rendererName !== null && t.media.rendererName.indexOf('iframe') > -1 && !document.getElementById(`${t.media.id}-iframe-overlay`)) {

			const
				layer = document.createElement('div'),
				target = document.getElementById(`${t.media.id}_${t.media.rendererName}`)
			;

			layer.id = `${t.media.id}-iframe-overlay`;
			layer.className = `${t.options.classPrefix}iframe-overlay`;
			layer.addEventListener('click', (e) => {
				if (t.options.clickToPlayPause) {
					if (t.paused) {
						t.play();
					} else {
						t.pause();
					}

					e.preventDefault();
					e.stopPropagation();
				}
			});

			target.parentNode.insertBefore(layer, target);
		}
	}

	resetSize () {
		const t = this;
		// webkit has trouble doing this without a delay
		setTimeout(() => {
			t.setPlayerSize(t.width, t.height);
			t.setControlsSize();
		}, 50);
	}

	setPoster (url) {
		const t = this;

		if (t.getElement(t.container)) {
			let posterDiv = t.getElement(t.container).querySelector(`.${t.options.classPrefix}poster`);

			if (!posterDiv) {
				posterDiv = document.createElement('div');
				posterDiv.className = `${t.options.classPrefix}poster ${t.options.classPrefix}layer`;
				t.getElement(t.layers).appendChild(posterDiv);
			}

			let posterImg = posterDiv.querySelector('img');

			if (!posterImg && url) {
				posterImg = document.createElement('img');
				posterImg.className = `${t.options.classPrefix}poster-img`;
				posterImg.width = '100%';
				posterImg.height = '100%';
				posterDiv.style.display = '';
				posterDiv.appendChild(posterImg);
			}

			if (url) {
				posterImg.setAttribute('src', url);
				posterDiv.style.backgroundImage = `url("${url}")`;
				posterDiv.style.display = '';
			} else if (posterImg) {
				posterDiv.style.backgroundImage = 'none';
				posterDiv.style.display = 'none';
				posterImg.remove();
			} else {
				posterDiv.style.display = 'none';
			}
		} else if ((IS_IPAD && t.options.iPadUseNativeControls) || (IS_IPHONE && t.options.iPhoneUseNativeControls) || (IS_ANDROID && t.options.AndroidUseNativeControls)) {
			t.media.originalNode.poster = url;
		}
	}

	changeSkin (className) {
		const t = this;

		t.getElement(t.container).className = `${t.options.classPrefix}container ${className}`;
		t.setPlayerSize(t.width, t.height);
		t.setControlsSize();
	}

	globalBind (events, callback) {
		const
			t = this,
			doc = t.node ? t.node.ownerDocument : document
		;

		events = splitEvents(events, t.id);
		if (events.d) {
			const eventList = events.d.split(' ');
			for (let i = 0, total = eventList.length; i < total; i++) {
				eventList[i].split('.').reduce(function (part, e) {
					doc.addEventListener(e, callback, false);
					return e;
				}, '');
			}
		}
		if (events.w) {
			const eventList = events.w.split(' ');
			for (let i = 0, total = eventList.length; i < total; i++) {
				eventList[i].split('.').reduce(function (part, e) {
					window.addEventListener(e, callback, false);
					return e;
				}, '');
			}
		}
	}

	globalUnbind (events, callback) {
		const
			t = this,
			doc = t.node ? t.node.ownerDocument : document
		;

		events = splitEvents(events, t.id);
		if (events.d) {
			const eventList = events.d.split(' ');
			for (let i = 0, total = eventList.length; i < total; i++) {
				eventList[i].split('.').reduce(function (part, e) {
					doc.removeEventListener(e, callback, false);
					return e;
				}, '');
			}
		}
		if (events.w) {
			const eventList = events.w.split(' ');
			for (let i = 0, total = eventList.length; i < total; i++) {
				eventList[i].split('.').reduce(function (part, e) {
					window.removeEventListener(e, callback, false);
					return e;
				}, '');
			}
		}
	}

	buildfeatures (player, controls, layers, media) {
		const t = this;

		// add user-defined features/controls
		for (let i = 0, total = t.options.features.length; i < total; i++) {
			const feature = t.options.features[i];
			if (t[`build${feature}`]) {
				try {
					t[`build${feature}`](player, controls, layers, media);
				} catch (e) {
					// TODO: report control error
					console.error(`error building ${feature}`, e);
				}
			}
		}
	}

	buildposter (player, controls, layers, media) {
		const
			t = this,
			poster = document.createElement('div')
		;

		poster.className = `${t.options.classPrefix}poster ${t.options.classPrefix}layer`;
		layers.appendChild(poster);

		let posterUrl = media.originalNode.getAttribute('poster');

		// priority goes to option (this is useful if you need to support iOS 3.x (iOS completely fails with poster)
		if (player.options.poster !== '') {
			if (posterUrl && IS_IOS) {
				media.originalNode.removeAttribute('poster');
			}
			posterUrl = player.options.poster;
		}

		// second, try the real poster
		if (posterUrl) {
			t.setPoster(posterUrl);
		} else if (t.media.renderer !== null && typeof t.media.renderer.getPosterUrl === 'function') {
			t.setPoster(t.media.renderer.getPosterUrl());
		} else {
			poster.style.display = 'none';
		}

		media.addEventListener('play', () => {
			poster.style.display = 'none';
		});

		media.addEventListener('playing', () => {
			poster.style.display = 'none';
		});

		if (player.options.showPosterWhenEnded && player.options.autoRewind) {
			media.addEventListener('ended', () => {
				poster.style.display = '';
			});
		}

		media.addEventListener('error', () => {
			poster.style.display = 'none';
		});

		if (player.options.showPosterWhenPaused) {
			media.addEventListener('pause', () => {
				// To avoid displaying the poster when video ended, since it
				// triggers a pause event as well
				if (!player.ended) {
					poster.style.display = '';
				}
			});
		}
	}

	buildoverlays (player, controls, layers, media) {

		if (!player.isVideo) {
			return;
		}

		const
			t = this,
			loading = document.createElement('div'),
			error = document.createElement('div'),
			// this needs to come last so it's on top
			bigPlay = document.createElement('div')
		;

		loading.style.display = 'none'; // start out hidden
		loading.className = `${t.options.classPrefix}overlay ${t.options.classPrefix}layer`;
		loading.innerHTML = `<div class="${t.options.classPrefix}overlay-loading">` +
			`<span class="${t.options.classPrefix}overlay-loading-bg-img"></span>` +
			`</div>`;
		layers.appendChild(loading);

		error.style.display = 'none';
		error.className = `${t.options.classPrefix}overlay ${t.options.classPrefix}layer`;
		error.innerHTML = `<div class="${t.options.classPrefix}overlay-error"></div>`;
		layers.appendChild(error);

		bigPlay.className = `${t.options.classPrefix}overlay ${t.options.classPrefix}layer ${t.options.classPrefix}overlay-play`;
		bigPlay.innerHTML = `<div class="${t.options.classPrefix}overlay-button" role="button" tabindex="0" ` +
			`aria-label="${i18n.t('mejs.play')}" aria-pressed="false"></div>`;
		bigPlay.addEventListener('click', () => {
			// Removed 'touchstart' due issues on Samsung Android devices where a tap on bigPlay
			// started and immediately stopped the video
			if (t.options.clickToPlayPause) {

				const
					button = t.getElement(t.container).querySelector(`.${t.options.classPrefix}overlay-button`),
					pressed = button.getAttribute('aria-pressed')
				;

				if (t.paused) {
					t.play();
				} else {
					t.pause();
				}

				button.setAttribute('aria-pressed', !!pressed);
				t.getElement(t.container).focus();
			}
		});
		// Allow keyboard to execute action on play button
		bigPlay.addEventListener('keydown', function (e) {
			const keyPressed = e.keyCode || e.which || 0;
			// On Enter, play media
			if (keyPressed === 13 || (IS_FIREFOX && keyPressed === 32)) {
				const event = createEvent('click', bigPlay);
				bigPlay.dispatchEvent(event);
				return false;
			}
		});

		layers.appendChild(bigPlay);

		if (t.media.rendererName !== null && ((/(youtube|facebook)/i.test(t.media.rendererName) &&
			!(t.media.originalNode.getAttribute('poster') || player.options.poster ||
			(typeof t.media.renderer.getPosterUrl === 'function' && t.media.renderer.getPosterUrl()))) ||
			IS_STOCK_ANDROID || t.media.originalNode.getAttribute('autoplay'))) {
			bigPlay.style.display = 'none';
		}

		let hasError = false;

		// show/hide big play button
		media.addEventListener('play', () => {
			bigPlay.style.display = 'none';
			loading.style.display = 'none';
			error.style.display = 'none';
			hasError = false;
		});
		media.addEventListener('playing', () => {
			bigPlay.style.display = 'none';
			loading.style.display = 'none';
			error.style.display = 'none';
			hasError = false;
		});
		media.addEventListener('seeking', () => {
			bigPlay.style.display = 'none';
			loading.style.display = '';
			hasError = false;
		});
		media.addEventListener('seeked', () => {
			bigPlay.style.display = t.paused && !IS_STOCK_ANDROID ? '' : 'none';
			loading.style.display = 'none';
			hasError = false;
		});
		media.addEventListener('pause', () => {
			loading.style.display = 'none';
			if (!IS_STOCK_ANDROID && !hasError) {
				bigPlay.style.display = '';
			}
			hasError = false;
		});
		media.addEventListener('waiting', () => {
			loading.style.display = '';
			hasError = false;
		});

		// show/hide loading
		media.addEventListener('loadeddata', () => {
			loading.style.display = '';
			// Firing the 'canplay' event after a timeout which isn't getting fired on some Android 4.1 devices
			// (https://github.com/johndyer/mediaelement/issues/1305)
			if (IS_ANDROID) {
				media.canplayTimeout = setTimeout(() => {
					if (document.createEvent) {
						const evt = document.createEvent('HTMLEvents');
						evt.initEvent('canplay', true, true);
						return media.dispatchEvent(evt);
					}
				}, 300);
			}
			hasError = false;
		});
		media.addEventListener('canplay', () => {
			loading.style.display = 'none';
			// Clear timeout inside 'loadeddata' to prevent 'canplay' from firing twice
			clearTimeout(media.canplayTimeout);
			hasError = false;
		});

		// error handling
		media.addEventListener('error', (e) => {
			t._handleError(e, t.media, t.node);
			loading.style.display = 'none';
			bigPlay.style.display = 'none';
			hasError = true;
		});

		media.addEventListener('loadedmetadata', () => {
			if (!t.controlsEnabled) {
				t.enableControls();
			}
		});

		media.addEventListener('keydown', (e) => {
			t.onkeydown(player, media, e);
			hasError = false;
		});
	}

	buildkeyboard (player, controls, layers, media) {

		const t = this;

		t.getElement(t.container).addEventListener('keydown', () => {
			t.keyboardAction = true;
		});

		t.globalKeydownCallback = (event) => {
			if (!document.activeElement) { 
				return true;
			}
			
			const
				container = document.activeElement.closest(`.${t.options.classPrefix}container`),
				target = t.media.closest(`.${t.options.classPrefix}container`)
			;
			t.hasFocus = !!(container && target && container.id === target.id);
			return t.onkeydown(player, media, event);
		};

		t.globalClickCallback = (event) => {
			t.hasFocus = !!(event.target.closest(`.${t.options.classPrefix}container`));
		};

		// listen for key presses
		t.globalBind('keydown', t.globalKeydownCallback);

		// check if someone clicked outside a player region, then kill its focus
		t.globalBind('click', t.globalClickCallback);
	}

	onkeydown (player, media, e) {

		if (player.hasFocus && player.options.enableKeyboard) {
			// find a matching key
			for (let i = 0, total = player.options.keyActions.length; i < total; i++) {
				const keyAction = player.options.keyActions[i];

				for (let j = 0, jl = keyAction.keys.length; j < jl; j++) {
					if (e.keyCode === keyAction.keys[j]) {
						keyAction.action(player, media, e.keyCode, e);
						e.preventDefault();
						e.stopPropagation();
						return;
					}
				}
			}
		}

		return true;
	}

	get paused () {
		return this.proxy.paused;
	}

	get muted () {
		return this.proxy.muted;
	}

	set muted (muted) {
		this.setMuted(muted);
	}

	get ended () {
		return this.proxy.ended;
	}

	get readyState () {
		return this.proxy.readyState;
	}

	set currentTime (time) {
		this.setCurrentTime(time);
	}

	get currentTime () {
		return this.getCurrentTime();
	}

	get duration () {
		return this.getDuration();
	}

	set volume (volume) {
		this.setVolume(volume);
	}

	get volume () {
		return this.getVolume();
	}

	set src (src) {
		this.setSrc(src);
	}

	get src () {
		return this.getSrc();
	}

	play () {
		return this.proxy.play();
	}

	pause () {
		return this.proxy.pause();
	}

	load () {
		return this.proxy.load();
	}

	setCurrentTime (time) {
		this.proxy.setCurrentTime(time);
	}

	getCurrentTime () {
		return this.proxy.currentTime;
	}

	getDuration () {
		return this.proxy.duration;
	}

	setVolume (volume) {
		this.proxy.volume = volume;
	}

	getVolume () {
		return this.proxy.getVolume();
	}

	setMuted (value) {
		this.proxy.setMuted(value);
	}

	setSrc (src) {
		if (!this.controlsEnabled) {
			this.enableControls();
		}
		this.proxy.setSrc(src);
	}

	getSrc () {
		return this.proxy.getSrc();
	}

	canPlayType (type) {
		return this.proxy.canPlayType(type);
	}

	remove () {
		const
			t = this,
			rendererName = t.media.rendererName,
			src = t.media.originalNode.src
		;

		// invoke features cleanup
		for (const featureIndex in t.options.features) {
			const feature = t.options.features[featureIndex];
			if (t[`clean${feature}`]) {
				try {
					t[`clean${feature}`](t, t.getElement(t.layers), t.getElement(t.controls), t.media);
				} catch (e) {
					// @todo: report control error
					console.error(`error cleaning ${feature}`, e);
				}
			}
		}

		// reset dimensions
		let
			nativeWidth = t.node.getAttribute('width'),
			nativeHeight = t.node.getAttribute('height')
		;

		if (nativeWidth) {
			if (nativeWidth.indexOf('%') === -1) {
				nativeWidth = `${nativeWidth}px`;
			}
		} else {
			nativeWidth = 'auto';
		}

		if (nativeHeight) {
			if (nativeHeight.indexOf('%') === -1) {
				nativeHeight = `${nativeHeight}px`;
			}
		} else {
			nativeHeight = 'auto';
		}

		t.node.style.width = nativeWidth;
		t.node.style.height = nativeHeight;
		// Call this to avoid further calls to attempt set the player's dimensions
		t.setPlayerSize(0,0);

		// grab video and put it back in place
		if (!t.isDynamic) {
			t.node.setAttribute('controls', true);
			t.node.setAttribute('id', t.node.getAttribute('id').replace(`_${rendererName}`, '').replace('_from_mejs', ''));
			const poster = t.getElement(t.container).querySelector(`.${t.options.classPrefix}poster>img`);
			if (poster) {
				t.node.setAttribute('poster', poster.src);
			}

			// Remove `autoplay` (not worth bringing it back once player is destroyed)
			delete t.node.autoplay;

			// Reintegrate file if it can be played
			t.node.setAttribute('src', '');
			if (t.media.canPlayType(getTypeFromFile(src)) !== '') {
				t.node.setAttribute('src', src);
			}

			// If <iframe>, remove overlay
			if (rendererName && rendererName.indexOf('iframe') > -1) {
				const layer = document.getElementById(`${t.media.id}-iframe-overlay`);
				layer.remove();
			}

			const node = t.node.cloneNode();
			node.style.display = '';
			t.getElement(t.container).parentNode.insertBefore(node, t.getElement(t.container));
			t.node.remove();

			// Add children
			if (t.mediaFiles) {
				for (let i = 0, total = t.mediaFiles.length; i < total; i++) {
					const source = document.createElement('source');
					source.setAttribute('src', t.mediaFiles[i].src);
					source.setAttribute('type', t.mediaFiles[i].type);
					node.appendChild(source);
				}
			}
			if (t.trackFiles) {
				// Load captions properly
				for (let i = 0, total = t.trackFiles.length; i < total; i++) {
					const track = t.trackFiles[i];
					const newTrack = document.createElement('track');
					newTrack.kind = track.kind;
					newTrack.label = track.label;
					newTrack.srclang = track.srclang;
					newTrack.src = track.src;

					node.appendChild(newTrack);
					newTrack.addEventListener('load', function () {
						this.mode = 'showing';
						node.textTracks[i].mode = 'showing';
					});
				}
			}

			delete t.node;
			delete t.mediaFiles;
			delete t.trackFiles;

		} else {
			t.getElement(t.container).parentNode.insertBefore(t.node, t.getElement(t.container));
		}

		if (t.media.renderer && typeof t.media.renderer.destroy === 'function') {
			t.media.renderer.destroy();
		}

		// Remove the player from the mejs.players object so that pauseOtherPlayers doesn't blow up when trying to
		// pause a non existent Flash API.
		delete mejs.players[t.id];

		if (typeof t.getElement(t.container) === 'object') {
			const offscreen = t.getElement(t.container).parentNode.querySelector(`.${t.options.classPrefix}offscreen`);
			if(offscreen){
			offscreen.remove();
			}
			t.getElement(t.container).remove();
		}
		t.globalUnbind('resize', t.globalResizeCallback);
		t.globalUnbind('keydown', t.globalKeydownCallback);
		t.globalUnbind('click', t.globalClickCallback);

		delete t.media.player;
	}
}

window.MediaElementPlayer = MediaElementPlayer;
mejs.MediaElementPlayer = MediaElementPlayer;

export default MediaElementPlayer;
