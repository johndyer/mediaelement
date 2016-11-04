/*!
 * MediaElement.js
 * http://www.mediaelement.com/
 *
 * Wrapper that mimics native HTML5 MediaElement (audio and video)
 * using a variety of technologies (pure JavaScript, Flash, iframe)
 *
 * Copyright 2010-2016, John Dyer (http://j.hn/)
 * License: MIT
 *
 */
if (jQuery !== undefined) {
	mejs.$ = jQuery;
} else if (Zepto !== undefined) {
	mejs.$ = Zepto;

	// define `outerWidth` method which has not been realized in Zepto
	Zepto.fn.outerWidth = function (includeMargin) {
		var width = $(this).width();
		if (includeMargin) {
			width += parseInt($(this).css('margin-right'), 10);
			width += parseInt($(this).css('margin-left'), 10);
		}
		return width;
	};

} else if (ender !== undefined) {
	mejs.$ = ender;
}
(function (mejs, $, win, doc, undefined) {

	// default player values
	mejs.MepDefaults = {
		// url to poster (to fix iOS 3.x)
		poster: '',
		// When the video is ended, we can show the poster.
		showPosterWhenEnded: false,
		// default if the <video width> is not specified
		defaultVideoWidth: 480,
		// default if the <video height> is not specified
		defaultVideoHeight: 270,
		// if set, overrides <video width>
		videoWidth: -1,
		// if set, overrides <video height>
		videoHeight: -1,
		// default if the user doesn't specify
		defaultAudioWidth: 400,
		// default if the user doesn't specify
		defaultAudioHeight: 30,
		// default amount to move back when back key is pressed
		defaultSeekBackwardInterval: function (media) {
			return (media.duration * 0.05);
		},
		// default amount to move forward when forward key is pressed
		defaultSeekForwardInterval: function (media) {
			return (media.duration * 0.05);
		},
		// set dimensions via JS instead of CSS
		setDimensions: true,
		// width of audio player
		audioWidth: -1,
		// height of audio player
		audioHeight: -1,
		// initial volume when the player starts (overridden by user cookie)
		startVolume: 0.8,
		// useful for <audio> player loops
		loop: false,
		// rewind to beginning when media ends
		autoRewind: true,
		// resize to media dimensions
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
		// forces the hour marker (##:00:00)
		alwaysShowHours: false,
		// show framecount in timecode (##:00:00:00)
		showTimecodeFrameCount: false,
		// used when showTimecodeFrameCount is set to true
		framesPerSecond: 25,
		// Hide controls when playing and mouse is not over the video
		alwaysShowControls: false,
		// Display the video control
		hideVideoControlsOnLoad: false,
		// Enable click video element to toggle play/pause
		clickToPlayPause: true,
		// Time in ms to hide controls
		controlsTimeoutDefault: 1500,
		// Time in ms to trigger the timer when mouse moves
		controlsTimeoutMouseEnter: 2500,
		// Time in ms to trigger the timer when mouse leaves
		controlsTimeoutMouseLeave: 1000,
		// force iPad's native controls
		iPadUseNativeControls: false,
		// force iPhone's native controls
		iPhoneUseNativeControls: false,
		// force Android's native controls
		AndroidUseNativeControls: false,
		// features to show
		features: ['playpause', 'current', 'progress', 'duration', 'tracks', 'volume', 'fullscreen'],
		// only for dynamic
		isVideo: true,
		// stretching modes (auto, fill, responsive, none)
		stretching: 'auto',
		// turns keyboard support on and off for this instance
		enableKeyboard: true,
		// when this player starts, it will pause other players
		pauseOtherPlayers: true,
		// array of keyboard actions such as play/pause
		keyActions: [
			{
				keys: [
					32, // SPACE
					179 // GOOGLE play/pause button
				],
				action: function (player, media, key, event) {

					if (!mejs.MediaFeatures.isFirefox) {
						if (media.paused || media.ended) {
							media.play();
						} else {
							media.pause();
						}
					}
				}
			},
			{
				keys: [38], // UP
				action: function (player, media, key, event) {
					player.container.find('.mejs-volume-slider').css('display', 'block');
					if (player.isVideo) {
						player.showControls();
						player.startControlsTimer();
					}

					var newVolume = Math.min(media.volume + 0.1, 1);
					media.setVolume(newVolume);
				}
			},
			{
				keys: [40], // DOWN
				action: function (player, media, key, event) {
					player.container.find('.mejs-volume-slider').css('display', 'block');
					if (player.isVideo) {
						player.showControls();
						player.startControlsTimer();
					}

					var newVolume = Math.max(media.volume - 0.1, 0);
					media.setVolume(newVolume);
				}
			},
			{
				keys: [
					37, // LEFT
					227 // Google TV rewind
				],
				action: function (player, media, key, event) {
					if (!isNaN(media.duration) && media.duration > 0) {
						if (player.isVideo) {
							player.showControls();
							player.startControlsTimer();
						}

						// 5%
						var newTime = Math.max(media.currentTime - player.options.defaultSeekBackwardInterval(media), 0);
						media.setCurrentTime(newTime);
					}
				}
			},
			{
				keys: [
					39, // RIGHT
					228 // Google TV forward
				],
				action: function (player, media, key, event) {
					if (!isNaN(media.duration) && media.duration > 0) {
						if (player.isVideo) {
							player.showControls();
							player.startControlsTimer();
						}

						// 5%
						var newTime = Math.min(media.currentTime + player.options.defaultSeekForwardInterval(media), media.duration);
						media.setCurrentTime(newTime);
					}
				}
			},
			{
				keys: [70], // F
				action: function (player, media, key, event) {
					if (!event.ctrlKey) {
						if (typeof player.enterFullScreen != 'undefined') {
							if (player.isFullScreen) {
								player.exitFullScreen();
							} else {
								player.enterFullScreen();
							}
						}
					}
				}
			},
			{
				keys: [77], // M
				action: function (player, media, key, event) {
					player.container.find('.mejs-volume-slider').css('display', 'block');
					if (player.isVideo) {
						player.showControls();
						player.startControlsTimer();
					}
					if (player.media.muted) {
						player.setMuted(false);
					} else {
						player.setMuted(true);
					}
				}
			}
		]
	};

	mejs.mepIndex = 0;

	mejs.players = {};

	/**
	 *
	 * @param {Object} obj
	 * @param {String} type
	 * @param {Function} fn
	 */
	mejs.addEvent = function (obj, type, fn) {
		if (obj.addEventListener) {
			obj.addEventListener(type, fn, false);
		} else if (obj.attachEvent) {
			obj['e' + type + fn] = fn;
			obj[type + fn] = function () {
				obj['e' + type + fn](window.event);
			};
			obj.attachEvent('on' + type, obj[type + fn]);
		}

	};

	/**
	 *
	 * @param {Object} obj
	 * @param {String} type
	 * @param {Function} fn
	 */
	mejs.removeEvent = function (obj, type, fn) {

		if (obj.removeEventListener) {
			obj.removeEventListener(type, fn, false);
		} else if (obj.detachEvent) {
			obj.detachEvent('on' + type, obj[type + fn]);
			obj[type + fn] = null;
		}
	};

	/**
	 *
	 * @param {String} className
	 * @param {HTMLElement} node
	 * @param {String} tag
	 * @return {HTMLElement[]}
	 */
	mejs.getElementsByClassName = function getElementsByClassName(className, node, tag) {

		if (node === undefined || node === null) {
			node = document;
		}
		if (node.getElementsByClassName !== undefined && node.getElementsByClassName !== null) {
			return node.getElementsByClassName(className);
		}
		if (tag === undefined || tag === null) {
			tag = '*';
		}

		var classElements = [];
		var j = 0, teststr;
		var els = node.getElementsByTagName(tag);
		var elsLen = els.length;

		for (i = 0; i < elsLen; i++) {
			if (els[i].className.indexOf(className) != -1) {
				teststr = "," + els[i].className.split(" ").join(",") + ",";
				if (teststr.indexOf("," + className + ",") != -1) {
					classElements[j] = els[i];
					j++;
				}
			}
		}
		return classElements;
	};

	/**
	 * Wrap a MediaElement object in player controls
	 *
	 * @constructor
	 * @param {HTMLElement} node
	 * @param {Object} o
	 * @return {?MediaElementPlayer}
	 */
	mejs.MediaElementPlayer = function (node, o) {

		// enforce object, even without "new" (via John Resig)
		if (!(this instanceof mejs.MediaElementPlayer)) {
			return new mejs.MediaElementPlayer(node, o);
		}

		var t = this;

		// these will be reset after the MediaElement.success fires
		t.$media = t.$node = $(node);
		t.node = t.media = t.$media[0];

		if (!t.node) {
			return null;
		}

		// check for existing player
		if (typeof t.node.player != 'undefined') {
			return t.node.player;
		}


		// try to get options from data-mejsoptions
		if (o === undefined) {
			o = t.$node.data('mejsoptions');
		}

		// extend default options
		t.options = $.extend({}, mejs.MepDefaults, o);

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

		mejs.Utility.calculateTimeFormat(0, t.options, t.options.framesPerSecond || 25);

		// unique ID
		t.id = 'mep_' + mejs.mepIndex++;

		// add to player array (for focus events)
		mejs.players[t.id] = t;

		// start up
		t.init();

		return t;
	};

	/**
	 * @constructor
	 * @class {mejs.MediaElementPlayer}
	 */
	mejs.MediaElementPlayer.prototype = {

		hasFocus: false,

		controlsAreVisible: true,

		init: function () {

			var
				t = this,
				mf = mejs.MediaFeatures,
				// options for MediaElement (shim)
				meOptions = $.extend({}, t.options, {
					success: function (media, domNode) {
						t.meReady(media, domNode);
					},
					error: function (e) {
						t.handleError(e);
					}
				}),
				tagName = t.media.tagName.toLowerCase();

			t.isDynamic = (tagName !== 'audio' && tagName !== 'video');

			if (t.isDynamic) {
				// get video from src or href?
				t.isVideo = t.options.isVideo;
			} else {
				t.isVideo = (tagName !== 'audio' && t.options.isVideo);
			}

			// use native controls in iPad, iPhone, and Android
			if ((mf.isiPad && t.options.iPadUseNativeControls) || (mf.isiPhone && t.options.iPhoneUseNativeControls)) {

				// add controls and stop
				t.$media.attr('controls', 'controls');

				// attempt to fix iOS 3 bug
				//t.$media.removeAttr('poster');
				// no Issue found on iOS3 -ttroxell

				// override Apple's autoplay override for iPads
				if (mf.isiPad && t.media.getAttribute('autoplay') !== null) {
					t.play();
				}

			} else if (mf.isAndroid && t.options.AndroidUseNativeControls) {

				// leave default player

			} else if (t.isVideo || (!t.isVideo && t.options.features.length)) {

				// DESKTOP: use MediaElementPlayer controls

				// remove native controls
				t.$media.removeAttr('controls');
				var videoPlayerTitle = t.isVideo ?
					mejs.i18n.t('mejs.video-player') : mejs.i18n.t('mejs.audio-player');
				// insert description for screen readers
				$('<span class="mejs-offscreen">' + videoPlayerTitle + '</span>').insertBefore(t.$media);
				// build container
				t.container =
					$('<div id="' + t.id + '" class="mejs-container" ' +
						'tabindex="0" role="application" aria-label="' + videoPlayerTitle + '">' +
						'<div class="mejs-inner">' +
						'<div class="mejs-mediaelement"></div>' +
						'<div class="mejs-layers"></div>' +
						'<div class="mejs-controls"></div>' +
						'<div class="mejs-clear"></div>' +
						'</div>' +
						'</div>')
					.addClass(t.$media[0].className)
					.insertBefore(t.$media)
					.focus(function (e) {
						if (!t.controlsAreVisible && !t.hasFocus && t.controlsEnabled) {
							t.showControls(true);
							// In versions older than IE11, the focus causes the playbar to be displayed
							// if user clicks on the Play/Pause button in the control bar once it attempts
							// to hide it
							if (!t.hasMsNativeFullScreen) {
								// If e.relatedTarget appears before container, send focus to play button,
								// else send focus to last control button.
								var btnSelector = '.mejs-playpause-button > button';

								if (mejs.Utility.isNodeAfter(e.relatedTarget, t.container[0])) {
									btnSelector = '.mejs-controls .mejs-button:last-child > button';
								}

								var button = t.container.find(btnSelector);
								button.focus();
							}
						}
					});

				// When no elements in controls, hide bar completely
				if (!t.options.features.length) {
					t.container.css('background', 'transparent').find('.mejs-controls').hide();
				}

				if (t.isVideo && t.options.stretching === 'fill' && !t.container.parent('mejs-fill-container').length) {
					// outer container
					t.outerContainer = t.$media.parent();
					t.container.wrap('<div class="mejs-fill-container"/>');
				}

				// add classes for user and content
				t.container.addClass(
					(mf.isAndroid ? 'mejs-android ' : '') +
					(mf.isiOS ? 'mejs-ios ' : '') +
					(mf.isiPad ? 'mejs-ipad ' : '') +
					(mf.isiPhone ? 'mejs-iphone ' : '') +
					(t.isVideo ? 'mejs-video ' : 'mejs-audio ')
				);


				// move the <video/video> tag into the right spot
				t.container.find('.mejs-mediaelement').append(t.$media);

				// needs to be assigned here, after iOS remap
				t.node.player = t;

				// find parts
				t.controls = t.container.find('.mejs-controls');
				t.layers = t.container.find('.mejs-layers');

				// determine the size

				/* size priority:
				 (1) videoWidth (forced),
				 (2) style="width;height;"
				 (3) width attribute,
				 (4) defaultVideoWidth (for unspecified cases)
				 */

				var tagType = (t.isVideo ? 'video' : 'audio'),
					capsTagName = tagType.substring(0, 1).toUpperCase() + tagType.substring(1);


				if (t.options[tagType + 'Width'] > 0 || t.options[tagType + 'Width'].toString().indexOf('%') > -1) {
					t.width = t.options[tagType + 'Width'];
				} else if (t.media.style.width !== '' && t.media.style.width !== null) {
					t.width = t.media.style.width;
				} else if (t.media.getAttribute('width') !== null) {
					t.width = t.$media.attr('width');
				} else {
					t.width = t.options['default' + capsTagName + 'Width'];
				}

				if (t.options[tagType + 'Height'] > 0 || t.options[tagType + 'Height'].toString().indexOf('%') > -1) {
					t.height = t.options[tagType + 'Height'];
				} else if (t.media.style.height !== '' && t.media.style.height !== null) {
					t.height = t.media.style.height;
				} else if (t.$media[0].getAttribute('height') !== null) {
					t.height = t.$media.attr('height');
				} else {
					t.height = t.options['default' + capsTagName + 'Height'];
				}

				t.initialAspectRatio = (t.height > t.width) ? t.width / t.height : t.height / t.width;

				// set the size, while we wait for the plugins to load below
				t.setPlayerSize(t.width, t.height);

				// create MediaElementShim
				meOptions.pluginWidth = t.width;
				meOptions.pluginHeight = t.height;
			}
			// Hide media completely for audio that doesn't have any features
			else if (!t.isVideo && !t.options.features.length) {
				t.$media.hide();
			}

			// create MediaElement shim
			mejs.MediaElement(t.$media[0], meOptions);

			if (typeof(t.container) !== 'undefined' && t.options.features.length && t.controlsAreVisible) {
				// controls are shown when loaded
				t.container.trigger('controlsshown');
			}
		},

		showControls: function (doAnimation) {
			var t = this;

			doAnimation = doAnimation === undefined || doAnimation;

			if (t.controlsAreVisible)
				return;

			if (doAnimation) {
				t.controls
				.removeClass('mejs-offscreen')
				.stop(true, true).fadeIn(200, function () {
					t.controlsAreVisible = true;
					t.container.trigger('controlsshown');
				});

				// any additional controls people might add and want to hide
				t.container.find('.mejs-control')
				.removeClass('mejs-offscreen')
				.stop(true, true).fadeIn(200, function () {
					t.controlsAreVisible = true;
				});

			} else {
				t.controls
				.removeClass('mejs-offscreen')
				.css('display', 'block');

				// any additional controls people might add and want to hide
				t.container.find('.mejs-control')
				.removeClass('mejs-offscreen')
				.css('display', 'block');

				t.controlsAreVisible = true;
				t.container.trigger('controlsshown');
			}

			t.setControlsSize();

		},

		hideControls: function (doAnimation) {
			var t = this;

			doAnimation = doAnimation === undefined || doAnimation;

			if (!t.controlsAreVisible || t.options.alwaysShowControls || t.keyboardAction || t.media.paused || t.media.ended)
				return;

			if (doAnimation) {
				// fade out main controls
				t.controls.stop(true, true).fadeOut(200, function () {
					$(this)
					.addClass('mejs-offscreen')
					.css('display', 'block');

					t.controlsAreVisible = false;
					t.container.trigger('controlshidden');
				});

				// any additional controls people might add and want to hide
				t.container.find('.mejs-control').stop(true, true).fadeOut(200, function () {
					$(this)
					.addClass('mejs-offscreen')
					.css('display', 'block');
				});
			} else {

				// hide main controls
				t.controls
				.addClass('mejs-offscreen')
				.css('display', 'block');

				// hide others
				t.container.find('.mejs-control')
				.addClass('mejs-offscreen')
				.css('display', 'block');

				t.controlsAreVisible = false;
				t.container.trigger('controlshidden');
			}
		},

		controlsTimer: null,

		startControlsTimer: function (timeout) {

			var t = this;

			timeout = typeof timeout != 'undefined' ? timeout : t.options.controlsTimeoutDefault;

			t.killControlsTimer('start');

			t.controlsTimer = setTimeout(function () {
				//
				t.hideControls();
				t.killControlsTimer('hide');
			}, timeout);
		},

		killControlsTimer: function (src) {

			var t = this;

			if (t.controlsTimer !== null) {
				clearTimeout(t.controlsTimer);
				delete t.controlsTimer;
				t.controlsTimer = null;
			}
		},

		controlsEnabled: true,

		disableControls: function () {
			var t = this;

			t.killControlsTimer();
			t.hideControls(false);
			this.controlsEnabled = false;
		},

		enableControls: function () {
			var t = this;

			t.showControls(false);

			t.controlsEnabled = true;
		},

		// Sets up all controls and events
		meReady: function (media, domNode) {

			var
				t = this,
				mf = mejs.MediaFeatures,
				autoplayAttr = domNode.getAttribute('autoplay'),
				autoplay = !(autoplayAttr === undefined || autoplayAttr === null || autoplayAttr === 'false'),
				featureIndex,
				feature,
				isNative = media.rendererName !== null && media.rendererName.match(/(native|html5)/)
				;

			// make sure it can't create itself again if a plugin reloads
			if (t.created) {
				return;
			} else {
				t.created = true;
			}

			t.media = media;
			t.domNode = domNode;

			if (!(mf.isAndroid && t.options.AndroidUseNativeControls) && !(mf.isiPad && t.options.iPadUseNativeControls) && !(mf.isiPhone && t.options.iPhoneUseNativeControls)) {

				// In the event that no features are specified for audio,
				// create only MediaElement instance rather than
				// doing all the work to create a full player
				if (!t.isVideo && !t.options.features.length) {

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

				// two built in features
				t.buildposter(t, t.controls, t.layers, t.media);
				t.buildkeyboard(t, t.controls, t.layers, t.media);
				t.buildoverlays(t, t.controls, t.layers, t.media);

				// grab for use by features
				t.findTracks();

				// add user-defined features/controls
				for (featureIndex in t.options.features) {
					feature = t.options.features[featureIndex];
					if (t['build' + feature]) {
						try {
							t['build' + feature](t, t.controls, t.layers, t.media);
						} catch (e) {
							// TODO: report control error
							//throw e;
							
							
						}
					}
				}

				t.container.trigger('controlsready');

				// reset all layers and controls
				t.setPlayerSize(t.width, t.height);
				t.setControlsSize();


				// controls fade
				if (t.isVideo) {

					if (mejs.MediaFeatures.hasTouch && !t.options.alwaysShowControls) {

						// for touch devices (iOS, Android)
						// show/hide without animation on touch

						t.$media.bind('touchstart', function () {

							// toggle controls
							if (t.controlsAreVisible) {
								t.hideControls(false);
							} else {
								if (t.controlsEnabled) {
									t.showControls(false);
								}
							}
						});

					} else {

						// create callback here since it needs access to current
						// MediaElement object
						t.clickToPlayPauseCallback = function () {
							//

							if (t.options.clickToPlayPause) {
								var
									button = t.$media.closest('.mejs-container').find('.mejs-overlay-button'),
									pressed = button.attr('aria-pressed')
									;
								if (t.media.paused && pressed) {
									t.pause();
								} else if (t.media.paused) {
									t.play();
								} else {
									t.pause();
								}

								button.attr('aria-pressed', !pressed);
							}
						};

						// click to play/pause
						t.media.addEventListener('click', t.clickToPlayPauseCallback, false);

						// show/hide controls
						t.container
						.bind('mouseenter', function () {
							if (t.controlsEnabled) {
								if (!t.options.alwaysShowControls) {
									t.killControlsTimer('enter');
									t.showControls();
									t.startControlsTimer(t.options.controlsTimeoutMouseEnter);
								}
							}
						})
						.bind('mousemove', function () {
							if (t.controlsEnabled) {
								if (!t.controlsAreVisible) {
									t.showControls();
								}
								if (!t.options.alwaysShowControls) {
									t.startControlsTimer(t.options.controlsTimeoutMouseEnter);
								}
							}
						})
						.bind('mouseleave', function () {
							if (t.controlsEnabled) {
								if (!t.media.paused && !t.options.alwaysShowControls) {
									t.startControlsTimer(t.options.controlsTimeoutMouseLeave);
								}
							}
						});
					}

					if (t.options.hideVideoControlsOnLoad) {
						t.hideControls(false);
					}

					// check for autoplay
					if (autoplay && !t.options.alwaysShowControls) {
						t.hideControls();
					}

					// resizer
					if (t.options.enableAutosize) {
						t.media.addEventListener('loadedmetadata', function (e) {
							// if the <video height> was not set and the options.videoHeight was not set
							// then resize to the real dimensions
							if (t.options.videoHeight <= 0 && !t.domNode.getAttribute('height') && !isNaN(e.target.videoHeight)) {
								t.setPlayerSize(e.target.videoWidth, e.target.videoHeight);
								t.setControlsSize();
								t.media.setSize(e.target.videoWidth, e.target.videoHeight);
							}
						}, false);
					}
				}

				// EVENTS

				// FOCUS: when a video starts playing, it takes focus from other players (possibly pausing them)
				t.media.addEventListener('play', function () {
					var playerIndex;

					t.hasFocus = true;

					// go through all other players
					for (playerIndex in mejs.players) {
						var p = mejs.players[playerIndex];
						if (p.id !== t.id && t.options.pauseOtherPlayers && !p.paused && !p.ended) {
							p.pause();
							p.hasFocus = false;
						}
					}

				}, false);

				// ended for all
				t.media.addEventListener('ended', function (e) {
					if (t.options.autoRewind) {
						try {
							t.media.setCurrentTime(0);
							// Fixing an Android stock browser bug, where "seeked" isn't fired correctly after ending the video and jumping to the beginning
							window.setTimeout(function () {
								$(t.container).find('.mejs-overlay-loading').parent().hide();
							}, 20);
						} catch (exp) {

						}
					}

					if (typeof t.media.stop === 'function') {
						t.media.stop();
					} else {
						t.media.pause();
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
				}, false);

				// resize on the first play
				t.media.addEventListener('loadedmetadata', function () {

					mejs.Utility.calculateTimeFormat(t.duration, t.options, t.options.framesPerSecond || 25);

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
				}, false);

				// Only change the time format when necessary
				var duration = null;
				t.media.addEventListener('timeupdate', function () {
					if (duration !== this.duration) {
						duration = this.duration;
						mejs.Utility.calculateTimeFormat(duration, t.options, t.options.framesPerSecond || 25);

						// make sure to fill in and resize the controls (e.g., 00:00 => 01:13:15
						if (t.updateDuration) {
							t.updateDuration();
						}
						if (t.updateCurrent) {
							t.updateCurrent();
						}
						t.setControlsSize();

					}
				}, false);

				t.container.focusout(function (e) {
					if (e.relatedTarget) { //FF is working on supporting focusout https://bugzilla.mozilla.org/show_bug.cgi?id=687787
						var $target = $(e.relatedTarget);
						if (t.keyboardAction && $target.parents('.mejs-container').length === 0) {
							t.keyboardAction = false;
							if (t.isVideo && !t.options.alwaysShowControls) {
								t.hideControls(true);
							}

						}
					}
				});

				// webkit has trouble doing this without a delay
				setTimeout(function () {
					t.setPlayerSize(t.width, t.height);
					t.setControlsSize();
				}, 50);

				// adjust controls whenever window sizes (used to be in fullscreen only)
				t.globalBind('resize', function () {

					// don't resize for fullscreen mode
					if (!(t.isFullScreen || (mejs.MediaFeatures.hasTrueNativeFullScreen && document.webkitIsFullScreen))) {
						t.setPlayerSize(t.width, t.height);
					}

					// always adjust controls
					t.setControlsSize();
				});

				// This is a work-around for a bug in the YouTube iFrame player, which means
				//	we can't use the play() API for the initial playback on iOS or Android;
				//	user has to start playback directly by tapping on the iFrame.
				if (t.media.rendererName !== null && t.media.rendererName.match(/youtube/) && (mf.isiOS || mf.isAndroid)) {
					t.container.find('.mejs-overlay-play').hide();
					t.container.find('.mejs-poster').hide();
				}
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
		},

		handleError: function (e) {
			var t = this;

			if (t.controls) {
				t.disableControls();
			}

			// Tell user that the file cannot be played
			if (t.options.error) {
				t.options.error(e);
			}
		},

		setPlayerSize: function (width, height) {
			var t = this;

			if (!t.options.setDimensions) {
				return false;
			}

			if (typeof width !== 'undefined') {
				t.width = width;
			}

			if (typeof height !== 'undefined') {
				t.height = height;
			}

			if (typeof FB !== 'undefined' && t.isVideo) {
				FB.Event.subscribe('xfbml.ready', function () {
					var target = $(t.media).children('.fb-video');

					t.width = target.width();
					t.height = target.height();
					t.setDimensions(t.width, t.height);
					return false;
				});

				var target = $(t.media).children('.fb-video');

				if (target.length) {
					t.width = target.width();
					t.height = target.height();
				}
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
		},

		hasFluidMode: function () {
			var t = this;

			// detect 100% mode - use currentStyle for IE since css() doesn't return percentages
			return (t.height.toString().indexOf('%') > -1 || (t.$node.css('max-width') !== 'none' && t.$node.css('max-width') !== t.width) || (t.$node[0].currentStyle && t.$node[0].currentStyle.maxWidth === '100%'));
		},

		setResponsiveMode: function () {
			var t = this;

			// do we have the native dimensions yet?
			var nativeWidth = (function () {
				if (t.isVideo) {
					if (t.media.videoWidth && t.media.videoWidth > 0) {
						return t.media.videoWidth;
					} else if (t.media.getAttribute('width') !== null) {
						return t.media.getAttribute('width');
					} else {
						return t.options.defaultVideoWidth;
					}
				} else {
					return t.options.defaultAudioWidth;
				}
			})();

			var nativeHeight = (function () {
				if (t.isVideo) {
					if (t.media.videoHeight && t.media.videoHeight > 0) {
						return t.media.videoHeight;
					} else if (t.media.getAttribute('height') !== null) {
						return t.media.getAttribute('height');
					} else {
						return t.options.defaultVideoHeight;
					}
				} else {
					return t.options.defaultAudioHeight;
				}
			})();

			// Use media aspect ratio if received; otherwise, the initially stored initial aspect ratio
			var
				aspectRatio = (function () {
					ratio = 1;
					if (!t.isVideo) {
						return ratio;
					}

					if (t.media.videoWidth && t.media.videoWidth > 0 && t.media.videoHeight && t.media.videoHeight > 0) {
						ratio = t.height >= t.width ?
							t.media.videoWidth / t.media.videoHeight : t.media.videoHeight / t.media.videoWidth;
					} else {
						ratio = t.initialAspectRatio;
					}

					if (isNaN(ratio) || ratio < 0.01 || ratio > 100) {
						ratio = 1;
					}

					return ratio;
				})(),
				parentWidth = t.container.parent().closest(':visible').width(),
				parentHeight = t.container.parent().closest(':visible').height(),
				newHeight;

			if (t.isVideo) {
				newHeight = t.height >= t.width ? parseInt(parentWidth / aspectRatio, 10) : parseInt(parentWidth * aspectRatio, 10);
			} else {
				newHeight = nativeHeight;
			}

			// If we were unable to compute newHeight, get the container height instead
			if (isNaN(newHeight)) {
				newHeight = parentHeight;
			}

			if (t.container.parent().length > 0 && t.container.parent()[0].tagName.toLowerCase() === 'body') { // && t.container.siblings().count == 0) {
				parentWidth = $(win).width();
				newHeight = $(win).height();
			}

			if (newHeight && parentWidth) {

				// set outer container size
				t.container
				.width(parentWidth)
				.height(newHeight);

				// set native <video> or <audio> and shims
				t.$media
				.width('100%')
				.height('100%');

				// if shim is ready, send the size to the embeded plugin
				if (t.isVideo) {
					if (t.media.setSize) {
						t.media.setSize(parentWidth, newHeight);
					}
				}

				// set the layers
				t.layers.children('.mejs-layer')
				.width('100%')
				.height('100%');
			}
		},

		setFillMode: function () {
			var t = this,
				parent = t.outerContainer;

			// Remove the responsive attributes in the event they are there
			if (t.$node.css('height') !== 'none' && t.$node.css('height') !== t.height) {
				t.$node.css('height', '');
			}
			if (t.$node.css('max-width') !== 'none' && t.$node.css('max-width') !== t.width) {
				t.$node.css('max-width', '');
			}

			if (t.$node.css('max-height') !== 'none' && t.$node.css('max-height') !== t.height) {
				t.$node.css('max-height', '');
			}

			if (t.$node[0].currentStyle) {
				if (t.$node[0].currentStyle.height === '100%') {
					t.$node[0].currentStyle.height = '';
				}
				if (t.$node[0].currentStyle.maxWidth === '100%') {
					t.$node[0].currentStyle.maxWidth = '';
				}
				if (t.$node[0].currentStyle.maxHeight === '100%') {
					t.$node[0].currentStyle.maxHeight = '';
				}
			}

			if (!parent.width()) {
				parent.height(t.$media.width());
			}

			if (!parent.height()) {
				parent.height(t.$media.height());
			}

			var parentWidth = parent.width(),
				parentHeight = parent.height();

			t.setDimensions('100%', '100%');

			// This prevents an issue when displaying poster
			t.container.find('.mejs-poster img').css('display', 'block');

			targetElement = t.container.find('object, embed, iframe, video');

			// calculate new width and height
			var initHeight = t.height,
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
				finalHeight = bScaleOnWidth ? Math.floor(scaleY1) : Math.floor(scaleY2);

			if (bScaleOnWidth) {
				targetElement.height(finalHeight).width(parentWidth);
				if (t.media.setSize) {
					t.media.setSize(parentWidth, finalHeight);
				}
			} else {
				targetElement.height(parentHeight).width(finalWidth);
				if (t.media.setSize) {
					t.media.setSize(finalWidth, parentHeight);
				}
			}

			targetElement.css({
				'margin-left': Math.floor((parentWidth - finalWidth) / 2),
				'margin-top': 0
			});
		},

		setDimensions: function (width, height) {
			var t = this;

			t.container
			.width(width)
			.height(height);

			t.layers.children('.mejs-layer')
			.width(width)
			.height(height);
		},

		setControlsSize: function () {
			var
				t = this,
				rail = t.controls.find('.mejs-time-rail')
			;

			// skip calculation if hidden
			if (!t.container.is(':visible') || !rail.length || !rail.is(':visible')) {
				return;
			}

			var
				controlElements = t.controls.children('div'),
				margin = parseFloat(controlElements.children('.mejs-time-total').css('margin-left')),
				// 1px on error margin
				siblingsWidth =  parseFloat(rail.siblings().width()) + margin - 1,
				siblings = ((rail.siblings().length) * siblingsWidth)
			;

			// Consider space if volume is vertical
			var horizontalVolume = t.controls.find('.mejs-horizontal-volume-slider');
			if (horizontalVolume.length) {
				siblings += parseFloat(horizontalVolume.width());
			}

			// Get number of features siblings to obtain total width to be reduced from time rail
			rail.width('100%').width('-=' + siblings);

			t.container.trigger('controlsresize');
		},


		buildposter: function (player, controls, layers, media) {
			var t = this,
				poster =
					$('<div class="mejs-poster mejs-layer">' +
						'</div>')
					.appendTo(layers),
				posterUrl = player.$media.attr('poster');

			// prioriy goes to option (this is useful if you need to support iOS 3.x (iOS completely fails with poster)
			if (player.options.poster !== '') {
				posterUrl = player.options.poster;
			}

			// second, try the real poster
			if (posterUrl) {
				t.setPoster(posterUrl);
			} else {
				poster.hide();
			}

			media.addEventListener('play', function () {
				poster.hide();
			}, false);

			if (player.options.showPosterWhenEnded && player.options.autoRewind) {
				media.addEventListener('ended', function () {
					poster.show();
				}, false);
			}
		},

		setPoster: function (url) {
			var t = this,
				posterDiv = t.container.find('.mejs-poster'),
				posterImg = posterDiv.find('img');

			if (posterImg.length === 0) {
				posterImg = $('<img class="mejs-poster-img" width="100%" height="100%" alt="" />').appendTo(posterDiv);
			}

			posterImg.attr('src', url);
			posterDiv.css({'background-image': 'url(' + url + ')'});
		},

		buildoverlays: function (player, controls, layers, media) {
			var t = this;
			if (!player.isVideo)
				return;

			var
				loading =
					$('<div class="mejs-overlay mejs-layer">' +
						'<div class="mejs-overlay-loading">' +
							'<span class="mejs-overlay-loading-bg-img"></span>' +
						'</div>' +
					'</div>')
					.hide() // start out hidden
					.appendTo(layers),
				error =
					$('<div class="mejs-overlay mejs-layer">' +
						'<div class="mejs-overlay-error"></div>' +
						'</div>')
					.hide() // start out hidden
					.appendTo(layers),
				// this needs to come last so it's on top
				bigPlay =
					$('<div class="mejs-overlay mejs-layer mejs-overlay-play">' +
						'<div class="mejs-overlay-button" role="button" aria-label="' + mejs.i18n.t('mejs.play') + '" aria-pressed="false"></div>' +
						'</div>')
					.appendTo(layers)
					.bind('click', function () {	 // Removed 'touchstart' due issues on Samsung Android devices where a tap on bigPlay started and immediately stopped the video
						if (t.options.clickToPlayPause) {

							var
								button = t.$media.closest('.mejs-container').find('.mejs-overlay-button'),
								pressed = button.attr('aria-pressed')
							;

							if (media.paused) {
								media.play();
							} else {
								media.pause();
							}

							button.attr('aria-pressed', !!pressed);
						}
					});

			if (mejs.Features.isiPhone || (t.media.rendererName !== null && t.media.rendererName.match(/(youtube|facebook)/))) {
				bigPlay.hide();
			}

			// show/hide big play button
			media.addEventListener('play', function () {
				bigPlay.hide();
				loading.hide();
				controls.find('.mejs-time-buffering').hide();
				error.hide();
			}, false);

			media.addEventListener('playing', function () {
				bigPlay.hide();
				loading.hide();
				controls.find('.mejs-time-buffering').hide();
				error.hide();
			}, false);

			media.addEventListener('seeking', function () {
				loading.show();
				controls.find('.mejs-time-buffering').show();
			}, false);

			media.addEventListener('seeked', function () {
				loading.hide();
				controls.find('.mejs-time-buffering').hide();
			}, false);

			media.addEventListener('pause', function () {
				if (!mejs.MediaFeatures.isiPhone) {
					bigPlay.show();
				}
			}, false);

			media.addEventListener('waiting', function () {
				loading.show();
				controls.find('.mejs-time-buffering').show();
			}, false);


			// show/hide loading
			media.addEventListener('loadeddata', function () {
				// for some reason Chrome is firing this event
				//if (mejs.MediaFeatures.isChrome && media.getAttribute && media.getAttribute('preload') === 'none')
				//	return;

				loading.show();
				controls.find('.mejs-time-buffering').show();
				// Firing the 'canplay' event after a timeout which isn't getting fired on some Android 4.1 devices (https://github.com/johndyer/mediaelement/issues/1305)
				if (mejs.MediaFeatures.isAndroid) {
					media.canplayTimeout = window.setTimeout(
						function () {
							if (document.createEvent) {
								var evt = document.createEvent('HTMLEvents');
								evt.initEvent('canplay', true, true);
								return media.dispatchEvent(evt);
							}
						}, 300
					);
				}
			}, false);
			media.addEventListener('canplay', function () {
				loading.hide();
				controls.find('.mejs-time-buffering').hide();
				clearTimeout(media.canplayTimeout); // Clear timeout inside 'loadeddata' to prevent 'canplay' to fire twice
			}, false);

			// error handling
			media.addEventListener('error', function (e) {
				t.handleError(e);
				loading.hide();
				bigPlay.hide();
				error.show();
				error.find('.mejs-overlay-error').html("Error loading this resource");
			}, false);

			media.addEventListener('keydown', function (e) {
				t.onkeydown(player, media, e);
			}, false);
		},

		buildkeyboard: function (player, controls, layers, media) {

			var t = this;

			t.container.keydown(function () {
				t.keyboardAction = true;
			});

			// listen for key presses
			t.globalBind('keydown', function (event) {
				player.hasFocus = $(event.target).closest('.mejs-container').length !== 0 &&
					$(event.target).closest('.mejs-container').attr('id') === player.$media.closest('.mejs-container').attr('id');
				return t.onkeydown(player, media, event);
			});


			// check if someone clicked outside a player region, then kill its focus
			t.globalBind('click', function (event) {
				player.hasFocus = $(event.target).closest('.mejs-container').length !== 0;
			});

		},
		onkeydown: function (player, media, e) {
			if (player.hasFocus && player.options.enableKeyboard) {
				// find a matching key
				for (var i = 0, il = player.options.keyActions.length; i < il; i++) {
					var keyAction = player.options.keyActions[i];

					for (var j = 0, jl = keyAction.keys.length; j < jl; j++) {
						if (e.keyCode === keyAction.keys[j]) {
							if (typeof(e.preventDefault) === "function") e.preventDefault();
							keyAction.action(player, media, e.keyCode, e);
							return false;
						}
					}
				}
			}

			return true;
		},

		findTracks: function () {
			var t = this,
				tracktags = t.$media.find('track');

			// store for use by plugins
			t.tracks = [];
			tracktags.each(function (index, track) {

				track = $(track);

				t.tracks.push({
					srclang: (track.attr('srclang')) ? track.attr('srclang').toLowerCase() : '',
					src: track.attr('src'),
					kind: track.attr('kind'),
					label: track.attr('label') || '',
					entries: [],
					isLoaded: false
				});
			});
		},
		changeSkin: function (className) {
			var t = this;

			t.container[0].className = 'mejs-container ' + className;
			t.setPlayerSize(t.width, t.height);
			t.setControlsSize();
		},
		play: function () {
			var t = this;

			t.load();
			t.media.play();
		},
		pause: function () {
			try {
				this.media.pause();
			} catch (e) {
			}
		},
		load: function () {
			var t = this;

			if (!t.isLoaded) {
				t.media.load();
			}

			t.isLoaded = true;
		},
		setMuted: function (muted) {
			this.media.setMuted(muted);
		},
		setCurrentTime: function (time) {
			this.media.setCurrentTime(time);
		},
		getCurrentTime: function () {
			return this.media.currentTime;
		},
		setVolume: function (volume) {
			this.media.setVolume(volume);
		},
		getVolume: function () {
			return this.media.volume;
		},
		setSrc: function (src) {
			this.media.setSrc(src);
		},
		remove: function () {
			var t = this, featureIndex, feature;

			t.container.prev('.mejs-offscreen').remove();

			// invoke features cleanup
			for (featureIndex in t.options.features) {
				feature = t.options.features[featureIndex];
				if (t['clean' + feature]) {
					try {
						t['clean' + feature](t);
					} catch (e) {
						// TODO: report control error
						//throw e;
						//
						//
					}
				}
			}

			// grab video and put it back in place
			if (!t.isDynamic) {
				t.$media.prop('controls', true);
				// detach events from the video
				// TODO: detach event listeners better than this;
				//		 also detach ONLY the events attached by this plugin!
				t.$node.clone().insertBefore(t.container).show();
				t.$node.remove();
			} else {
				t.$node.insertBefore(t.container);
			}

			var isNative = t.media.rendererName !== null && t.media.rendererName.match(/(native|html5)/);

			if (!isNative) {
				t.media.remove();
			}

			// Remove the player from the mejs.players object so that pauseOtherPlayers doesn't blow up when trying to pause a non existent Flash API.
			delete mejs.players[t.id];

			if (typeof t.container === 'object') {
				t.container.remove();
			}
			t.globalUnbind();
			delete t.node.player;
		},
		rebuildtracks: function () {
			var t = this;
			t.findTracks();
			t.buildtracks(t, t.controls, t.layers, t.media);
		},
		resetSize: function () {
			var t = this;
			// webkit has trouble doing this without a delay
			setTimeout(function () {
				//
				t.setPlayerSize(t.width, t.height);
				t.setControlsSize();
			}, 50);
		}
	};

	(function () {
		var rwindow = /^((after|before)print|(before)?unload|hashchange|message|o(ff|n)line|page(hide|show)|popstate|resize|storage)\b/;

		function splitEvents(events, id) {
			// add player ID as an event namespace so it's easier to unbind them all later
			var ret = {d: [], w: []};
			$.each((events || '').split(' '), function (k, v) {
				var eventname = v + '.' + id;
				if (eventname.indexOf('.') === 0) {
					ret.d.push(eventname);
					ret.w.push(eventname);
				}
				else {
					ret[rwindow.test(v) ? 'w' : 'd'].push(eventname);
				}
			});
			ret.d = ret.d.join(' ');
			ret.w = ret.w.join(' ');
			return ret;
		}

		mejs.MediaElementPlayer.prototype.globalBind = function (events, data, callback) {
			var t = this;
			var doc = t.node ? t.node.ownerDocument : document;

			events = splitEvents(events, t.id);
			if (events.d) $(doc).bind(events.d, data, callback);
			if (events.w) $(window).bind(events.w, data, callback);
		};

		mejs.MediaElementPlayer.prototype.globalUnbind = function (events, callback) {
			var t = this;
			var doc = t.node ? t.node.ownerDocument : document;

			events = splitEvents(events, t.id);
			if (events.d) $(doc).unbind(events.d, callback);
			if (events.w) $(window).unbind(events.w, callback);
		};
	})();

	// turn into jQuery plugin
	if (typeof $ != 'undefined') {
		$.fn.mediaelementplayer = function (options) {
			if (options === false) {
				this.each(function () {
					var player = $(this).data('mediaelementplayer');
					if (player) {
						player.remove();
					}
					$(this).removeData('mediaelementplayer');
				});
			}
			else {
				this.each(function () {
					$(this).data('mediaelementplayer', new mejs.MediaElementPlayer(this, options));
				});
			}
			return this;
		};


		$(document).ready(function () {
			// auto enable using JSON attribute
			$('.mejs-player').mediaelementplayer();
		});
	}

	// push out to window
	window.MediaElementPlayer = mejs.MediaElementPlayer;

})(mejs, mejs.$, window, document);

/**
 * Play/Pause button
 *
 * This feature enables the displaying of a Play button in the control bar, and also contains logic to toggle its state
 * between paused and playing.
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {String}
		 */
		playText: '',
		/**
		 * @type {String}
		 */
		pauseText: ''
	});

	$.extend(MediaElementPlayer.prototype, {
		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 * @public
		 */
		buildplaypause: function(player, controls, layers, media) {
			var 
				t = this,
				op = t.options,
				playTitle = op.playText ? op.playText : mejs.i18n.t('mejs.play'),
				pauseTitle = op.pauseText ? op.pauseText : mejs.i18n.t('mejs.pause'),
				play =
				$('<div class="mejs-button mejs-playpause-button mejs-play" >' +
					'<button type="button" aria-controls="' + t.id + '" title="' + playTitle + '" aria-label="' + pauseTitle + '"></button>' +
				'</div>')
				.appendTo(controls)
				.click(function(e) {
					e.preventDefault();
				
					if (media.paused) {
						media.play();
					} else {
						media.pause();
					}
					
					return false;
				}),
				play_btn = play.find('button');


			/**
			 * @private
			 * @param {String} which - token to determine new state of button
			 */
			function togglePlayPause(which) {
				if ('play' === which) {
					play.removeClass('mejs-play').addClass('mejs-pause');
					play_btn.attr({
						'title': pauseTitle,
						'aria-label': pauseTitle
					});
				} else {
					play.removeClass('mejs-pause').addClass('mejs-play');
					play_btn.attr({
						'title': playTitle,
						'aria-label': playTitle
					});
				}
			}

			togglePlayPause('pse');

			media.addEventListener('play',function() {
				togglePlayPause('play');
			}, false);
			media.addEventListener('playing',function() {
				togglePlayPause('play');
			}, false);


			media.addEventListener('pause',function() {
				togglePlayPause('pse');
			}, false);
			media.addEventListener('paused',function() {
				togglePlayPause('pse');
			}, false);
		}
	});
	
})(mejs.$);

