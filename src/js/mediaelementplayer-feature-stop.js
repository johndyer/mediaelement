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

			$('<div class="' +  t.options.classPrefix + 'button ' +
			                    t.options.classPrefix + 'stop-button ' +
			                    t.options.classPrefix + 'stop">' +
					'<button type="button" aria-controls="' + t.id + '" ' +
						'title="' + stopTitle + '" aria-label="' + stopTitle + '">' +
					'</button>' +
				'</div>')
			.appendTo(controls)
			.click(function () {
				if (!media.paused) {
					media.pause();
				}
				if (media.currentTime > 0) {
					media.setCurrentTime(0);
					media.pause();
					controls.find('.' +  t.options.classPrefix + 'time-current')
						.width('0px');
					controls.find('.' +  t.options.classPrefix + 'time-handle')
						.css('left', '0px');
					controls.find('.' +  t.options.classPrefix + 'time-float-current')
						.html(mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours));
					controls.find('.' +  t.options.classPrefix + 'currenttime')
						.html(mejs.Utility.secondsToTimeCode(0, player.options.alwaysShowHours));
					layers.find('.' +  t.options.classPrefix + 'poster')
						.show();
				}
			});
		}
	});

})(mejs.$);
