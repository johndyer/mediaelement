﻿package {		import flash.display.LoaderInfo;	import flash.display.Sprite;	import flash.net.NetConnection;	import flash.net.NetStream;	import flash.media.Video;	import flash.media.SoundTransform;	import flash.utils.Timer;			import flash.display.*;	import flash.events.*;	import flash.media.*;	import flash.net.*;	import flash.text.*;	import flash.system.*;	import flash.external.*;		import flash.media.Sound;	import flash.media.SoundChannel;	import flash.media.SoundTransform;		import flash.net.URLRequest;	import flash.utils.Timer;		public class VideoElement extends Sprite {				private var _request:URLRequest = null;				private var _connection:NetConnection;		private var _stream:NetStream;		private var _video:Video;		private var _display:Sprite;		private var _soundTransform:SoundTransform;		private var _oldVolume:Number = 1;				private var _isPaused:Boolean = true;		private var _isLoaded:Boolean = false;		private var _isPlaying:Boolean = false;		private var _isEnded:Boolean = false;		private var _isMuted:Boolean = false;		private var _preload:String = "";				private var _isConnected:Boolean = false;		private var _playWhenConnected:Boolean = false;		private var _hasStartedPlaying:Boolean = false;				private var _isPreloading:Boolean = false;						private var _framerate:Number = 0;		private var _bytesLoaded:Number = 0;		private var _bytesTotal:Number = 0;		private var _bufferedTime:Number = 0;		private var _bufferEmpty:Boolean = false;		private var _videoWidth:Number = -1;		private var _videoHeight:Number = -1;						private var _src:String = '';		private var _volume:Number = 1;		private var _currentTime:Number = 0;		private var _duration:Number = 0;				private var _timer:Timer;				private var _id:String;				// RTMP stuff		private var _isRTMP:Boolean = false;		private var _rtmpInfo:Object = null;		private var _streamer:String = "";		private var _pseudoStreamingEnabled:Boolean = false;		private var _pseudoStreamingStartQueryParam:String = "start";								// native video size (from meta data)		private var _nativeVideoWidth:Number = 0;		private var _nativeVideoHeight:Number = 0;				private var _stageWidth:Number;		private var _stageHeight:Number;				public function VideoElement() {						var flashVars:Object = LoaderInfo(this.root.loaderInfo).parameters;						_id = flashVars.uid // parseFloat(flashVars.uid) || 0;						// stage setup			stage.align = StageAlign.TOP_LEFT;			stage.scaleMode = StageScaleMode.NO_SCALE;			_stageWidth = stage.stageWidth;			_stageHeight = stage.stageHeight;						stage.addEventListener(Event.RESIZE, stageResizeHandler);			stage.addEventListener(MouseEvent.MOUSE_DOWN, stageClickHandler);			stage.addEventListener(MouseEvent.MOUSE_OVER , stageMouseOverHandler);			stage.addEventListener(Event.MOUSE_LEAVE, stageMouseLeaveHandler);									// video setup			_display = new Sprite();			addChild(_display);						_video = new Video();			_display.addChild(_video);			_display.addEventListener(MouseEvent.MOUSE_OVER, stageMouseOverHandler);						_display.x = _video.x = 0;			_display.y = _video.y = 0;			_display.width = _video.width = _stageWidth;			_display.height = _video.height = _stageHeight;						_connection = new NetConnection();			_connection.client = { onBWDone: function():void{} };			_connection.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler);			_connection.addEventListener(SecurityErrorEvent.SECURITY_ERROR, securityErrorHandler);										_timer = new Timer(250);			_timer.addEventListener(TimerEvent.TIMER, timerHander);									if (ExternalInterface.available) {							ExternalInterface.addCallback('get_src', get_src);				ExternalInterface.addCallback('get_volume',get_volume);				ExternalInterface.addCallback('get_currentTime', get_currentTime);				ExternalInterface.addCallback('get_muted', get_muted);						ExternalInterface.addCallback('get_buffered', get_buffered);						ExternalInterface.addCallback('get_duration', get_duration);							ExternalInterface.addCallback('get_paused', get_paused);				ExternalInterface.addCallback('get_ended', get_ended);											ExternalInterface.addCallback('set_src', set_src);				ExternalInterface.addCallback('set_volume', set_volume);				ExternalInterface.addCallback('set_currentTime', set_currentTime);				ExternalInterface.addCallback('set_muted', set_muted);						//ExternalInterface.addCallback('set_duration', set_duration);						//ExternalInterface.addCallback('set_paused', set_paused);											ExternalInterface.addCallback('fire_load', fire_load);				ExternalInterface.addCallback('fire_play', fire_play);				ExternalInterface.addCallback('fire_pause', fire_pause);				ExternalInterface.addCallback('fire_setSize', fire_setSize);				ExternalInterface.addCallback('fire_stop', fire_stop);				ExternalInterface.call('__ready__' + _id);			}					}				private function log():void {			if (ExternalInterface.available) {								ExternalInterface.call('console.log', arguments);							} else {				trace(arguments);			}					}						private function fire_setSize(width:Number, height:Number):void {								_stageWidth = width;			_stageHeight = height;						repositionVideo();		}										private function fire_load():void {			if (!_isLoaded && _src) {						// disconnect existing stream and connection				if (_isConnected && _stream) {					_stream.pause();					_stream.close();					_connection.close();				}				_isConnected = false;				_isPreloading = false;						_isPaused = true;				_isEnded = false;				_bufferEmpty = false;								log('load', _src, _isRTMP);									if (_isRTMP) {					//var rtmpInfo:Object = parseRTMP(_src);										/*					if (_streamer != "") {						rtmpInfo.server = _streamer;						rtmpInfo.stream = _src;										}					*/									_connection.connect(_rtmpInfo.server);				} else {					_connection.connect(null);				}												// in a few moments the "NetConnection.Connect.Success" event will fire				// and call createConnection which finishes the "load" sequence				sendEvent("loadstart");			}		}				private function parseRTMP(url:String):Object {					var match:Array = url.match(/(.*)\/((flv|mp4|mp3):.*)/);			var rtmpInfo:Object = {				server: null,				stream: null			};						if (match) {				rtmpInfo.server = match[1];				rtmpInfo.stream = match[2];			} else {				rtmpInfo.server = url.replace(/\/[^\/]+$/,"/");				rtmpInfo.stream = url.split("/").pop();			}						log("RTMP info = server: " + rtmpInfo.server + " stream: " + rtmpInfo.stream);						return rtmpInfo;		}					private function getUrlPosition(pos:Number):String {			var url:String = _src;						if (_pseudoStreamingEnabled) {				if (url.indexOf('?') > -1) {					url = url + '&' + _pseudoStreamingStartQueryParam + '=' + pos;				}				else {					url = url + '?' + _pseudoStreamingStartQueryParam + '=' + pos;				}			}			return url;		}							private function fire_play():void {						log("fire_play", "_hasStartedPlaying", _hasStartedPlaying, "_isConnected", _isConnected, "_isPaused", _isPaused, "_isEnded", _isEnded);						// if .src has been set, but .load() hasn't been called...			if (!_hasStartedPlaying && !_isConnected) {				_playWhenConnected = true;				fire_load();				return;			}						if (_hasStartedPlaying) {				if (_isEnded) {					_stream.seek(0);				}												if (_isPaused) {					_stream.resume();					_timer.start();					_isPaused = false;					sendEvent("play");					sendEvent("playing");				}			} else {				if (_isRTMP) {					//var rtmpInfo:Object = parseRTMP(_src);					_stream.play(_rtmpInfo.stream);								} else {									_stream.play(getUrlPosition(0));					//_stream.play(_src); 				}								_timer.start();				_isPaused = false;				_hasStartedPlaying = true;								// don't toss play/playing events here, because we haven't sent a 				// canplay / loadeddata event yet. that'll be handled in the net				// event listener			}		}				private function fire_pause():void {						ExternalInterface.call('console.log', _id, 'fire_pause');						if (_stream == null)				return;			_stream.pause();			_isPaused = true;						if (_bytesLoaded == _bytesTotal) {				_timer.stop();			}			_isPaused = true;			sendEvent("pause");		}		public function fire_stop():void {			if (_stream == null)				return;						_stream.close();			_isPaused = false;			_timer.stop();			sendEvent("stop");		}										// src		private function set_src(value:String = ''):void {						if (_isConnected && _stream) {				// stop and restart				_stream.pause();							}			_src = value;			_isConnected = false;			_hasStartedPlaying = false;				_isLoaded = false;						_isRTMP = !!_src.match(/^rtmp(s|t|e|te)?\:\/\//) || _streamer != "";			if (_isRTMP) {				_rtmpInfo = parseRTMP(_src);			}		}				private function get_src():String {			return _src;		}			// paused		private function set_paused(value:*):void {			// do nothing		}		private function get_paused():Boolean {			return _isPaused;		}				// muted		private function set_muted(value:*):void {			if (_isConnected && _stream) {								if (value == true) {					// store the old value to restore later					_oldVolume = _volume;										_isMuted = true;					set_volume(0);									} else {										_isMuted = false;										if (_oldVolume > 0) {						set_volume(_oldVolume);					} else {						set_volume(1);					}														}											}				}		private function get_muted():Boolean {			return _isMuted;		}				// volume				private function set_volume(value:Number = NaN):void {			if (!isNaN(value)) {								if (_stream != null) {					_soundTransform = new SoundTransform(value);					_stream.soundTransform = _soundTransform;								}								_volume = value;					//_isMuted = (_volume == 0);					sendEvent("volumechange");			}		}		private function get_volume():Number {			return _volume;		}						// currentTime		private function set_currentTime(value:Number = NaN):void {						if (_stream == null)				return;						sendEvent("seeking");			_stream.seek(value);			sendEvent("timeupdate");		}				private function get_currentTime():Number {			if (_stream != null) {				return _stream.time;			} else {				return 0;			}		}				// duration		private function set_duration(value:*):void {			// do nothing		}			private function get_duration():Number {			return _duration;		}						private function get_buffered():Number {						if (_bytesTotal > 0) {				return _bytesLoaded / _bytesTotal * _duration;			} else {				return 0;			}		}		private function get_ended():Boolean {			return _isEnded;		}						//// INERTNAL ///		private function connectStream():void {			log("connectStream");						_stream = new NetStream(_connection);								// explicitly set the sound since it could have come before the connection was made			_soundTransform = new SoundTransform(_volume);			_stream.soundTransform = _soundTransform;												_stream.addEventListener(NetStatusEvent.NET_STATUS, netStatusHandler); // same event as connection			_stream.addEventListener(AsyncErrorEvent.ASYNC_ERROR, asyncErrorHandler);			var customClient:Object = new Object();			customClient.onMetaData = metaDataHandler;			_stream.client = customClient;			_video.attachNetStream(_stream);						// start downloading without playing )based on preload and play() hasn't been called)			// I wish flash had a load() command to make this less awkward			/*			if (_preload != "none" && !_playWhenConnected) {				_isPaused = true;				_stream.play(_src, 0, 0);				_stream.pause();								_isPreloading = true;			}			*/						_isConnected = true;			if (_playWhenConnected && !_hasStartedPlaying) {				fire_play();				_playWhenConnected = false;			}		}					private function repositionVideo(fullscreen:Boolean = false):void {			//_output.appendText("positioning video\n");					if (isNaN(_nativeVideoWidth) || isNaN(_nativeVideoHeight) || _nativeVideoWidth <= 0 || _nativeVideoHeight <= 0) {				//_output.appendText("ERR: I dont' have the native dimension\n");				return;			}			// calculate ratios			var stageRatio:Number, nativeRatio:Number;						_video.x = 0;			_video.y = 0;								if (fullscreen == true) {				stageRatio = flash.system.Capabilities.screenResolutionX/flash.system.Capabilities.screenResolutionY;				nativeRatio = _nativeVideoWidth/_nativeVideoHeight;						// adjust size and position				if (nativeRatio > stageRatio) {					_display.width = _video.width = flash.system.Capabilities.screenResolutionX;					_display.height = _video.height = _nativeVideoHeight * flash.system.Capabilities.screenResolutionX / _nativeVideoWidth;					_display.y = _video.y = flash.system.Capabilities.screenResolutionY/2 - _video.height/2;				} else if (stageRatio > nativeRatio) {					_display.width = _video.width = _nativeVideoWidth * flash.system.Capabilities.screenResolutionY / _nativeVideoHeight;					_display.height = _video.height = flash.system.Capabilities.screenResolutionY;										_display.x = _video.x = flash.system.Capabilities.screenResolutionX/2 - _video.width/2;				} else if (stageRatio == nativeRatio) {					_display.width = _video.width = flash.system.Capabilities.screenResolutionX;					_display.height = _video.height = flash.system.Capabilities.screenResolutionY;				}							} else {				stageRatio = _stageWidth/_stageHeight;				nativeRatio = _nativeVideoWidth/_nativeVideoHeight;								// adjust size and position				if (nativeRatio > stageRatio) {					_display.width = _video.width = _stageWidth;					_display.height = _video.height = _nativeVideoHeight * _stageWidth / _nativeVideoWidth;										_display.y = _video.y = _stageHeight/2 - _video.height/2;				} else if (stageRatio > nativeRatio) {					_display.width = _video.width = _nativeVideoWidth * _stageHeight / _nativeVideoHeight;					_display.height = _video.height = _stageHeight;					_display.x = _video.x = _stageWidth/2 - _video.width/2;				} else if (stageRatio == nativeRatio) {					_display.width = _video.width = _stageWidth;					_display.height = _video.height = _stageHeight;				}							}			//positionControls();		}								//// EVENTS ////				private function ioErrorHandler(event:Event):void {						//ExternalInterface.call('console.log', 'ioErrorHandler');			//ExternalInterface.call('console.log', event);						sendEvent("error");		}					private function timerHander(event:TimerEvent):void {						_bytesLoaded = _stream.bytesLoaded;			_bytesTotal = _stream.bytesTotal;						if (!_isPaused)				sendEvent("timeupdate");			if (_bytesLoaded < _bytesTotal)				sendEvent("progress");					}				private function _idHandler(value:String = ""):Boolean {			return (value === _id);		}		private function soundCompleteHandler(e:Event):void {			handleEnded();		}		private function handleEnded():void {			_timer.stop();			_currentTime = 0;			_isEnded = true;			sendEvent("ended");		}					private function metaDataHandler(info:Object):void {						// store main info			_duration = info.duration;			_framerate = info.framerate;			_videoWidth = info.width;			_videoHeight = info.height;			// reposition			_nativeVideoWidth = _video.videoWidth;			_nativeVideoHeight = _video.videoHeight;			repositionVideo();			sendEvent("loadedmetadata");						if (_isPreloading) {								_stream.pause();				_isPaused = true;				_isPreloading = false;								sendEvent("progress");				sendEvent("timeupdate");						}					}						// internal events		private function netStatusHandler(event:NetStatusEvent):void {			trace("netStatus", event.info.code);						log("netStatus", event.info.code.toString());			switch (event.info.code) {				case "NetStream.Buffer.Empty":					_bufferEmpty = true;					if (_isEnded) {						sendEvent("ended");					}					break;				case "NetStream.Buffer.Full":					_bytesLoaded = _stream.bytesLoaded;					_bytesTotal = _stream.bytesTotal;					_bufferEmpty = false;					sendEvent("progress");					break;				case "NetConnection.Connect.Success":					connectStream();					break;									case "NetStream.Play.StreamNotFound":					trace("Unable to locate video");					break;				// STREAM				case "NetStream.Play.Start":									_isPaused = false;					sendEvent("loadeddata");					sendEvent("canplay");										if (!_isPreloading) {						sendEvent("play");						sendEvent("playing");					}										_timer.start();										break;				case "NetStream.Seek.Notify":					sendEvent("seeked");					break;				case "NetStream.Pause.Notify":					_isPaused = true;					sendEvent("pause");					break;				case "NetStream.Play.Stop":					if (_hasStartedPlaying) {						_isEnded = true;						_isPaused = false;						_timer.stop();						if (_bufferEmpty) {							sendEvent("ended");						}					}					break;			}		}						private function securityErrorHandler(event:SecurityErrorEvent):void {			trace("securityErrorHandler: " + event);		}		private function asyncErrorHandler(event:AsyncErrorEvent):void {			// ignore AsyncErrorEvent events.		}		private function stageClickHandler(e:MouseEvent):void {			sendEvent("click");		}		private function stageMouseOverHandler(e:MouseEvent):void {			//ExternalInterface.call('console.log', 'flash mouseover');			sendEvent("mouseover");		}		private function stageMouseLeaveHandler(e:Event):void {			//ExternalInterface.call('console.log', 'flash mouseout');			sendEvent("mouseout");			sendEvent("mouseleave");					}						private function stageResizeHandler(e:Event):void {			repositionVideo();		}						private function sendEvent(eventName:String):void {			//ExternalInterface.call('console.log', 'event', _id, eventName);						// TODO: export all values?			ExternalInterface.call('__event__' + _id, eventName);		}					}}