/**
 * Stop button
 *
 * This feature enables the displaying of a Stop button in the control bar, which basically pauses the media and rewinds
 * it to the initial position.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {String}
		 */
		stopText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildstop: function (player, controls, layers, media) {
			var
				t = this,
				stopTitle = t.options.stopText ? t.options.stopText : mejs.i18n.t('mejs.stop');

			$('<div class="mejs-button mejs-stop-button mejs-stop">' +
				'<button type="button" aria-controls="' + t.id + '" title="' + stopTitle + '" aria-label="' + stopTitle + '"></button>' +
				'</div>')
			.appendTo(controls)
			.click(function () {
				if (!media.paused) {
					media.pause();
				}
				if (media.currentTime > 0) {
					media.setCurrentTime(0);
					media.pause();
					controls.find('.mejs-time-current').width('0px');
					controls.find('.mejs-time-handle').css('left', '0px');
					controls.find('.mejs-time-float-current').html(mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours));
					controls.find('.mejs-currenttime').html(mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours));
					layers.find('.mejs-poster').show();
				}
			});
		}
	});

})(mejs.$);

/**
 * Progress/loaded bar
 *
 * This feature creates a progress bar with a slider in the control bar, and updates it based on native events.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * Enable tooltip that shows time in progress bar
		 * @type {Boolean}
		 */
		enableProgressTooltip: true,
		/**
		 * @type {String}
		 */
		progressHelpText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildprogress: function (player, controls, layers, media) {

			var
				t = this,
				mouseIsDown = false,
				mouseIsOver = false,
				lastKeyPressTime = 0,
				startedPaused = false,
				autoRewindInitial = player.options.autoRewind,
				progressTitle = t.options.progressHelpText ? t.options.progressHelpText : mejs.i18n.t('mejs.time-help-text'),
				tooltip = player.options.enableProgressTooltip ? '<span class="mejs-time-float">' +
				'<span class="mejs-time-float-current">00:00</span>' +
				'<span class="mejs-time-float-corner"></span>' +
				'</span>' : "";

			$('<div class="mejs-time-rail">' +
				'<span  class="mejs-time-total mejs-time-slider">' +
				//'<span class="mejs-offscreen">' + progressTitle + '</span>' +
				'<span class="mejs-time-buffering"></span>' +
				'<span class="mejs-time-loaded"></span>' +
				'<span class="mejs-time-current"></span>' +
				'<span class="mejs-time-handle"></span>' +
				tooltip +
				'</span>' +
				'</div>')
			.appendTo(controls);
			controls.find('.mejs-time-buffering').hide();

			t.total = controls.find('.mejs-time-total');
			t.loaded = controls.find('.mejs-time-loaded');
			t.current = controls.find('.mejs-time-current');
			t.handle = controls.find('.mejs-time-handle');
			t.timefloat = controls.find('.mejs-time-float');
			t.timefloatcurrent = controls.find('.mejs-time-float-current');
			t.slider = controls.find('.mejs-time-slider');

			/**
			 *
			 * @private
			 * @param {Event} e
			 */
			var handleMouseMove = function (e) {

					var offset = t.total.offset(),
						width = t.total.width(),
						percentage = 0,
						newTime = 0,
						pos = 0,
						x;

					// mouse or touch position relative to the object
					if (e.originalEvent && e.originalEvent.changedTouches) {
						x = e.originalEvent.changedTouches[0].pageX;
					} else if (e.changedTouches) { // for Zepto
						x = e.changedTouches[0].pageX;
					} else {
						x = e.pageX;
					}

					if (media.duration) {
						if (x < offset.left) {
							x = offset.left;
						} else if (x > width + offset.left) {
							x = width + offset.left;
						}

						pos = x - offset.left;
						percentage = (pos / width);
						newTime = (percentage <= 0.02) ? 0 : percentage * media.duration;

						// seek to where the mouse is
						if (mouseIsDown && newTime.toFixed(4) !== media.currentTime.toFixed(4)) {
							media.setCurrentTime(newTime);
						}

						// position floating time box
						if (!mejs.MediaFeatures.hasTouch) {
							t.timefloat.css('left', pos);
							t.timefloatcurrent.html(mejs.Utility.secondsToTimeCode(newTime, player.options.alwaysShowHours));
							t.timefloat.show();
						}
					}
				},
				/**
				 * Update elements in progress bar for accessibility purposes only when player is paused.
				 *
				 * This is to avoid attempts to repeat the time over and over again when media is playing.
				 * @private
				 */
				updateSlider = function () {

					var seconds = media.currentTime,
						timeSliderText = mejs.i18n.t('mejs.time-slider'),
						time = mejs.Utility.secondsToTimeCode(seconds, player.options.alwaysShowHours),
						duration = media.duration;

					t.slider.attr({
						'role': 'slider',
						'tabindex': 0
					});
					if (media.paused) {
						t.slider.attr({
							'aria-label': timeSliderText,
							'aria-valuemin': 0,
							'aria-valuemax': duration,
							'aria-valuenow': seconds,
							'aria-valuetext': time
						});
					} else {
						t.slider.removeAttr('aria-label aria-valuemin aria-valuemax aria-valuenow aria-valuetext');
					}
				},
				/**
				 *
				 * @private
				 */
				restartPlayer = function () {
					var now = new Date();
					if (now - lastKeyPressTime >= 1000) {
						media.play();
					}
				};

			// Events
			t.slider.bind('focus', function (e) {
				player.options.autoRewind = false;
			});

			t.slider.bind('blur', function (e) {
				player.options.autoRewind = autoRewindInitial;
			});

			t.slider.bind('keydown', function (e) {

				if ((new Date() - lastKeyPressTime) >= 1000) {
					startedPaused = media.paused;
				}

				if (t.options.keyActions.length) {

					var keyCode = e.keyCode,
						duration = media.duration,
						seekTime = media.currentTime,
						seekForward = player.options.defaultSeekForwardInterval(media),
						seekBackward = player.options.defaultSeekBackwardInterval(media);

					switch (keyCode) {
						case 37: // left
						case 40: // Down
							seekTime -= seekBackward;
							break;
						case 39: // Right
						case 38: // Up
							seekTime += seekForward;
							break;
						case 36: // Home
							seekTime = 0;
							break;
						case 35: // end
							seekTime = duration;
							break;
						case 32: // space
							if (!mejs.Utility.isFirefox) {
								if (media.paused) {
									media.play();
								} else {
									media.pause();
								}
							}
							return;
						case 13: // enter
							if (media.paused) {
								media.play();
							} else {
								media.pause();
							}
							return;
						default:
							return;
					}


					seekTime = seekTime < 0 ? 0 : (seekTime >= duration ? duration : Math.floor(seekTime));
					lastKeyPressTime = new Date();
					if (!startedPaused) {
						media.pause();
					}

					if (seekTime < media.duration && !startedPaused) {
						setTimeout(restartPlayer, 1100);
					}

					media.setCurrentTime(seekTime);

					e.preventDefault();
					e.stopPropagation();
				}
			});


			// handle clicks
			t.total
			.bind('mousedown touchstart', function (e) {
				// only handle left clicks or touch
				if (e.which === 1 || e.which === 0) {
					mouseIsDown = true;
					handleMouseMove(e);
					t.globalBind('mousemove.dur touchmove.dur', function (e) {
						handleMouseMove(e);
					});
					t.globalBind('mouseup.dur touchend.dur', function (e) {
						mouseIsDown = false;
						if (t.timefloat !== undefined) {
							t.timefloat.hide();
						}
						t.globalUnbind('.dur');
					});
				}
			})
			.bind('mouseenter', function (e) {
				mouseIsOver = true;
				t.globalBind('mousemove.dur', function (e) {
					handleMouseMove(e);
				});
				if (t.timefloat !== undefined && !mejs.MediaFeatures.hasTouch) {
					t.timefloat.show();
				}
			})
			.bind('mouseleave', function (e) {
				mouseIsOver = false;
				if (!mouseIsDown) {
					t.globalUnbind('.dur');
					if (t.timefloat !== undefined) {
						t.timefloat.hide();
					}
				}
			});

			// loading
			media.addEventListener('progress', function (e) {
				player.setProgressRail(e);
				player.setCurrentRail(e);
			}, false);

			// current time
			media.addEventListener('timeupdate', function (e) {
				player.setProgressRail(e);
				player.setCurrentRail(e);
				updateSlider(e);
			}, false);

			t.container.on('controlsresize', function (e) {
				player.setProgressRail(e);
				player.setCurrentRail(e);
			});
		},

		/**
		 * Calculate the progress on the media and update progress bar's width
		 *
		 * @param {Event} e
		 */
		setProgressRail: function (e) {

			var
				t = this,
				target = (e !== undefined) ? e.target : t.media,
				percent = null;

			// newest HTML5 spec has buffered array (FF4, Webkit)
			if (target && target.buffered && target.buffered.length > 0 && target.buffered.end && target.duration) {
				// account for a real array with multiple values - always read the end of the last buffer
				percent = target.buffered.end(target.buffered.length - 1) / target.duration;
			}
			// Some browsers (e.g., FF3.6 and Safari 5) cannot calculate target.bufferered.end()
			// to be anything other than 0. If the byte count is available we use this instead.
			// Browsers that support the else if do not seem to have the bufferedBytes value and
			// should skip to there. Tested in Safari 5, Webkit head, FF3.6, Chrome 6, IE 7/8.
			else if (target && target.bytesTotal !== undefined && target.bytesTotal > 0 && target.bufferedBytes !== undefined) {
				percent = target.bufferedBytes / target.bytesTotal;
			}
			// Firefox 3 with an Ogg file seems to go this way
			else if (e && e.lengthComputable && e.total !== 0) {
				percent = e.loaded / e.total;
			}

			// finally update the progress bar
			if (percent !== null) {
				percent = Math.min(1, Math.max(0, percent));
				// update loaded bar
				if (t.loaded && t.total) {
					t.loaded.width((percent * 100) + '%');
				}
			}
		},
		/**
		 * Update the slider's width depending on the current time
		 *
		 */
		setCurrentRail: function () {

			var t = this;

			if (t.media.currentTime !== undefined && t.media.duration) {

				// update bar and handle
				if (t.total && t.handle) {
					var
						newWidth = Math.round(t.total.width() * t.media.currentTime / t.media.duration),
						handlePos = newWidth - Math.round(t.handle.outerWidth(true) / 2);

					newWidth = (t.media.currentTime / t.media.duration) * 100;
					t.current.width(newWidth + '%');
					t.handle.css('left', handlePos);
				}
			}

		}
	});
})(mejs.$);

