/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DUMPPROC_CID = Components.ID("{c0b558fd-d32a-4b7f-ae48-5ef095134292}");
const NS_DUMPPROC_PROG_ID = "@downloadhelper.net/dump-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function DumpProc() {
	try {
		//dump("[DumpProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);

		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
		                                   .getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		var dpe=false;
		try {
			dpe=this.pref.getBoolPref("dump-processor-enable");
		} catch(e) {}
		if(dpe) {
			this.core=Components.classes["@downloadhelper.net/core;1"].
				getService(Components.interfaces.dhICore);
			this.core.registerProcessor(this);
		}
	} catch(e) {
		dump("[DumpProc] !!! constructor: "+e+"\n");
	}
}

DumpProc.prototype = {
		get name() { return "dump"; },
		get provider() { return "DownloadHelper"; },
		get title() { return Util.getText("processor.dump.title"); },
		get description() { return Util.getText("processor.dump.description"); },
		get enabled() { return true; },
}

DumpProc.prototype.canHandle=function(desc) {
	//dump("[DumpProc] canHandle()\n");
	return true;
}

DumpProc.prototype.requireDownload=function(desc) {
	//dump("[DumpProc] requireDownload()\n");
	return false;
}

DumpProc.prototype.preDownload=function(desc) {
	//dump("[DumpProc] preDownload()\n");
	return true;
}

DumpProc.prototype.handle=function(desc) {
	//dump("[DumpProc] handle()\n");
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator);
	var w = wm.getMostRecentWindow("navigator:browser");
	w.openDialog('chrome://dwhelper/content/dump-media.xul','_blank',"chrome,centerscreen",desc);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

DumpProc.prototype.contractID="@downloadhelper.net/dump-processor;1";
DumpProc.prototype.classID=Components.ID("{c0b558fd-d32a-4b7f-ae48-5ef095134292}");
DumpProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([DumpProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([DumpProc]);

