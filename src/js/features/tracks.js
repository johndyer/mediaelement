'use strict';

import document from 'global/document';
import mejs from '../core/mejs';
import i18n from '../core/i18n';
import {config} from '../player';
import MediaElementPlayer from '../player';
import {convertSMPTEtoSeconds} from '../utils/time';
import {isString, createEvent} from '../utils/general';
import {addClass, removeClass, hasClass, siblings, ajax, fadeIn, fadeOut, visible} from '../utils/dom';

/**
 * Closed Captions (CC) button
 *
 * This feature enables the displaying of a CC button in the control bar, and also contains the methods to start media
 * with a certain language (if available), toggle captions, etc.
 */

// Feature configuration
Object.assign(config, {
	/**
	 * Default language to start media using ISO 639-2 Language Code List (en, es, it, etc.)
	 * If there are multiple tracks for one language, the last track node found is activated
	 * @see https://www.loc.gov/standards/iso639-2/php/code_list.php
	 * @type {String}
	 */
	startLanguage: '',
	/**
	 * @type {?String}
	 */
	tracksText: null,
	/**
	 * @type {?String}
	 */
	chaptersText: null,
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

Object.assign(MediaElementPlayer.prototype, {
	/**
	 * @type {Boolean}
	 */
	hasChapters: false,

	/**
	 * Feature constructor.
	 *
	 * Always has to be prefixed with `build` and the name that will be used in MepDefaults.features list
	 * @param {MediaElementPlayer} player
	 * @param {HTMLElement} controls
	 * @param {HTMLElement} layers
	 * @param {HTMLElement} media
	 */
	buildtracks (player, controls, layers, media) {

		this.findTracks();

		if (!player.tracks.length && (!player.trackFiles || !player.trackFiles.length === 0)) {
			return;
		}

		const
			t = this,
			attr = t.options.tracksAriaLive ? ' role="log" aria-live="assertive" aria-atomic="false"' : '',
			tracksTitle = isString(t.options.tracksText) ? t.options.tracksText : i18n.t('mejs.captions-subtitles'),
			chaptersTitle = isString(t.options.chaptersText) ? t.options.chaptersText : i18n.t('mejs.captions-chapters'),
			total = player.trackFiles === null ? player.tracks.length : player.trackFiles.length
		;

		// If browser will do native captions, prefer mejs captions, loop through tracks and hide
		if (t.domNode.textTracks) {
			for (let i = t.domNode.textTracks.length - 1; i >= 0; i--) {
				t.domNode.textTracks[i].mode = 'hidden';
			}
		}

		t.cleartracks(player);

		player.captions = document.createElement('div');
		player.captions.className = `${t.options.classPrefix}captions-layer ${t.options.classPrefix}layer`;
		player.captions.innerHTML = `<div class="${t.options.classPrefix}captions-position ${t.options.classPrefix}captions-position-hover"${attr}>` +
			`<span class="${t.options.classPrefix}captions-text"></span>` +
		`</div>`;
		player.captions.style.display = 'none';
		layers.insertBefore(player.captions, layers.firstChild);

		player.captionsText = player.captions.querySelector(`.${t.options.classPrefix}captions-text`);

		player.captionsButton = document.createElement('div');
		player.captionsButton.className = `${t.options.classPrefix}button ${t.options.classPrefix}captions-button`;
		player.captionsButton.innerHTML =
			`<button type="button" aria-controls="${t.id}" title="${tracksTitle}" aria-label="${tracksTitle}" tabindex="0"></button>` +
			`<div class="${t.options.classPrefix}captions-selector ${t.options.classPrefix}offscreen">` +
				`<ul class="${t.options.classPrefix}captions-selector-list">` +
					`<li class="${t.options.classPrefix}captions-selector-list-item">` +
						`<input type="radio" class="${t.options.classPrefix}captions-selector-input" ` +
							`name="${player.id}_captions" id="${player.id}_captions_none" ` +
							`value="none" checked disabled>` +
						`<label class="${t.options.classPrefix}captions-selector-label ` +
							`${t.options.classPrefix}captions-selected" ` +
							`for="${player.id}_captions_none">${i18n.t('mejs.none')}</label>` +
					`</li>` +
				`</ul>` +
			`</div>`;

		t.addControlElement(player.captionsButton, 'tracks');

		player.captionsButton.querySelector(`.${t.options.classPrefix}captions-selector-input`).disabled = false;

		player.chaptersButton = document.createElement('div');
		player.chaptersButton.className = `${t.options.classPrefix}button ${t.options.classPrefix}chapters-button`;
		player.chaptersButton.innerHTML =
			`<button type="button" aria-controls="${t.id}" title="${chaptersTitle}" aria-label="${chaptersTitle}" tabindex="0"></button>` +
			`<div class="${t.options.classPrefix}chapters-selector ${t.options.classPrefix}offscreen">` +
				`<ul class="${t.options.classPrefix}chapters-selector-list"></ul>` +
			`</div>`;

		let subtitleCount = 0;

		for (let i = 0; i < total; i++) {
			const
				kind = player.tracks[i].kind,
				src = player.tracks[i].src
			;
			if (src.trim()) {
				if (kind === 'subtitles' || kind === 'captions') {
					subtitleCount++;
				} else if (kind === 'chapters' && !controls.querySelector(`.${t.options.classPrefix}chapter-selector`)) {
					player.captionsButton.parentNode.insertBefore(player.chaptersButton, player.captionsButton);
				}
			}
		}

		player.trackToLoad = -1;
		player.selectedTrack = null;
		player.isLoadingTrack = false;

		// add to list
		for (let i = 0; i < total; i++) {
			const kind = player.tracks[i].kind;
			if (player.tracks[i].src.trim() && (kind === 'subtitles' || kind === 'captions')) {
				player.addTrackButton(player.tracks[i].trackId, player.tracks[i].srclang, player.tracks[i].label);
			}
		}

		// start loading tracks
		player.loadNextTrack();

		const
			inEvents = ['mouseenter', 'focusin'],
			outEvents = ['mouseleave', 'focusout']
		;

		// if only one language then just make the button a toggle
		if (t.options.toggleCaptionsButtonWhenOnlyOne && subtitleCount === 1) {
			player.captionsButton.addEventListener('click', (e) => {
				let trackId = 'none';
				if (player.selectedTrack === null) {
					trackId = player.tracks[0].trackId;
				}
				const keyboard = e.keyCode || e.which;
				player.setTrack(trackId, (typeof keyboard !== 'undefined'));
			});
		} else {
			const
				labels = player.captionsButton.querySelectorAll(`.${t.options.classPrefix}captions-selector-label`),
				captions = player.captionsButton.querySelectorAll('input[type=radio]')
			;

			for (let i = 0, total = inEvents.length; i < total; i++) {
				player.captionsButton.addEventListener(inEvents[i], function () {
					removeClass(this.querySelector(`.${t.options.classPrefix}captions-selector`), `${t.options.classPrefix}offscreen`);
				});
			}

			for (let i = 0, total = outEvents.length; i < total; i++) {
				player.captionsButton.addEventListener(outEvents[i], function () {
					addClass(this.querySelector(`.${t.options.classPrefix}captions-selector`), `${t.options.classPrefix}offscreen`);
				});
			}

			for (let i = 0, total = captions.length; i < total; i++) {
				captions[i].addEventListener('click',  function (e) {
					// value is trackId, same as the actual id, and we're using it here
					// because the "none" checkbox doesn't have a trackId
					// to use, but we want to know when "none" is clicked
					const keyboard = e.keyCode || e.which;
					player.setTrack(this.value, (typeof keyboard !== 'undefined'));
				});
			}

			for (let i = 0, total = labels.length; i < total; i++) {
				labels[i].addEventListener('click',  function (e) {
					const
						radio = siblings(this, (el) => el.tagName === 'INPUT')[0],
						event = createEvent('click', radio)
					;
					radio.dispatchEvent(event);
					e.preventDefault();
				});
			}

			//Allow up/down arrow to change the selected radio without changing the volume.
			player.captionsButton.addEventListener('keydown', (e) => {
				e.stopPropagation();
			});
		}

		for (let i = 0, total = inEvents.length; i < total; i++) {
			player.chaptersButton.addEventListener(inEvents[i], function () {
				if (this.querySelector(`.${t.options.classPrefix}chapters-selector-list`).children.length) {
					removeClass(this.querySelector(`.${t.options.classPrefix}chapters-selector`), `${t.options.classPrefix}offscreen`);
				}
			});
		}

		for (let i = 0, total = outEvents.length; i < total; i++) {
			player.chaptersButton.addEventListener(outEvents[i], function () {
				addClass(this.querySelector(`.${t.options.classPrefix}chapters-selector`), `${t.options.classPrefix}offscreen`);
			});
		}

		//Allow up/down arrow to change the selected radio without changing the volume.
		player.chaptersButton.addEventListener('keydown', (e) => {
			e.stopPropagation();
		});

		if (!player.options.alwaysShowControls) {
			// move with controls
			player.getElement(player.container).addEventListener('controlsshown', () => {
				// push captions above controls
				addClass(player.getElement(player.container).querySelector(`.${t.options.classPrefix}captions-position`), `${t.options.classPrefix}captions-position-hover`);
			});

			player.getElement(player.container).addEventListener('controlshidden', () => {
				if (!media.paused) {
					// move back to normal place
					removeClass(player.getElement(player.container).querySelector(`.${t.options.classPrefix}captions-position`), `${t.options.classPrefix}captions-position-hover`);
				}
			});
		} else {
			addClass(player.getElement(player.container).querySelector(`.${t.options.classPrefix}captions-position`), `${t.options.classPrefix}captions-position-hover`);
		}

		media.addEventListener('timeupdate', () => {
			player.displayCaptions();
		});

		if (player.options.slidesSelector !== '') {
			player.slidesContainer = document.querySelectorAll(player.options.slidesSelector);

			media.addEventListener('timeupdate', () => {
				player.displaySlides();
			});
		}
	},

	/**
	 * Feature destructor.
	 *
	 * Always has to be prefixed with `clean` and the name that was used in MepDefaults.features list
	 * @param {MediaElementPlayer} player
	 */
	cleartracks (player) {
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
			if (player.chaptersButton) {
				player.chaptersButton.remove();
			}
		}
	},

	rebuildtracks () {
		const t = this;
		t.findTracks();
		t.buildtracks(t, t.getElement(t.controls), t.getElement(t.layers), t.media);
	},

	findTracks () {
		const
			t = this,
			tracktags = t.trackFiles === null ? t.node.querySelectorAll('track') : t.trackFiles,
			total = tracktags.length
		;

		// store for use by plugins
		t.tracks = [];
		for (let i = 0; i < total; i++) {
			const
				track = tracktags[i],
				srclang = track.getAttribute('srclang').toLowerCase() || '',
				trackId = `${t.id}_track_${i}_${track.getAttribute('kind')}_${srclang}`
			;
			t.tracks.push({
				trackId: trackId,
				srclang: srclang,
				src: track.getAttribute('src'),
				kind: track.getAttribute('kind'),
				label: track.getAttribute('label') || '',
				entries: [],
				isLoaded: false
			});
		}
	},

	/**
	 *
	 * @param {String} trackId, or "none" to disable captions
	 * @param {Boolean} setByKeyboard
	 */
	setTrack (trackId, setByKeyboard) {

		const
			t = this,
			radios = t.captionsButton.querySelectorAll('input[type="radio"]'),
			captions = t.captionsButton.querySelectorAll(`.${t.options.classPrefix}captions-selected`),
			track = t.captionsButton.querySelector(`input[value="${trackId}"]`)
		;

		for (let i = 0, total = radios.length; i < total; i++) {
			radios[i].checked = false;
		}

		for (let i = 0, total = captions.length; i < total; i++) {
			removeClass(captions[i], `${t.options.classPrefix}captions-selected`);
		}

		track.checked = true;
		const labels = siblings(track, (el) => hasClass(el, `${t.options.classPrefix}captions-selector-label`));
		for (let i = 0, total = labels.length; i < total; i++) {
			addClass(labels[i], `${t.options.classPrefix}captions-selected`)
		}

		if (trackId === 'none') {
			t.selectedTrack = null;
			removeClass(t.captionsButton, `${t.options.classPrefix}captions-enabled`);
		} else {
			for (let i = 0, total = t.tracks.length; i < total; i++) {
				const track = t.tracks[i];
				if (track.trackId === trackId) {
					if (t.selectedTrack === null) {
						addClass(t.captionsButton, `${t.options.classPrefix}captions-enabled`);
					}
					t.selectedTrack = track;
					t.captions.setAttribute('lang', t.selectedTrack.srclang);
					t.displayCaptions();
					break;
				}
			}
		}

		const event = createEvent('captionschange', t.media);
		event.detail.caption = t.selectedTrack;
		t.media.dispatchEvent(event);

		if (!setByKeyboard) {
			setTimeout(function() {
				t.getElement(t.container).focus();
			}, 500);
		}
	},

	/**
	 *
	 */
	loadNextTrack () {
		const t = this;

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
	loadTrack (index) {
		const
			t = this,
			track = t.tracks[index]
		;

		if (track !== undefined && (track.src !== undefined || track.src !== "")) {
			ajax(track.src, 'text', (d) => {
				track.entries = typeof d === 'string' && (/<tt\s+xml/ig).exec(d) ?
					mejs.TrackFormatParser.dfxp.parse(d) : mejs.TrackFormatParser.webvtt.parse(d);

				track.isLoaded = true;
				t.enableTrackButton(track);
				t.loadNextTrack();

				if (track.kind === 'slides') {
					t.setupSlides(track);
				}
				// Load by default the first track with `chapters` kind
				else if (track.kind === 'chapters' && !t.hasChapters) {
					t.drawChapters(track);
					t.hasChapters = true;
				}
			}, () => {
				t.removeTrackButton(track.trackId);
				t.loadNextTrack();
			});
		}
	},

	/**
	 *
	 * @param {String} track - The language code
	 */
	enableTrackButton (track) {
		const
			t = this,
			lang = track.srclang,
			target = document.getElementById(`${track.trackId}`)
		;

		if (!target) {
			return;
		}

		let label = track.label;

		if (label === '') {
			label = i18n.t(mejs.language.codes[lang]) || lang;
		}
		target.disabled = false;
		const targetSiblings = siblings(target, (el) => hasClass(el, `${t.options.classPrefix}captions-selector-label`));
		for (let i = 0, total = targetSiblings.length; i < total; i++) {
			targetSiblings[i].innerHTML = label;
		}

		// auto select
		if (t.options.startLanguage === lang) {
			target.checked = true;
			const event = createEvent('click', target);
			target.dispatchEvent(event);
		}
	},

	/**
	 *
	 * @param {String} trackId
	 */
	removeTrackButton (trackId) {
		const element = document.getElementById(`${trackId}`);
		if (element) {
			const button = element.closest('li');
			if (button) {
				button.remove();
			}
		}
	},

	/**
	 *
	 * @param {String} trackId
	 * @param {String} lang - The language code
	 * @param {String} label
	 */
	addTrackButton (trackId, lang, label) {
		const t = this;
		if (label === '') {
			label = i18n.t(mejs.language.codes[lang]) || lang;
		}

		// trackId is used in the value, too, because the "none"
		// caption option doesn't have a trackId but we need to be able
		// to set it, too
		t.captionsButton.querySelector('ul').innerHTML += `<li class="${t.options.classPrefix}captions-selector-list-item">` +
			`<input type="radio" class="${t.options.classPrefix}captions-selector-input" ` +
				`name="${t.id}_captions" id="${trackId}" value="${trackId}" disabled>` +
			`<label class="${t.options.classPrefix}captions-selector-label"` +
				`for="${trackId}">${label} (loading)</label>` +
		`</li>`;
	},

	/**
	 *
	 */
	checkForTracks () {
		const t = this;

		let hasSubtitles = false;

		// check if any subtitles
		if (t.options.hideCaptionsButtonWhenEmpty) {
			for (let i = 0, total = t.tracks.length; i < total; i++) {
				const kind = t.tracks[i].kind;
				if ((kind === 'subtitles' || kind === 'captions') && t.tracks[i].isLoaded) {
					hasSubtitles = true;
					break;
				}
			}

			t.captionsButton.style.display = hasSubtitles ? '' : 'none';
			t.setControlsSize();
		}
	},

	/**
	 *
	 */
	displayCaptions () {
		if (this.tracks === undefined) {
			return;
		}

		const
			t = this,
			track = t.selectedTrack,
			sanitize = (html) => {
				const div = document.createElement('div');
				div.innerHTML = html;

				// Remove all `<script>` tags first
				const scripts = div.getElementsByTagName('script');
				let i = scripts.length;
				while (i--) {
					scripts[i].remove();
				}

				// Loop the elements and remove anything that contains value="javascript:" or an `on*` attribute
				// (`onerror`, `onclick`, etc.)
				const allElements = div.getElementsByTagName('*');
				for (let i = 0, n = allElements.length; i < n; i++) {
					const
						attributesObj = allElements[i].attributes,
						attributes = Array.prototype.slice.call(attributesObj)
					;

					for (let j = 0, total = attributes.length; j < total; j++) {
						if (attributes[j].name.startsWith('on') || attributes[j].value.startsWith('javascript')) {
							allElements[i].remove();
						} else if (attributes[j].name === 'style') {
							allElements[i].removeAttribute(attributes[j].name);
						}
					}

				}
				return div.innerHTML;
			}
		;

		if (track !== null && track.isLoaded) {
			let i = t.searchTrackPosition(track.entries, t.media.currentTime);
			if (i > -1) {
				// Set the line before the timecode as a class so the cue can be targeted if needed
				var text = track.entries[i].text;
				if (typeof t.options.captionTextPreprocessor === 'function')
					text = t.options.captionTextPreprocessor(text);
				t.captionsText.innerHTML = sanitize(text);
				t.captionsText.className = `${t.options.classPrefix}captions-text ${(track.entries[i].identifier || '')}`;
				t.captions.style.display = '';
				t.captions.style.height = '0px';
				return; // exit out if one is visible;
			}
			t.captions.style.display = 'none';
		} else {
			t.captions.style.display = 'none';
		}
	},

	/**
	 *
	 * @param {HTMLElement} track
	 */
	setupSlides (track) {
		const t = this;
		t.slides = track;
		t.slides.entries.imgs = [t.slides.entries.length];
		t.showSlide(0);
	},

	/**
	 *
	 * @param {Number} index
	 */
	showSlide (index) {
		const t = this;

		if (t.tracks === undefined || t.slidesContainer === undefined) {
			return;
		}

		const url = t.slides.entries[index].text;

		let img = t.slides.entries[index].imgs;

		if (img === undefined || img.fadeIn === undefined) {
			const image = document.createElement('img');
			image.src = url;
			image.addEventListener('load', () => {
				const
					self = this,
					visible = siblings(self, (el) => visible(el))
				;
				self.style.display = 'none';
				t.slidesContainer.innerHTML += self.innerHTML;
				fadeIn(t.slidesContainer.querySelector(image));
				for (let i = 0, total = visible.length; i < total; i++) {
					fadeOut(visible[i], 400);
				}

			});
			t.slides.entries[index].imgs = img = image;

		} else if (!visible(img)) {
			const visible = siblings(self, (el) => visible(el));
			fadeIn(t.slidesContainer.querySelector(img));
			for (let i = 0, total = visible.length; i < total; i++) {
				fadeOut(visible[i]);
			}
		}

	},

	/**
	 *
	 */
	displaySlides () {
		const t = this;

		if (this.slides === undefined) {
			return;
		}

		const
			slides = t.slides,
			i = t.searchTrackPosition(slides.entries, t.media.currentTime)
		;

		if (i > -1) {
			t.showSlide(i);
		}
	},

	/**
	 *
	 * @param {Object} chapters
	 */
	drawChapters (chapters) {
		const
			t = this,
			total = chapters.entries.length
		;

		if (!total) {
			return;
		}

		t.chaptersButton.querySelector('ul').innerHTML = '';

		for (let i = 0; i < total; i++) {
			t.chaptersButton.querySelector('ul').innerHTML += `<li class="${t.options.classPrefix}chapters-selector-list-item" ` +
				`role="menuitemcheckbox" aria-live="polite" aria-disabled="false" aria-checked="false">` +
				`<input type="radio" class="${t.options.classPrefix}captions-selector-input" ` +
					`name="${t.id}_chapters" id="${t.id}_chapters_${i}" value="${chapters.entries[i].start}" disabled>` +
				`<label class="${t.options.classPrefix}chapters-selector-label"`+
					`for="${t.id}_chapters_${i}">${chapters.entries[i].text}</label>` +
			`</li>`;
		}

		const
			radios = t.chaptersButton.querySelectorAll('input[type="radio"]'),
			labels = t.chaptersButton.querySelectorAll(`.${t.options.classPrefix}chapters-selector-label`)
		;

		for (let i = 0, total = radios.length; i < total; i++) {
			radios[i].disabled = false;
			radios[i].checked = false;
			radios[i].addEventListener('click',  function (e) {
				const
					self = this,
					listItems = t.chaptersButton.querySelectorAll('li'),
					label = siblings(self, (el) => hasClass(el, `${t.options.classPrefix}chapters-selector-label`))[0]
				;

				self.checked = true;
				self.parentNode.setAttribute('aria-checked', true);
				addClass(label, `${t.options.classPrefix}chapters-selected`);
				removeClass(t.chaptersButton.querySelector(`.${t.options.classPrefix}chapters-selected`), `${t.options.classPrefix}chapters-selected`);

				for (let i = 0, total = listItems.length; i < total; i++) {
					listItems[i].setAttribute('aria-checked', false);
				}

				const keyboard = e.keyCode || e.which;
				if (typeof keyboard === 'undefined') {
					setTimeout(function() {
						t.getElement(t.container).focus();
					}, 500);
				}

				t.media.setCurrentTime(parseFloat(self.value));
				if (t.media.paused) {
					t.media.play(true);
				}
			});
		}

		for (let i = 0, total = labels.length; i < total; i++) {
			labels[i].addEventListener('click',  function (e) {
				const
					radio = siblings(this, (el) => el.tagName === 'INPUT')[0],
					event = createEvent('click', radio)
				;
				radio.dispatchEvent(event);
				e.preventDefault();
			});
		}
	},
	/**
	 * Perform binary search to look for proper track index
	 *
	 * @param {Object[]} tracks
	 * @param {Number} currentTime
	 * @return {Number}
	 */
	searchTrackPosition (tracks, currentTime) {
		let
			lo = 0,
			hi = tracks.length - 1,
			mid,
			start,
			stop
		;

		while (lo <= hi) {
			mid = ((lo + hi) >> 1);
			start = tracks[mid].start;
			stop = tracks[mid].stop;

			if (currentTime >= start && currentTime < stop) {
				return mid;
			} else if (start < currentTime) {
				lo = mid + 1;
			} else if (start > currentTime) {
				hi = mid - 1;
			}
		}

		return -1;
	}
});

/**
 * Map all possible languages with their respective code
 *
 * @constructor
 */
mejs.language = {
	codes: {
		af: 'mejs.afrikaans',
		sq: 'mejs.albanian',
		ar: 'mejs.arabic',
		be: 'mejs.belarusian',
		bg: 'mejs.bulgarian',
		ca: 'mejs.catalan',
		zh: 'mejs.chinese',
		'zh-cn': 'mejs.chinese-simplified',
		'zh-tw': 'mejs.chines-traditional',
		hr: 'mejs.croatian',
		cs: 'mejs.czech',
		da: 'mejs.danish',
		nl: 'mejs.dutch',
		en: 'mejs.english',
		et: 'mejs.estonian',
		fl: 'mejs.filipino',
		fi: 'mejs.finnish',
		fr: 'mejs.french',
		gl: 'mejs.galician',
		de: 'mejs.german',
		el: 'mejs.greek',
		ht: 'mejs.haitian-creole',
		iw: 'mejs.hebrew',
		hi: 'mejs.hindi',
		hu: 'mejs.hungarian',
		is: 'mejs.icelandic',
		id: 'mejs.indonesian',
		ga: 'mejs.irish',
		it: 'mejs.italian',
		ja: 'mejs.japanese',
		ko: 'mejs.korean',
		lv: 'mejs.latvian',
		lt: 'mejs.lithuanian',
		mk: 'mejs.macedonian',
		ms: 'mejs.malay',
		mt: 'mejs.maltese',
		no: 'mejs.norwegian',
		fa: 'mejs.persian',
		pl: 'mejs.polish',
		pt: 'mejs.portuguese',
		ro: 'mejs.romanian',
		ru: 'mejs.russian',
		sr: 'mejs.serbian',
		sk: 'mejs.slovak',
		sl: 'mejs.slovenian',
		es: 'mejs.spanish',
		sw: 'mejs.swahili',
		sv: 'mejs.swedish',
		tl: 'mejs.tagalog',
		th: 'mejs.thai',
		tr: 'mejs.turkish',
		uk: 'mejs.ukrainian',
		vi: 'mejs.vietnamese',
		cy: 'mejs.welsh',
		yi: 'mejs.yiddish'
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
		pattern: /^((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/,

		/**
		 *
		 * @param {String} trackText
		 * @returns {{text: Array, times: Array}}
		 */
		parse (trackText) {
			const
				lines = trackText.split(/\r?\n/),
				entries = []
			;

			let
				timecode,
				text,
				identifier
			;

			for (let i = 0, total = lines.length; i < total; i++) {
				timecode = this.pattern.exec(lines[i]);

				if (timecode && i < lines.length) {
					if ((i - 1) >= 0 && lines[i - 1] !== '') {
						identifier = lines[i - 1];
					}
					i++;
					// grab all the (possibly multi-line) text that follows
					text = lines[i];
					i++;
					while (lines[i] !== '' && i < lines.length) {
						text = `${text}\n${lines[i]}`;
						i++;
					}
					text = text === null ? '' : text.trim().replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
					entries.push({
						identifier: identifier,
						start: (convertSMPTEtoSeconds(timecode[1]) === 0) ? 0.200 : convertSMPTEtoSeconds(timecode[1]),
						stop: convertSMPTEtoSeconds(timecode[3]),
						text: text,
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
		parse (trackText) {
			const trackElem = document.adoptNode(new DOMParser().parseFromString(trackText, 'application/xml').documentElement),
				container = trackElem.querySelector('div'),
				lines = container.querySelectorAll('p'),
				styleNode = document.getElementById(container.getAttribute('style')),
				entries = []
      ;

			let styles;

			if (styleNode) {
				styleNode.removeAttribute('id');
				const attributes = styleNode.attributes;
				if (attributes.length) {
					styles = {};
					for (let i = 0, total = attributes.length; i < total; i++) {
						styles[attributes[i].name.split(":")[1]] = attributes[i].value;
					}
				}
			}

			for (let i = 0, total = lines.length; i < total; i++) {
				let
					style,
					_temp = {
						start: null,
						stop: null,
						style: null,
						text: null
					}
				;

				if (lines[i].getAttribute('begin')) {
					_temp.start = convertSMPTEtoSeconds(lines[i].getAttribute('begin'));
				}
				if (!_temp.start && lines[i - 1].getAttribute('end')) {
					_temp.start = convertSMPTEtoSeconds(lines[i - 1].getAttribute('end'));
				}
				if (lines[i].getAttribute('end')) {
					_temp.stop = convertSMPTEtoSeconds(lines[i].getAttribute('end'));
				}
				if (!_temp.stop && lines[i + 1].getAttribute('begin')) {
					_temp.stop = convertSMPTEtoSeconds(lines[i + 1].getAttribute('begin'));
				}

				if (styles) {
					style = '';
					for (let _style in styles) {
						style += `${_style}: ${styles[_style] };`;
					}
				}
				if (style) {
					_temp.style = style;
				}
				if (_temp.start === 0) {
					_temp.start = 0.200;
				}
				_temp.text = lines[i].innerHTML.trim().replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_| !:, .; ]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>");
				entries.push(_temp);
			}
			return entries;
		}
	}
};