/**
 * Current/duration times
 *
 * This feature creates/updates the duration and progress times in the control bar, based on native events.
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * The initial duration
		 * @type {Number}
		 */
		duration: 0,
		/**
		 * @type {String}
		 */
		timeAndDurationSeparator: '<span> | </span>'
	});


	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Current time constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildcurrent: function(player, controls, layers, media) {
			var t = this;
			
			$('<div class="mejs-time" role="timer" aria-live="off">' +
					'<span class="mejs-currenttime">' + 
						mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours) +
                    '</span>'+
				'</div>')
			.appendTo(controls);
			
			t.currenttime = t.controls.find('.mejs-currenttime');

			media.addEventListener('timeupdate',function() {
				if (t.controlsAreVisible) {
					player.updateCurrent();
				}

			}, false);
		},

		/**
		 * Duration time constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildduration: function(player, controls, layers, media) {
			var t = this;
			
			if (controls.children().last().find('.mejs-currenttime').length > 0) {
				$(t.options.timeAndDurationSeparator +
					'<span class="mejs-duration">' + 
						mejs.Utility.secondsToTimeCode(t.options.duration, t.options.alwaysShowHours) +
					'</span>')
					.appendTo(controls.find('.mejs-time'));
			} else {

				// add class to current time
				controls.find('.mejs-currenttime').parent().addClass('mejs-currenttime-container');
				
				$('<div class="mejs-time mejs-duration-container">'+
					'<span class="mejs-duration">' + 
						mejs.Utility.secondsToTimeCode(t.options.duration, t.options.alwaysShowHours) +
					'</span>' +
				'</div>')
				.appendTo(controls);
			}
			
			t.durationD = t.controls.find('.mejs-duration');

			media.addEventListener('timeupdate',function() {
				if (t.controlsAreVisible) {
					player.updateDuration();
				}
			}, false);
		},

		/**
		 * Update the current time and output it in format 00:00
		 *
		 */
		updateCurrent:  function() {
			var t = this;
			
			var currentTime = t.media.currentTime;
			
			if (isNaN(currentTime)) {
				currentTime = 0;
			}

			if (t.currenttime) {
				t.currenttime.html(mejs.Utility.secondsToTimeCode(currentTime, t.options.alwaysShowHours));
			}
		},

		/**
		 * Update the duration time and output it in format 00:00
		 *
		 */
		updateDuration: function() {
			var t = this;
			
			var duration = t.media.duration;

			if (isNaN(duration) || duration == Infinity || duration < 0) {
				t.media.duration = t.options.duration = duration = 0;
			}

			if (t.options.duration > 0) {
				duration = t.options.duration;
			}

			//Toggle the long video class if the video is longer than an hour.
			t.container.toggleClass("mejs-long-video", duration > 3600);
			
			if (t.durationD && duration > 0) {
				t.durationD.html(mejs.Utility.secondsToTimeCode(duration, t.options.alwaysShowHours));
			}		
		}
	});

})(mejs.$);

