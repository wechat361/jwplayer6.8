package com.longtailvideo.jwplayer.utils {

    /**
    * Object that catches and forwards calls invoked by NetStream.
    **/
	public dynamic class NetClient {


		/** Function to callback all events to **/
		private var callback:Object;


		/** Constructor. **/
		public function NetClient(cbk:Object):void {
			Logger.log("Logo NetClient callback's name is " + cbk);
			callback = cbk;
		}


		/** Forward calls to callback **/
		private function forward(dat:Object, typ:String):void {
			dat['type'] = typ;
			Logger.log("Logo NetClient forward onClientData dat['type'] = " + dat['type']);
			var out:Object = new Object();
			for (var i:Object in dat) {
				out[i] = dat[i];
				Logger.log("Logo NetClient forward onClientData dat["+i+"] = " + dat[i]);
			}
			Logger.log("Logo NetClient forward to onClientData params is out");
			callback.onClientData(out);
		}


		/** Get connection close from RTMP server. **/
		public function close(... rest):void {
			Logger.log("Logo NetClient close ...complete.. ");
			forward({close: true}, 'close');
		}

	/** Checking the available bandwidth. **/
		public function onBWCheck(... rest):Number {
			return 0;
		}
		
		/** Receiving the bandwidth check result. **/
		public function onBWDone(... rest):void {
			if (rest.length > 0) {
				forward({bandwidth: rest[0]}, 'bandwidth');
			}
		}
		
		/** Captionate caption handler. **/
		public function onCaption(cps:String, spk:Number):void {
			forward({captions: cps, speaker: spk}, 'caption');
		}
		
		/** Captionate metadata handler. **/
		public function onCaptionInfo(obj:Object):void {
			forward(obj, 'captioninfo');
		}
		
		/** Cuepoint handler. **/
		public function onCuePoint(obj:Object):void {
			forward(obj, 'cuepoint');
		}
		
		/** CDN subscription handler. **/
		/** Get successful stream subscription from RTMP server. **/
		public function onFCSubscribe(obj:Object):void {
			Logger.log("Logo NetClient onFCSubscribe ...fcsubscribe.. ");
			forward(obj, 'fcsubscribe');
		}

	/** Get headerdata information from netstream class. **/
		public function onHeaderData(obj:Object):void {
			var dat:Object = new Object();
			var pat:String = "-";
			var rep:String = "_";
			for (var i:String in obj) {
				var j:String = i.replace("-", "_");
				dat[j] = obj[i];
			}
			forward(dat, 'headerdata');
		}
		
		/** Image data (iTunes-style) handler. **/
		public function onID3(... rest):void {
			forward(rest[0], 'id3');
		}
		
		/** Image data (iTunes-style) handler. **/
		public function onImageData(obj:Object):void {
			forward(obj, 'imagedata');
		}
		
		/** Lastsecond call handler. **/
		public function onLastSecond(obj:Object):void {
			forward(obj, 'lastsecond');
		}
		/** Get metadata information from netstream class. **/
		public function onMetaData(obj:Object, ...rest):void {
			Logger.log("Logo NetClient onMetaData .....rest.length = " + (rest.length));
			if (rest && rest.length > 0) {
				rest.splice(0, 0, obj);
				forward({ arguments: rest }, 'metadata');
			} else {
				Logger.log("Logo NetClient onMetaData obj.duration = " + (obj.duration));
				forward(obj, 'metadata');
			}
			Logger.log("Logo NetClient onMetaData to forward .... ");
		}


		/** Receive NetStream playback codes. **/
		public function onPlayStatus(... rest):void {
			Logger.log("Logo NetClient onPlayStatus start..... ");
			for each (var dat:Object in rest) {
				if (dat && dat.hasOwnProperty('code')) {
					Logger.log("Logo NetClient onPlayStatus dat.code = " + dat.code);
					if (dat.code == "NetStream.Play.Complete") {
						forward(dat, 'complete');
					} else if (dat.code == "NetStream.Play.TransitionComplete") {
						forward(dat, 'transition');
					} else {
						forward(dat, 'playstatus');
					}
					Logger.log("Logo NetClient onPlayStatus to forward .... ");
				} 
			}
			Logger.log("Logo NetClient onPlayStatus ..... ");
			Logger.log("Logo NetClient onPlayStatus end..... ");
		}
		/** Quicktime broadcaster pixel. **/
		public function onSDES(... rest):void {
			forward(rest[0], 'sdes');
		}
		
		/** Receiving the bandwidth check result. **/
		public function onXMPData(... rest):void {
			forward(rest[0], 'xmp');
		}
		
		public function onXMP(... rest):void {
			onXMPData(rest);
		}

		/** RTMP Sample handler (what is this for?). **/
		public function RtmpSampleAccess(... rest):void {
			forward(rest[0], 'rtmpsampleaccess');
		}

		/** Get cues from MP4 text tracks). **/
		public function onTextData(obj:Object):void {
			forward(obj, 'textdata');
		}


	}
}