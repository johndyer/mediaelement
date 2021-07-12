'use strict';

import document from 'global/document';
import {config} from '../player';
import MediaElementPlayer from '../player';
import i18n from '../core/i18n';
import {IS_ANDROID, IS_IOS} from '../utils/constants';
import {isString, createEvent} from '../utils/general';
import {addClass, removeClass, offset} from '../utils/dom';

/**
 * Volume button
 *
 * This feature enables the displaying of a Volume button in the control bar, and also contains logic to manipulate its
 * events, such as sliding up/down (or left/right, if vertical), muting/unmuting media, etc.
 */

// Feature configuration
Object.assign(config, {
	/**
	 * @type {?String}
	 */
	muteText: null,
	/**
	 * @type {?String}
	 */
	unmuteText: null,
	/**
	 * @type {?String}
	 */
	allyVolumeControlText: null,
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
	videoVolume: 'vertical',
	/**
	 * Initial volume when the player starts (overridden by user cookie)
	 * @type {Number}
	 */
	startVolume: 0.8
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
	buildvolume (player, controls, layers, media) {

		// Android and iOS don't support volume controls
		if ((IS_ANDROID || IS_IOS) && this.options.hideVolumeOnTouchDevices) {
			return;
		}

		const
			t = this,
			mode = (t.isVideo) ? t.options.videoVolume : t.options.audioVolume,
			muteText = isString(t.options.muteText) ? t.options.muteText : i18n.t('mejs.mute'),
			unmuteText = isString(t.options.unmuteText) ? t.options.unmuteText : i18n.t('mejs.unmute'),
			volumeControlText = isString(t.options.allyVolumeControlText) ? t.options.allyVolumeControlText : i18n.t('mejs.volume-help-text'),
			mute = document.createElement('div')
		;

		mute.className = `${t.options.classPrefix}button ${t.options.classPrefix}volume-button ${t.options.classPrefix}mute`;
		mute.innerHTML = mode === 'horizontal' ?
			`<button type="button" aria-controls="${t.id}" title="${muteText}" aria-label="${muteText}" tabindex="0"></button>` :
			`<button type="button" aria-controls="${t.id}" title="${muteText}" aria-label="${muteText}" tabindex="0"></button>` +
			`<a class="${t.options.classPrefix}volume-slider" ` +
				`aria-label="${i18n.t('mejs.volume-slider')}" aria-valuemin="0" aria-valuemax="100" role="slider" ` +
				`aria-orientation="vertical">` +
				`<span class="${t.options.classPrefix}offscreen">${volumeControlText}</span>` +
				`<div class="${t.options.classPrefix}volume-total">` +
					`<div class="${t.options.classPrefix}volume-current"></div>` +
					`<div class="${t.options.classPrefix}volume-handle"></div>` +
				`</div>` +
			`</a>`;

		t.addControlElement(mute, 'volume');

		t.options.keyActions.push({
			keys: [38], // UP
			action: (player) => {
				const volumeSlider = player.getElement(player.container).querySelector(`.${t.options.classPrefix}volume-slider`);
				if (volumeSlider && volumeSlider.matches(':focus')) {
					volumeSlider.style.display = 'block';
				}
				if (player.isVideo) {
					player.showControls();
					player.startControlsTimer();
				}

				const newVolume = Math.min(player.volume + 0.1, 1);
				player.setVolume(newVolume);
				if (newVolume > 0) {
					player.setMuted(false);
				}

			}
		},
		{
			keys: [40], // DOWN
			action: (player) => {
				const volumeSlider = player.getElement(player.container).querySelector(`.${t.options.classPrefix}volume-slider`);
				if (volumeSlider) {
					volumeSlider.style.display = 'block';
				}

				if (player.isVideo) {
					player.showControls();
					player.startControlsTimer();
				}

				const newVolume = Math.max(player.volume - 0.1, 0);
				player.setVolume(newVolume);

				if (newVolume <= 0.1) {
					player.setMuted(true);
				}

			}
		},
		{
			keys: [77], // M
			action: (player) => {
				const volumeSlider = player.getElement(player.container).querySelector(`.${t.options.classPrefix}volume-slider`);
				if (volumeSlider) {
					volumeSlider.style.display = 'block';
				}

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
		});

		// horizontal version
		if (mode === 'horizontal') {
			const anchor = document.createElement('a');
			anchor.className = `${t.options.classPrefix}horizontal-volume-slider`;
			anchor.setAttribute('aria-label', i18n.t('mejs.volume-slider'));
			anchor.setAttribute('aria-valuemin', 0);
			anchor.setAttribute('aria-valuemax', 100);
			anchor.setAttribute('aria-valuenow', 100);
			anchor.setAttribute('role', 'slider');
			anchor.innerHTML += `<span class="${t.options.classPrefix}offscreen">${volumeControlText}</span>` +
				`<div class="${t.options.classPrefix}horizontal-volume-total">` +
				`<div class="${t.options.classPrefix}horizontal-volume-current"></div>` +
				`<div class="${t.options.classPrefix}horizontal-volume-handle"></div>` +
				`</div>`;
			mute.parentNode.insertBefore(anchor, mute.nextSibling);
		}

		let
			mouseIsDown = false,
			mouseIsOver = false,
			modified = false,

			/**
			 * @private
			 */
			updateVolumeSlider = () => {
				const volume = Math.floor(media.volume * 100);
				volumeSlider.setAttribute('aria-valuenow', volume);
				volumeSlider.setAttribute('aria-valuetext', `${volume}%`);
			}
		;

		const
			volumeSlider = mode === 'vertical' ? t.getElement(t.container).querySelector(`.${t.options.classPrefix}volume-slider`) :
				t.getElement(t.container).querySelector(`.${t.options.classPrefix}horizontal-volume-slider`),
			volumeTotal = mode === 'vertical' ? t.getElement(t.container).querySelector(`.${t.options.classPrefix}volume-total`) :
				t.getElement(t.container).querySelector(`.${t.options.classPrefix}horizontal-volume-total`),
			volumeCurrent = mode === 'vertical' ? t.getElement(t.container).querySelector(`.${t.options.classPrefix}volume-current`) :
				t.getElement(t.container).querySelector(`.${t.options.classPrefix}horizontal-volume-current`),
			volumeHandle = mode === 'vertical' ? t.getElement(t.container).querySelector(`.${t.options.classPrefix}volume-handle`) :
				t.getElement(t.container).querySelector(`.${t.options.classPrefix}horizontal-volume-handle`),

			/**
			 * @private
			 * @param {Number} volume
			 */
			positionVolumeHandle = (volume) => {

				if (volume === null || isNaN(volume) || volume === undefined) {
					return;
				}

				// correct to 0-1
				volume = Math.max(0, volume);
				volume = Math.min(volume, 1);

				// adjust mute button style
				if (volume === 0) {
					removeClass(mute, `${t.options.classPrefix}mute`);
					addClass(mute, `${t.options.classPrefix}unmute`);
					const button = mute.firstElementChild;
					button.setAttribute('title', unmuteText);
					button.setAttribute('aria-label', unmuteText);
				} else {
					removeClass(mute, `${t.options.classPrefix}unmute`);
					addClass(mute, `${t.options.classPrefix}mute`);
					const button = mute.firstElementChild;
					button.setAttribute('title', muteText);
					button.setAttribute('aria-label', muteText);
				}

				const
					volumePercentage = `${(volume * 100)}%`,
					volumeStyles = getComputedStyle(volumeHandle)
				;

				// position slider
				if (mode === 'vertical') {
					volumeCurrent.style.bottom = 0;
					volumeCurrent.style.height = volumePercentage;
					volumeHandle.style.bottom = volumePercentage;
					volumeHandle.style.marginBottom = `${(-parseFloat(volumeStyles.height) / 2)}px`;
				} else {
					volumeCurrent.style.left = 0;
					volumeCurrent.style.width = volumePercentage;
					volumeHandle.style.left = volumePercentage;
					volumeHandle.style.marginLeft = `${(-parseFloat(volumeStyles.width) / 2)}px`;
				}
			},
			/**
			 * @private
			 */
			handleVolumeMove = (e) => {
				const
					totalOffset = offset(volumeTotal),
					volumeStyles = getComputedStyle(volumeTotal)
				;

				modified = true;

				let volume = null;

				// calculate the new volume based on the most recent position
				if (mode === 'vertical') {
					const
						railHeight = parseFloat(volumeStyles.height),
						newY = e.pageY - totalOffset.top
					;

					volume = (railHeight - newY) / railHeight;

					// the controls just hide themselves (usually when mouse moves too far up)
					if (totalOffset.top === 0 || totalOffset.left === 0) {
						return;
					}

				} else {
					const
						railWidth = parseFloat(volumeStyles.width),
						newX = e.pageX - totalOffset.left
					;

					volume = newX / railWidth;
				}

				// ensure the volume isn't outside 0-1
				volume = Math.max(0, volume);
				volume = Math.min(volume, 1);

				// position the slider and handle
				positionVolumeHandle(volume);

				// set the media object (this will trigger the `volumechange` event)
				t.setMuted((volume === 0));
				t.setVolume(volume);

				e.preventDefault();
				e.stopPropagation();
			},
			toggleMute = () => {
				if (t.muted) {
					positionVolumeHandle(0);
					removeClass(mute, `${t.options.classPrefix}mute`);
					addClass(mute, `${t.options.classPrefix}unmute`);
				} else {
					
					positionVolumeHandle(media.volume);
					removeClass(mute, `${t.options.classPrefix}unmute`);
					addClass(mute, `${t.options.classPrefix}mute`);
				}
			}
		;

		player.getElement(player.container).addEventListener('keydown', (e) => {
			const hasFocus = !!(e.target.closest(`.${t.options.classPrefix}container`));
			if (!hasFocus && mode === 'vertical') {
				volumeSlider.style.display = 'none';
			}
		});

		mute.addEventListener('mouseenter', (e) => {
			if (e.target === mute) {
				volumeSlider.style.display = 'block';
				mouseIsOver = true;
				e.preventDefault();
				e.stopPropagation();
			}
		});
		mute.addEventListener('focusin', () => {
			volumeSlider.style.display = 'block';
			mouseIsOver = true;
		});

		mute.addEventListener('focusout', (e) => {
			if ((!e.relatedTarget || (e.relatedTarget && !e.relatedTarget.matches(`.${t.options.classPrefix}volume-slider`))) &&
				mode === 'vertical') {
				volumeSlider.style.display = 'none';
			}
		});
		mute.addEventListener('mouseleave', () => {
			mouseIsOver = false;
			if (!mouseIsDown && mode === 'vertical') {
				volumeSlider.style.display = 'none';
			}
		});
		mute.addEventListener('focusout', () => {
			mouseIsOver = false;
		});
		mute.addEventListener('keydown', (e) => {
			if (t.options.enableKeyboard && t.options.keyActions.length) {
				let
					keyCode = e.which || e.keyCode || 0,
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

				e.preventDefault();
				e.stopPropagation();
			}
		});
		mute.querySelector('button').addEventListener('click', () => {
			media.setMuted(!media.muted);
			const event = createEvent('volumechange', media);
			media.dispatchEvent(event);
		});

		// Events
		volumeSlider.addEventListener('dragstart', () => false);

		volumeSlider.addEventListener('mouseover', () => {
			mouseIsOver = true;
		});
		volumeSlider.addEventListener('focusin', () => {
			volumeSlider.style.display = 'block';
			mouseIsOver = true;
		});
		volumeSlider.addEventListener('focusout', () => {
			mouseIsOver = false;
			if (!mouseIsDown && mode === 'vertical') {
				volumeSlider.style.display = 'none';
			}
		});
		volumeSlider.addEventListener('mousedown', (e) => {
			handleVolumeMove(e);
			t.globalBind('mousemove.vol', (event) => {
				const target = event.target;
				if (mouseIsDown && (target === volumeSlider ||
                                        (typeof target.closest == 'function' && 
					target.closest((mode === 'vertical' ? `.${t.options.classPrefix}volume-slider` :
					`.${t.options.classPrefix}horizontal-volume-slider`))))) {
					handleVolumeMove(event);
				}
			});
			t.globalBind('mouseup.vol', () => {
				mouseIsDown = false;
				if (!mouseIsOver && mode === 'vertical') {
					volumeSlider.style.display = 'none';
				}
			});
			mouseIsDown = true;
			e.preventDefault();
			e.stopPropagation();
		});

		// listen for volume change events from other sources
		media.addEventListener('volumechange', (e) => {
			if (!mouseIsDown) {
				toggleMute();
			}
			updateVolumeSlider(e);
		});

		let rendered = false;
		media.addEventListener('rendererready', function () {
			if (!modified) {
				setTimeout(() => {
					rendered = true;
					if (player.options.startVolume === 0 || media.originalNode.muted) {
						media.setMuted(true);
					}
					media.setVolume(player.options.startVolume);
					t.setControlsSize();
				}, 250);
			}
		});

		media.addEventListener('loadedmetadata', function () {
			setTimeout(() => {
				if (!modified && !rendered) {
					if (player.options.startVolume === 0 || media.originalNode.muted) {
						media.setMuted(true);
					}
					if(player.options.startVolume === 0){
						player.options.startVolume = 0;	
					}
					media.setVolume(player.options.startVolume);
					t.setControlsSize();
				}
				rendered = false;
			}, 250);
		});

		// mute the media and sets the volume icon muted if the initial volume is set to 0
		if (player.options.startVolume === 0 || media.originalNode.muted) {
			media.setMuted(true);
			if(player.options.startVolume === 0){
				player.options.startVolume = 0;	
			}			
			toggleMute();
		}

		t.getElement(t.container).addEventListener('controlsresize', () => {
			toggleMute();
		});
	}
});