/**
 * Volume button
 *
 * This feature enables the displaying of a Volume button in the control bar, and also contains logic to manipulate its
 * events, such as sliding up/down (or left/right, if vertical), muting/unmuting media, etc.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {String}
		 */
		muteText: mejs.i18n.t('mejs.mute-toggle'),
		/**
		 * @type {String}
		 */
		allyVolumeControlText: mejs.i18n.t('mejs.volume-help-text'),
		/**
		 * @type {Boolean}
		 */
		hideVolumeOnTouchDevices: true,
		/**
		 * @type {String}
		 */
		audioVolume: 'horizontal',
		/**
		 * @type {String}
		 */
		videoVolume: 'vertical'
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 * @public
		 */
		buildvolume: function (player, controls, layers, media) {

			// Android and iOS don't support volume controls
			if ((mejs.MediaFeatures.isAndroid || mejs.MediaFeatures.isiOS) && this.options.hideVolumeOnTouchDevices)
				return;

			var t = this,
				mode = (t.isVideo) ? t.options.videoVolume : t.options.audioVolume,
				mute = (mode === 'horizontal') ?

					// horizontal version
					$('<div class="mejs-button mejs-volume-button mejs-mute">' +
						'<button type="button" aria-controls="' + t.id +
						'" title="' + t.options.muteText +
						'" aria-label="' + t.options.muteText +
						'"></button>' +
						'</div>' +
						'<a href="javascript:void(0);" class="mejs-horizontal-volume-slider">' + // outer background
						'<span class="mejs-offscreen">' + t.options.allyVolumeControlText + '</span>' +
						'<div class="mejs-horizontal-volume-total"></div>' + // line background
						'<div class="mejs-horizontal-volume-current"></div>' + // current volume
						'<div class="mejs-horizontal-volume-handle"></div>' + // handle
						'</a>'
					)
					.appendTo(controls) :

					// vertical version
					$('<div class="mejs-button mejs-volume-button mejs-mute">' +
						'<button type="button" aria-controls="' + t.id +
						'" title="' + t.options.muteText +
						'" aria-label="' + t.options.muteText +
						'"></button>' +
						'<a href="javascript:void(0);" class="mejs-volume-slider">' + // outer background
						'<span class="mejs-offscreen">' + t.options.allyVolumeControlText + '</span>' +
						'<div class="mejs-volume-total"></div>' + // line background
						'<div class="mejs-volume-current"></div>' + // current volume
						'<div class="mejs-volume-handle"></div>' + // handle
						'</a>' +
						'</div>')
					.appendTo(controls),
				volumeSlider = t.container.find('.mejs-volume-slider, .mejs-horizontal-volume-slider'),
				volumeTotal = t.container.find('.mejs-volume-total, .mejs-horizontal-volume-total'),
				volumeCurrent = t.container.find('.mejs-volume-current, .mejs-horizontal-volume-current'),
				volumeHandle = t.container.find('.mejs-volume-handle, .mejs-horizontal-volume-handle'),

				/**
				 * @private
				 * @param {Number} volume
				 * @param {Boolean} secondTry
				 */
				positionVolumeHandle = function (volume, secondTry) {

					if (!volumeSlider.is(':visible') && secondTry === undefined) {
						volumeSlider.show();
						positionVolumeHandle(volume, true);
						volumeSlider.hide();
						return;
					}

					// correct to 0-1
					volume = Math.max(0, volume);
					volume = Math.min(volume, 1);

					// adjust mute button style
					if (volume === 0) {
						mute.removeClass('mejs-mute').addClass('mejs-unmute');
						mute.children('button').attr('title', mejs.i18n.t('mejs.unmute')).attr('aria-label', mejs.i18n.t('mejs.unmute'));
					} else {
						mute.removeClass('mejs-unmute').addClass('mejs-mute');
						mute.children('button').attr('title', mejs.i18n.t('mejs.mute')).attr('aria-label', mejs.i18n.t('mejs.mute'));
					}

					// top/left of full size volume slider background
					var totalPosition = volumeTotal.position();

					// position slider
					if (mode === 'vertical') {
						var
							// height of the full size volume slider background
							totalHeight = volumeTotal.height(),

							// the new top position based on the current volume
							// 70% volume on 100px height == top:30px
							newTop = totalHeight - (totalHeight * volume);

						// handle
						volumeHandle.css('top', Math.round(totalPosition.top + newTop - (volumeHandle.height() / 2)));

						// show the current visibility
						volumeCurrent.height(totalHeight - newTop);
						volumeCurrent.css('top', totalPosition.top + newTop);
					} else {
						var
							// height of the full size volume slider background
							totalWidth = volumeTotal.width(),

							// the new left position based on the current volume
							newLeft = totalWidth * volume;

						// handle
						volumeHandle.css('left', Math.round(totalPosition.left + newLeft - (volumeHandle.width() / 2)));

						// resize the current part of the volume bar
						volumeCurrent.width(Math.round(newLeft));
					}
				},
				/**
				 * @private
				 */
				handleVolumeMove = function (e) {

					var
						volume = null,
						totalOffset = volumeTotal.offset()
					;

					// calculate the new volume based on the most recent position
					if (mode === 'vertical') {

						var
							railHeight = volumeTotal.height(),
							newY = e.pageY - totalOffset.top
						;

						volume = (railHeight - newY) / railHeight;

						// the controls just hide themselves (usually when mouse moves too far up)
						if (totalOffset.top === 0 || totalOffset.left === 0) {
							return;
						}

					} else {
						var
							railWidth = volumeTotal.width(),
							newX = e.pageX - totalOffset.left
						;

						volume = newX / railWidth;
					}

					// ensure the volume isn't outside 0-1
					volume = Math.max(0, volume);
					volume = Math.min(volume, 1);

					// position the slider and handle
					positionVolumeHandle(volume);

					// set the media object (this will trigger the `volumechanged` event)
					if (volume === 0) {
						media.setMuted(true);
					} else {
						media.setMuted(false);
					}
					media.setVolume(volume);
				},
				mouseIsDown = false,
				mouseIsOver = false;

			// SLIDER
			mute.hover(function () {
				volumeSlider.show();
				mouseIsOver = true;
			}, function () {
				mouseIsOver = false;

				if (!mouseIsDown && mode === 'vertical') {
					volumeSlider.hide();
				}
			});

			/**
			 * @private
			 */
			var updateVolumeSlider = function () {

				var volume = Math.floor(media.volume * 100);

				volumeSlider.attr({
					'aria-label': mejs.i18n.t('mejs.volume-slider'),
					'aria-valuemin': 0,
					'aria-valuemax': 100,
					'aria-valuenow': volume,
					'aria-valuetext': volume + '%',
					'role': 'slider',
					'tabindex': 0
				});

			};

			// Events
			volumeSlider
				.bind('mouseover', function () {
					mouseIsOver = true;
				})
				.bind('mousedown', function (e) {
					handleVolumeMove(e);
					t.globalBind('mousemove.vol', function (e) {
						handleVolumeMove(e);
					});
					t.globalBind('mouseup.vol', function () {
						mouseIsDown = false;
						t.globalUnbind('.vol');

						if (!mouseIsOver && mode === 'vertical') {
							volumeSlider.hide();
						}
					});
					mouseIsDown = true;

					return false;
				})
				.bind('keydown', function (e) {

					if (t.options.keyActions.length) {
						var
							keyCode = e.keyCode,
							volume = media.volume
							;
						switch (keyCode) {
							case 38: // Up
								volume = Math.min(volume + 0.1, 1);
								break;
							case 40: // Down
								volume = Math.max(0, volume - 0.1);
								break;
							default:
								return true;
						}

						mouseIsDown = false;
						positionVolumeHandle(volume);
						media.setVolume(volume);
						return false;
					}
				});

			// MUTE button
			mute.find('button').click(function () {
				media.setMuted(!media.muted);
			});

			//Keyboard input
			mute.find('button').on('focus', function () {
				volumeSlider.show();
			}).on('blur', function () {
				volumeSlider.hide();
			});

			// listen for volume change events from other sources
			media.addEventListener('volumechange', function (e) {
				if (!mouseIsDown) {
					if (media.muted) {
						positionVolumeHandle(0);
						mute.removeClass('mejs-mute').addClass('mejs-unmute');
					} else {
						positionVolumeHandle(media.volume);
						mute.removeClass('mejs-unmute').addClass('mejs-mute');
					}
				}
				updateVolumeSlider(e);
			}, false);

			// mutes the media and sets the volume icon muted if the initial volume is set to 0
			if (player.options.startVolume === 0) {
				media.setMuted(true);
			}

			// shim gets the startvolume as a parameter, but we have to set it on the native <video> and <audio> elements
			var isNative = t.media.rendererName !== null && t.media.rendererName.match(/(native|html5)/);

			if (isNative) {
				media.setVolume(player.options.startVolume);
			}

			t.container.on('controlsresize', function () {
				if (media.muted) {
					positionVolumeHandle(0);
					mute.removeClass('mejs-mute').addClass('mejs-unmute');
				} else {
					positionVolumeHandle(media.volume);
					mute.removeClass('mejs-unmute').addClass('mejs-mute');
				}
			});
		}
	});

})(mejs.$);

