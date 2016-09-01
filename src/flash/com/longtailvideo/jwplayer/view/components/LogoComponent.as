package com.longtailvideo.jwplayer.view.components {
	import com.longtailvideo.jwplayer.events.PlayerStateEvent;
	import com.longtailvideo.jwplayer.player.IPlayer;
	import com.longtailvideo.jwplayer.player.PlayerState;
	import com.longtailvideo.jwplayer.utils.Animations;
	import com.longtailvideo.jwplayer.utils.Logger;
	import com.longtailvideo.jwplayer.utils.RootReference;
	import com.longtailvideo.jwplayer.utils.Strings;
	import com.longtailvideo.jwplayer.view.interfaces.IPlayerComponent;
	
	import flash.display.DisplayObject;
	import flash.display.Loader;
	import flash.events.ErrorEvent;
	import flash.events.Event;
	import flash.events.IOErrorEvent;
	import flash.events.MouseEvent;
	import flash.net.URLRequest;
	import flash.net.navigateToURL;
	import flash.utils.clearTimeout;
	import flash.utils.setTimeout;

	
	public class LogoComponent extends CoreComponent implements IPlayerComponent {
		/** Configuration defaults **/
		protected var defaults:Object = {
			prefix: "./resources/jwplayer",
			file: "logo.png",
			link: 'http://www.visionvera.com/',
			linktarget: "_blank",
			margin: 8, 
			hide: false,
			timeout: 5,
			position: "top-right"
		}
		/** Seconds after fading in to hide logo again **/
		protected var timeout:Number = 2;
		/** Reference to the loader **/
		protected var loader:Loader;
		/** Animations handler **/
		protected var animations:Animations;
		/** Whether the buffer icon has been shown for this item **/
		protected var _alreadyShown:Boolean = false;
		/** Whether the logo is currently visible **/
		protected var _showing:Boolean = false;
		
		/** Dimensions **/
		protected var _width:Number;
		protected var _height:Number;
		
		/** Constructor **/
		public function LogoComponent(player:IPlayer) {
			//player.config.
			super(player, "logo");
			animations = new Animations(this);
			_player = player;
			
			var linkFlag:String = _getLinkFlag(_getEdition());
			Logger.log("Logo LogoComponent before setLogoOption player.config.logo = " + player.config.logo);
			setLogoOption(player.config.logo);
			//defaults.link = 'http://www.visionvera.com/',
			setupDefaults();
			setupMouseEvents();
			loadFile();
			alpha = 0;
			if (getConfigParam('hide').toString().toLowerCase() == "false") {
				Logger.log("Logo show() start .....");
				show();
			}
		}

		private function setLogoOption(logo:Object):void {
			Logger.log("Logo LogoComponent setLogoOption logo = " + logo);
			if(logo){
				for (var i:* in logo) {
					Logger.log("Logo LogoComponent setLogoOption logo["+i+"] = " + logo[i]);
					if(logo[i]) {
						defaults[i] = logo[i];
					}
				}
			}
		}
		
		private function _getLinkFlag(edition:String):String {
			switch (edition.toLowerCase()) {
				case "pro":
					return "p";
				case "premium":
					return "r";
				case "ads":
					return "a";
				case "open":
					return "o";
				default:
					return "f";
			}
		}
		
		private function _getEdition():String {
			var edition:String = "";
			try {
				edition = _player['edition'];
			}
			catch(error:Error) {
				edition = "open";
			}
			return edition;		
		}
		
		/**
		 * This method can be overridden to set alternate default values. 
		 */
		protected function setupDefaults():void {
			return;
		}

		protected function setupMouseEvents():void {
			this.mouseChildren = false;
			this.buttonMode = true;
			addEventListener(MouseEvent.CLICK, clickHandler);
			this.mouseEnabled = false;
		}
		
		protected function loadFile():void {
			var versionRE:RegExp = /(\S+)\.(\S+)\./;
			var versionInfo:Array = versionRE.exec(_player.version);
			var prefix:String = getConfigParam('prefix');
			if (getConfigParam('file') && prefix) {
				try {
					if (RootReference.root.loaderInfo.url.indexOf("https://") == 0) {
						prefix = prefix.replace("http://", "https://ssl.");
					}
				} catch(e:Error) {}
				defaults['file'] = prefix + "/" + getConfigParam('file');
			}
			
			if (getConfigParam('file') && RootReference.root.loaderInfo.url.indexOf("http")==0) {
				loader = new Loader();
				loader.contentLoaderInfo.addEventListener(Event.COMPLETE, loaderHandler);
				loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, errorHandler);
				loader.load(new URLRequest(getConfigParam('file')));
			}
		}
		
		/** Logo loaded - add to display **/
		protected function loaderHandler(evt:Event):void {
			//Logger.log("Logo loaderHandler start ...... ");
			if (loader is DisplayObject) {
				addChild(loader);
				resize(_width, _height);
				//outHandler();
			} else {
				Logger.log("Logo was not a display object");
			}
			/*if (loader is DisplayObject) {
				addChild(loader);
				resize(_width, _height);
			} else {
				Logger.log("Logo was not a display object");
			}*/
		}
		
		/** Logo failed to load - die **/
		protected function errorHandler(evt:ErrorEvent):void {
			Logger.log("Failed to load logo: " + evt.text);
		}
		
		
		/** Handles mouse clicks **/
		protected function clickHandler(evt:MouseEvent):void {
			//Logger.log("Logo clickHandler start .... ");
			var link:String = getConfigParam('link');
			if (_showing && link) {
				_player.pause();
				_player.fullscreen(false);
				navigateToURL(new URLRequest(Strings.cleanLink(link)), getConfigParam('linktarget'));
			}
			else {
				if (_player.state == PlayerState.IDLE || _player.state == PlayerState.PAUSED) {
					_player.play();
				}
				else {
					_player.pause();
				}
			}
		}
		
		/** Handles mouse outs **/
		protected function outHandler(evt:MouseEvent=null):void {
			//Logger.log("Logo outHandler = start" );
			alpha = getConfigParam('out');
			//Logger.log("Logo outHandler alpha = " + alpha);
		}
		
		
		/** Handles mouse overs **/
		/*protected function overHandler(evt:MouseEvent):void {
			if (getConfigParam('link')) {
				alpha = getConfigParam('over');
			}
		}*/
		

		
		
		/** Fade in **/
		override public function show():void {
			//Logger.log("Logo show = start" );
			visible = true;
			_showing = true;
			alpha = 0;
			animations.fade(getConfigParam('out'), 0.25);
			timeout = setTimeout(hideLogo, parseInt(getConfigParam('timeout')) * 1000);
			mouseEnabled = true;
		}
		
		
		public function hideLogo():void {
			Logger.log("Logo hideLogo start ... ");
			mouseEnabled = false;
			_showing = false;
			visible = false;
			animations.fade(0, 0.1);
			Logger.log("Logo hideLogo end ... ");
		}
		
		/** Fade out **/
		override public function hide(force:Boolean = false):void {
			Logger.log("Logo hide = start & force = " + force );
			if (getConfigParam('hide').toString() == "true" || force) {
				mouseEnabled = false;
				_showing = false;
				visible = false;
				animations.fade(0, 0.1);
			}
		}
		
		
		/** Resizes the logo **/
		override public function resize(width:Number, height:Number):void {
			_width = width;
			_height = height;
			var image:DisplayObject = logo;
			if (image) {
				if (position.indexOf('right') >= 0) {
					image.x = _width - image.width - margin;
				} else {
					image.x = margin;
				}
				
				if (position.indexOf('bottom') >= 0) {
					image.y = _height - image.height - margin;
				} else {
					image.y = margin;
				}
			}
		}
		
		public function get position():String {
			return String(getConfigParam('position')).toLowerCase();
		}
		
		public function get margin():Number {
			return Number(getConfigParam('margin'));
		}
		
		protected function get logo():DisplayObject {
			return loader;
		}
		
		/** Gets a configuration parameter **/
		override protected function getConfigParam(param:String):* {
			return defaults[param];
		}

	}
}
