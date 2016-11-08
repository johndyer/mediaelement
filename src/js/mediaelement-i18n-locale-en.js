/*!
 * This is a i18n.locale language object.
 *
 * English; This can serve as a template for other languages to translate
 *
 * @author
 *   TBD
 *   Sascha Greuel (Twitter: @SoftCreatR)
 *
 * @see
 *   mediaelement-i18n.js
 *
 * @params
 *  - exports - CommonJS, window ..
 */
(function (exports) {
	"use strict";

	if (exports.en === undefined) {
		exports.en = {
			"mejs.plural-form": 1,

			// me-shim
			"mejs.download-file": "Download File",
			"mejs.install-flash": "You are using a browser that does not have Flash player enabled or installed. Please turn on your Flash player plugin or download the latest version from https://get.adobe.com/flashplayer/",

			// mep-feature-contextmenu
			"mejs.fullscreen-off": "Turn off Fullscreen",
			"mejs.fullscreen-on": "Go Fullscreen",
			"mejs.download-video": "Download Video",

			// mep-feature-fullscreen
			"mejs.fullscreen": "Fullscreen",

			// mep-feature-jumpforward
			"mejs.time-jump-forward": ["Jump forward 1 second", "Jump forward %1 seconds"],

			// mep-feature-playpause
			"mejs.play": "Play",
			"mejs.pause": "Pause",

			// mep-feature-postroll
			"mejs.close": "Close",

			// mep-feature-progress
			"mejs.time-slider": "Time Slider",
			"mejs.time-help-text": "Use Left/Right Arrow keys to advance one second, Up/Down arrows to advance ten seconds.",

			// mep-feature-skipback
			"mejs.time-skip-back": ["Skip back 1 second", "Skip back %1 seconds"],

			// mep-feature-tracks
			"mejs.captions-subtitles": "Captions/Subtitles",
			"mejs.none": "None",

			// mep-feature-volume
			"mejs.mute-toggle": "Mute Toggle",
			"mejs.volume-help-text": "Use Up/Down Arrow keys to increase or decrease volume.",
			"mejs.unmute": "Unmute",
			"mejs.mute": "Mute",
			"mejs.volume-slider": "Volume Slider",

			// mep-player
			"mejs.video-player": "Video Player",
			"mejs.audio-player": "Audio Player",

			// mep-feature-ads
			"mejs.ad-skip": "Skip ad",
			"mejs.ad-skip-info": ["Skip in 1 second", "Skip in %1 seconds"],

			// mep-feature-sourcechooser
			"mejs.source-chooser": "Source Chooser",

			// mep-feature-stop
			"mejs.stop": "Stop",

			// mep-tracks
			"mejs.afrikaans": "Afrikaans",
			"mejs.albanian": "Albanian",
			"mejs.arabic": "Arabic",
			"mejs.belarusian": "Belarusian",
			"mejs.bulgarian": "Bulgarian",
			"mejs.catalan": "Catalan",
			"mejs.chinese": "Chinese",
			"mejs.chinese-simplified": "Chinese (Simplified)",
			"mejs.chinese-traditional": "Chinese (Traditional)",
			"mejs.croatian": "Croatian",
			"mejs.czech": "Czech",
			"mejs.danish": "Danish",
			"mejs.dutch": "Dutch",
			"mejs.english": "English",
			"mejs.estonian": "Estonian",
			"mejs.filipino": "Filipino",
			"mejs.finnish": "Finnish",
			"mejs.french": "French",
			"mejs.galician": "Galician",
			"mejs.german": "German",
			"mejs.greek": "Greek",
			"mejs.haitian-creole": "Haitian Creole",
			"mejs.hebrew": "Hebrew",
			"mejs.hindi": "Hindi",
			"mejs.hungarian": "Hungarian",
			"mejs.icelandic": "Icelandic",
			"mejs.indonesian": "Indonesian",
			"mejs.irish": "Irish",
			"mejs.italian": "Italian",
			"mejs.japanese": "Japanese",
			"mejs.korean": "Korean",
			"mejs.latvian": "Latvian",
			"mejs.lithuanian": "Lithuanian",
			"mejs.macedonian": "Macedonian",
			"mejs.malay": "Malay",
			"mejs.maltese": "Maltese",
			"mejs.norwegian": "Norwegian",
			"mejs.persian": "Persian",
			"mejs.polish": "Polish",
			"mejs.portuguese": "Portuguese",
			"mejs.romanian": "Romanian",
			"mejs.russian": "Russian",
			"mejs.serbian": "Serbian",
			"mejs.slovak": "Slovak",
			"mejs.slovenian": "Slovenian",
			"mejs.spanish": "Spanish",
			"mejs.swahili": "Swahili",
			"mejs.swedish": "Swedish",
			"mejs.tagalog": "Tagalog",
			"mejs.thai": "Thai",
			"mejs.turkish": "Turkish",
			"mejs.ukrainian": "Ukrainian",
			"mejs.vietnamese": "Vietnamese",
			"mejs.welsh": "Welsh",
			"mejs.yiddish": "Yiddish"
		};
	}
}(mejs.i18n.locale.strings));
