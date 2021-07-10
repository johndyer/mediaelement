# API and Configuration

* [Attributes](#attributes)
* [Configuration](#development)
	* [Standalone](#standalone)
	* [MediaElementPlayer](#player)
* [API](#api)
	* [Properties](#properties)
	* [Methods](#methods)
	* [Events](#events)
	* [Examples](#examples)


<a id="attributes"></a>
## Attributes

`MediaElement` supports the following `video`/`audio` tag attributes:

Attribute | Description
-------- | ------------
autoplay |	Specifies that the video will start playing as soon as it is ready
class | Specifies one or more class names for an element (refers to a class in a style sheet)
controls | Specifies that video controls should be displayed (such as a play/pause button etc).
id | Specifies a unique id for an element; if not specified, the plugin will create one automatically
height | Sets the height of the video player in pixels; you can also indicate percentages
loop |	Specifies that the video will start over again, every time it is finished
muted |	Specifies that the audio output of the video should be muted
poster | Specifies an image to be shown while the video is downloading, or until the user hits the play button. Generally, a PNG or JPEG image. If not specified, the player will use the background color specified in the style sheet
preload	| Specifies if and how the author thinks the video should be loaded when the page loads; possible values: `auto`, `metadata` or `none` (recommended)
src	| Specifies the URL of the video file; this value can also be indicated with `source` tags (refer to the [Multiple Codecs](installation.md#multi-codecs) section for more information)
style | Specifies an inline CSS style for an element
tabindex | Specifies the tabbing order of an element. To avoid the keyboard to focus on this element, use `-1`; otherwise, `0`
title | Specifies extra information about an element
width | Sets the width of the video player in pixels; you can also indicate percentages

The following markup displays all the attributes listed above for more clarity:
```html
<video autoplay controls class="player" id="player1" height="360"
	width="100%" loop muted poster="/path/to/poster.jpg"
	preload="none" src="/path/to/media.mp4"
	style="max-width: 100%" tabindex="0" title="MediaElement">
</video>
```

<a id="configuration"></a>
## Configuration

<a id="standalone"></a>
### Standalone

As a standalone library, _MediaElement.js_ can be configured using the following settings.

Parameter | Type | Default | Description
------ | --------- | ------- | --------
renderers | array | `[]` | List of the renderers to use
fakeNodeName | string | `mediaelementwrapper` | Name of MediaElement container
pluginPath | string | `build/` | Path where Flash shims are located
shimScriptAccess | string | `sameDomain` | Flag in `<object>` and `<embed>` to determine whether to use local or CDN files. Possible values: `always` (CDN version) or `sameDomain` (local files)
success | callback | | Action(s) that will be executed as soon as the source is loaded; passes 2 arguments: `media` (the wrapper that mimics all the native events/properties/methods for all renderers) and `node` (the original HTML `video`, `audio` or `iframe` tag where the media was loaded originally; if `html5` is being used, `media` and `node` are the basically the same)
error | callback | | Action(s) that will be executed if source doesn't load for any reason. Passes same arguments as `success`
dailymotion | object | | See [Documentation](https://developer.dailymotion.com/player)
dash | object | | Accepts `debug`, `drm` (object to load protected/licensed streaming; read [here](https://github.com/Axinom/drm-quick-start) for more information) and `path` parameters to indicate `dash.js` URL/local path
facebook | object | | See [Documentation](https://developers.facebook.com/docs/plugins/embedded-video-player/api#setup) (and a custom `lang` parameter to indicate the FB SDK language)
flv | object | | See [Documentation](https://github.com/Bilibili/flv.js/blob/master/docs/api.md) (and a custom `path` parameter to indicate where to load library)
hls | object | | See [Documentation](https://github.com/dailymotion/hls.js/blob/master/API.md#fine-tuning) (and a custom `path` parameter to indicate where to load library)
youtube | object | | See [Documentation](https://developers.google.com/youtube/player_parameters#Parameters); also, a custom `nocookie` parameter to switch to YouTube's no-cookie URL and `imageQuality` parameter if user decides to use Image API to load a YouTube poster based on YouTube video ID (possible values: `default`, `hqdefault`, `mqdefault`, `sddefault` and `maxresdefault`)

**Notes**
1. Vimeo and Soundcloud don't need any configuration for now since they are pretty straight forward.
2. To use DRM with M(PEG)-DASH, make sure CORS are configured correctly, and also your site **MUST** be using SSL.
3. Both `success` and `error` will be available for both `MediaElement` and `MediaElementPlayer`; however, when using `MediaElementPlayer`, a third argument is passed: `instance`, which gives access to the methods associated to the `MediaElementPlayer` class.
4. When using `MediaElementPlayer`, `error` arguments will be: `error` (the details on the error event), `media` and `node`.

<a id="player"></a>
### MediaElementPlayer

Including the above, _MediaElementPlayer_ object allows the following extra configuration elements.

Parameter | Type | Default | Description
------ | --------- | ------- | --------
classPrefix | string | `mejs__` | Class prefix for player elements
poster | string | _(empty)_ | Poster URL that overrides `poster` attribute
showPosterWhenEnded | boolean | `false` | When the video is ended, show the poster
showPosterWhenPaused | boolean | `false` | When the video is paused, show the poster
defaultVideoWidth | number | `480` | Default width if the `<video>` width is not specified
defaultVideoHeight | number | `270` | Default height if the `<video>` height is not specified
videoWidth | number | `-1` | If set, overrides `<video>` width
videoHeight | number | `-1` | If set, overrides `<video>` height
defaultAudioWidth | number | `400` | Default width for audio player if the user doesn't specify
defaultAudioHeight | number | `30` | Default height for audio player if the user doesn't specify
defaultSeekBackwardInterval | function |  | Default amount to move back when back key is pressed. Default callback is represented like: `function(media) {return (media.duration * 0.05);}`
defaultSeekForwardInterval | function |  | Default amount to move forward when forward key is pressed. Default callback is represented like: `function(media) {return (media.duration * 0.05);}`
setDimensions | boolean | `true` | Set dimensions via JS instead of CSS
audioWidth | number | `-1` | Width of audio player
audioHeight | number| `-1` | Height of audio player
startVolume | number | `0.8` | Initial volume when the player starts (overrided by user cookie); represented with `float` values
loop | boolean | `false` | Whether to loop or not media
autoRewind | boolean | `true` | Rewind to beginning when media ends
enableAutosize | boolean | `true` | Resize to media dimensions
timeFormat | string | _(empty)_ | Time format to use. Default: `'mm:ss'`. Supported units: `h`: hour, `m`: minute, `s`: second and `f`: frame count. If use 2 letters, 2 digits will be displayed (`hh:mm:ss`)
alwaysShowHours | boolean | `false` | Force the hour marker (`##:00:00`)
showTimecodeFrameCount | boolean| `false` | Whether to show frame count in timecode (`##:00:00:00`)
framesPerSecond | number | `25` | Used when `showTimecodeFrameCount` is set to `true`
autosizeProgress | boolean | `true` | Automatically calculate the width of the progress bar based on the sizes of other elements
alwaysShowControls | boolean | `false` | Hide controls when playing and mouse is not over the video
hideVideoControlsOnLoad | boolean | `false` | Display the video control when media is loading
hideVideoControlsOnPause | boolean | `false` | Display the video controls when media is paused
clickToPlayPause | boolean | `true` | Enable click video element to toggle play/pause
controlsTimeoutDefault | number | `1500` | Time in ms to hide controls
controlsTimeoutMouseEnter | number | `2500` | Time in ms to trigger the timer when mouse moves
controlsTimeoutMouseLeave | number | `1000` | Time in ms to trigger the timer when mouse leaves
iPadUseNativeControls | boolean | `false` | Force iPad's native controls
iPhoneUseNativeControls | boolean | `false` | Force iPhone's native controls
AndroidUseNativeControls | boolean | `false` | Force Android's native controls
features | array | `[...]` | List of features/plugin to use in the player; some will be included in the control bar (by default IN STRICT ORDER: `playpause`, `current`, `progress`, `duration`, `tracks`, `volume`, `fullscreen`)
useDefaultControls | boolean | `false` | If set to `true`, all the default control elements listed in `features` above will be used, and the features will append any other plugins indicated in `features`. This approach is used mostly when adding more plugins WITHOUT modifying the elements in the control bar in any capacity
isVideo | boolean | `true` | Only for dynamic purposes
stretching | string | `auto` | Stretching modes for video player. If `auto` is set, player will try to find the `max-width` and `max-height` CSS styles to turn it into `responsive` mode; otherwise, will set the dimensions specified in the tag (same as setting this option as `none`). The `fill` mode will try to use the available space to make the video fit and, when window is resized, it will crop the dimensions to center it according to the available space.
enableKeyboard | boolean | `true` | Turns keyboard support on and off for this instance
pauseOtherPlayers | boolean | `true` | When focused player starts, it will pause other players
ignorePauseOtherPlayersOption | boolean | `true` |it will ignore pauseOtherPlayers option on currentplayer
secondsDecimalLength | number | `0` | Number of decimal places to show if frames are shown
customError | string/callback | `null` | If error happens, set up customized HTML message through a string or a function. The function has 2 parameters: `media` (the wrapper that mimics all the native events/properties/methods for all renderers) and `node` (the original HTML `video`, `audio` or `iframe` tag where the media was loaded originally)
keyActions | array | `[...]` | Keyboard actions to trigger different actions. Accepts array of objects in format: `{keys: [1,2,3...], action: function(player, media) { ... }}`. To see the entire list, please check `/src/js/mediaelementplayer-player.js`
duration | number | `-1` | Start point to detect changes on media time duration
timeAndDurationSeparator | string | `<span> &#124; </span>` | Separator between the current time and the total duration of media being played
hideVolumeOnTouchDevices | boolean | `true` | Touch devices (specially mobile devices) have different way to handle volume, so no need to display it
enableProgressTooltip | boolean | `true` | Enable/disable tooltip that shows time popup in progress bar
useSmoothHover | boolean | `true` | Enable smooth behavior when hovering progress bar (like YouTube's)
forceLive | boolean | `false` | If set to `true`, the `Live Broadcast` message will be displayed and progress bar will be hidden, no matter if `duration` is a valid number
audioVolume | string | `horizontal` | Position of volume slider on audio element
videoVolume | string | `vertical` | Position of volume slider on video element
usePluginFullScreen | boolean | `true` | Flag to activate detection of Pointer events when on fullscreen mode
useFakeFullscreen | boolean | `false` | Flag to bypass native capabilities on mobile devices and use the fake-fullscreen mode
tracksAriaLive | boolean | `false` | By default, no WAI-ARIA live region - don't make a screen reader speak captions over an audio track.
hideCaptionsButtonWhenEmpty | boolean | `true` | Option to remove the `[cc]` button when no `<track kind="subtitles">` are present
captionTextPreprocessor | function | _not set_ | Option to preprocess the caption text before it is displayed. If set, it expects a function which takes in caption text and returns a preprocessed version thereof. If it is not set, the caption text is displayed as is.
toggleCaptionsButtonWhenOnlyOne | boolean | `false` | If true and we only have one track, change captions to toggle button
startLanguage | string | _(empty)_ | Automatically turn on a `<track>` element. Note: Will not work when toggleCaptionsButtonWhenOnlyOne is set to `true`
slidesSelector | string | _(empty)_ | Selector for slides; could be any valid JavaScript selector (`#id`, `.class`, `img`, etc.)
tracksText | string | `null` | Title for Closed Captioning button for WARIA purposes
chaptersText  | string | `null` | Title for Chapters button for WARIA purposes
muteText | string | `null` | Title for Mute button for WARIA purposes
unmuteText | string | `null` | Title for Unmute button for WARIA purposes
allyVolumeControlText | string | `null` | Title for Volume slider for WARIA purposes
fullscreenText | string | `null` | Title for Fullscreen button for WARIA purposes
playText | string | `null` | Title for Play/Pause button for WARIA purposes when media is playing
pauseText | string | `null` | Title for Play/Pause button for WARIA purposes when media is paused


<a id="api"></a>
## API

MediaElementPlayer is a complete audio and video player, but you can also use just the MediaElement object which replaces `<video>` and `<audio>` with a Flash player that mimics the properties, methods, and events of HTML MediaElement API.

<a id="properties"></a>
### Properties
Property | Description | GET | SET
-------- | ----------- | --- | ---
autoplay | Set or return whether the audio/video should start playing as soon as it is loaded | X | X
buffered | Return a TimeRanges object representing the buffered parts of the audio/video | X |
controls | Set or return whether the audio/video should display controls (like play/pause etc.) | X | X
currentSrc | Return the URL of the current audio/video | X |
currentTime | Set or return the current playback position in the audio/video (in seconds) | X | X
duration | Return the length of the current audio/video (in seconds); to determine it without playing media, `preload="auto"` must be set | X |
ended | Return whether the playback of the audio/video has ended or not | X |
error | Return a MediaError object representing the error state of the audio/video | X |
loop | Set or return whether the audio/video should start over again when finished | X | X
muted | Set or returns whether the audio/video is muted or not | X | X
paused | Return whether the audio/video is paused or not | X |
readyState | Return the current ready state of the audio/video | X |
seeking | Return whether the user is currently seeking in the audio/video | X |
src | Set or return the current source of the audio/video element | X | X
volume | Set or return the volume of the audio/video | X | X
playUserInteraction | Returns whether the last `play` call was initiated from user interaction | X |
pauseUserInteraction | Returns whether the last `pause` call was initiated from user interaction | X |

<a id="methods"></a>
### Methods

Method | Description
-------- | ------------
load() | Reload the audio/video element; also, it is used to update the audio/video element after changing the source or other settings
play(userInteraction = false) | Start playing the audio/video
pause(userInteraction = false) | Halt (pauses) the currently playing audio or video
stop() | **Only** present to support Flash RTMP streaming in MediaElementPlayer. The equivalent for other scenarios is `pause`
remove() | Destroy the video/audio player instance
canPlayType(type) | Determine whether current player can/cannot play a specific media type; `type` is MIME type and each renderer has a whitelist of them
setPlayerSize (width, height) | Set player's `width` and `height` also considering the `stretching` configuration
setPoster (url) | Add a `image` tag with the poster's `url` inside the player's layer; you can pass an _empty_ string to clear the poster 
setMuted (muted) | Mute/unmute the player; `muted` is a boolean value
setCurrentTime (time) | Set a new current time for the player; `time` is either an integer or float number, and if negative, it will start from zero.
getCurrentTime () | Retrieve the current time of the media being played
setVolume (volume) | Set a volume level for the player; `volume` is a number between `0` and `1`
getVolume () | Retrieve the current volume level of the media being played
setSrc (src) | Set a new URL/path for the player; each renderer has a different mechanism to set it
getSrc () | Retrieve the media URL/path currently being played; each renderer has a different mechanism to return it

<a id="events"></a>
### Events

Event | Action(s) executed when...
----- | -----------
loadedmetadata | Meta data (like dimensions and duration) are loaded
progress | Browser is in the process of getting the media data
timeupdate | The playing position has changed (like when the user fast forwards to a different point in the media)
seeking | The seeking attribute is set to true indicating that seeking has started
seeked | The seeking attribute is set to false indicating that seeking has ended
canplay | A file is ready to start playing (when it has buffered enough to begin)
play | The media is ready to start playing
playing	| The media actually has started playing
pause | The media is paused either by the user or programmatically
ended | The media has reach the end (a useful event for messages like "thanks for listening")
volumechange | Volume is changed (including setting the volume to "mute")
captionschange | The media has detected that captions have changed

<a id="examples"></a>
### Examples

#### Detect if play/pause event comes from user interaction

```js
mediaElement.addEventListener('play', () => {
	if (player.playUserInteraction) {
		// Example: Send event to Websocket
	}
});

mediaElement.addEventListener('pause', () => {
	const userInteraction = player.pauseUserInteraction &&
		// Handle when video is ended (dispatches a `pause` event)
		player.currentTime < player.duration;
	if (userInteraction) {
		// Example: Send event to Websocket
	}
});
```

________
[Back to Main](../README.md)
