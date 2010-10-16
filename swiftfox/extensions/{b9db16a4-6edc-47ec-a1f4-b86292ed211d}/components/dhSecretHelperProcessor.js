/******************************************************************************
 *            Copyright (c) 2006-2010 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_SEHPROC_CID = Components.ID("{3b6dfafc-a55a-4e3b-8e2c-34584c33d676}");
const NS_SEHPROC_PROG_ID = "@downloadhelper.net/secrethelper-intro-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function SehProc() {
	try {
		//dump("[SehProc] constructor\n");

		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);

		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
		                                   .getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		var seh=this.pref.getBoolPref("seh-intro-proc.enable");
		if(seh) {	
			try { // for windows only
				var reg=Components.classes["@mozilla.org/windows-registry-key;1"]
					.createInstance(Components.interfaces.nsIWindowsRegKey);
				this.core=Components.classes["@downloadhelper.net/core;1"].
					getService(Components.interfaces.dhICore);
				this.core.registerProcessor(this);
			} catch(e) {}
		}
	} catch(e) {
		dump("[SehProc] !!! constructor: "+e+"\n");
	}
}

SehProc.prototype = {
		get name() { return "sec-download"; },
		get provider() { return "SecretHelperHelper"; },
		get title() { return Util.getText("processor.sec-download.title"); },
		get description() { return Util.getText("processor.sec-download.description"); },
		get enabled() { return true; },
}

SehProc.prototype.canHandle=function(desc) {
	//dump("[SehProc] canHandle()\n");
	if(desc.has("media-url"))
		return true;
	else
		return false;
}

SehProc.prototype.requireDownload=function(desc) {
	//dump("[SehProc] requireDownload()\n");
	return false;
}

SehProc.prototype.preDownload=function(desc) {
	//dump("[SehProc] preDownload()\n");
	return true;
}

SehProc.prototype.handle=function(desc) {
	//dump("[SehProc] handle()\n");
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator);
	var w = wm.getMostRecentWindow("navigator:browser");
	w.open('http://www.downloadhelper.net/secrethelper.php');
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

SehProc.prototype.contractID="@downloadhelper.net/secrethelper-intro-processor;1";
SehProc.prototype.classID=Components.ID("{3b6dfafc-a55a-4e3b-8e2c-34584c33d676}");
SehProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.XXX,
                                       ]);

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([SehProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([SehProc]);