/**
 * Fullscreen button
 *
 * This feature creates a button to toggle fullscreen on video; it considers a variety of possibilities when dealing with it
 * since it is not consistent across browsers. It also accounts for triggering the event through Flash shim.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {Boolean}
		 */
		usePluginFullScreen: true,
		/**
		 * @type {String}
		 */
		fullscreenText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * @type {Boolean}
		 */
		isFullScreen: false,
		/**
		 * @type {Boolean}
		 */
		isNativeFullScreen: false,
		/**
		 * @type {Boolean}
		 */
		isInIframe: false,
		/**
		 * @type {Boolean}
		 */
		isPluginClickThroughCreated: false,
		/**
		 * Possible modes
		 * (1) 'native-native'  HTML5 video  + browser fullscreen (IE10+, etc.)
		 * (2) 'plugin-native'  plugin video + browser fullscreen (fails in some versions of Firefox)
		 * (3) 'fullwindow'     Full window (retains all UI)
		 * (4) 'plugin-click'   Flash 1 - click through with pointer events
		 * (5) 'plugin-hover'   Flash 2 - hover popup in flash (IE6-8)
		 *
		 * @type {String}
		 */
		fullscreenMode: '',
		/**
		 *
		 */
		containerSizeTimeout: null,

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildfullscreen: function (player, controls, layers, media) {

			if (!player.isVideo)
				return;

			player.isInIframe = (window.location != window.parent.location);

			// detect on start
			media.addEventListener('loadstart', function () {
				player.detectFullscreenMode();
			});

			// build button
			var t = this,
				hideTimeout = null,
				fullscreenTitle = t.options.fullscreenText ? t.options.fullscreenText : mejs.i18n.t('mejs.fullscreen'),
				fullscreenBtn =
					$('<div class="mejs-button mejs-fullscreen-button">' +
						'<button type="button" aria-controls="' + t.id + '" title="' + fullscreenTitle + '" aria-label="' + fullscreenTitle + '"></button>' +
						'</div>')
					.appendTo(controls)
					.on('click', function () {

						// toggle fullscreen
						var isFullScreen = (mejs.MediaFeatures.hasTrueNativeFullScreen && mejs.MediaFeatures.isFullScreen()) || player.isFullScreen;

						if (isFullScreen) {
							player.exitFullScreen();
						} else {
							player.enterFullScreen();
						}
					})
					.on('mouseover', function () {

						// very old browsers with a plugin
						if (t.fullscreenMode === 'plugin-hover') {
							if (hideTimeout !== null) {
								clearTimeout(hideTimeout);
								hideTimeout = null;
							}

							var buttonPos = fullscreenBtn.offset(),
								containerPos = player.container.offset();

							media.positionFullscreenButton(buttonPos.left - containerPos.left, buttonPos.top - containerPos.top, true);
						}

					})
					.on('mouseout', function () {

						if (t.fullscreenMode === 'plugin-hover') {
							if (hideTimeout !== null) {
								clearTimeout(hideTimeout);
							}

							hideTimeout = setTimeout(function () {
								media.hideFullscreenButton();
							}, 1500);
						}

					});


			player.fullscreenBtn = fullscreenBtn;

			t.globalBind('keydown', function (e) {
				if (e.keyCode === 27 && ((mejs.MediaFeatures.hasTrueNativeFullScreen && mejs.MediaFeatures.isFullScreen()) || t.isFullScreen)) {
					player.exitFullScreen();
				}
			});

			t.normalHeight = 0;
			t.normalWidth = 0;

			// setup native fullscreen event
			if (mejs.MediaFeatures.hasTrueNativeFullScreen) {

				//
				/**
				 * Detect any changes on fullscreen
				 *
				 * Chrome doesn't always fire this in an `<iframe>`
				 * @private
				 */
				var fullscreenChanged = function () {
					if (player.isFullScreen) {
						if (mejs.MediaFeatures.isFullScreen()) {
							player.isNativeFullScreen = true;
							// reset the controls once we are fully in full screen
							player.setControlsSize();
						} else {
							player.isNativeFullScreen = false;
							// when a user presses ESC
							// make sure to put the player back into place
							player.exitFullScreen();
						}
					}
				};

				player.globalBind(mejs.MediaFeatures.fullScreenEventName, fullscreenChanged);
			}

		},

		/**
		 * Detect the type of fullscreen based on browser's capabilities
		 *
		 * @return {String}
		 */
		detectFullscreenMode: function () {

			var
				t = this,
				mode = '',
				features = mejs.MediaFeatures,
				isNative = t.media.rendererName !== null && t.media.rendererName.match(/(native|html5)/)
				;

			if (features.hasTrueNativeFullScreen && isNative) {
				mode = 'native-native';
			} else if (features.hasTrueNativeFullScreen && !isNative && !features.hasFirefoxPluginMovingProblem) {
				mode = 'plugin-native';
			} else if (t.usePluginFullScreen) {
				if (mejs.MediaFeatures.supportsPointerEvents) {
					mode = 'plugin-click';
					// this needs some special setup
					t.createPluginClickThrough();
				} else {
					mode = 'plugin-hover';
				}

			} else {
				mode = 'fullwindow';
			}


			t.fullscreenMode = mode;
			return mode;
		},

		/**
		 *
		 */
		createPluginClickThrough: function () {

			var t = this;

			// don't build twice
			if (t.isPluginClickThroughCreated) {
				return;
			}

			// allows clicking through the fullscreen button and controls down directly to Flash

			/*
			 When a user puts his mouse over the fullscreen button, we disable the controls so that mouse events can go down to flash (pointer-events)
			 We then put a divs over the video and on either side of the fullscreen button
			 to capture mouse movement and restore the controls once the mouse moves outside of the fullscreen button
			 */

			var fullscreenIsDisabled = false,
				restoreControls = function () {
					if (fullscreenIsDisabled) {
						// hide the hovers
						for (var i in hoverDivs) {
							hoverDivs[i].hide();
						}

						// restore the control bar
						t.fullscreenBtn.css('pointer-events', '');
						t.controls.css('pointer-events', '');

						// prevent clicks from pausing video
						t.media.removeEventListener('click', t.clickToPlayPauseCallback);

						// store for later
						fullscreenIsDisabled = false;
					}
				},
				hoverDivs = {},
				hoverDivNames = ['top', 'left', 'right', 'bottom'],
				i, len,
				positionHoverDivs = function () {
					var fullScreenBtnOffsetLeft = fullscreenBtn.offset().left - t.container.offset().left,
						fullScreenBtnOffsetTop = fullscreenBtn.offset().top - t.container.offset().top,
						fullScreenBtnWidth = fullscreenBtn.outerWidth(true),
						fullScreenBtnHeight = fullscreenBtn.outerHeight(true),
						containerWidth = t.container.width(),
						containerHeight = t.container.height();

					for (i in hoverDivs) {
						hoverDivs[i].css({position: 'absolute', top: 0, left: 0}); //, backgroundColor: '#f00'});
					}

					// over video, but not controls
					hoverDivs.top
					.width(containerWidth)
					.height(fullScreenBtnOffsetTop);

					// over controls, but not the fullscreen button
					hoverDivs.left
					.width(fullScreenBtnOffsetLeft)
					.height(fullScreenBtnHeight)
					.css({top: fullScreenBtnOffsetTop});

					// after the fullscreen button
					hoverDivs.right
					.width(containerWidth - fullScreenBtnOffsetLeft - fullScreenBtnWidth)
					.height(fullScreenBtnHeight)
					.css({
						top: fullScreenBtnOffsetTop,
						left: fullScreenBtnOffsetLeft + fullScreenBtnWidth
					});

					// under the fullscreen button
					hoverDivs.bottom
					.width(containerWidth)
					.height(containerHeight - fullScreenBtnHeight - fullScreenBtnOffsetTop)
					.css({top: fullScreenBtnOffsetTop + fullScreenBtnHeight});
				};

			t.globalBind('resize', function () {
				positionHoverDivs();
			});

			for (i = 0, len = hoverDivNames.length; i < len; i++) {
				hoverDivs[hoverDivNames[i]] = $('<div class="mejs-fullscreen-hover" />').appendTo(t.container).mouseover(restoreControls).hide();
			}

			// on hover, kill the fullscreen button's HTML handling, allowing clicks down to Flash
			fullscreenBtn.on('mouseover', function () {

				if (!t.isFullScreen) {

					var buttonPos = fullscreenBtn.offset(),
						containerPos = player.container.offset();

					// move the button in Flash into place
					media.positionFullscreenButton(buttonPos.left - containerPos.left, buttonPos.top - containerPos.top, false);

					// allows click through
					t.fullscreenBtn.css('pointer-events', 'none');
					t.controls.css('pointer-events', 'none');

					// restore click-to-play
					t.media.addEventListener('click', t.clickToPlayPauseCallback);

					// show the divs that will restore things
					for (i in hoverDivs) {
						hoverDivs[i].show();
					}

					positionHoverDivs();

					fullscreenIsDisabled = true;
				}

			});

			// restore controls anytime the user enters or leaves fullscreen
			media.addEventListener('fullscreenchange', function (e) {
				t.isFullScreen = !t.isFullScreen;
				// don't allow plugin click to pause video - messes with
				// plugin's controls
				if (t.isFullScreen) {
					t.media.removeEventListener('click', t.clickToPlayPauseCallback);
				} else {
					t.media.addEventListener('click', t.clickToPlayPauseCallback);
				}
				restoreControls();
			});


			// the mouseout event doesn't work on the fullscren button, because we already killed the pointer-events
			// so we use the document.mousemove event to restore controls when the mouse moves outside the fullscreen button

			t.globalBind('mousemove', function (e) {

				// if the mouse is anywhere but the fullsceen button, then restore it all
				if (fullscreenIsDisabled) {

					var fullscreenBtnPos = fullscreenBtn.offset();


					if (e.pageY < fullscreenBtnPos.top || e.pageY > fullscreenBtnPos.top + fullscreenBtn.outerHeight(true) ||
						e.pageX < fullscreenBtnPos.left || e.pageX > fullscreenBtnPos.left + fullscreenBtn.outerWidth(true)
					) {

						fullscreenBtn.css('pointer-events', '');
						t.controls.css('pointer-events', '');

						fullscreenIsDisabled = false;
					}
				}
			});


			t.isPluginClickThroughCreated = true;
		},
		/**
		 * Feature destructor.
		 *
		 * Always has to be prefixed with `clean` and the name that was used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 */
		cleanfullscreen: function (player) {
			player.exitFullScreen();
		},

		/**
		 *
		 */
		enterFullScreen: function () {

			var
				t = this,
				isNative = t.media.rendererName !== null && t.media.rendererName.match(/(html5|native)/)
				;

			if (mejs.MediaFeatures.isiOS && mejs.MediaFeatures.hasiOSFullScreen && typeof t.media.webkitEnterFullscreen === 'function') {
				t.media.webkitEnterFullscreen();
				return;
			}

			// set it to not show scroll bars so 100% will work
			$(document.documentElement).addClass('mejs-fullscreen');

			// store sizing
			t.normalHeight = t.container.height();
			t.normalWidth = t.container.width();


			// attempt to do true fullscreen
			if (t.fullscreenMode === 'native-native' || t.fullscreenMode === 'plugin-native') {

				mejs.MediaFeatures.requestFullScreen(t.container[0]);
				//return;

				if (t.isInIframe) {
					// sometimes exiting from fullscreen doesn't work
					// notably in Chrome <iframe>. Fixed in version 17
					setTimeout(function checkFullscreen() {

						if (t.isNativeFullScreen) {
							var percentErrorMargin = 0.002, // 0.2%
								windowWidth = $(window).width(),
								screenWidth = screen.width,
								absDiff = Math.abs(screenWidth - windowWidth),
								marginError = screenWidth * percentErrorMargin;

							// check if the video is suddenly not really fullscreen
							if (absDiff > marginError) {
								// manually exit
								t.exitFullScreen();
							} else {
								// test again
								setTimeout(checkFullscreen, 500);
							}
						}

					}, 1000);
				}

			} else if (t.fullscreeMode === 'fullwindow') {
				// move into position

			}

			// make full size
			t.container
			.addClass('mejs-container-fullscreen')
			.width('100%')
			.height('100%');

			// Only needed for safari 5.1 native full screen, can cause display issues elsewhere
			// Actually, it seems to be needed for IE8, too
			//if (mejs.MediaFeatures.hasTrueNativeFullScreen) {
			t.containerSizeTimeout = setTimeout(function () {
				t.container.css({width: '100%', height: '100%'});
				t.setControlsSize();
			}, 500);
			//}

			if (isNative) {
				t.$media
				.width('100%')
				.height('100%');
			} else {
				t.container.find('iframe, embed, object')
				.width('100%')
				.height('100%');

				if (t.options.setDimensions) {
					t.media.setSize(screen.width, screen.height);
				}
			}

			t.layers.children('div')
			.width('100%')
			.height('100%');

			if (t.fullscreenBtn) {
				t.fullscreenBtn
				.removeClass('mejs-fullscreen')
				.addClass('mejs-unfullscreen');
			}

			t.setControlsSize();
			t.isFullScreen = true;

			var zoomFactor = Math.min(screen.width / t.width, screen.height / t.height);
			t.container.find('.mejs-captions-text').css('font-size', zoomFactor * 100 + '%');
			t.container.find('.mejs-captions-text').css('line-height', 'normal');
			t.container.find('.mejs-captions-position').css('bottom', '45px');

			t.container.trigger('enteredfullscreen');
		},

		/**
		 *
		 */
		exitFullScreen: function () {

			var
				t = this,
				isNative = t.media.rendererName !== null && t.media.rendererName.match(/(native|html5)/)
				;

			// Prevent container from attempting to stretch a second time
			clearTimeout(t.containerSizeTimeout);

			// come out of native fullscreen
			if (mejs.MediaFeatures.hasTrueNativeFullScreen && (mejs.MediaFeatures.isFullScreen() || t.isFullScreen)) {
				mejs.MediaFeatures.cancelFullScreen();
			}

			// restore scroll bars to document
			$(document.documentElement).removeClass('mejs-fullscreen');

			t.container.removeClass('mejs-container-fullscreen');

			if (t.options.setDimensions) {
				t.container.width(t.normalWidth)
					.height(t.normalHeight);
				if (isNative) {
					t.$media
						.width(t.normalWidth)
						.height(t.normalHeight);
				} else {
					t.container.find('iframe, embed, object')
						.width(t.normalWidth)
						.height(t.normalHeight);

					t.media.setSize(t.normalWidth, t.normalHeight);
				}
				t.layers.children('div')
					.width(t.normalWidth)
					.height(t.normalHeight);
			}

			t.fullscreenBtn
			.removeClass('mejs-unfullscreen')
			.addClass('mejs-fullscreen');

			t.setControlsSize();
			t.isFullScreen = false;

			t.container.find('.mejs-captions-text').css('font-size','');
			t.container.find('.mejs-captions-text').css('line-height', '');
			t.container.find('.mejs-captions-position').css('bottom', '');

			t.container.trigger('exitedfullscreen');
		}
	});

})(mejs.$);

