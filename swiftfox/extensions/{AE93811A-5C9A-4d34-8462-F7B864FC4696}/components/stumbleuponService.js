// component defined in this file
const su_EXTENSION_ID="{AE93811A-5C9A-4d34-8462-F7B864FC4696}";
const su_SERVICE_NAME="StumbleUpon Service";
const su_SERVICE_ID="{b97c288d-917d-4d26-bd24-3adf14f5aea3}";
const su_SERVICE_CTRID = "@stumbleupon.com/stumbleupon-service;1";

const su_SERVICE_CID = Components.ID(su_SERVICE_ID);

if(Components.utils && Components.utils.import)
	Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

//const SERVICE_CATS = ["app-startup"];

// Factory object
var su_SERVICE_FACTORY = {
	_instance: null,
	
	createInstance: function (outer, iid)
	{
		if (outer != null)
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		
		if (! (iid.equals(Components.interfaces.nsISupports) ||
				iid.equals(Components.interfaces.nsISupportsWeakReference)))
			throw Components.results.NS_ERROR_INVALID_ARG;
		
		if (! this._instance)
			this._instance = new su_Service();
		
		return this._instance;
  }
};

var su_Module = {
  _registered: false,
	
	registerSelf: function(componentManager, fileSpec, location, type)
	{
		if (this._registered)
			return;
	
		var registrar = componentManager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		
		registrar.registerFactoryLocation(
				su_SERVICE_CID,
				su_SERVICE_NAME,
				su_SERVICE_CTRID,
				fileSpec,
				location,
				type);

//		const categoryManager = Components.classes['@mozilla.org/categorymanager;1']
//				.getService(Components.interfaces.nsICategoryManager);
//		
//		var i;
//		for (i = 0; i < SERVICE_CATS.length; i++)
//		{
//			categoryManager.addCategoryEntry(
//					SERVICE_CATS[i],
//					su_SERVICE_CTRID,
//					su_SERVICE_CTRID,
//					true,
//					true);
//		}

		this._registered = true;
  },
  
	unregisterSelf: function(componentManager, fileSpec, location)
	{
    var registrar = componentManager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		
		registrar.unregisterFactoryLocation(su_SERVICE_CID, fileSpec);
  },

	getClassObject: function (compMgr, cid, iid)
	{
		if (cid.equals(su_SERVICE_CID))
			return su_SERVICE_FACTORY;
		
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		
		throw Components.results.NS_ERROR_NO_INTERFACE;
	},
	
	canUnload: function(componentManager)
	{
		return true;
	}
}
function NSGetModule(componentManager, fileSpec)
{
  return su_Module;
}

