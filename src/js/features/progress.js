'use strict';

import document from 'global/document';
import {config} from '../player';
import MediaElementPlayer from '../player';
import i18n from '../core/i18n';
import {IS_FIREFOX, IS_IOS, IS_ANDROID, SUPPORT_PASSIVE_EVENT} from '../utils/constants';
import {secondsToTimeCode} from '../utils/time';
import {offset, addClass, removeClass, hasClass} from '../utils/dom';

/**
 * Progress/loaded bar
 *
 * This feature creates a progress bar with a slider in the control bar, and updates it based on native events.
 */

// Feature configuration
Object.assign(config, {
	/**
	 * Enable tooltip that shows time in progress bar
	 * @type {Boolean}
	 */
	enableProgressTooltip: true,

	/**
	 * Enable smooth behavior when hovering progress bar
	 * @type {Boolean}
	 */
	useSmoothHover: true,
	/**
	 * If set to `true`, the `Live Broadcast` message will be displayed no matter if `duration` is a valid number
	 */
	forceLive: false
});

Object.assign(MediaElementPlayer.prototype, {
	/**
	 * Feature constructor.
	 *
	 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
	 * @param {MediaElementPlayer} player
	 * @param {HTMLElement} controls
	 * @param {HTMLElement} layers
	 * @param {HTMLElement} media
	 */
	buildprogress (player, controls, layers, media)  {

		let
			lastKeyPressTime = 0,
			mouseIsDown = false,
			startedPaused = false
		;

		const
			t = this,
			autoRewindInitial = player.options.autoRewind,
			tooltip = player.options.enableProgressTooltip ?
				`<span class="${t.options.classPrefix}time-float">` +
					`<span class="${t.options.classPrefix}time-float-current">00:00</span>` +
					`<span class="${t.options.classPrefix}time-float-corner"></span>` +
				`</span>` : '',
			rail = document.createElement('div')
		;

		rail.className = `${t.options.classPrefix}time-rail`;
		rail.innerHTML = `<span class="${t.options.classPrefix}time-total ${t.options.classPrefix}time-slider">` +
			`<span class="${t.options.classPrefix}time-buffering"></span>` +
			`<span class="${t.options.classPrefix}time-loaded"></span>` +
			`<span class="${t.options.classPrefix}time-current"></span>` +
			`<span class="${t.options.classPrefix}time-hovered no-hover"></span>` +
			`<span class="${t.options.classPrefix}time-handle"><span class="${t.options.classPrefix}time-handle-content"></span></span>` +
			`${tooltip}` +
		`</span>`;

		t.addControlElement(rail, 'progress');

		t.options.keyActions.push({
			keys: [
				37, // LEFT
				227 // Google TV rewind
			],
			action: (player) => {
				if (!isNaN(player.duration) && player.duration > 0) {
					if (player.isVideo) {
						player.showControls();
						player.startControlsTimer();
					}

					var timeSlider = player.getElement(player.container).querySelector(`.${t.options.classPrefix}time-total`);
					if (timeSlider) {
						timeSlider.focus();
					}

					// 5%
					const newTime = Math.max(player.currentTime - player.options.defaultSeekBackwardInterval(player), 0);
					
					// pause to track current time
					if (!player.paused) {
						player.pause(true);
					}

					// make sure time is updated after 'pause' event is processed
					setTimeout(function() {
						player.setCurrentTime(newTime);
					}, 0);

					// start again to track new time
					setTimeout(function() {
						player.play(true);
					}, 0);
				}
			}
		},
		{
			keys: [
				39, // RIGHT
				228 // Google TV forward
			],
			action: (player) => {

				if (!isNaN(player.duration) && player.duration > 0) {
					if (player.isVideo) {
						player.showControls();
						player.startControlsTimer();
					}

					var timeSlider = player.getElement(player.container).querySelector(`.${t.options.classPrefix}time-total`);
					if (timeSlider) {
						timeSlider.focus();
					}

					// 5%
					const newTime = Math.min(player.currentTime + player.options.defaultSeekForwardInterval(player), player.duration);
					
					// pause to track current time
					if (!player.paused) {
						player.pause(true);
					}

					// make sure time is updated after 'pause' event is processed
					setTimeout(function() {
						player.setCurrentTime(newTime);
					}, 0);

					// start again to track new time
					setTimeout(function() {
						player.play(true);
					}, 0);
				}
			}
		});

		t.rail = controls.querySelector(`.${t.options.classPrefix}time-rail`);
		t.total = controls.querySelector(`.${t.options.classPrefix}time-total`);
		t.loaded = controls.querySelector(`.${t.options.classPrefix}time-loaded`);
		t.current = controls.querySelector(`.${t.options.classPrefix}time-current`);
		t.handle = controls.querySelector(`.${t.options.classPrefix}time-handle`);
		t.timefloat = controls.querySelector(`.${t.options.classPrefix}time-float`);
		t.timefloatcurrent = controls.querySelector(`.${t.options.classPrefix}time-float-current`);
		t.slider = controls.querySelector(`.${t.options.classPrefix}time-slider`);
		t.hovered = controls.querySelector(`.${t.options.classPrefix}time-hovered`);
		t.buffer = controls.querySelector(`.${t.options.classPrefix}time-buffering`);
		t.newTime = 0;
		t.forcedHandlePause = false;
		t.setTransformStyle = (element, value) => {
			element.style.transform = value;
			element.style.webkitTransform = value;
			element.style.MozTransform = value;
			element.style.msTransform = value;
			element.style.OTransform = value;
		};

		t.buffer.style.display = 'none';

		/**
		 *
		 * @private
		 * @param {Event} e
		 */
		let
			handleMouseMove = (e) => {
				const
					totalStyles = getComputedStyle(t.total),
					offsetStyles = offset(t.total),
					width = t.total.offsetWidth,
					transform = (() => {
						if (totalStyles.webkitTransform !== undefined) {
							return 'webkitTransform';
						} else if (totalStyles.mozTransform !== undefined) {
							return 'mozTransform ';
						} else if (totalStyles.oTransform !== undefined) {
							return 'oTransform';
						} else if (totalStyles.msTransform !== undefined) {
							return 'msTransform';
						} else {
							return 'transform';
						}
					})(),
					cssMatrix = (() => {
						if ('WebKitCSSMatrix' in window) {
							return 'WebKitCSSMatrix';
						} else if ('MSCSSMatrix' in window) {
							return 'MSCSSMatrix';
						} else if ('CSSMatrix' in window) {
							return 'CSSMatrix';
						}
					})()
				;

				let
					percentage = 0,
					leftPos = 0,
					pos = 0,
					x
				;

				// mouse or touch position relative to the object
				if (e.originalEvent && e.originalEvent.changedTouches) {
					x = e.originalEvent.changedTouches[0].pageX;
				} else if (e.changedTouches) { // for Zepto
					x = e.changedTouches[0].pageX;
				} else {
					x = e.pageX;
				}

				if (t.getDuration()) {
					if (x < offsetStyles.left) {
						x = offsetStyles.left;
					} else if (x > width + offsetStyles.left) {
						x = width + offsetStyles.left;
					}

					pos = x - offsetStyles.left;
					percentage = (pos / width);
					t.newTime = percentage * t.getDuration();

					// fake seek to where the mouse is
					if (mouseIsDown && t.getCurrentTime() !== null && t.newTime.toFixed(4) !== t.getCurrentTime().toFixed(4)) {
						t.setCurrentRailHandle(t.newTime);
						t.updateCurrent(t.newTime);
					}

					// position floating time box
					if (!IS_IOS && !IS_ANDROID) {
						if (pos < 0){
							pos = 0;
						}
						if (t.options.useSmoothHover && cssMatrix !== null && typeof window[cssMatrix] !== 'undefined') {
							const
								matrix = new window[cssMatrix](getComputedStyle(t.handle)[transform]),
								handleLocation = matrix.m41,
								hoverScaleX = pos/parseFloat(getComputedStyle(t.total).width) - handleLocation/parseFloat(getComputedStyle(t.total).width)
							;

							t.hovered.style.left = `${handleLocation}px`;
							t.setTransformStyle(t.hovered,`scaleX(${hoverScaleX})`);
							t.hovered.setAttribute('pos', pos);

							if (hoverScaleX >= 0) {
								removeClass(t.hovered, 'negative');
							} else {
								addClass(t.hovered, 'negative');
							}
						}

						// Add correct position of tooltip if rail is 100%
						if (t.timefloat) {
							const
								half = t.timefloat.offsetWidth / 2,
								offsetContainer = mejs.Utils.offset(t.getElement(t.container)),
								tooltipStyles = getComputedStyle(t.timefloat)
							;

							if ((x - offsetContainer.left) < t.timefloat.offsetWidth) {
								leftPos = half;
							} else if ((x - offsetContainer.left) >= t.getElement(t.container).offsetWidth - half) {
								leftPos = t.total.offsetWidth - half;
							} else {
								leftPos = pos;
							}

							if (hasClass(t.getElement(t.container), `${t.options.classPrefix}long-video`)) {
								leftPos += parseFloat(tooltipStyles.marginLeft)/2 + t.timefloat.offsetWidth/2;
							}

							t.timefloat.style.left = `${leftPos}px`;
							t.timefloatcurrent.innerHTML = secondsToTimeCode(t.newTime, player.options.alwaysShowHours, player.options.showTimecodeFrameCount, player.options.framesPerSecond, player.options.secondsDecimalLength, player.options.timeFormat);
							t.timefloat.style.display = 'block';
						}
					}
				} else if (!IS_IOS && !IS_ANDROID && t.timefloat) {
					leftPos = t.timefloat.offsetWidth + width >= t.getElement(t.container).offsetWidth ? t.timefloat.offsetWidth / 2 : 0;
					t.timefloat.style.left = leftPos + 'px';
					t.timefloat.style.left = `${leftPos}px`;
					t.timefloat.style.display = 'block';
				}
			},
			/**
			 * Update elements in progress bar for accessibility purposes only when player is paused.
			 *
			 * This is to avoid attempts to repeat the time over and over again when media is playing.
			 * @private
			 */
			updateSlider = () => {
				const
					seconds = t.getCurrentTime(),
					timeSliderText = i18n.t('mejs.time-slider'),
					time = secondsToTimeCode(seconds, player.options.alwaysShowHours, player.options.showTimecodeFrameCount, player.options.framesPerSecond, player.options.secondsDecimalLength, player.options.timeFormat),
					duration = t.getDuration()
				;

				t.slider.setAttribute('role', 'slider');
				t.slider.tabIndex = 0;

				if (media.paused) {
					t.slider.setAttribute('aria-label', timeSliderText);
					t.slider.setAttribute('aria-valuemin', 0);
					t.slider.setAttribute('aria-valuemax', isNaN(duration) ? 0 : duration);
					t.slider.setAttribute('aria-valuenow', seconds);
					t.slider.setAttribute('aria-valuetext', time);
				} else {
					t.slider.removeAttribute('aria-label');
					t.slider.removeAttribute('aria-valuemin');
					t.slider.removeAttribute('aria-valuemax');
					t.slider.removeAttribute('aria-valuenow');
					t.slider.removeAttribute('aria-valuetext');
				}
			},
			/**
			 *
			 * @private
			 */
			restartPlayer = () => {
				if (new Date() - lastKeyPressTime >= 1000) {
					t.play();
				}
			},
			handleMouseup = () => {
				if (mouseIsDown && t.getCurrentTime() !== null && t.newTime.toFixed(4) !== t.getCurrentTime().toFixed(4)) {
					t.setCurrentTime(t.newTime);
					t.setCurrentRailHandle(t.newTime);
					t.updateCurrent(t.newTime);
				}
				if (t.forcedHandlePause) {
					t.slider.focus();
					t.play(true);
				}
				t.forcedHandlePause = false;
			}
		;

		// Events
		t.slider.addEventListener('focus', () => {
			player.options.autoRewind = false;
		});
		t.slider.addEventListener('blur', () => {
			player.options.autoRewind = autoRewindInitial;
		});
		t.slider.addEventListener('keydown', (e) => {
			if ((new Date() - lastKeyPressTime) >= 1000) {
				startedPaused = t.paused;
			}

			if (t.options.enableKeyboard && t.options.keyActions.length) {

				const
					keyCode = e.which || e.keyCode || 0,
					duration = t.getDuration(),
					seekForward = player.options.defaultSeekForwardInterval(media),
					seekBackward = player.options.defaultSeekBackwardInterval(media)
				;

				let seekTime = t.getCurrentTime();
				const volume = t.getElement(t.container).querySelector(`.${t.options.classPrefix }volume-slider`);

				if (keyCode === 38 || keyCode === 40) {
					if (volume) {
						volume.style.display = 'block';
					}
					if (t.isVideo) {
						t.showControls();
						t.startControlsTimer();
					}

					const
						newVolume = keyCode === 38 ? Math.min(t.volume + 0.1, 1) : Math.max(t.volume - 0.1, 0),
						mutePlayer = newVolume <= 0
					;
					t.setVolume(newVolume);
					t.setMuted(mutePlayer);
					return;
				} else {
					if (volume) {
						volume.style.display = 'none';
					}
				}

				switch (keyCode) {
					case 37: // left
						if (t.getDuration() !== Infinity) {
							seekTime -= seekBackward;
						}
						break;
					case 39: // Right
						if (t.getDuration() !== Infinity) {
							seekTime += seekForward;
						}
						break;
					case 36: // Home
						seekTime = 0;
						break;
					case 35: // end
						seekTime = duration;
						break;
					case 13: // enter
					case 32: // space
						if (IS_FIREFOX) {
							if (t.paused) {
								t.play(true);
							} else {
								t.pause(true);
							}
						}
						return;
					default:
						return;
				}

				seekTime = seekTime < 0 || isNaN(seekTime) ? 0 : (seekTime >= duration ? duration : Math.floor(seekTime));
				lastKeyPressTime = new Date();
				if (!startedPaused) {
					player.pause(true);
				}

				// make sure time is updated after 'pause' event is processed
				setTimeout(function() {
					t.setCurrentTime(seekTime);
				}, 0);

				if (seekTime < t.getDuration() && !startedPaused) {
					setTimeout(restartPlayer, 1100);
				}

				player.showControls();

				e.preventDefault();
				e.stopPropagation();
			}
		});

		const events = ['mousedown', 'touchstart'];

		// Required to manipulate mouse movements that require drag 'n' drop properly
		t.slider.addEventListener('dragstart', () => false);

		for (let i = 0, total = events.length; i < total; i++) {
			t.slider.addEventListener(events[i], (e) => {
				t.forcedHandlePause = false;
				if (t.getDuration() !== Infinity) {
					// only handle left clicks or touch
					if (e.which === 1 || e.which === 0) {
						if (!t.paused) {
							t.pause(true);
							t.forcedHandlePause = true;
						}

						mouseIsDown = true;
						handleMouseMove(e);
						const endEvents = ['mouseup', 'touchend'];

						for (let j = 0, totalEvents = endEvents.length; j < totalEvents; j++) {
							t.getElement(t.container).addEventListener(endEvents[j], (event) => {
								const target = event.target;
								if (target === t.slider || target.closest(`.${t.options.classPrefix}time-slider`)) {
									handleMouseMove(event);
								}
							});
						}
						t.globalBind('mouseup.dur touchend.dur', () => {
							handleMouseup();
							mouseIsDown = false;
							if (t.timefloat) {
								t.timefloat.style.display = 'none';
							}
						});
					}
				}
			}, (SUPPORT_PASSIVE_EVENT && events[i] === 'touchstart') ? { passive: true } : false);
		}
		t.slider.addEventListener('mouseenter', (e) => {
			if (e.target === t.slider && t.getDuration() !== Infinity) {
				t.getElement(t.container).addEventListener('mousemove', (event) => {
					const target = event.target;
					if (target === t.slider || target.closest(`.${t.options.classPrefix}time-slider`)) {
						handleMouseMove(event);
					}
				});
				if (t.timefloat && !IS_IOS && !IS_ANDROID) {
					t.timefloat.style.display = 'block';
				}
				if (t.hovered && !IS_IOS && !IS_ANDROID && t.options.useSmoothHover) {
					removeClass(t.hovered, 'no-hover');
				}
			}
		});
		t.slider.addEventListener('mouseleave', () => {
			if (t.getDuration() !== Infinity) {
				if (!mouseIsDown) {
					if (t.timefloat) {
						t.timefloat.style.display = 'none';
					}
					if (t.hovered && t.options.useSmoothHover) {
						addClass(t.hovered, 'no-hover');
					}
				}
			}
		});

		// If media is does not have a finite duration, remove progress bar interaction
		// and indicate that is a live broadcast
		t.broadcastCallback = (e) => {
			const broadcast = controls.querySelector(`.${t.options.classPrefix}broadcast`);
			if (!t.options.forceLive && t.getDuration() !== Infinity) {
				if (broadcast) {
					t.slider.style.display = '';
					broadcast.remove();
				}

				player.setProgressRail(e);
				if (!t.forcedHandlePause) {
					player.setCurrentRail(e);
				}
				updateSlider();
			} else if (!broadcast && t.options.forceLive) {
				const label = document.createElement('span');
				label.className = `${t.options.classPrefix}broadcast`;
				label.innerText = i18n.t('mejs.live-broadcast');
				t.slider.style.display = 'none';
				t.rail.appendChild(label);
			}
		};

		media.addEventListener('progress', t.broadcastCallback);
		media.addEventListener('timeupdate', t.broadcastCallback);
		media.addEventListener('play', () => {
			t.buffer.style.display = 'none';
		});
		media.addEventListener('playing', () => {
			t.buffer.style.display = 'none';
		});
		media.addEventListener('seeking', () => {
			t.buffer.style.display = '';
		});
		media.addEventListener('seeked', () => {
			t.buffer.style.display = 'none';
		});
		media.addEventListener('pause', () => {
			t.buffer.style.display = 'none';
		});
		media.addEventListener('waiting', () => {
			t.buffer.style.display = '';
		});
		media.addEventListener('loadeddata', () => {
			t.buffer.style.display = '';
		});
		media.addEventListener('canplay', () => {
			t.buffer.style.display = 'none';
		});
		media.addEventListener('error', () => {
			t.buffer.style.display = 'none';
		});

		t.getElement(t.container).addEventListener('controlsresize', (e) => {
			if (t.getDuration() !== Infinity) {
				player.setProgressRail(e);
				if (!t.forcedHandlePause) {
					player.setCurrentRail(e);
				}
			}
		});
	},
	cleanprogress (player, controls, layers, media) {
		media.removeEventListener('progress', player.broadcastCallback);
		media.removeEventListener('timeupdate', player.broadcastCallback);
		if (player.rail) {
			player.rail.remove();
		}
	},
	/**
	 * Calculate the progress on the media and update progress bar's width
	 *
	 * @param {Event} e
	 */
	setProgressRail (e)  {
		const
			t = this,
			target = (e !== undefined) ? (e.detail.target || e.target) : t.media
		;

		let percent = null;

		// newest HTML5 spec has buffered array (FF4, Webkit)
		if (target && target.buffered && target.buffered.length > 0 && target.buffered.end && t.getDuration()) {
			// account for a real array with multiple values - always read the end of the last buffer
			percent = target.buffered.end(target.buffered.length - 1) / t.getDuration();
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
			if (t.loaded) {
				t.setTransformStyle(t.loaded,`scaleX(${percent})`);
			}
		}
	},
	/**
	 * Update the slider's width depending on the time assigned
	 *
	 * @param {Number} fakeTime
	 */
	setCurrentRailHandle (fakeTime) {
		const t = this;
		t.setCurrentRailMain(t, fakeTime);
	},
	/**
	 * Update the slider's width depending on the current time
	 *
	 */
	setCurrentRail () {
		const t = this;
		t.setCurrentRailMain(t);
	},
	/**
	 * Method that handles the calculation of the width of the rail.
	 *
	 * @param {MediaElementPlayer} t
	 * @param {?Number} fakeTime
	 */
	setCurrentRailMain (t, fakeTime) {
		if (t.getCurrentTime() !== undefined && t.getDuration()) {
			const nTime = (typeof fakeTime === 'undefined') ? t.getCurrentTime() : fakeTime;

			// update bar and handle
			if (t.total && t.handle) {
				const tW = parseFloat(getComputedStyle(t.total).width);

				let
					newWidth = Math.round(tW * nTime / t.getDuration()),
					handlePos = newWidth - Math.round(t.handle.offsetWidth / 2)
				;

				handlePos = (handlePos < 0) ? 0 : handlePos;
				t.setTransformStyle(t.current,`scaleX(${newWidth/tW})`);
				t.setTransformStyle(t.handle,`translateX(${handlePos}px)`);

				if (t.options.useSmoothHover && !hasClass(t.hovered, 'no-hover')) {
					let pos = parseInt(t.hovered.getAttribute('pos'), 10);
					pos = (isNaN(pos)) ? 0 : pos;

					const hoverScaleX = pos/tW - handlePos/tW;

					t.hovered.style.left = `${handlePos}px`;
					t.setTransformStyle(t.hovered,`scaleX(${hoverScaleX})`);

					if (hoverScaleX >= 0) {
						removeClass(t.hovered, 'negative');
					} else {
						addClass(t.hovered, 'negative');
					}
				}
			}
		}
	}
});