/**
 * Speed button
 *
 * This feature creates a button to speed media in different levels.
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * The speeds media can be accelerated
		 *
		 * Supports an array of float values or objects with format
		 * [{name: 'Slow', value: '0.75'}, {name: 'Normal', value: '1.00'}, ...]
		 * @type {{String[]|Object[]}}
		 */
		speeds: ['2.00', '1.50', '1.25', '1.00', '0.75'],
		/**
		 * @type {String}
		 */
		defaultSpeed: '1.00',
		/**
		 * @type {String}
		 */
		speedChar: 'x'

	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildspeed: function(player, controls, layers, media) {
			var
				t = this,
				isNative = t.media.rendererName !== null && t.media.rendererName.match(/(native|html5)/)
			;

			if (!isNative) {
				return;
			}

			var
				speedButton = null,
				speedSelector = null,
				playbackSpeed = null,
				inputId = null;

			var speeds = [];
			var defaultInArray = false;
			for (var i=0, len=t.options.speeds.length; i < len; i++) {
				var s = t.options.speeds[i];
				if (typeof(s) === 'string'){
					speeds.push({
						name: s + t.options.speedChar,
						value: s
					});
					if(s === t.options.defaultSpeed) {
						defaultInArray = true;
					}
				}
				else {
					speeds.push(s);
					if(s.value === t.options.defaultSpeed) {
						defaultInArray = true;
					}
				}
			}

			if (!defaultInArray) {
				speeds.push({
					name: t.options.defaultSpeed + t.options.speedChar,
					value: t.options.defaultSpeed
				});
			}

			speeds.sort(function(a, b) {
				return parseFloat(b.value) - parseFloat(a.value);
			});

			var getSpeedNameFromValue = function(value) {
				for(i=0,len=speeds.length; i <len; i++) {
					if (speeds[i].value === value) {
						return speeds[i].name;
					}
				}
			};

			var html = '<div class="mejs-button mejs-speed-button">' +
						'<button type="button">' + getSpeedNameFromValue(t.options.defaultSpeed) + '</button>' +
							'<div class="mejs-speed-selector">' +
								'<ul class="mejs-speed-selector-list">';

			for (i = 0, il = speeds.length; i<il; i++) {
				inputId = t.id + '-speed-' + speeds[i].value;
				html += '<li class="mejs-speed-selector-list-item">' +
							'<input class="mejs-speed-selector-input" ' +
								'type="radio" name="speed" ' +
								'value="' + speeds[i].value + '" ' +
								'id="' + inputId + '" ' +
								(speeds[i].value === t.options.defaultSpeed ? ' checked' : '') +
							' />' +
							'<label class="mejs-speed-selector-label" ' +
							 	'for="' + inputId + '" ' +
								(speeds[i].value === t.options.defaultSpeed ? ' class="mejs-speed-selected"' : '') +
								'>' + speeds[i].name +
							'</label>' +
						'</li>';
			}
			html += '</ul></div></div>';

			speedButton = $(html).appendTo(controls);
			speedSelector = speedButton.find('.mejs-speed-selector');

			playbackSpeed = t.options.defaultSpeed;

			media.addEventListener('loadedmetadata', function(e) {
				if (playbackSpeed) {
					media.playbackRate = parseFloat(playbackSpeed);
				}
			}, true);

			speedSelector
				.on('click', 'input[type="radio"]', function() {
					var newSpeed = $(this).attr('value');
					playbackSpeed = newSpeed;
					media.playbackRate = parseFloat(newSpeed);
					speedButton.find('button').html(getSpeedNameFromValue(newSpeed));
					speedButton.find('.mejs-speed-selected').removeClass('mejs-speed-selected');
					speedButton.find('input[type="radio"]:checked').next().addClass('mejs-speed-selected');
				});
			speedButton
				.one( 'mouseenter focusin', function() {
					speedSelector
						.height(
							speedButton.find('.mejs-speed-selector ul').outerHeight(true) +
							speedButton.find('.mejs-speed-translations').outerHeight(true))
						.css('top', (-1 * speedSelector.height()) + 'px');
				});
		}
	});

})(mejs.$);