var su_Service = function ()
{
	this._hostSpec = null;
	this._datastore = null;
	this._stumbleReporter = null;
	this._tldService = null;
	this._globals = {}; // same as this._datastore.globals
	this._globals.batched_error_log = "";
	this._globals.batched_pref_error_log = "";
	this._startupTimeMs = (new Date()).getTime();
	this._batchingLog = false;
	this._blockedLogErrorPending = false;
	this._messageCount = 0;
	this._messageLog = "";
	this._messageLogEnabled = false;
	this._agentDesc = "";
	this._refs = [];
	this._logCommunicationEnabled = false;
	this._forceCampusDistEnabled = false;
	this._logErrorDomain = "stumbleupon.com";
	this._persistLCFD = false;
}
su_Service.prototype = 
{
	classID: Components.ID("{b97c288d-917d-4d26-bd24-3adf14f5aea3}"),
	
	QueryInterface: function (iid)
	{
		if (iid.equals(Components.interfaces.nsISupports) ||
				iid.equals(Components.interfaces.nsISupportsWeakReference))
			return this;
		else
			throw Components.results.NS_ERROR_NO_INTERFACE;
	},

  get wrappedJSObject() {
    return this;
  },
	
	_createInstance: function (nsclass, nsinterface)
	{
		try {
			return Components.classes[nsclass].createInstance(Components.interfaces[nsinterface]);
		} catch (e) {
			return null;
		}
	},
	
	_getService: function (nsclass, nsinterface)
	{
		try {
			return Components.classes[nsclass].getService(Components.interfaces[nsinterface]);
		} catch (e) {
			return null;
		}
	},
	
	_loadScript: function (filename)
	{
		var uri = "chrome://stumbleupon/content/" + filename;
		try {
			this._getService(
						"@mozilla.org/moz/jssubscript-loader;1",
						"mozIJSSubScriptLoader")
						.loadSubScript(uri);
		}
		catch (e) {
			this.logError("INCLUDE", e, uri);
		}
	},
	
	_addref: function (obj)
	{
		this._refs.push(obj);
	},
	
	_release: function (obj)
	{
		var i;
		for (i = 0; i < this._refs.length; i++)
		{
			if (this._refs[i] == obj)
			{
				this._refs.splice(i, 1);
				return;
			}
		}
	},
	
	_setTimeout: function ()
	{
		var timer = this._createInstance(
						"@mozilla.org/timer;1",
						"nsITimer");
		
		this._addref(timer);
		var i;
		var args = [];
		for (i = 2; i < arguments.length; i++)
			args.push(arguments[i]);

		var this_ = this;
		var fn = arguments[0];
		timer.initWithCallback(
				{
					QueryInterface: function (iid) {
						if (iid.equals(Components.interfaces.nsISupports) ||
								iid.equals(Components.interfaces.nsITimerCallback))
							return this;
						else
							throw Components.results.NS_ERROR_NO_INTERFACE;
					},	
					notify: function (timer) {
						this_._release(timer);
						fn.apply(fn, args);
					}
				},
				arguments[1],
				timer.TYPE_ONE_SHOT);
		return timer;
	},
	
	_clearTimeout: function (timer)
	{
		timer.cancel();
		this._release(timer);
	},

	_setInterval: function ()
	{
		var timer = this._createInstance(
						"@mozilla.org/timer;1",
						"nsITimer");
		
		this._addref(timer);
		var i;
		var args = [];
		for (i = 2; i < arguments.length; i++)
			args.push(arguments[i]);

		var this_ = this;
		var fn = arguments[0];
		timer.initWithCallback(
				{
					QueryInterface: function (iid) {
						if (iid.equals(Components.interfaces.nsISupports) ||
								iid.equals(Components.interfaces.nsITimerCallback))
							return this;
						else
							throw Components.results.NS_ERROR_NO_INTERFACE;
					},	
					notify: function (timer) {
						this_._release(timer);
						fn.apply(fn, args);
					}
				},
				arguments[1],
				timer.TYPE_REPEATING_SLACK);
		return timer;
	},
	
	_clearInterval: function (timer)
	{
		timer.cancel();
		this._release(timer);
	},

	getErrorObjectDump: function (o)
	{
		if (! o)
			return "\n" + (typeof o);
		
		var str = "\n===== dump ===\n"; 
		var p;
		for (p in o)
		{
			if (p.match(/.*_ERR$/))
				continue;
			
			try {
				str += "[" + p + "]\n" + o[p] + "\n";
			}
			catch (e) {
				str += "[" + p + "] ERROR\n" + e + "\n";
			}
		}
		str += "========";
		return str;
	},
	
	getSessionTimeMs: function ()
	{
		return (new Date()).getTime() - this._startupTimeMs;
	},
	
	setMessageLogEnabled: function (enabled)
	{
		this._messageLogEnabled = enabled;
	},
	
	setLogCommunicationEnabled: function (enabled)
	{
		this._logCommunicationEnabled = enabled;
	},
	
	setLogResourceCFD: function (enabled)
	{
		this._logResourceCFD = enabled
	},
	
	setAgentDesc: function (desc)
	{
		this._agentDesc = desc;
	},
	
	setForceCampusDistEnabled: function (enabled)
	{
		this._forceCampusDistEnabled = enabled;	
	},
	
	setLogErrorDomain: function (domain)
	{
		this._logErrorDomain = domain;
	},
	
	getWindow: function ()
	{
		var enumerator = this._getService(
				"@mozilla.org/appshell/window-mediator;1",
				"nsIWindowMediator").getEnumerator("navigator:browser");

		if (! enumerator.hasMoreElements())
			return null;
		
		return enumerator.getNext();
	},
	
	callWindow: function ()
	{
		var win = this.getWindow();
		if (! win)
			return null;
		
		var args = [];
		var i;
		for (i = 1; i < arguments.length; i++)
			args.push(arguments[i]);
		
		return win[arguments[0]].apply(win, args);
	},
	
	logError: function ()
	{
		var i;
		var str = "";
		if (arguments.length != 0)
		{
			str += "\n";
			str += this.getSessionTimeMs() + "\n";
		}
		for (i = 0; i < arguments.length; i++)
		{
			var type = typeof(arguments[i]);
			if ((i == 1) && (type != "string") && (type != "number"))
				str += this.getErrorObjectDump(arguments[i]);
			
			else
				str += "\n" + arguments[i];
		}
		
		this._globals.batched_error_log += (this._globals.batched_error_log == "") ? str : ("\n" + str);
	
		if ((this._globals.batched_error_log == "") && (this._globals.batched_pref_error_log == ""))
			return;
		
		// By delaying for 1000 ms, we batch sets of closely spaced errors.
		if (! this._batchingLog)
		{
			this._batchingLog = true;
			this._blockedLogErrorPending = false;
			this._setTimeout(function (this_) { this_._logErrorGated(); }, 1000, this);
		}
		else if (this._batchingLog && 
					(! this._blockedLogErrorPending))
		{
			// If logging is blocked, push back the logging event. -- JW
			this._blockedLogErrorPending = true;
			this._setTimeout(function (this_) { this_._logErrorGated(); }, 1000, this);
		}
	},

	_logErrorGated: function ()
	{
		if ((this._globals.batched_error_log == "") && (this._globals.batched_pref_error_log == ""))
		{
			this._batchingLog = false;
			return;
		}
		
		var consoleService =
					Components.classes["@mozilla.org/consoleservice;1"]
					.getService(Components.interfaces.nsIConsoleService);
	
		if (! consoleService)
			return;
		
		var str = "StumbleUpon error message:\n";
		if (this._datastore)
			str += this.getHostSpec().desc;
		str += this._globals.batched_error_log;
		str += this._globals.batched_pref_error_log;
		consoleService.logStringMessage(str);
		
		if (this._messageLogEnabled)
		{
			this._messageCount++;
			this._messageLog += "\n--- " + this._messageCount;
			this._messageLog += this._globals.batched_error_log + this._globals.batched_pref_error_log;
		}
		
		var prefService = this._getService(
					"@mozilla.org/preferences-service;1",
					"nsIPrefService");
	
		var prefBranch = prefService.getBranch("");
	
		var errorCount;
		if (prefBranch.getPrefType("stumble.report_error_count") == 0)
			errorCount = 0;
		
		else
			errorCount = prefBranch.getIntPref("stumble.report_error_count");
	
		errorCount++;
		prefBranch.setIntPref("stumble.report_error_count", errorCount);
		prefService.savePrefFile(null);
		
		var errorCountMax;
		if (prefBranch.getPrefType("stumble.report_error_count_max") == 0)
			errorCountMax = 3;
		
		else
			errorCountMax = prefBranch.getIntPref("stumble.report_error_count_max");
		
		if (errorCount <= errorCountMax)
		{
			var params = "";
			params += "host=" + encodeURIComponent(this.getHostSpec().desc);
			params += "&count=" + errorCount;
			if (this._datastore)
			{
				var userid = this._datastore._userid;
				if (userid == "")
					userid = 0;
				else
					params += "&password=" + encodeURIComponent(this._datastore.getStoredPassword());
				params += "&username=" + encodeURIComponent(userid);
				params += "&nick=" + encodeURIComponent(this._datastore.getValue("$nick"));
			}
			else
			{
				params += "&username=0";
			}
			params += "&version=" + encodeURIComponent(this._agentDesc);
			
			var simultPref = (this._globals.batched_pref_error_log == "") ? 0 : 1;
			var simultOther = (this._globals.batched_error_log == "") ? 0 : 1;
			
			if (this._globals.batched_error_log != "")
			{
				this.postAsync(
						this._agentDesc,
						"http://www." + this._logErrorDomain + "/mozbar_error.php",
						params +
							"&pref=0" +
							"&error=" + encodeURIComponent(this._globals.batched_error_log) + 
							"&simultpref=" + simultPref,
						null,
						null,
						null);
			}
			
			if (this._globals.batched_pref_error_log != "")
			{
				this.postAsync(
						this._agentDesc,
						"http://www." + this._logErrorDomain + "/mozbar_error.php",
						params +
							"&pref=1" +
							"&error=" + encodeURIComponent(this._globals.batched_pref_error_log) +
							"&simultother=" + simultOther,
						null,
						null,
						null);
			}
		}
		this._globals.batched_error_log = "";
		this._globals.batched_pref_error_log = "";
		this._batchingLog = false;
	},
	
	dd: function ()
	{
		var i;
		var str = "";
	
		for (i = 0; i < arguments.length; i++)
			str += "\n" + arguments[i];
	
		var consoleService = this._getService(
					"@mozilla.org/consoleservice;1",
					"nsIConsoleService");
		consoleService.logStringMessage("StumbleUpon debug message: " + str);
	},
	
	ddf: function ()
	{
		var i;
		var str = "";
	
		for (i = 0; i < arguments.length; i++)
			str += " >" + arguments[i];
		
		var ds = this.getDatastore();
		ds.writeFile(
				ds.getLegacyNSIFile("stumbledd"),
				(ds.getTimestampStr() + str + "\n"),
				true);
	},
	
	postAsync: function (useragent, uri, postdata, timeoutIntervalMs, callback, detail)
	{
		if (! postdata)
			postdata = "";
		
		var x = this._createInstance(
					"@mozilla.org/xmlextras/xmlhttprequest;1",
					"nsIXMLHttpRequest");
		var this_ = this;
		if (callback)
		{
			x = x.QueryInterface(Components.interfaces.nsIDOMEventTarget);
		
			// This ensures that our detail property doesn't get garbage
			// collected.  We release in the callback function. -- JW
			this._addref(x);
			
			x.callback = callback;
			x.addEventListener(
					"load",
					function (event) {
						this_._postAsyncDone(event); },
					false);
		}
		
		if (detail)
		{
			x.detail = detail;
			// This creates an ugly circular reference that we must be sure
			// to remove. -- JW
			x.detail._request = x;
		}
		
//		netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
		try {
			x.open("POST", uri, true);
//			x.setRequestHeader("User-Agent" , useragent);
			x.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		} catch (e) { this.logError("POST ASYNC", e); }
		x.aborted = false;
		if (timeoutIntervalMs)
		{
			x.done = false;
			
			this._setTimeout(
					function (this_, request) { this_.abortPostAsync(request); },
					timeoutIntervalMs,
					this,
					x);
		}
		
		if (this._logCommunicationEnabled)
			this.dd("post async", uri, postdata);
		
		x.send(postdata);
	},

	_postAsyncDone: function (event)
	{
		var request = event.target;
		if (request.readyState != 4)
			return;
	
		this._release(request);
		if (request.detail)
			delete request.detail._request;
		var callback = request.callback;
		callback(request);
	
		if (request.status == 200)
			request.done = true;
	},
	
	abortPostAsync: function (request)
	{
		if (request.done)
			return;
		
		request.aborted = true;
		this._release(request);
	
		if (request.detail)
			delete request.detail._request;
	
		request.abort();
	
		if (! request.callback) return;
	
		var callback = request.callback;
		callback(request);
	},
	
	getHostSpec: function (optNavigatorObject)
	{
		if (this._hostSpec)
			return this._hostSpec;
		
		if (! this._datastore)
			this.getDatastore();
		
		var spec = {};
		try {
		
		const MOZILLA   = "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}";
		const FIREFOX   = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
		const SEAMONKEY = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
		const NETSCAPE  = "{3db10fab-e461-4c80-8b97-957ad5f8ea47}";
		const FLOCK     = "{a463f10c-3994-11da-9945-000d60ca027b}";
	
		var os_str = "";
		if ("@mozilla.org/xre/app-info;1" in Components.classes)
		{
			// running under Mozilla 1.8 or later
			var appinfo = this._getService(
				"@mozilla.org/xre/app-info;1",
				"nsIXULAppInfo");
			
			spec.id = appinfo.ID;
			spec.version = appinfo.version;
			try {
				appinfo = appinfo.QueryInterface(Components.interfaces.nsIXULRuntime);
				os_str = appinfo.OS.toLowerCase();
			}
			catch (e) {
				os_str = navigator.userAgent.toLowerCase();
			}
		}
		else
		{
			if (optNavigatorObject)
				os_str = optNavigatorObject.userAgent.toLowerCase();
			else
				os_str = "win";
			
			try {
				spec.id = this._datastore.getValue("app.id");
				spec.version = this._datastore.getValue("app.version");
			} catch(e) {
			// very old version
				spec.id = MOZILLA;
				spec.version = "0.0";
			}
		}
		spec.win = (os_str.indexOf("win") != -1);
		spec.mac = ((os_str.indexOf("mac") != -1)  || 
					(os_str.indexOf("darwin") != -1));
		
		spec.mozilla = false;
		spec.firefox = false;
		spec.seamonkey = false;
		spec.netscape = false;
		spec.flock = false;
		
		spec.label = "the browser";
		switch (spec.id)
		{
			case MOZILLA:   spec.mozilla = true;   spec.label = "Mozilla";   break;
			case FIREFOX:   spec.firefox = true;   spec.label = "Firefox";   break;
			case SEAMONKEY: spec.seamonkey = true; spec.label = "Seamonkey"; break;
			case NETSCAPE:  spec.netscape = true;  spec.label = "Netscape";  break;
			case FLOCK:     spec.flock = true;     spec.label = "Flock";     break;
		}
		
		spec.desc = spec.label.toLowerCase();
		
		spec.desc += "/" + spec.version + "/[[" + os_str + "]]";
		
		spec.toolkit = spec.firefox || spec.flock || (spec.netscape && 
				spec.version.match(/^[89]\./));
		
		spec.places = (spec.firefox && Components.interfaces.nsINavBookmarksService &&
				Components.interfaces.nsITaggingService);
		
		spec.ff2plus = false;
		
		spec.ff3plus = false;
		
		try {
			// introduced in ff 1.5
			var vc = this._getService(
					"@mozilla.org/xpcom/version-comparator;1",
					"nsIVersionComparator");
			
			if (vc.compare(spec.version, "2.0") >= 0)
				spec.ff2plus = true;
			
			if (vc.compare(spec.version, "3.0") >= 0)
				spec.ff3plus = true;
		} catch (e) {}
		
		
		spec.sha1 = (Components.interfaces.nsICryptoHash) ? true : false;
		
	//	var file = this._getService(
	//				"@mozilla.org/file/directory_service;1",
	//				"nsIProperties")
	//				.get("ProfD", Components.interfaces.nsIFile);
	//
	//	file.append("extensions");
	//	file.append("{AE93811A-5C9A-4d34-8462-F7B864FC4696}");
	//	
	//	if (file.exists())
	//		return null;
		
		spec.dist = null;
		if (this._datastore.isPrefDefined("app.distributor.channel"))
		{
			var dist = "ff" + this._datastore.getValue("app.distributor.channel");
			if (dist == "ffcampus")
				spec.dist = dist;
		}
		
		if (this._forceCampusDistEnabled)
			spec.dist = "ffcampus";
		
		}
		catch (e) {
			spec.desc = os_str;
		}
	
		if (optNavigatorObject)
			this._hostSpec = spec;
		
		return spec;
	},
	
	getDatastore: function ()
	{
		if (this._datastore)
			return this._datastore;
		
		this._loadScript("datastore.js");
		
		var enabledb = (Components.interfaces.nsINavBookmarksService 
				&& Components.interfaces.nsITaggingService); 
		
		if (enabledb) 
			this._loadScript("DatabaseConnection.js"); 
		
		this._datastore = new su_Datastore(this, enabledb);
		
		return this._datastore;
	},
	
	getStumbleReporter: function ()
	{
		if (this._stumbleReporter)
			return this._stumbleReporter;
		
		this._loadScript("stumbleReporter.js"); 

		this._stumbleReporter = new su_StumbleReporter(this);

		return this._stumbleReporter;
	},
	
	getEffectiveTLD: function (url)
	{
		if (! url.match(/^(http:|https:|ftp:)/i))
			return null;
		
		var spliturl = url.split("/");
		if (spliturl.length < 3)
			return null;
		
		var alt = spliturl[2].match(/([^\.]*\.stumble\.net)$/);
		if (alt)
			return alt[1];
		
		if (! this._tldService)
		{
			if (Components.interfaces.nsIEffectiveTLDService)
			{
				this._tldService = this._getService(
						"@mozilla.org/network/effective-tld-service;1",
						"nsIEffectiveTLDService");
			}
			else
			{
				this._loadScript("tldEmulation.js");
				this._tldService = su_EmulatedTLDService;
			}
		}
		
		var out = null;
		
		try {
			out = this._tldService.getBaseDomainFromHost(spliturl[2], 0);
		} catch (e) {}
		return out;
	},
	
	getSha1: function (str) 
	{
		var engine;
		try {
			engine = this._createInstance(
						"@mozilla.org/security/hash;1",
						"nsICryptoHash");
			
			if (! engine)
				return null;
			
			engine.init(engine.SHA1);
			var charcodes = new Array();
			for (var i = 0; i < str.length; i++)
				charcodes.push(str.charCodeAt(i));
		
			engine.update(charcodes, str.length);
			return engine.finish(true);
		}
		catch (e) {
			return null;
		}
	}
};

// Gecko 2 component registration
if ((typeof(XPCOMUtils) != "undefined") && XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([su_Service]);

function su_dd()
{
	var service;
	try {
		service = Components.classes["@stumbleupon.com/stumbleupon-service;1"].getService().wrappedJSObject;
	}
	catch (e) {
		service = su_service;
	}
	
	service.dd.apply(service, arguments);
}

var su_log = su_dd;

function su_ddf()
{
	var service;
	try {
		service = Components.classes["@stumbleupon.com/stumbleupon-service;1"].getService().wrappedJSObject;
	}
	catch (e) {
		service = su_service;
	}
	
	service.ddf.apply(service, arguments);
}

var su_logf = su_ddf;

function su_dump_object(o)
{
	var str = "";
	var p;
	
	for (p in o)
	{
		try {
			str += "[" + p + "]\n" + o[p] + "\n\n";
		}
		catch (e) {
			str += "[" + p + "] ERROR\n" + e + "\n\n";
		}
	}
	
	su_dd(str);
}
