/**
 * jwplayer.html5 namespace
 * 
 * @author pablo
 * @version 6.0
 */
(function(jwplayer) {
	var html5 = jwplayer.html5, 
		utils = jwplayer.utils, 
		events = jwplayer.events, 
		states = events.state,
		_css = utils.css, 
		_bounds = utils.bounds,
		_isMobile = utils.isMobile(),
		_isIPad = utils.isIPad(),
		_isIPod = utils.isIPod(),
		_isAndroid = utils.isAndroid(),
		_isIOS = utils.isIOS(),
		DOCUMENT = document,
		PLAYER_CLASS = "jwplayer",
		ASPECT_MODE = "aspectMode",
		FULLSCREEN_SELECTOR = "."+PLAYER_CLASS+".jwfullscreen",
		VIEW_MAIN_CONTAINER_CLASS = "jwmain",
		VIEW_INSTREAM_CONTAINER_CLASS = "jwinstream",
		VIEW_VIDEO_CONTAINER_CLASS = "jwvideo", 
		VIEW_CONTROLS_CONTAINER_CLASS = "jwcontrols",
		VIEW_ASPECT_CONTAINER_CLASS = "jwaspect",
		VIEW_PLAYLIST_CONTAINER_CLASS = "jwplaylistcontainer",

		/*************************************************************
		 * Player stylesheets - done once on script initialization;  *
		 * These CSS rules are used for all JW Player instances      *
		 *************************************************************/

		TRUE = true,
		FALSE = false,
		
		isAllowLogoDisplay = true;
		
		JW_CSS_SMOOTH_EASE = "opacity .25s ease",
		JW_CSS_100PCT = "100%",
		JW_CSS_ABSOLUTE = "absolute",
		JW_CSS_IMPORTANT = " !important",
		JW_CSS_HIDDEN = "hidden",
		JW_CSS_NONE = "none",
		JW_CSS_BLOCK = "block";

	html5.view = function(api, model) {
		var _api = api,
			_model = model, 
			_playerElement,
			_container,
			_controlsLayer,
			_aspectLayer,
			_playlistLayer,
			_controlsTimeout = -1,
			_timeoutDuration = _isMobile ? 4000 : 2000,
			_videoTag,
			_videoLayer,
			_lastWidth,
			_lastHeight,
			_instreamLayer,
			_instreamControlbar,
			_instreamDisplay,
			_instreamModel,
			_instreamMode = FALSE,
			_controlbar,
			_display,
			_dock,
			_logo,
			_logoConfig = utils.extend({}, _model.config.logo),
			_captions,
			_playlist,
			_audioMode,
			_errorState = FALSE,
			_showing = FALSE,
			_replayState,
			_readyState,
			_rightClickMenu,
			_resizeMediaTimeout = -1,
			_inCB = FALSE,
			_currentState,
			_eventDispatcher = new events.eventdispatcher();

		utils.extend(this, _eventDispatcher);

		function _init() {

			_playerElement = _createElement("div", PLAYER_CLASS + " playlist-" + _model.playlistposition);
			_playerElement.id = _api.id;
			
			if (_model.aspectratio) {
				_css.style(_playerElement, {
					display: 'inline-block'
				});
				_playerElement.className = _playerElement.className.replace(PLAYER_CLASS, PLAYER_CLASS + " " + ASPECT_MODE);
			}

			_resize(_model.width, _model.height);
			
			var replace = DOCUMENT.getElementById(_api.id);
			replace.parentNode.replaceChild(_playerElement, replace);
		}

		this.getCurrentCaptions = function() {
			return _captions.getCurrentCaptions();
		};

		this.setCurrentCaptions = function(caption) {
			_captions.setCurrentCaptions(caption);
		};

		this.getCaptionsList = function() {
			return _captions.getCaptionsList();
		};		
		
		function _responsiveListener() {
			var bounds = _bounds(_playerElement), 
				containerWidth = Math.round(bounds.width),
				containerHeight = Math.round(bounds.height);
			if (!DOCUMENT.body.contains(_playerElement)) {
				window.removeEventListener('resize', _responsiveListener);
				if (_isMobile) {
					window.removeEventListener("orientationchange", _responsiveListener);
				}
			} else if (containerWidth && containerHeight) {
				if (containerWidth !== _lastWidth || containerHeight !== _lastHeight) {
					_lastWidth = containerWidth;
					_lastHeight = containerHeight;
					if (_display) {
						_display.redraw();
					}
					clearTimeout(_resizeMediaTimeout);
					_resizeMediaTimeout = setTimeout(_resizeMedia, 50);
					_eventDispatcher.sendEvent(events.JWPLAYER_RESIZE, {
						width : containerWidth,
						height : containerHeight
					});
				}
			}
			return bounds;
		}

		
		this.setup = function(skin) {
			if (_errorState) return;
			_api.skin = skin;
			
			_container = _createElement("span", VIEW_MAIN_CONTAINER_CLASS);
			_container.id = _api.id + "_view";
			_videoLayer = _createElement("span", VIEW_VIDEO_CONTAINER_CLASS);
			
			_videoTag = _model.getVideo().getTag();
			_videoLayer.appendChild(_videoTag);
			_controlsLayer = _createElement("span", VIEW_CONTROLS_CONTAINER_CLASS);
			_instreamLayer = _createElement("span", VIEW_INSTREAM_CONTAINER_CLASS);
			_playlistLayer = _createElement("span", VIEW_PLAYLIST_CONTAINER_CLASS);
			_aspectLayer = _createElement("span", VIEW_ASPECT_CONTAINER_CLASS);

			_setupControls();
			
			_container.appendChild(_videoLayer);
			_container.appendChild(_controlsLayer);
			_container.appendChild(_instreamLayer);
			
			_playerElement.appendChild(_container);
			_playerElement.appendChild(_aspectLayer);
			_playerElement.appendChild(_playlistLayer);

			DOCUMENT.addEventListener('webkitfullscreenchange', _fullscreenChangeHandler, FALSE);
			_videoTag.addEventListener('webkitbeginfullscreen', _fullscreenChangeHandler, FALSE);
			_videoTag.addEventListener('webkitendfullscreen', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('mozfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('MSFullscreenChange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.addEventListener('keydown', _keyHandler, FALSE);
			
			window.removeEventListener('resize', _responsiveListener);
			window.addEventListener('resize', _responsiveListener, false);
			if (_isMobile) {
				window.removeEventListener("orientationchange", _responsiveListener);
				window.addEventListener("orientationchange", _responsiveListener, false);
			}
			
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_READY, _readyHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYER_STATE, _stateHandler);
			_api.jwAddEventListener(events.JWPLAYER_MEDIA_ERROR, _errorHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_COMPLETE, _playlistCompleteHandler);
			_api.jwAddEventListener(events.JWPLAYER_PLAYLIST_ITEM,_playlistItemHandler);
			_stateHandler({newstate:states.IDLE});
			
			if (!_isMobile) {
				_controlsLayer.addEventListener('mouseout', function() {
					clearTimeout(_controlsTimeout);
					_controlsTimeout = setTimeout(_hideControls, 10);
				}, FALSE);
				
				_controlsLayer.addEventListener('mousemove', _startFade, FALSE);
				if (utils.isIE()) {
					// Not sure why this is needed
					_videoLayer.addEventListener('mousemove', _startFade, FALSE);
					_videoLayer.addEventListener('click', _display.clickHandler);
				}
			} 
			_componentFadeListeners(_controlbar);
			_componentFadeListeners(_dock);
			_componentFadeListeners(_logo);

			_css('#' + _playerElement.id + '.' + ASPECT_MODE + " ." + VIEW_ASPECT_CONTAINER_CLASS, {
				"margin-top": _model.aspectratio,
				display: JW_CSS_BLOCK
			});

			var ar = utils.exists (_model.aspectratio) ? parseFloat(_model.aspectratio) : 100,
				size = _model.playlistsize;
			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_ASPECT_CONTAINER_CLASS, {
				"margin-bottom": -1 * size * (ar/100) + "px"
			});

			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_PLAYLIST_CONTAINER_CLASS, {
				width: size + "px",
				right: 0,
				top: 0,
				height: "100%"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_ASPECT_CONTAINER_CLASS, {
				"padding-bottom": size + "px"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_PLAYLIST_CONTAINER_CLASS, {
				width: "100%",
				height: size + "px",
				bottom: 0
			});

			_css('#' + _playerElement.id + '.playlist-right .' + VIEW_MAIN_CONTAINER_CLASS, {
				right: size + "px"
			});

			_css('#' + _playerElement.id + '.playlist-bottom .' + VIEW_MAIN_CONTAINER_CLASS, {
				bottom: size + "px"
			});

			setTimeout(function() { 
				_resize(_model.width, _model.height);
			}, 0);
		};
		
		function _componentFadeListeners(comp) {
			if (comp) {
				comp.element().addEventListener('mousemove', _cancelFade, FALSE);
				comp.element().addEventListener('mouseout', _resumeFade, FALSE);
			}
		}
	
	    function _captionsLoadedHandler(evt) {
	        
	        //ios7captions
	        //_model.getVideo().addCaptions(evt.captionData,_model.fullscreen, _api.jwGetCurrentCaptions());
	    }
	
	
		function _createElement(elem, className) {
			var newElement = DOCUMENT.createElement(elem);
			if (className) newElement.className = className;
			return newElement;
		}
		
		function _touchHandler() {
			if (_isMobile) {
				if (_showing) {
					_hideControls();
				} else {
					_showControls();
				}
			} else {
				_stateHandler(_api.jwGetState());
			}
			if (_showing) {
				_resetTapTimer();
			}
		}

		function _resetTapTimer() {
			clearTimeout(_controlsTimeout);
			_controlsTimeout = setTimeout(_hideControls, _timeoutDuration);
		}
		
		function _startFade() {
			clearTimeout(_controlsTimeout);
			if (_api.jwGetState() == states.PAUSED || _api.jwGetState() == states.PLAYING) {
				_showControls();
				if (!_inCB) {
					_controlsTimeout = setTimeout(_hideControls, _timeoutDuration);
				}
			}
		}
		
		function _cancelFade() {
			clearTimeout(_controlsTimeout);
			_inCB = TRUE;
		}
		
		function _resumeFade() {
			_inCB = FALSE;
		}
		
		function forward(evt) {
			_eventDispatcher.sendEvent(evt.type, evt);
		}
		
		function _setupControls() {
			var height = _model.height,
				cbSettings = _model.componentConfig('controlbar'),
				displaySettings = _model.componentConfig('display');

			_checkAudioMode(height);

			_captions = new html5.captions(_api, _model.captions);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_LIST, forward);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_CHANGED, forward);
			_captions.addEventListener(events.JWPLAYER_CAPTIONS_LOADED, _captionsLoadedHandler);
			_controlsLayer.appendChild(_captions.element());

			_display = new html5.display(_api, displaySettings);
			_display.addEventListener(events.JWPLAYER_DISPLAY_CLICK, function(evt) {
				forward(evt);
				_touchHandler();
				});
			if (_audioMode) _display.hidePreview(TRUE);
			_controlsLayer.appendChild(_display.element());
			//console.log("jwplayer.html5.view--------_logoConfig-----"+JSON.stringify(_logoConfig));
			_logo = new html5.logo(_api, _logoConfig);
			_controlsLayer.appendChild(_logo.element());
			
			_dock = new html5.dock(_api, _model.componentConfig('dock'));
			_controlsLayer.appendChild(_dock.element());
			
			if (_api.edition && !_isMobile) {
				_rightClickMenu = new html5.rightclick(_api, {abouttext: _model.abouttext, aboutlink: _model.aboutlink});	
			}
			else if (!_isMobile) {
				_rightClickMenu = new html5.rightclick(_api, {});
			}
			
			if (_model.playlistsize && _model.playlistposition && _model.playlistposition != JW_CSS_NONE) {
				_playlist = new html5.playlistcomponent(_api, {});
				_playlistLayer.appendChild(_playlist.element());
			}
			

			_controlbar = new html5.controlbar(_api, cbSettings);
			_controlbar.addEventListener(events.JWPLAYER_USER_ACTION, _resetTapTimer);
			_controlsLayer.appendChild(_controlbar.element());
			
			if (_isIPod) _hideControlbar();
		}

		/** 
		 * Switch to fullscreen mode.  If a native fullscreen method is available in the browser, use that.  
		 * Otherwise, use the false fullscreen method using CSS. 
		 **/
		var _fullscreen = this.fullscreen = function(state) {
			if (!utils.exists(state)) {
				state = !_model.fullscreen;
			}

			if (state) {
				if (_isAudioFile()) return;
				
				//ios7captions
				//_model.getVideo().fsCaptions(state,_api.jwGetCurrentCaptions());
				if (_isMobile) {
					try {
						_videoTag.webkitEnterFullScreen();
						_model.setFullscreen(TRUE);
					} catch(e) {
						//object can't go fullscreen
						return;
					}
				} else if (!_model.fullscreen) {
					_fakeFullscreen(TRUE);
					if (_playerElement.requestFullScreen) {
						_playerElement.requestFullScreen();
					} else if (_playerElement.mozRequestFullScreen) {
						_playerElement.mozRequestFullScreen();
					} else if (_playerElement.webkitRequestFullScreen) {
						_playerElement.webkitRequestFullScreen();
					} else if (_playerElement.msRequestFullscreen) {
						_playerElement.msRequestFullscreen();
					}
					_model.setFullscreen(TRUE);
				
				}
			} else {
			    
			    //commenting out ios7 support
			    //var curr = _model.getVideo().fsCaptions(state,_api.jwGetCurrentCaptions());
                //if (curr)
                 //   _api.jwSetCurrentCaptions(curr+1);
                //else 
                //    _api.jwSetCurrentCaptions(0);
				if (_isMobile) {
					_videoTag.webkitExitFullScreen();
					_model.setFullscreen(FALSE);
					if(_isIPad) {
                        _videoTag.controls = FALSE;
					}
				} else if (_model.fullscreen) {

					_fakeFullscreen(FALSE);
					_model.setFullscreen(FALSE);
					if (DOCUMENT.cancelFullScreen) {  
						DOCUMENT.cancelFullScreen();  
					} else if (DOCUMENT.mozCancelFullScreen) {  
						DOCUMENT.mozCancelFullScreen();  
					} else if (DOCUMENT.webkitCancelFullScreen) {  
						DOCUMENT.webkitCancelFullScreen();  
					} else if (DOCUMENT.msExitFullscreen) {
						DOCUMENT.msExitFullscreen();
					}
				}
				if (_isIPad && _api.jwGetState() == states.PAUSED) {
					setTimeout(_showDisplay, 500);
				}
			}

			_redrawComponent(_controlbar);
			_redrawComponent(_display);
			_redrawComponent(_dock);
			_resizeMedia();

			if (_model.fullscreen) {
				// Browsers seem to need an extra second to figure out how large they are in fullscreen...
				clearTimeout(_resizeMediaTimeout);
				_resizeMediaTimeout = setTimeout(_resizeMedia, 200);
			}
			
		};
		

		
		function _redrawComponent(comp) {
			if (comp) comp.redraw();
		}

		/**
		 * Resize the player
		 */
		function _resize(width, height, resetAspectMode) {
			var className = _playerElement.className,
				playerStyle,
				playlistStyle,
				containerStyle,
				playlistSize,
				playlistPos,
				id = _api.id + '_view';
			_css.block(id);

			// when jwResize is called remove aspectMode and force layout
			resetAspectMode = !!resetAspectMode;
			if (resetAspectMode) {
				className = className.replace(/\s*aspectMode/, '');
				if (_playerElement.className !== className) {
					_playerElement.className = className;
				}
				_css.style(_playerElement, {
					display: JW_CSS_BLOCK
				}, resetAspectMode);
			}
			
			if (utils.exists(width) && utils.exists(height)) {
				_model.width = width;
				_model.height = height;
			}
			
			playerStyle = { width: width };
			if (className.indexOf(ASPECT_MODE) == -1) {
				playerStyle.height = height;
			}
			_css.style(_playerElement, playerStyle, true);

			if (_display) {
				_display.redraw();
			}
			if (_controlbar) {
				_controlbar.redraw(TRUE);
			}
			if (_logo) {
				_logo.offset(_controlbar && _logo.position().indexOf("bottom") >= 0 ? _controlbar.height() + _controlbar.margin() : 0);
				setTimeout(function() {
					if (_dock) {
						_dock.offset(_logo.position() == "top-left" ? _logo.element().clientWidth + _logo.margin() : 0);
					}
				}, 500);
			}
			
			_checkAudioMode(height);

			playlistSize = _model.playlistsize;
			playlistPos = _model.playlistposition;
			if (_playlist && playlistSize && (playlistPos == "right" || playlistPos == "bottom")) {
				_playlist.redraw();
				
				playlistStyle = {
					display: JW_CSS_BLOCK
				};
				containerStyle = {};

				playlistStyle[playlistPos] = 0;
				containerStyle[playlistPos] = playlistSize;
				
				if (playlistPos == "right") {
					playlistStyle.width = playlistSize;
				} else {
					playlistStyle.height = playlistSize;
				}
				
				_css.style(_playlistLayer, playlistStyle);
				_css.style(_container, containerStyle);
			}

			// pass width, height from jwResize if present 
			_resizeMedia(width, height);

			_css.unblock(id);
		}
		
		function _checkAudioMode(height) {
			_audioMode = _isAudioMode(height);
			if (_controlbar) {
				if (_audioMode) {
					_controlbar.audioMode(TRUE);
					_showControls();
					_display.hidePreview(TRUE);
					_hideDisplay();
					_showVideo(FALSE);
				} else {
					_controlbar.audioMode(FALSE);
					_updateState(_api.jwGetState());
				}
			}
			if (_logo && _audioMode) {
				_hideLogo();
			}
			_playerElement.style.backgroundColor = _audioMode ? 'transparent' : '#000';
		}
		
		function _isAudioMode(height) {
			var bounds = _bounds(_playerElement);
			if (height.toString().indexOf("%") > 0)
				return FALSE;
			else if (bounds.height === 0)
				return FALSE;
			else if (_model.playlistposition == "bottom")
				return bounds.height <= 40 + _model.playlistsize;
			return bounds.height <= 40;
		}
		
		function _resizeMedia(width, height) {
			if (_videoTag) {
				if (!width || isNaN(Number(width))) {
					width  = _videoLayer.clientWidth;
				}
				if (!height || isNaN(Number(height))) {
					height = _videoLayer.clientHeight;
				}
				var transformScale = utils.stretch(_model.stretching,
					_videoTag, 
					width, height, 
					_videoTag.videoWidth, _videoTag.videoHeight);
				// poll resizing if video is transformed
				if (transformScale) {
					clearTimeout(_resizeMediaTimeout);
					_resizeMediaTimeout = setTimeout(_resizeMedia, 250);
				}
			}
		}
		
		this.resize = function(width, height) {
			var resetAspectMode = true;
			_resize(width, height, resetAspectMode);
			_responsiveListener();
		};
		this.resizeMedia = _resizeMedia;

		var _completeSetup = this.completeSetup = function() {
			_css.style(_playerElement, {
				opacity: 1
			});
		};
		
		/**
		 * Listen for keystrokes while in fullscreen mode.  
		 * ESC returns from fullscreen
		 * SPACE toggles playback
		 **/
		function _keyHandler(evt) {
			if (_model.fullscreen) {
				switch (evt.keyCode) {
				// ESC
				case 27:
					_fullscreen(FALSE);
					break;
				// SPACE
//				case 32:
//					if (_model.state == states.PLAYING || _model.state = states.BUFFERING)
//						_api.jwPause();
//					break;
				}
			}
		}
		
		/**
		 * False fullscreen mode. This is used for browsers without full support for HTML5 fullscreen.
		 * This method sets the CSS of the container element to a fixed position with 100% width and height.
		 */
		function _fakeFullscreen(state) {
			//this was here to fix a bug with iOS resizing from fullscreen, but it caused another bug with android, multiple sources.
			if (_isIOS) return;
			if (state) {
				_playerElement.className += " jwfullscreen";
				(DOCUMENT.getElementsByTagName("body")[0]).style["overflow-y"] = JW_CSS_HIDDEN;
			} else {
				_playerElement.className = _playerElement.className.replace(/\s+jwfullscreen/, "");
				(DOCUMENT.getElementsByTagName("body")[0]).style["overflow-y"] = "";
			}
		}

		/**
		 * Return whether or not we're in native fullscreen
		 */
		function _isNativeFullscreen() {
			var fsElement = DOCUMENT.mozFullScreenElement || 
							DOCUMENT.webkitCurrentFullScreenElement ||
							DOCUMENT.msFullscreenElement ||
							_videoTag.webkitDisplayingFullscreen;
			
			return !!(fsElement && (!fsElement.id || fsElement.id == _api.id));
		}
		
		/**
		 * If the browser enters or exits fullscreen mode (without the view's knowing about it) update the model.
		 **/
		function _fullscreenChangeHandler() {
			var fsNow = _isNativeFullscreen();
			if (_model.fullscreen != fsNow) {
				_fullscreen(fsNow);
			}
			
		}
		
		function _showControlbar() {
			if (_isIPod && !_audioMode) return; 
			if (_controlbar) _controlbar.show();
		}
		
		function _hideControlbar() {
			if (_controlbar && !_audioMode && !_model.getVideo().audioMode()) {
				_controlbar.hide();
			}
		}
		
		function _showDock() {
			if (_dock && !_audioMode && _model.controls) _dock.show();
		}
		function _hideDock() {
			if (_dock && !_replayState && !_model.getVideo().audioMode()) {
				_dock.hide();
			}
		}

		function _showLogo() {
			if (_logo && !_audioMode && isAllowLogoDisplay) {
				_logo.show();
				if(_logo.timeout() > 0){
					window.setTimeout(function(){
						//console.log("_showLogo setTimeout start");
						_logo.hide(true);
						isAllowLogoDisplay = false;
						//console.log("_showLogo setTimeout end");
					}, _logo.timeout() * 1000);
				}
			}
		}
		function _hideLogo() {
			if (_logo && !_model.getVideo().audioMode()) _logo.hide(_audioMode);
		}

		function _showDisplay() {
			if (_display && _model.controls && !_audioMode) {
				if (!_isIPod || _api.jwGetState() == states.IDLE)
					_display.show();
			}

			if (!(_isMobile && _model.fullscreen)) {
				_videoTag.controls = FALSE;
			}
			
		}
		function _hideDisplay() {
			if (_display) {
				_display.hide();
			}
		}

		function _hideControls() {
			clearTimeout(_controlsTimeout);
			_showing = FALSE;

			var state = _api.jwGetState();
			
			if (!model.controls || state != states.PAUSED) {
				_hideControlbar();
			}

			if (!model.controls) {
				_hideDock();
			}

			if (state != states.IDLE && state != states.PAUSED) {
				_hideDock();
				_hideLogo();
			}
		}

		function _showControls() {

			_showing = TRUE;
			if (_model.controls || _audioMode) {
				if (!(_isIPod && _currentState == states.PAUSED)) {
					_showControlbar();
					_showDock();
				}
			}
			if (!_logoConfig.hide) _showLogo();

		}

		function _showVideo(state) {
			state = state && !_audioMode;
			if (state || _isAndroid) {
				// Changing visibility to hidden on Android < 4.2 causes 
				// the pause event to be fired. This causes audio files to 
				// become unplayable. Hence the video tag is always kept 
				// visible on Android devices.
				_css.style(_videoLayer, {
					visibility: "visible",
					opacity: 1
				});
			}
			else {
				_css.style(_videoLayer, {
					visibility: JW_CSS_HIDDEN,
					opacity: 0
				});		
			}
		}

		function _playlistCompleteHandler() {
			_replayState = TRUE;
			_fullscreen(FALSE);
			if (_model.controls) {
				_showDock();
			}
		}
		
		
	    function _playlistItemHandler() {
            //ios7 captions:
            //_model.getVideo().resetCaptions();
        }

		function _readyHandler() {
			_readyState = TRUE;
		}

		/**
		 * Player state handler
		 */
		var _stateTimeout;
		
		function _stateHandler(evt) {
			_replayState = FALSE;
			clearTimeout(_stateTimeout);
			_stateTimeout = setTimeout(function() {
				_updateState(evt.newstate);
			}, 100);
		}
		
		function _errorHandler() {
			_hideControlbar();
		}
		
		function _isAudioFile() {
		    var model = _instreamMode ? _instreamModel : _model;
		    return model.getVideo().audioMode()
		}
		
		
		function _updateState(state) {
			_currentState = state;
			switch(state) {
			case states.PLAYING:
				if (!_isAudioFile()) {
					_showVideo(TRUE);
					_resizeMedia();
					_display.hidePreview(TRUE);
					if (_controlbar) _controlbar.hideFullscreen(FALSE);
					_hideControls();
				} else {
					_showVideo(FALSE);
					_display.hidePreview(_audioMode);
					_display.setHiding(TRUE);
					if (_controlbar) {
						_showControls();
						_controlbar.hideFullscreen(TRUE);
					} 
					_showDock();
					_showLogo();
				}
				break;
			case states.IDLE:
				_showVideo(FALSE);
				if (!_audioMode) {
					_display.hidePreview(FALSE);
					_showDisplay();
					_showDock();
					_showLogo();	
					if (_controlbar) _controlbar.hideFullscreen(FALSE);
				}
				break;
			case states.BUFFERING:
				_showDisplay();
				_hideControls();
				if (_isMobile) _showVideo(TRUE);
				break;
			case states.PAUSED:
				_showDisplay();
				_showControls();
				break;
			}
		}
		
		function _internalSelector(className) {
			return '#' + _api.id + (className ? " ." + className : "");
		}
		
		this.setupInstream = function(instreamContainer, instreamControlbar, instreamDisplay, instreamModel) {
			_css.unblock();
			_setVisibility(_internalSelector(VIEW_INSTREAM_CONTAINER_CLASS), TRUE);
			_setVisibility(_internalSelector(VIEW_CONTROLS_CONTAINER_CLASS), FALSE);
			_instreamLayer.appendChild(instreamContainer);
			_instreamControlbar = instreamControlbar;
			_instreamDisplay = instreamDisplay;
			_instreamModel = instreamModel;
			_stateHandler({newstate:states.PLAYING});
			_instreamMode = TRUE;
		};
		
		this.destroyInstream = function() {
			_css.unblock();
			_setVisibility(_internalSelector(VIEW_INSTREAM_CONTAINER_CLASS), FALSE);
			_setVisibility(_internalSelector(VIEW_CONTROLS_CONTAINER_CLASS), TRUE);
			_instreamLayer.innerHTML = "";
			_instreamMode = FALSE;
		};
		
		this.setupError = function(message) {
			_errorState = TRUE;
			jwplayer.embed.errorScreen(_playerElement, message, _model);
			_completeSetup();
		};
		
		function _setVisibility(selector, state) {
			_css(selector, { display: state ? JW_CSS_BLOCK : JW_CSS_NONE });
		}
		
		this.addButton = function(icon, label, handler, id) {
			if (_dock) {
				_dock.addButton(icon, label, handler, id);
				if (_api.jwGetState() == states.IDLE) _showDock();
			}
		};

		this.removeButton = function(id) {
			if (_dock) _dock.removeButton(id);
		};
		
		this.setControls = function(state) {
			var oldstate = _model.controls,
				newstate = state ? TRUE : FALSE;
			_model.controls = newstate;
			if (newstate != oldstate) {

				if (_instreamMode) {
					_hideInstream(!state);
				} else {
				    if (newstate) {
                        _stateHandler({newstate: _api.jwGetState()});
                    } else {
                        _hideControls();
                        _hideDisplay();
                    }
				}
				_eventDispatcher.sendEvent(events.JWPLAYER_CONTROLS, { controls: newstate });
			}
		};
		
		function _hideInstream(hidden) {
			if (hidden) {
				_instreamControlbar.hide();
				_instreamDisplay.hide();
			} else {
				_instreamControlbar.show();
				_instreamDisplay.show();
			}
		}
		
		this.addCues = function(cues) {
			if (_controlbar) _controlbar.addCues(cues);
		};

		this.forceState = function(state) {
			_display.forceState(state);
		};
		
		this.releaseState = function() {
			_display.releaseState(_api.jwGetState());
		};
		
		this.getSafeRegion = function() {
			var bounds = {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			};
			if (!_model.controls) {
				return bounds;
			}
			_controlbar.showTemp();
			_dock.showTemp();
			//_responsiveListener();
			var dispBounds = _bounds(_container),
				dispOffset = dispBounds.top,
				cbBounds = _instreamMode ? _bounds(DOCUMENT.getElementById(_api.id + "_instream_controlbar")) : _bounds(_controlbar.element()),
				dockButtons = _instreamMode ? false : (_dock.numButtons() > 0),
				logoTop = (_logo.position().indexOf("top") === 0),
				dockBounds,
				logoBounds = _bounds(_logo.element());
			if (dockButtons) {
				dockBounds = _bounds(_dock.element());
				bounds.y = Math.max(0, dockBounds.bottom - dispOffset);
			}
			if (logoTop) {
				bounds.y = Math.max(bounds.y, logoBounds.bottom - dispOffset);
			}
			bounds.width = dispBounds.width;
			if (cbBounds.height) {
				bounds.height = (logoTop ? cbBounds.top : logoBounds.top) - dispOffset - bounds.y;
			} else {
				bounds.height = dispBounds.height - bounds.y;
			}
			_controlbar.hideTemp();
			_dock.hideTemp();
			return bounds;
		};

		this.destroy = function () {
			//console.log("jwplayer.html5.view-------this.destroy----1");
			DOCUMENT.removeEventListener('webkitfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('mozfullscreenchange', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('MSFullscreenChange', _fullscreenChangeHandler, FALSE);
			_videoTag.removeEventListener('webkitbeginfullscreen', _fullscreenChangeHandler, FALSE);
			_videoTag.removeEventListener('webkitendfullscreen', _fullscreenChangeHandler, FALSE);
			DOCUMENT.removeEventListener('keydown', _keyHandler, FALSE);
			if (_rightClickMenu) {
				_rightClickMenu.destroy();
			}
			//console.log("jwplayer.html5.view-------this.destroy----2");
		};

		_init();
	};

	// Container styles
	_css('.' + PLAYER_CLASS, {
		position: 'relative',
		// overflow: 'hidden',
		display: 'block',
		opacity: 0,
		'min-height': 0,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_MAIN_CONTAINER_CLASS, {
		position : JW_CSS_ABSOLUTE,
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS + ', .'+ VIEW_CONTROLS_CONTAINER_CLASS, {
		position : JW_CSS_ABSOLUTE,
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		'-webkit-transition': JW_CSS_SMOOTH_EASE,
		'-moz-transition': JW_CSS_SMOOTH_EASE,
		'-o-transition': JW_CSS_SMOOTH_EASE
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS, {
		overflow: JW_CSS_HIDDEN,
		visibility: JW_CSS_HIDDEN,
		opacity: 0,
		cursor: "pointer"
	});

	_css('.' + VIEW_VIDEO_CONTAINER_CLASS + " video", {
		background : 'transparent',
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		position: 'absolute',
		margin: 'auto',
		right: 0,
		left: 0,
		top: 0,
		bottom: 0
	});

	_css('.' + VIEW_PLAYLIST_CONTAINER_CLASS, {
		position: JW_CSS_ABSOLUTE,
		height : JW_CSS_100PCT,
		width: JW_CSS_100PCT,
		display: JW_CSS_NONE
	});
	
	_css('.' + VIEW_INSTREAM_CONTAINER_CLASS, {
		position: JW_CSS_ABSOLUTE,
		top: 0,
		left: 0,
		bottom: 0,
		right: 0,
		display: 'none'
	});


	_css('.' + VIEW_ASPECT_CONTAINER_CLASS, {
		display: 'none'
	});

	_css('.' + PLAYER_CLASS + '.' + ASPECT_MODE , {
		height: 'auto'
	});

	// Fullscreen styles
	
	_css(FULLSCREEN_SELECTOR, {
		width: JW_CSS_100PCT,
		height: JW_CSS_100PCT,
		left: 0, 
		right: 0,
		top: 0,
		bottom: 0,
		'z-index': 1000,
		position: "fixed"
	}, TRUE);

	_css(FULLSCREEN_SELECTOR + ' .'+ VIEW_MAIN_CONTAINER_CLASS, {
		left: 0, 
		right: 0,
		top: 0,
		bottom: 0
	}, TRUE);

	_css(FULLSCREEN_SELECTOR + ' .'+ VIEW_PLAYLIST_CONTAINER_CLASS, {
		display: JW_CSS_NONE
	}, TRUE);
	
	_css('.' + PLAYER_CLASS+' .jwuniform', {
		'background-size': 'contain' + JW_CSS_IMPORTANT
	});

	_css('.' + PLAYER_CLASS+' .jwfill', {
		'background-size': 'cover' + JW_CSS_IMPORTANT,
		'background-position': 'center'
	});

	_css('.' + PLAYER_CLASS+' .jwexactfit', {
		'background-size': JW_CSS_100PCT + " " + JW_CSS_100PCT + JW_CSS_IMPORTANT
	});

})(jwplayer);