/**
 * Closed Captions (CC) button
 *
 * This feature enables the displaying of a CC button in the control bar, and also contains the methods to start media
 * with a certain language (if available), toggle captions, etc.
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * Default language to start media using ISO 639-2 Language Code List (en, es, it, etc.)
		 * @see https://www.loc.gov/standards/iso639-2/php/code_list.php
		 * @type {String}
		 */
		startLanguage: '',
		/**
		 * @type {String}
		 */
		tracksText: '',
		/**
		 * Avoid to screen reader speak captions over an audio track.
		 *
		 * @type {Boolean}
		 */
		tracksAriaLive: false,
		/**
		 * Remove the [cc] button when no track nodes are present
		 * @type {Boolean}
		 */
		hideCaptionsButtonWhenEmpty: true,
		/**
		 * Change captions to pop-up if true and only one track node is found
		 * @type {Boolean}
		 */
		toggleCaptionsButtonWhenOnlyOne: false,
		/**
		 * @type {String}
		 */
		slidesSelector: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * @type {Boolean}
		 */
		hasChapters: false,

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildtracks: function(player, controls, layers, media) {
			if (player.tracks.length === 0) {
				return;
			}

			var
				t = this,
				attr = t.options.tracksAriaLive ? 'role="log" aria-live="assertive" aria-atomic="false"' : '',
				tracksTitle = t.options.tracksText ? t.options.tracksText : mejs.i18n.t('mejs.captions-subtitles'),
				i,
				kind
			;

			// If browser will do native captions, prefer mejs captions, loop through tracks and hide
			if (t.domNode.textTracks) {
				for (i = t.domNode.textTracks.length - 1; i >= 0; i--) {
					t.domNode.textTracks[i].mode = "hidden";
				}
			}

			t.cleartracks(player);
			player.chapters =
					$('<div class="mejs-chapters mejs-layer"></div>')
						.prependTo(layers).hide();
			player.captions =
					$('<div class="mejs-captions-layer mejs-layer"><div class="mejs-captions-position mejs-captions-position-hover" ' +
					attr + '><span class="mejs-captions-text"></span></div></div>')
						.prependTo(layers).hide();
			player.captionsText = player.captions.find('.mejs-captions-text');
			player.captionsButton =
					$('<div class="mejs-button mejs-captions-button">'+
						'<button type="button" aria-controls="' + t.id + '" title="' + tracksTitle + '" aria-label="' + tracksTitle + '"></button>'+
						'<div class="mejs-captions-selector">'+
							'<ul>'+
								'<li>'+
									'<input type="radio" name="' + player.id + '_captions" id="' + player.id + '_captions_none" value="none" checked="checked" />' +
									'<label for="' + player.id + '_captions_none">' + mejs.i18n.t('mejs.none') +'</label>'+
								'</li>'	+
							'</ul>'+
						'</div>'+
					'</div>')
						.appendTo(controls);


			var subtitleCount = 0;
			for (i=0; i<player.tracks.length; i++) {
				kind = player.tracks[i].kind;
				if (kind === 'subtitles' || kind === 'captions') {
					subtitleCount++;
				}
			}

			// if only one language then just make the button a toggle
			if (t.options.toggleCaptionsButtonWhenOnlyOne && subtitleCount === 1){
				// click
				player.captionsButton.on('click',function() {
					if (player.selectedTrack === null) {
						lang = player.tracks[0].srclang;
					} else {
						lang = 'none';
					}
					player.setTrack(lang);
				});
			} else {
				// hover or keyboard focus
				player.captionsButton.on( 'mouseenter focusin', function() {
					$(this).find('.mejs-captions-selector').removeClass('mejs-offscreen');
				})

				// handle clicks to the language radio buttons
				.on('click','input[type=radio]',function() {
					lang = this.value;
					player.setTrack(lang);
				});

				player.captionsButton.on( 'mouseleave focusout', function() {
					$(this).find(".mejs-captions-selector").addClass("mejs-offscreen");
				});

			}

			if (!player.options.alwaysShowControls) {
				// move with controls
				player.container
					.bind('controlsshown', function () {
						// push captions above controls
						player.container.find('.mejs-captions-position').addClass('mejs-captions-position-hover');

					})
					.bind('controlshidden', function () {
						if (!media.paused) {
							// move back to normal place
							player.container.find('.mejs-captions-position').removeClass('mejs-captions-position-hover');
						}
					});
			} else {
				player.container.find('.mejs-captions-position').addClass('mejs-captions-position-hover');
			}

			player.trackToLoad = -1;
			player.selectedTrack = null;
			player.isLoadingTrack = false;

			// add to list
			var total = player.tracks.length;

			for (i = 0; i < total; i++) {
				kind = player.tracks[i].kind;
				if (kind === 'subtitles' || kind === 'captions') {
					player.addTrackButton(player.tracks[i].srclang, player.tracks[i].label);
				}
			}

			// start loading tracks
			player.loadNextTrack();

			media.addEventListener('timeupdate',function() {
				player.displayCaptions();
			}, false);

			if (player.options.slidesSelector !== '') {
				player.slidesContainer = $(player.options.slidesSelector);

				media.addEventListener('timeupdate',function() {
					player.displaySlides();
				}, false);

			}

			media.addEventListener('loadedmetadata', function() {
				player.displayChapters();
			}, false);

			player.container.hover(
				function () {
					// chapters
					if (player.hasChapters) {
						player.chapters.removeClass('mejs-offscreen');
						player.chapters.fadeIn(200).height(player.chapters.find('.mejs-chapter').outerHeight());
					}
				},
				function () {
					if (player.hasChapters && !media.paused) {
						player.chapters.fadeOut(200, function() {
							$(this).addClass('mejs-offscreen');
							$(this).css('display','block');
						});
					}
				});

			t.container.on('controlsresize', function() {
				t.adjustLanguageBox();
			});

			// check for autoplay
			if (player.node.getAttribute('autoplay') !== null) {
				player.chapters.addClass('mejs-offscreen');
			}
		},

		/**
		 * Feature destructor.
		 *
		 * Always has to be prefixed with `clean` and the name that was used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 */
		cleartracks: function(player){
			if (player) {
				if (player.captions) {
					player.captions.remove();
				}
				if (player.chapters) {
					player.chapters.remove();
				}
				if (player.captionsText) {
					player.captionsText.remove();
				}
				if (player.captionsButton) {
					player.captionsButton.remove();
				}
			}
		},

		/**
		 *
		 * @param {String} lang
		 */
		setTrack: function(lang){

			var
				t = this,
				i
			;

			if (lang === 'none') {
				t.selectedTrack = null;
				t.captionsButton.removeClass('mejs-captions-enabled');
			} else {
				for (i=0; i<t.tracks.length; i++) {
					if (t.tracks[i].srclang === lang) {
						if (t.selectedTrack === null)
							t.captionsButton.addClass('mejs-captions-enabled');
						t.selectedTrack = t.tracks[i];
						t.captions.attr('lang', t.selectedTrack.srclang);
						t.displayCaptions();
						break;
					}
				}
			}
		},

		/**
		 *
		 */
		loadNextTrack: function() {
			var t = this;

			t.trackToLoad++;
			if (t.trackToLoad < t.tracks.length) {
				t.isLoadingTrack = true;
				t.loadTrack(t.trackToLoad);
			} else {
				// add done?
				t.isLoadingTrack = false;

				t.checkForTracks();
			}
		},

		/**
		 *
		 * @param index
		 */
		loadTrack: function(index){
			var
				t = this,
				track = t.tracks[index],
				after = function() {

					track.isLoaded = true;

					t.enableTrackButton(track.srclang, track.label);

					t.loadNextTrack();

				}
			;

			if (track.src !== undefined || track.src !== "") {
				$.ajax({
					url: track.src,
					dataType: "text",
					success: function(d) {

						// parse the loaded file
						if (typeof d == "string" && (/<tt\s+xml/ig).exec(d)) {
							track.entries = mejs.TrackFormatParser.dfxp.parse(d);
						} else {
							track.entries = mejs.TrackFormatParser.webvtt.parse(d);
						}

						after();

						if (track.kind == 'chapters') {
							t.media.addEventListener('play', function() {
								if (t.media.duration > 0) {
									t.displayChapters(track);
								}
							}, false);
						}

						if (track.kind == 'slides') {
							t.setupSlides(track);
						}
					},
					error: function() {
						t.removeTrackButton(track.srclang);
						t.loadNextTrack();
					}
				});
			}
		},

		/**
		 *
		 * @param {String} lang - The language code
		 * @param {String} label
		 */
		enableTrackButton: function(lang, label) {
			var t = this;

			if (label === '') {
				label = mejs.language.codes[lang] || lang;
			}

			t.captionsButton
				.find('input[value=' + lang + ']')
					.prop('disabled',false)
				.siblings('label')
					.html(label);

			// auto select
			if (t.options.startLanguage === lang) {
				$('#' + t.id + '_captions_' + lang).prop('checked', true).trigger('click');
			}

			t.adjustLanguageBox();
		},

		/**
		 *
		 * @param {String} lang
		 */
		removeTrackButton: function(lang) {
			var t = this;

			t.captionsButton.find('input[value=' + lang + ']').closest('li').remove();

			t.adjustLanguageBox();
		},

		/**
		 *
		 * @param {String} lang - The language code
		 * @param {String} label
		 */
		addTrackButton: function(lang, label) {
			var t = this;
			if (label === '') {
				label = mejs.language.codes[lang] || lang;
			}

			t.captionsButton.find('ul').append(
				$('<li>'+
					'<input type="radio" name="' + t.id + '_captions" id="' + t.id + '_captions_' + lang + '" value="' + lang + '" disabled="disabled" />' +
					'<label for="' + t.id + '_captions_' + lang + '">' + label + ' (loading)' + '</label>'+
				'</li>')
			);

			t.adjustLanguageBox();

			// remove this from the dropdownlist (if it exists)
			t.container.find('.mejs-captions-translations option[value=' + lang + ']').remove();
		},

		/**
		 *
		 */
		adjustLanguageBox:function() {
			var t = this;
			// adjust the size of the outer box
			t.captionsButton.find('.mejs-captions-selector').height(
				t.captionsButton.find('.mejs-captions-selector ul').outerHeight(true) +
				t.captionsButton.find('.mejs-captions-translations').outerHeight(true)
			);
		},

		/**
		 *
		 */
		checkForTracks: function() {
			var
				t = this,
				hasSubtitles = false
			;

			// check if any subtitles
			if (t.options.hideCaptionsButtonWhenEmpty) {
				for (var i=0; i<t.tracks.length; i++) {
					var kind = t.tracks[i].kind;
					if ((kind === 'subtitles' || kind === 'captions') && t.tracks[i].isLoaded) {
						hasSubtitles = true;
						break;
					}
				}

				if (!hasSubtitles) {
					t.captionsButton.hide();
					t.setControlsSize();
				}
			}
		},

		/**
		 *
		 */
		displayCaptions: function() {

			if (this.tracks === undefined)
				return;

			var
				t = this,
				i,
				track = t.selectedTrack
			;

			if (track !== null && track.isLoaded) {
				for (i=0; i<track.entries.times.length; i++) {
					if (t.media.currentTime >= track.entries.times[i].start && t.media.currentTime <= track.entries.times[i].stop) {
						// Set the line before the timecode as a class so the cue can be targeted if needed
						t.captionsText.html(track.entries.text[i]).attr('class', 'mejs-captions-text ' + (track.entries.times[i].identifier || ''));
						t.captions.show().height(0);
						return; // exit out if one is visible;
					}
				}
				t.captions.hide();
			} else {
				t.captions.hide();
			}
		},

		/**
		 *
		 * @param {HTMLElement} track
		 */
		setupSlides: function(track) {
			var t = this;

			t.slides = track;
			t.slides.entries.imgs = [t.slides.entries.text.length];
			t.showSlide(0);

		},

		/**
		 *
		 * @param {Number} index
		 */
		showSlide: function(index) {
			if (this.tracks === undefined || this.slidesContainer === undefined) {
				return;
			}

			var t = this,
				url = t.slides.entries.text[index],
				img = t.slides.entries.imgs[index];

			if (img === undefined || img.fadeIn === undefined) {

				t.slides.entries.imgs[index] = img = $('<img src="' + url + '">')
						.on('load', function() {
							img.appendTo(t.slidesContainer)
								.hide()
								.fadeIn()
								.siblings(':visible')
									.fadeOut();

						});

			} else {

				if (!img.is(':visible') && !img.is(':animated')) {

					//

					img.fadeIn()
						.siblings(':visible')
							.fadeOut();
				}
			}

		},

		/**
		 *
		 */
		displaySlides: function() {

			if (this.slides === undefined) {
				return;
			}

			var
				t = this,
				slides = t.slides,
				i
			;

			for (i=0; i<slides.entries.times.length; i++) {
				if (t.media.currentTime >= slides.entries.times[i].start && t.media.currentTime <= slides.entries.times[i].stop){

					t.showSlide(i);

					return; // exit out if one is visible;
				}
			}
		},

		/**
		 *
		 */
		displayChapters: function() {
			var
				t = this,
				i;

			for (i=0; i<t.tracks.length; i++) {
				if (t.tracks[i].kind === 'chapters' && t.tracks[i].isLoaded) {
					t.drawChapters(t.tracks[i]);
					t.hasChapters = true;
					break;
				}
			}
		},

		/**
		 *
		 * @param {Object} chapters
		 */
		drawChapters: function(chapters) {
			var
				t = this,
				i,
				dur,
				percent = 0,
				usedPercent = 0,
				total = chapters.entries.times.length
			;

			t.chapters.empty();

			for (i = 0; i<total; i++) {
				dur = chapters.entries.times[i].stop - chapters.entries.times[i].start;
				percent = Math.floor(dur / t.media.duration * 100);
				if (percent + usedPercent > 100 || // too large
					i === chapters.entries.times.length-1 && percent + usedPercent < 100) // not going to fill it in
					{
					percent = 100 - usedPercent;
				}
				//width = Math.floor(t.width * dur / t.media.duration);
				//left = Math.floor(t.width * chapters.entries.times[i].start / t.media.duration);
				//if (left + width > t.width) {
				//	width = t.width - left;
				//}

				t.chapters.append( $(
					'<div class="mejs-chapter" rel="' + chapters.entries.times[i].start + '" style="left: ' + usedPercent.toString() + '%;width: ' + percent.toString() + '%;">' +
						'<div class="mejs-chapter-block' + ((i==chapters.entries.times.length-1) ? ' mejs-chapter-block-last' : '') + '">' +
							'<span class="ch-title">' + chapters.entries.text[i] + '</span>' +
							'<span class="ch-time">' + mejs.Utility.secondsToTimeCode(chapters.entries.times[i].start, t.options.alwaysShowHours) + '&ndash;' + mejs.Utility.secondsToTimeCode(chapters.entries.times[i].stop, t.options.alwaysShowHours) + '</span>' +
						'</div>' +
					'</div>'));
				usedPercent += percent;
			}

			t.chapters.find('div.mejs-chapter').click(function() {
				t.media.setCurrentTime( parseFloat( $(this).attr('rel') ) );
				if (t.media.paused) {
					t.media.play();
				}
			});

			t.chapters.show();
		}
	});

	/**
	 * Map all possible languages with their respective code
	 *
	 * @constructor
	 */
	mejs.language = {
		codes:  {
			af: mejs.i18n.t('mejs.afrikaans'),
			sq: mejs.i18n.t('mejs.albanian'),
			ar: mejs.i18n.t('mejs.arabic'),
			be: mejs.i18n.t('mejs.belarusian'),
			bg: mejs.i18n.t('mejs.bulgarian'),
			ca: mejs.i18n.t('mejs.catalan'),
			zh: mejs.i18n.t('mejs.chinese'),
			'zh-cn': mejs.i18n.t('mejs.chinese-simplified'),
			'zh-tw': mejs.i18n.t('mejs.chines-traditional'),
			hr: mejs.i18n.t('mejs.croatian'),
			cs: mejs.i18n.t('mejs.czech'),
			da: mejs.i18n.t('mejs.danish'),
			nl: mejs.i18n.t('mejs.dutch'),
			en: mejs.i18n.t('mejs.english'),
			et: mejs.i18n.t('mejs.estonian'),
			fl: mejs.i18n.t('mejs.filipino'),
			fi: mejs.i18n.t('mejs.finnish'),
			fr: mejs.i18n.t('mejs.french'),
			gl: mejs.i18n.t('mejs.galician'),
			de: mejs.i18n.t('mejs.german'),
			el: mejs.i18n.t('mejs.greek'),
			ht: mejs.i18n.t('mejs.haitian-creole'),
			iw: mejs.i18n.t('mejs.hebrew'),
			hi: mejs.i18n.t('mejs.hindi'),
			hu: mejs.i18n.t('mejs.hungarian'),
			is: mejs.i18n.t('mejs.icelandic'),
			id: mejs.i18n.t('mejs.indonesian'),
			ga: mejs.i18n.t('mejs.irish'),
			it: mejs.i18n.t('mejs.italian'),
			ja: mejs.i18n.t('mejs.japanese'),
			ko: mejs.i18n.t('mejs.korean'),
			lv: mejs.i18n.t('mejs.latvian'),
			lt: mejs.i18n.t('mejs.lithuanian'),
			mk: mejs.i18n.t('mejs.macedonian'),
			ms: mejs.i18n.t('mejs.malay'),
			mt: mejs.i18n.t('mejs.maltese'),
			no: mejs.i18n.t('mejs.norwegian'),
			fa: mejs.i18n.t('mejs.persian'),
			pl: mejs.i18n.t('mejs.polish'),
			pt: mejs.i18n.t('mejs.portuguese'),
			ro: mejs.i18n.t('mejs.romanian'),
			ru: mejs.i18n.t('mejs.russian'),
			sr: mejs.i18n.t('mejs.serbian'),
			sk: mejs.i18n.t('mejs.slovak'),
			sl: mejs.i18n.t('mejs.slovenian'),
			es: mejs.i18n.t('mejs.spanish'),
			sw: mejs.i18n.t('mejs.swahili'),
			sv: mejs.i18n.t('mejs.swedish'),
			tl: mejs.i18n.t('mejs.tagalog'),
			th: mejs.i18n.t('mejs.thai'),
			tr: mejs.i18n.t('mejs.turkish'),
			uk: mejs.i18n.t('mejs.ukrainian'),
			vi: mejs.i18n.t('mejs.vietnamese'),
			cy: mejs.i18n.t('mejs.welsh'),
			yi: mejs.i18n.t('mejs.yiddish')
		}
	};

	/*
	Parses WebVTT format which should be formatted as
	================================
	WEBVTT

	1
	00:00:01,1 --> 00:00:05,000
	A line of text

	2
	00:01:15,1 --> 00:02:05,000
	A second line of text

	===============================

	Adapted from: http://www.delphiki.com/html5/playr
	*/
	mejs.TrackFormatParser = {
		webvtt: {
			/**
			 * @type {String}
			 */
			pattern_timecode: /^((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/,

			/**
			 *
			 * @param {String} trackText
			 * @returns {{text: Array, times: Array}}
			 */
			parse: function(trackText) {
				var
					i = 0,
					lines = mejs.TrackFormatParser.split2(trackText, /\r?\n/),
					entries = {text:[], times:[]},
					timecode,
					text,
					identifier;
				for(; i<lines.length; i++) {
					timecode = this.pattern_timecode.exec(lines[i]);

					if (timecode && i<lines.length) {
						if ((i - 1) >= 0 && lines[i - 1] !== '') {
							identifier = lines[i - 1];
						}
						i++;
						// grab all the (possibly multi-line) text that follows
						text = lines[i];
						i++;
						while(lines[i] !== '' && i<lines.length){
							text = text + '\n' + lines[i];
							i++;
						}
						text = $.trim(text).replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
						// Text is in a different array so I can use .join
						entries.text.push(text);
						entries.times.push(
						{
							identifier: identifier,
							start: (mejs.Utility.convertSMPTEtoSeconds(timecode[1]) === 0) ? 0.200 : mejs.Utility.convertSMPTEtoSeconds(timecode[1]),
							stop: mejs.Utility.convertSMPTEtoSeconds(timecode[3]),
							settings: timecode[5]
						});
					}
					identifier = '';
				}
				return entries;
			}
		},
		// Thanks to Justin Capella: https://github.com/johndyer/mediaelement/pull/420
		dfxp: {
			/**
			 *
			 * @param {String} trackText
			 * @returns {{text: Array, times: Array}}
			 */
			parse: function(trackText) {
				trackText = $(trackText).filter("tt");
				var
					i = 0,
					container = trackText.children("div").eq(0),
					lines = container.find("p"),
					styleNode = trackText.find("#" + container.attr("style")),
					styles,
					text,
					entries = {text:[], times:[]};


				if (styleNode.length) {
					var attributes = styleNode.removeAttr("id").get(0).attributes;
					if (attributes.length) {
						styles = {};
						for (i = 0; i < attributes.length; i++) {
							styles[attributes[i].name.split(":")[1]] = attributes[i].value;
						}
					}
				}

				for(i = 0; i<lines.length; i++) {
					var style;
					var _temp_times = {
						start: null,
						stop: null,
						style: null
					};
					if (lines.eq(i).attr("begin")) _temp_times.start = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i).attr("begin"));
					if (!_temp_times.start && lines.eq(i-1).attr("end")) _temp_times.start = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i-1).attr("end"));
					if (lines.eq(i).attr("end")) _temp_times.stop = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i).attr("end"));
					if (!_temp_times.stop && lines.eq(i+1).attr("begin")) _temp_times.stop = mejs.Utility.convertSMPTEtoSeconds(lines.eq(i+1).attr("begin"));
					if (styles) {
						style = "";
						for (var _style in styles) {
							style += _style + ":" + styles[_style] + ";";
						}
					}
					if (style) _temp_times.style = style;
					if (_temp_times.start === 0) _temp_times.start = 0.200;
					entries.times.push(_temp_times);
					text = $.trim(lines.eq(i).html()).replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
					entries.text.push(text);
				}
				return entries;
			}
		},
		/**
		 *
		 * @param {String} text
		 * @param {String} regex
		 * @returns {Array}
		 */
		split2: function (text, regex) {
			// normal version for compliant browsers
			// see below for IE fix
			return text.split(regex);
		}
	};

	// test for browsers with bad String.split method.
	if ('x\n\ny'.split(/\n/gi).length != 3) {
		// add super slow IE8 and below version
		mejs.TrackFormatParser.split2 = function(text, regex) {
			var
				parts = [],
				chunk = '',
				i;

			for (i=0; i<text.length; i++) {
				chunk += text.substring(i,i+1);
				if (regex.test(chunk)) {
					parts.push(chunk.replace(regex, ''));
					chunk = '';
				}
			}
			parts.push(chunk);
			return parts;
		};
	}

})(mejs.$);

/**
 * Loop button
 *
 * This feature creates a loop button in the control bar to toggle its behavior. It will restart media once finished
 * if activated
 */
(function($) {

	$.extend(MediaElementPlayer.prototype, {
		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildloop: function(player, controls, layers, media) {
			var 
				t = this,
				// create the loop button
				loop = 
				$('<div class="mejs-button mejs-loop-button ' + ((player.options.loop) ? 'mejs-loop-on' : 'mejs-loop-off') + '">' +
					'<button type="button" aria-controls="' + t.id + '" title="Toggle Loop" aria-label="Toggle Loop"></button>' +
				'</div>')
				// append it to the toolbar
				.appendTo(controls)
				// add a click toggle event
				.click(function() {
					player.options.loop = !player.options.loop;
					if (player.options.loop) {
						loop.removeClass('mejs-loop-off').addClass('mejs-loop-on');
					} else {
						loop.removeClass('mejs-loop-on').addClass('mejs-loop-off');
					}
				});
		}
	});
	
})(mejs.$);

