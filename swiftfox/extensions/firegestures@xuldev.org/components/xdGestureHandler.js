
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const PREFS_DOMAIN = "extensions.firegestures.";
const HTML_NS = "http://www.w3.org/1999/xhtml";

const STATE_READY    = 0;
const STATE_GESTURE  = 1;
const STATE_ROCKER   = 2;
const STATE_WHEEL    = 3;
const STATE_KEYPRESS = 4;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");






function xdGestureHandler() {}


xdGestureHandler.prototype = {


	classDescription: "Mouse Gesture Handler",
	contractID: "@xuldev.org/firegestures/handler;1",
	classID: Components.ID("{ca559550-8ab4-41c5-a72f-fd931322cc7e}"),
	QueryInterface: XPCOMUtils.generateQI([
		Ci.nsISupports,
		Ci.nsIObserver,
		Ci.nsISupportsWeakReference,
		Ci.nsIDOMEventListener,
		Ci.nsITimerCallback,
		Ci.xdIGestureHandler
	]),



	sourceNode: null,



	_drawArea: null,
	_lastX: null,
	_lastY: null,
	_directionChain: "",

	_gestureObserver: null,



	attach: function FGH_attach(aDrawArea, aObserver) {
		this._drawArea = aDrawArea;
		this._gestureObserver = aObserver;
		this._drawArea.addEventListener("mousedown", this, true);
		this._drawArea.addEventListener("mousemove", this, true);
		this._drawArea.addEventListener("mouseup", this, true);
		this._drawArea.addEventListener("contextmenu", this, true);
		this._drawArea.addEventListener("draggesture", this, true);
		this._reloadPrefs();
		var prefBranch2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
		prefBranch2.addObserver(PREFS_DOMAIN, this, true);
	},

	detach: function FGH_detach() {
		this._drawArea.removeEventListener("mousedown", this, true);
		this._drawArea.removeEventListener("mousemove", this, true);
		this._drawArea.removeEventListener("mouseup", this, true);
		this._drawArea.removeEventListener("contextmenu", this, true);
		this._drawArea.removeEventListener("draggesture", this, true);
		var prefBranch2 = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
		prefBranch2.removeObserver(PREFS_DOMAIN, this);
		this._clearTimeout();
		this.sourceNode = null;
		this._drawArea = null;
		this._gestureObserver = null;
		this._prefs = null;
	},

	_reloadPrefs: function FGH__reloadPrefs() {
		var prefBranch = Cc["@mozilla.org/preferences-service;1"]
		                 .getService(Ci.nsIPrefService)
		                 .getBranch(PREFS_DOMAIN);
		var getPref = function(aName) {
			try {
				switch (prefBranch.getPrefType(aName)) {
					case prefBranch.PREF_STRING:
						return prefBranch.getCharPref(aName);
					case prefBranch.PREF_BOOL:
						return prefBranch.getBoolPref(aName);
					case prefBranch.PREF_INT:
						return prefBranch.getIntPref(aName);
					default:
						throw null;
				}
			}
			catch(ex) {
			}
		};
		this._triggerButton  = getPref("trigger_button");
		this._suppressAlt    = getPref("suppress.alt");
		this._trailEnabled   = getPref("mousetrail");
		this._trailSize      = getPref("mousetrail.size");
		this._trailColor     = getPref("mousetrail.color");
		this._gestureTimeout = getPref("gesture_timeout");
		this._mouseGestureEnabled    = getPref("mousegesture");
		this._wheelGestureEnabled    = getPref("wheelgesture");
		this._rockerGestureEnabled   = getPref("rockergesture");
		this._keypressGestureEnabled = getPref("keypressgesture");
		this._drawArea.removeEventListener("DOMMouseScroll", this, true);
		this._drawArea.removeEventListener("click", this, true);
		if (this._wheelGestureEnabled)
			this._drawArea.addEventListener("DOMMouseScroll", this, true);
		if (this._rockerGestureEnabled)
			this._drawArea.addEventListener("click", this, true);
		var tabbrowser = this._drawArea.ownerDocument.getBindingParent(this._drawArea);
		if (tabbrowser && tabbrowser.localName == "tabbrowser") {
			tabbrowser.mStrip.removeEventListener("DOMMouseScroll", this._wheelOnTabBar, true);
			if (getPref("tabwheelgesture"))
				tabbrowser.mStrip.addEventListener("DOMMouseScroll", this._wheelOnTabBar, true);
		}
		if (this._triggerButton == 1) {
			var prefSvc = Cc["@mozilla.org/preferences-service;1"]
			              .getService(Ci.nsIPrefBranch2)
			              .QueryInterface(Ci.nsIPrefService);
			prefSvc.setBoolPref("middlemouse.contentLoadURL", false);
		}
	},



	_state: STATE_READY,
	_isMouseDownL: false,
	_isMouseDownM: false,
	_isMouseDownR: false,
	_suppressContext: false,
	_shouldFireContext: false,

	handleEvent: function FGH_handleEvent(event) {
		switch (event.type) {
			case "mousedown": 
				if (event.button == 0) {
					var targetName = event.target.localName.toUpperCase();
					if (targetName == "INPUT" || targetName == "TEXTAREA") {
						break;
					}
					targetName = event.originalTarget.localName;
					if (targetName == "scrollbarbutton" || targetName == "slider" || targetName == "thumb") {
						break;
					}
					this._isMouseDownL = true;
					this._isMouseDownM = false;
					if (this._triggerButton == 0 && !this._isMouseDownM && !this._isMouseDownR && !this._altKey(event)) {
						this._state = STATE_GESTURE;
						this._startGesture(event);
						if (this._mouseGestureEnabled)
							event.preventDefault();
					}
					else if (this._rockerGestureEnabled && this._isMouseDownR) {
						this._state = STATE_ROCKER;
						this._invokeExtraGesture(event, "rocker-left");
					}
				}
				else if (event.button == 1) {
					this._isMouseDownM = true;
					if (this._triggerButton == 1 && !this._isMouseDownL && !this._isMouseDownR && !this._altKey(event)) {
						this._state = STATE_GESTURE;
						this._startGesture(event);
						event.stopPropagation();
					}
				}
				else if (event.button == 2) {
					var targetName = event.target.localName.toUpperCase();
					if (targetName == "OBJECT" || targetName == "EMBED") {
						break;
					}
					this._isMouseDownR = true;
					this._isMouseDownM = false;
					this._suppressContext = false;
					if (this._triggerButton == 2 && !this._isMouseDownL && !this._isMouseDownM && !this._altKey(event)) {
						this._state = STATE_GESTURE;
						this._startGesture(event);
					}
					else if (this._rockerGestureEnabled && this._isMouseDownL) {
						this._state = STATE_ROCKER;
						this._invokeExtraGesture(event, "rocker-right");
					}
				}
				break;
			case "mousemove": 
				if (this._state == STATE_GESTURE || this._state == STATE_KEYPRESS) {
					if (this._mouseGestureEnabled) {
						if (this._keypressGestureEnabled && (event.ctrlKey || event.shiftKey)) {
							var type = this._state == STATE_GESTURE ? "keypress-start" : "keypress-progress";
							this._state = STATE_KEYPRESS;
							this._invokeExtraGesture(event, type);
						}
						this._progressGesture(event);
					}
				}
				else if (this._state == STATE_WHEEL || this._state == STATE_ROCKER) {
					this._lastX = event.screenX;
					this._lastY = event.screenY;
					if (Math.abs(this._lastX - this._lastExtraX) > 10 || 
					    Math.abs(this._lastY - this._lastExtraY) > 10) {
						this._stopGesture();
					}
				}
				break;
			case "mouseup": 
				if (event.button == 0)
					this._isMouseDownL = false;
				else if (event.button == 1)
					this._isMouseDownM = false;
				else if (event.button == 2)
					this._isMouseDownR = false;
				if (!this._isMouseDownL && !this._isMouseDownM && !this._isMouseDownR) {
					if (this._state == STATE_KEYPRESS) {
						this._state = STATE_READY;
						if (event.ctrlKey)
							this._invokeExtraGesture(event, "keypress-ctrl");
						else if (event.shiftKey)
							this._invokeExtraGesture(event, "keypress-shift");
						this._invokeExtraGesture(event, "keypress-stop");
					}
					this._stopGesture(event);
					if (this._shouldFireContext) {
						this._shouldFireContext = false;
						this._displayContextMenu(event);
					}
				}
				break;
			case "contextmenu": 
				if (!this._isMouseDownL && this._isMouseDownR) {
					this._suppressContext = true;
					this._shouldFireContext = true;
				}
				if (this._suppressContext) {
					this._suppressContext = false;
					event.preventDefault();
					event.stopPropagation();
				}
				break;
			case "DOMMouseScroll": 
				if (this._state == STATE_GESTURE || this._state == STATE_WHEEL) {
					this._state = STATE_WHEEL;
					this._invokeExtraGesture(event, event.detail < 0 ? "wheel-up" : "wheel-down");
					event.preventDefault();
					event.stopPropagation();
				}
				break;
			case "click": 
				if (this._state == STATE_ROCKER) {
					event.preventDefault();
					event.stopPropagation();
				}
				break;
			case "draggesture": 
				if (this._state != STATE_ROCKER)
					this._isMouseDownL = false;
				break;
		}
	},

	_altKey: function(event) {
		return this._suppressAlt ? event.altKey : false;
	},

	_displayContextMenu: function FGH__displayContextMenu(event) {
		with (this._drawArea.ownerDocument.defaultView) {
			if (!nsContextMenu.prototype._setTargetInternal) {
				nsContextMenu.prototype._setTargetInternal = nsContextMenu.prototype.setTarget;
				nsContextMenu.prototype.setTarget = function(aNode, aRangeParent, aRangeOffset) {
					this._setTargetInternal(aNode, aRangeParent, this._rangeOffset);
				};
			}
			nsContextMenu.prototype._rangeOffset = event.rangeOffset;
		}
		var evt = event.originalTarget.ownerDocument.createEvent("MouseEvents");
		evt.initMouseEvent(
			"contextmenu", true, true, event.originalTarget.ownerDocument.defaultView, 0,
			event.screenX, event.screenY, event.clientX, event.clientY,
			false, false, false, false, 2, null
		);
		event = new XPCNativeWrapper(event);
		event.originalTarget.dispatchEvent(evt);
	},

	_wheelOnTabBar: function FGH__wheelOnTabBar(event) {
		var tabbar = null;
		if (event.target.localName == "tab")
			tabbar = event.target.parentNode;
		else if (event.target.localName == "tabs" && event.originalTarget.localName != "menuitem")
			tabbar = event.target;
		else
			return;
		event.preventDefault();
		event.stopPropagation();
		tabbar.advanceSelectedTab(event.detail < 0 ? -1 : 1, true);
	},

	_startGesture: function FGH__startGesture(event) {
		this.sourceNode = event.target;
		this._lastX = event.screenX;
		this._lastY = event.screenY;
		this._directionChain = "";
		this._shouldFireContext = false;
		if (this._trailEnabled)
			this.createTrail(event);
	},

	_progressGesture: function FGH__progressGesture(event) {
		var x = event.screenX;
		var y = event.screenY;
		var dx = Math.abs(x - this._lastX);
		var dy = Math.abs(y - this._lastY);
		if (dx < 10 && dy < 10)
			return;
		var direction;
		if (dx > dy)
			direction = x < this._lastX ? "L" : "R";
		else
			direction = y < this._lastY ? "U" : "D";
		if (this._trailEnabled)
			this.drawTrail(this._lastX, this._lastY, x, y);
		this._lastX = x;
		this._lastY = y;
		if (this._state == STATE_KEYPRESS)
			return;
		var lastDirection = this._directionChain.charAt(this._directionChain.length - 1);
		if (direction != lastDirection) {
			this._directionChain += direction;
			this._gestureObserver.onDirectionChanged(event, this._directionChain);
		}
		if (this._gestureTimeout > 0)
			this._setTimeout(this._gestureTimeout);
	},

	_invokeExtraGesture: function FGH__invokeExtraGesture(event, aGestureType) {
		if (this._state == STATE_WHEEL || this._state == STATE_ROCKER) {
			this._lastExtraX = event.screenX;
			this._lastExtraY = event.screenY;
		}
		if (this._state != STATE_KEYPRESS && this._trailEnabled)
			this.eraseTrail();
		if (!this.sourceNode)
			this.sourceNode = event.target;
		this._gestureObserver.onExtraGesture(event, aGestureType);
		this._suppressContext = true;
		this._shouldFireContext = false;
		this._directionChain = "";
		if (this._state == STATE_WHEEL || this._state == STATE_ROCKER) {
			if (this._gestureTimeout > 0)
				this._setTimeout(this._gestureTimeout);
		}
	},

	_stopGesture: function FGH__stopGesture(event) {
		this._state = STATE_READY;
		this._isMouseDownL = false;
		this._isMouseDownM = false;
		this._isMouseDownR = false;
		if (this._trailEnabled)
			this.eraseTrail();
		if (this._directionChain) {
			this._gestureObserver.onMouseGesture(event, this._directionChain);
			this._suppressContext = true;
			this._shouldFireContext = false;
		}
		this.sourceNode = null;
		this._directionChain = "";
		this._clearTimeout();
	},



	observe: function FGH_observe(aSubject, aTopic, aData) {
		if (aTopic == "nsPref:changed")
			this._reloadPrefs();
	},



	_gestureTimer: null,

	_setTimeout: function FGH__setTimeout(aMsec) {
		this._clearTimeout();
		this._gestureTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
		this._gestureTimer.initWithCallback(this, aMsec, Ci.nsITimer.TYPE_ONE_SHOT);
	},

	_clearTimeout: function FGH__clearTimeout() {
		if (this._gestureTimer) {
			this._gestureTimer.cancel();
			this._gestureTimer = null;
		}
	},

	notify: function(aTimer) {
		this._suppressContext = true;
		this._shouldFireContext = false;
		this._directionChain = "";
		this._stopGesture();
		this._gestureObserver.onExtraGesture(null, "gesture-timeout");
	},

	openPopupAtPointer: function FGH_openPopupAtPointer(aPopup) {
		aPopup.openPopupAtScreen(this._lastX, this._lastY, false);
		this._directionChain = "";
		this._stopGesture();
	},



	_trailDot: null,
	_trailArea: null,
	_trailLastDot: null,
	_trailOffsetX: 0,
	_trailOffsetY: 0,
	_trailZoom: 1,

	createTrail: function FGH_createTrail(event) {
		var doc;
		if (event.view.top.document instanceof Ci.nsIDOMHTMLDocument)
			doc = event.view.top.document;
		else if (event.view.document instanceof Ci.nsIDOMHTMLDocument)
			doc = event.view.document;
		else
			return;
		var insertionNode = doc.documentElement ? doc.documentElement : doc;
		if (doc.getBoxObjectFor) {
			var box = doc.getBoxObjectFor(insertionNode);
			this._trailOffsetX = box.screenX;
			this._trailOffsetY = box.screenY;
			this._trailZoom = 1;
			var tabbrowser = this._drawArea.ownerDocument.defaultView.gBrowser;
			if (tabbrowser && (tabbrowser.mCurrentBrowser || tabbrowser).markupDocumentViewer.fullZoom != 1) {
				var dot = doc.createElementNS(HTML_NS, "xdTrailDot");
				dot.style.top = "1048576px";
				dot.style.position = "absolute";
				insertionNode.appendChild(dot);
				this._trailZoom = (doc.getBoxObjectFor(dot).screenY - this._trailOffsetY) / dot.offsetTop;
				insertionNode.removeChild(dot);
			}
		}
		else {
			var win = doc.defaultView;
			this._trailZoom = win.QueryInterface(Ci.nsIInterfaceRequestor).
			                  getInterface(Ci.nsIDOMWindowUtils).screenPixelsPerCSSPixel;
			this._trailOffsetX = (win.mozInnerScreenX - win.scrollX) * this._trailZoom;
			this._trailOffsetY = (win.mozInnerScreenY - win.scrollY) * this._trailZoom;
		}
		this._trailArea = doc.createElementNS(HTML_NS, "xdTrailArea");
		insertionNode.appendChild(this._trailArea);
		this._trailDot = doc.createElementNS(HTML_NS, "xdTrailDot");
		this._trailDot.style.width = this._trailSize + "px";
		this._trailDot.style.height = this._trailSize + "px";
		this._trailDot.style.background = this._trailColor;
		this._trailDot.style.border = "0px";
		this._trailDot.style.position = "absolute";
		this._trailDot.style.zIndex = 2147483647;
	},

	drawTrail: function FGH_drawTrail(x1, y1, x2, y2) {
		if (!this._trailArea)
			return;
		var xMove = x2 - x1;
		var yMove = y2 - y1;
		var xDecrement = xMove < 0 ? 1 : -1;
		var yDecrement = yMove < 0 ? 1 : -1;
		x2 -= this._trailOffsetX;
		y2 -= this._trailOffsetY;
		if (Math.abs(xMove) >= Math.abs(yMove))
			for (var i = xMove; i != 0; i += xDecrement)
				this._strokeDot(x2 - i, y2 - Math.round(yMove * i / xMove));
		else
			for (var i = yMove; i != 0; i += yDecrement)
				this._strokeDot(x2 - Math.round(xMove * i / yMove), y2 - i);
	},

	eraseTrail: function FGH_eraseTrail() {
		if (this._trailArea && this._trailArea.parentNode) {
			while (this._trailArea.lastChild)
				this._trailArea.removeChild(this._trailArea.lastChild);
			this._trailArea.parentNode.removeChild(this._trailArea);
		}
		this._trailDot = null;
		this._trailArea = null;
		this._trailLastDot = null;
	},

	_strokeDot: function FGH__strokeDot(x, y) {
		if (this._trailArea.y == y && this._trailArea.h == this._trailSize) {
			var newX = Math.min(this._trailArea.x, x);
			var newW = Math.max(this._trailArea.x + this._trailArea.w, x + this._trailSize) - newX;
			this._trailArea.x = newX;
			this._trailArea.w = newW;
			this._trailLastDot.style.left  = newX.toString() + "px";
			this._trailLastDot.style.width = newW.toString() + "px";
			return;
		}
		else if (this._trailArea.x == x && this._trailArea.w == this._trailSize) {
			var newY = Math.min(this._trailArea.y, y);
			var newH = Math.max(this._trailArea.y + this._trailArea.h, y + this._trailSize) - newY;
			this._trailArea.y = newY;
			this._trailArea.h = newH;
			this._trailLastDot.style.top    = newY.toString() + "px";
			this._trailLastDot.style.height = newH.toString() + "px";
			return;
		}
		if (this._trailZoom != 1) {
			x = Math.floor(x / this._trailZoom);
			y = Math.floor(y / this._trailZoom);
		}
		var dot = this._trailDot.cloneNode(true);
		dot.style.left = x + "px";
		dot.style.top = y + "px";
		this._trailArea.x = x;
		this._trailArea.y = y;
		this._trailArea.w = this._trailSize;
		this._trailArea.h = this._trailSize;
		this._trailArea.appendChild(dot);
		this._trailLastDot = dot;
	},

};



function NSGetModule(compMgr, fileSpec) {
	return XPCOMUtils.generateModule([xdGestureHandler]);
}


