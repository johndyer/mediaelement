﻿package {	import flash.display.LoaderInfo;	import flash.display.Sprite;		import flash.events.*;	import flash.external.*;		import flash.media.Sound;	import flash.media.SoundChannel;	import flash.media.SoundTransform;		import flash.net.URLRequest;	import flash.utils.Timer;		public class AudioMediaElement extends Sprite {		private var _request:URLRequest = null;				private var _sound:Sound = new Sound();		private var _channel:SoundChannel;		private var _transform:SoundTransform = new SoundTransform(1, 0);		private var _autoplay:Boolean = false;				private var _isLoaded:Boolean = false;		private var _isPlaying:Boolean = false;		private var _isEnded:Boolean = false;		private var _playWhenLoaded:Boolean = false;				private var _src:String = '';		private var _volume:Number = 1;		private var _currentTime:Number = 0;		private var _duration:Number = 0;				private var _timer:Timer;				private var _id:String;		/**		 * @constructor		 */		public function AudioMediaElement() {			var flashVars:Object = LoaderInfo(this.root.loaderInfo).parameters;						_id = flashVars.uid;			_autoplay = (flashVars.autoplay == true);						_timer = new Timer(250);			_timer.addEventListener(TimerEvent.TIMER, timerHander);						_sound.addEventListener(Event.COMPLETE, completeHandler);			_sound.addEventListener(Event.ID3, id3Handler);			_sound.addEventListener(IOErrorEvent.IO_ERROR, ioErrorHandler);			_sound.addEventListener(ProgressEvent.PROGRESS, progressHandler);						ExternalInterface.addCallback('get_src', get_src);			ExternalInterface.addCallback('get_paused', get_paused);			ExternalInterface.addCallback('get_volume',get_volume);			ExternalInterface.addCallback('get_currentTime', get_currentTime);			ExternalInterface.addCallback('get_duration', get_duration);			ExternalInterface.addCallback('get_ended', get_duration);			ExternalInterface.addCallback('get_buffered', get_buffered);			ExternalInterface.addCallback('set_src', set_src);			ExternalInterface.addCallback('set_paused', set_paused);			ExternalInterface.addCallback('set_volume', set_volume);			ExternalInterface.addCallback('set_currentTime', set_currentTime);			ExternalInterface.addCallback('set_duration', set_duration);								ExternalInterface.addCallback('fire_load', fire_load);			ExternalInterface.addCallback('fire_play', fire_play);			ExternalInterface.addCallback('fire_pause', fire_pause);						ExternalInterface.call('__ready__' + _id);		}		//		// Javascript bridged methods		//		private function fire_load():void {			if (!_isLoaded && _src) {						_request = new URLRequest(_src);				_sound.load(_request);								sendEvent("loadstart");				if (_autoplay) {					fire_play();				}			}		}		private function fire_play():void {						_playWhenLoaded = true;						if (!_isPlaying && _src) {								if (_request == null) {					fire_load();				}								_timer.stop();								_channel = _sound.play(_currentTime * 1000, 0, _transform);				_channel.removeEventListener(Event.SOUND_COMPLETE, soundCompleteHandler);				_channel.addEventListener(Event.SOUND_COMPLETE, soundCompleteHandler);												_isPlaying = true;				_playWhenLoaded = false;				_isEnded = false;								sendEvent("play");				sendEvent("playing");								_timer.start();			}		}		private function fire_pause():void {			_playWhenLoaded = false;						if (_isPlaying) {				_channel.stop();				_isPlaying = false;								_timer.stop();								sendEvent("pause");			}		}		//		// Setters		//		private function set_src(value:String = ''):void {			_src = value;						if (_playWhenLoaded) {				fire_play();			}		}		private function set_paused(value:*):void {			// do nothing		}		private function set_duration(value:*):void {			// do nothing		}		private function set_volume(value:Number = NaN):void {			if (!isNaN(value)) {								_volume = value;								if (_request) {					_transform.volume = _volume;					_channel.soundTransform = _transform;										sendEvent("volumechange");				}			}		}		private function set_currentTime(value:Number = NaN):void {						if (!isNaN(value) && _isPlaying) {								sendEvent("seeking");								_channel.stop();				_currentTime = value;				_channel = _sound.play(_currentTime * 1000, 0, _transform);								sendEvent("seeked");							}		}		//		// Getters		//		private function get_currentTime():Number {			if (_channel != null) {				_currentTime = _channel.position / 1000;			}			return _currentTime;		}		private function get_duration():Number {			return _duration;		}		private function get_src():String {			return _src;		}		private function get_paused():Boolean {			return !_isPlaying;		}		private function get_ended():Boolean {			return _isEnded;		}		private function get_volume():Number {			return _volume;		}		private function get_buffered():Number {		}		//		// Event handlers		//		private function completeHandler(event:Event):void {			_duration = _sound.length / 1000;			_isLoaded = true;						_timer.stop();						sendEvent("canplaythrough");		}		private function id3Handler(event:Event):void {			sendEvent('loadedmetadata');		}		private function ioErrorHandler(event:Event):void {			sendEvent('error', event.message);		}		private function progressHandler(event:ProgressEvent):void {			_duration = _sound.length / 1000;			sendEvent("progress");		}		private function timerHander(event:TimerEvent):void {						if (_channel != null) {				_currentTime = _channel.position / 1000;			}						sendEvent("timeupdate");		}		private function soundCompleteHandler(e:Event):void {			handleEnded();		}		private function handleEnded():void {			_timer.stop();			_currentTime = 0;			_isEnded = true;			sendEvent("ended");		}		//		// Utilities		//		private function sendEvent(eventName:String, eventMessage:String = ''):void {			ExternalInterface.call('__event__' + _id, eventName, eventMessage);		}		private function log():void {			if (ExternalInterface.available) {				ExternalInterface.call('console.log', arguments);			} else {				trace(arguments);			}		}	}}