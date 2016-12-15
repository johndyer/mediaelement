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

			$('<div class="' + t.options.classPrefix + 'time" role="timer" aria-live="off">' +
					'<span class="' + t.options.classPrefix + 'currenttime">' +
						mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours) +
                    '</span>'+
				'</div>')
			.appendTo(controls);

			t.currenttime = t.controls.find('.' + t.options.classPrefix + 'currenttime');

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

			if (controls.children().last().find('.' + t.options.classPrefix + 'currenttime').length > 0) {
				$(t.options.timeAndDurationSeparator +
					'<span class="' + t.options.classPrefix + 'duration">' +
						mejs.Utility.secondsToTimeCode(t.options.duration, t.options.alwaysShowHours) +
					'</span>')
					.appendTo(controls.find('.' + t.options.classPrefix + 'time'));
			} else {

				// add class to current time
				controls.find('.' + t.options.classPrefix + 'currenttime').parent()
					.addClass(t.options.classPrefix + 'currenttime-container');

				$('<div class="' + t.options.classPrefix + 'time ' +
				                   t.options.classPrefix + 'duration-container">'+
					'<span class="' + t.options.classPrefix + 'duration">' +
						mejs.Utility.secondsToTimeCode(t.options.duration, t.options.alwaysShowHours) +
					'</span>' +
				'</div>')
				.appendTo(controls);
			}

			t.durationD = t.controls.find('.' + t.options.classPrefix + 'duration');

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
			t.container.toggleClass(t.options.classPrefix + "long-video", duration > 3600);

			if (t.durationD && duration > 0) {
				t.durationD.html(mejs.Utility.secondsToTimeCode(duration, t.options.alwaysShowHours));
			}
		}
	});

})(mejs.$);