/**
 * Source chooser button
 *
 * This feature creates a button to speed media in different levels.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {String}
		 */
		sourcechooserText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildsourcechooser: function (player, controls, layers, media) {

			var
				t = this,
				sourceTitle = t.options.sourcechooserText ? t.options.sourcechooserText : mejs.i18n.t('mejs.source-chooser'),
				hoverTimeout
			;

			// add to list
			var sources = [];

			for (var j in this.node.children) {
				var s = this.node.children[j];
				if (s.nodeName === 'SOURCE') {
					sources.push(s);
				}
			}

			if (sources.length <= 1) {
				return;
			}

			player.sourcechooserButton =
				$('<div class="mejs-button mejs-sourcechooser-button">' +
					'<button type="button" role="button" aria-haspopup="true" aria-owns="' + t.id + '" title="' + sourceTitle + '" aria-label="' + sourceTitle + '"></button>' +
					'<div class="mejs-sourcechooser-selector mejs-offscreen" role="menu" aria-expanded="false" aria-hidden="true">' +
					'<ul>' +
					'</ul>' +
					'</div>' +
					'</div>')
				.appendTo(controls)

				// hover
				.hover(function () {
					clearTimeout(hoverTimeout);
					player.showSourcechooserSelector();
				}, function () {
					hoverTimeout = setTimeout(function () {
						player.hideSourcechooserSelector();
					}, 500);
				})

				// keyboard menu activation
				.on('keydown', function (e) {
					var keyCode = e.keyCode;

					switch (keyCode) {
						case 32: // space
							if (!mejs.MediaFeatures.isFirefox) { // space sends the click event in Firefox
								player.showSourcechooserSelector();
							}
							$(this).find('.mejs-sourcechooser-selector')
							.find('input[type=radio]:checked').first().focus();
							break;
						case 13: // enter
							player.showSourcechooserSelector();
							$(this).find('.mejs-sourcechooser-selector')
							.find('input[type=radio]:checked').first().focus();
							break;
						case 27: // esc
							player.hideSourcechooserSelector();
							$(this).find('button').focus();
							break;
						default:
							return true;
					}
				})

				// close menu when tabbing away
				.on('focusout', mejs.Utility.debounce(function (e) { // Safari triggers focusout multiple times
					// Firefox does NOT support e.relatedTarget to see which element
					// just lost focus, so wait to find the next focused element
					setTimeout(function () {
						var parent = $(document.activeElement).closest('.mejs-sourcechooser-selector');
						if (!parent.length) {
							// focus is outside the control; close menu
							player.hideSourcechooserSelector();
						}
					}, 0);
				}, 100))

				// handle clicks to the source radio buttons
				.delegate('input[type=radio]', 'click', function () {
					// set aria states
					$(this).attr('aria-selected', true).attr('checked', 'checked');
					$(this).closest('.mejs-sourcechooser-selector').find('input[type=radio]').not(this).attr('aria-selected', 'false').removeAttr('checked');

					var src = this.value;

					if (media.currentSrc !== src) {
						var currentTime = media.currentTime;
						var paused = media.paused;
						media.pause();
						media.setSrc(src);
						media.load();

						media.addEventListener('loadedmetadata', function (e) {
							media.currentTime = currentTime;
						}, true);

						var canPlayAfterSourceSwitchHandler = function (e) {
							if (!paused) {
								media.play();
							}
							media.removeEventListener("canplay", canPlayAfterSourceSwitchHandler, true);
						};
						media.addEventListener('canplay', canPlayAfterSourceSwitchHandler, true);
						media.load();
					}
				})

				// Handle click so that screen readers can toggle the menu
				.delegate('button', 'click', function (e) {
					if ($(this).siblings('.mejs-sourcechooser-selector').hasClass('mejs-offscreen')) {
						player.showSourcechooserSelector();
						$(this).siblings('.mejs-sourcechooser-selector').find('input[type=radio]:checked').first().focus();
					} else {
						player.hideSourcechooserSelector();
					}
				});

			for (var i in sources) {
				var src = sources[i];
				if (src.type !== undefined && src.nodeName === 'SOURCE' && media.canPlayType !== null) {
					player.addSourceButton(src.src, src.title, src.type, media.src === src.src);
				}
			}

		},

		/**
		 *
		 * @param {String} src
		 * @param {String} label
		 * @param {String} type
		 * @param {Boolean} isCurrent
		 */
		addSourceButton: function (src, label, type, isCurrent) {
			var t = this;
			if (label === '' || label === undefined) {
				label = src;
			}
			type = type.split('/')[1];

			t.sourcechooserButton.find('ul').append(
				$('<li>' +
					'<input type="radio" name="' + t.id + '_sourcechooser" id="' + t.id + '_sourcechooser_' + label + type + '" role="menuitemradio" value="' + src + '" ' + (isCurrent ? 'checked="checked"' : '') + 'aria-selected="' + isCurrent + '"' + ' />' +
					'<label for="' + t.id + '_sourcechooser_' + label + type + '" aria-hidden="true">' + label + ' (' + type + ')</label>' +
					'</li>')
			);

			t.adjustSourcechooserBox();

		},

		/**
		 *
		 */
		adjustSourcechooserBox: function () {
			var t = this;
			// adjust the size of the outer box
			t.sourcechooserButton.find('.mejs-sourcechooser-selector').height(
				t.sourcechooserButton.find('.mejs-sourcechooser-selector ul').outerHeight(true)
			);
		},

		/**
		 *
		 */
		hideSourcechooserSelector: function () {

			var t = this;

			if (t.sourcechooserButton === undefined || !t.sourcechooserButton.find('.mejs-sourcechooser-selector').find('input[type=radio]').length) {
				return;
			}

			this.sourcechooserButton.find('.mejs-sourcechooser-selector')
			.addClass('mejs-offscreen')
			.attr('aria-expanded', 'false')
			.attr('aria-hidden', 'true')
			.find('input[type=radio]') // make radios not focusable
			.attr('tabindex', '-1');
		},

		/**
		 *
		 */
		showSourcechooserSelector: function () {

			var t = this;

			if (t.sourcechooserButton === undefined || !t.sourcechooserButton.find('.mejs-sourcechooser-selector').find('input[type=radio]').length) {
				return;
			}

			this.sourcechooserButton.find('.mejs-sourcechooser-selector')
			.removeClass('mejs-offscreen')
			.attr('aria-expanded', 'true')
			.attr('aria-hidden', 'false')
			.find('input[type=radio]')
			.attr('tabindex', '0');
		}
	});

})(mejs.$);

/*
* ContextMenu Plugin
* 
*
*/

(function($) {

$.extend(mejs.MepDefaults,
	{ 'contextMenuItems': [
		// demo of a fullscreen option
		{ 
			render: function(player) {
				
				// check for fullscreen plugin
				if (player.enterFullScreen === undefined)
					return null;
			
				if (player.isFullScreen) {
					return mejs.i18n.t('mejs.fullscreen-off');
				} else {
					return mejs.i18n.t('mejs.fullscreen-on');
				}
			},
			click: function(player) {
				if (player.isFullScreen) {
					player.exitFullScreen();
				} else {
					player.enterFullScreen();
				}
			}
		},
		// demo of a mute/unmute button
		{ 
			render: function(player) {
				if (player.media.muted) {
					return mejs.i18n.t('mejs.unmute');
				} else {
					return mejs.i18n.t('mejs.mute');
				}
			},
			click: function(player) {
				if (player.media.muted) {
					player.setMuted(false);
				} else {
					player.setMuted(true);
				}
			}
		},
		// separator
		{
			isSeparator: true
		},
		// demo of simple download video
		{ 
			render: function(player) {
				return mejs.i18n.t('mejs.download-video');
			},
			click: function(player) {
				window.location.href = player.media.currentSrc;
			}
		}	
	]}
);


	$.extend(MediaElementPlayer.prototype, {
		buildcontextmenu: function(player, controls, layers, media) {
			
			// create context menu
			player.contextMenu = $('<div class="mejs-contextmenu"></div>')
								.appendTo($('body'))
								.hide();
			
			// create events for showing context menu
			player.container.bind('contextmenu', function(e) {
				if (player.isContextMenuEnabled) {
					e.preventDefault();
					player.renderContextMenu(e.clientX-1, e.clientY-1);
					return false;
				}
			});
			player.container.bind('click', function() {
				player.contextMenu.hide();
			});	
			player.contextMenu.bind('mouseleave', function() {

				//
				player.startContextMenuTimer();
				
			});		
		},

		cleancontextmenu: function(player) {
			player.contextMenu.remove();
		},
		
		isContextMenuEnabled: true,
		enableContextMenu: function() {
			this.isContextMenuEnabled = true;
		},
		disableContextMenu: function() {
			this.isContextMenuEnabled = false;
		},
		
		contextMenuTimeout: null,
		startContextMenuTimer: function() {
			//
			
			var t = this;
			
			t.killContextMenuTimer();
			
			t.contextMenuTimer = setTimeout(function() {
				t.hideContextMenu();
				t.killContextMenuTimer();
			}, 750);
		},
		killContextMenuTimer: function() {
			var timer = this.contextMenuTimer;
			
			//
			
			if (timer !== null && timer !== undefined) {
				clearTimeout(timer);
				timer = null;
			}
		},		
		
		hideContextMenu: function() {
			this.contextMenu.hide();
		},
		
		renderContextMenu: function(x,y) {
			
			// alway re-render the items so that things like "turn fullscreen on" and "turn fullscreen off" are always written correctly
			var t = this,
				html = '',
				items = t.options.contextMenuItems;
			
			for (var i=0, il=items.length; i<il; i++) {
				
				if (items[i].isSeparator) {
					html += '<div class="mejs-contextmenu-separator"></div>';
				} else {
				
					var rendered = items[i].render(t);
				
					// render can return null if the item doesn't need to be used at the moment
					if (rendered !== null && rendered !== undefined) {
						html += '<div class="mejs-contextmenu-item" data-itemindex="' + i + '" id="element-' + (Math.random()*1000000) + '">' + rendered + '</div>';
					}
				}
			}
			
			// position and show the context menu
			t.contextMenu
				.empty()
				.append($(html))
				.css({top:y, left:x})
				.show();
				
			// bind events
			t.contextMenu.find('.mejs-contextmenu-item').each(function() {
							
				// which one is this?
				var $dom = $(this),
					itemIndex = parseInt( $dom.data('itemindex'), 10 ),
					item = t.options.contextMenuItems[itemIndex];
				
				// bind extra functionality?
				if (typeof item.show != 'undefined')
					item.show( $dom , t);
				
				// bind click action
				$dom.click(function() {			
					// perform click action
					if (typeof item.click != 'undefined')
						item.click(t);
					
					// close
					t.contextMenu.hide();				
				});				
			});	
			
			// stop the controls from hiding
			setTimeout(function() {
				t.killControlsTimer('rev3');	
			}, 100);
						
		}
	});
	
})(mejs.$);
/**
 * Skip back button
 *
 * This feature creates a button to rewind media a specific number of seconds.
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {Number}
		 */
		skipBackInterval: 30,
		/**
		 * @type {String}
		 */
		skipBackText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildskipback: function(player, controls, layers, media) {
			var
				t = this,
				defaultTitle = mejs.i18n.t('mejs.time-skip-back', t.options.skipBackInterval),
				skipTitle = t.options.skipBackText ? t.options.skipBackText.replace('%1', t.options.skipBackInterval) : defaultTitle,
				// create the loop button
				loop =
					$('<div class="mejs-button mejs-skip-back-button">' +
						'<button type="button" aria-controls="' + t.id + '" title="' + skipTitle + '" aria-label="' + skipTitle + '">' + t.options.skipBackInterval + '</button>' +
					'</div>')
					// append it to the toolbar
					.appendTo(controls)
					// add a click toggle event
					.click(function() {
						if (media.duration) {
							media.setCurrentTime(Math.max(media.currentTime - t.options.skipBackInterval, 0));
							$(this).find('button').blur();
						}
					});
		}
	});

})(mejs.$);

/**
 * Jump forward button
 *
 * This feature creates a button to forward media a specific number of seconds.
 */
(function ($) {
	// Jump forward button

	$.extend(mejs.MepDefaults, {
		/**
		 * @type {Number}
		 */
		jumpForwardInterval: 30,
		/**
		 * @type {String}
		 */
		jumpForwardText: ''
	});

	$.extend(MediaElementPlayer.prototype, {
		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildjumpforward: function (player, controls, layers, media) {
			var
				t = this,
				defaultTitle = mejs.i18n.t('mejs.time-jump-forward', t.options.jumpForwardInterval),
				forwardTitle = t.options.jumpForwardText ? t.options.jumpForwardText.replace('%1', t.options.jumpForwardInterval) : defaultTitle,
				// create the loop button
				loop =
					$('<div class="mejs-button mejs-jump-forward-button">' +
						'<button type="button" aria-controls="' + t.id + '" title="' + forwardTitle + '" aria-label="' + forwardTitle + '">' + t.options.jumpForwardInterval + '</button>' +
						'</div>')
					// append it to the toolbar
					.appendTo(controls)
					// add a click toggle event
					.click(function () {
						if (media.duration) {
							media.setCurrentTime(Math.min(media.currentTime + t.options.jumpForwardInterval, media.duration));
							$(this).find('button').blur();
						}
					});
		}
	});

})(mejs.$);

/**
 * Postroll plugin
 *
 * This feature allows the injection of any HTML content in an independent layer once the media finished.
 * To activate it, one of the nodes contained in the `<video>` tag must be
 * `<link href="/path/to/action_to_display_content" rel="postroll">`
 */
(function($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * @type {String}
		 */
		postrollCloseText: ''
	});

	$.extend(MediaElementPlayer.prototype, {

		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildpostroll: function(player, controls, layers, media) {
			var
				t = this,
				postrollTitle = t.options.postrollCloseText ? t.options.postrollCloseText : mejs.i18n.t('mejs.close'),
				postrollLink = t.container.find('link[rel="postroll"]').attr('href');

			if (postrollLink !== undefined) {
				player.postroll =
					$('<div class="mejs-postroll-layer mejs-layer"><a class="mejs-postroll-close" onclick="$(this).parent().hide();return false;">' + postrollTitle + '</a><div class="mejs-postroll-layer-content"></div></div>').prependTo(layers).hide();

				t.media.addEventListener('ended', function (e) {
					$.ajax({
						dataType: 'html',
						url: postrollLink,
						success: function (data, textStatus) {
							layers.find('.mejs-postroll-layer-content').html(data);
						}
					});
					player.postroll.show();
				}, false);
			}
		}
	});

})(mejs.$);
/**
 * Markers plugin
 *
 * This feature allows you to add Visual Cues in the progress time rail.
 * This plugin also lets you register a custom callback function that will be called every time the play position reaches a marker.
 * Marker position and a reference to the MediaElement Player object is passed to the registered callback function for
 * any post processing. Marker color is configurable.
 */
(function ($) {

	// Feature configuration
	$.extend(mejs.MepDefaults, {
		/**
		 * Default marker color
		 * @type {String}
		 */
		markerColor: '#E9BC3D',
		/**
		 * @type {Number[]}
		 */
		markers: [],
		/**
		 * @type {Function}
		 */
		markerCallback: function () {
		}
	});

	$.extend(MediaElementPlayer.prototype, {
		/**
		 * Feature constructor.
		 *
		 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
		 * @param {MediaElementPlayer} player
		 * @param {$} controls
		 * @param {$} layers
		 * @param {HTMLElement} media
		 */
		buildmarkers: function (player, controls, layers, media) {
			var
				t = this,
				i = 0,
				currentPos = -1,
				currentMarker = -1,
				lastPlayPos = -1, //Track backward seek
				lastMarkerCallBack = -1; //Prevents successive firing of callbacks

			for (i = 0; i < player.options.markers.length; ++i) {
				controls.find('.mejs-time-total').append('<span class="mejs-time-marker"></span>');
			}

			media.addEventListener('durationchange', function (e) {
				player.setmarkers(controls);
			});
			media.addEventListener('timeupdate', function (e) {
				currentPos = Math.floor(media.currentTime);
				if (lastPlayPos > currentPos) {
					if (lastMarkerCallBack > currentPos) {
						lastMarkerCallBack = -1;
					}
				} else {
					lastPlayPos = currentPos;
				}

				for (i = 0; i < player.options.markers.length; ++i) {
					currentMarker = Math.floor(player.options.markers[i]);
					if (currentPos === currentMarker && currentMarker !== lastMarkerCallBack) {
						player.options.markerCallback(media, media.currentTime); //Fires the callback function
						lastMarkerCallBack = currentMarker;
					}
				}

			}, false);

		},
		/**
		 * Create markers in the progress bar
		 *
		 * @param {$} controls
		 */
		setmarkers: function (controls) {
			var t = this,
				i = 0,
				left;

			for (i = 0; i < t.options.markers.length; ++i) {
				if (Math.floor(t.options.markers[i]) <= t.media.duration && Math.floor(t.options.markers[i]) >= 0) {
					left = 100 * Math.floor(t.options.markers[i]) / t.media.duration;
					$(controls.find('.mejs-time-marker')[i]).css({
						"width": "1px",
						"left": left + "%",
						"background": t.options.markerColor
					});
				}
			}

		}
	});

})(mejs.$);