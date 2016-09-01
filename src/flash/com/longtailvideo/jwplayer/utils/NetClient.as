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
			forward({close: true}, 'complete');
		}


		/** Get successful stream subscription from RTMP server. **/
		public function onFCSubscribe(obj:Object):void {
			Logger.log("Logo NetClient onFCSubscribe ...fcsubscribe.. ");
			forward(obj, 'fcsubscribe');
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
					if (dat.code == "NetStream.Play.Complete") {
						forward(dat, 'complete');
					} else if (dat.code == "NetStream.Play.TransitionComplete") {
						forward(dat, 'transition');
					}
					Logger.log("Logo NetClient onPlayStatus to forward .... ");
				} 
			}
			Logger.log("Logo NetClient onPlayStatus ..... ");
			Logger.log("Logo NetClient onPlayStatus end..... ");
		}


		/** Get cues from MP4 text tracks). **/
		public function onTextData(obj:Object):void {
			forward(obj, 'textdata');
		}


	}
}