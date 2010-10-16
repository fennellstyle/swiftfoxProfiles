/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_FDLPROC_CID = Components.ID("{6d2d4306-a218-4be4-bdc4-61630dd7df7e}");
const NS_FDLPROC_PROG_ID = "@downloadhelper.net/flashgot-download-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function FDLProc() {
	try {
		//dump("[FDLProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);

		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		        						.getService(Components.interfaces.mozIJSSubScriptLoader);
		jsLoader.loadSubScript("chrome://dwhelper/content/dlproc-helper.js");
		this.flashGot=null;
		try {
			this.flashGot=Components.classes["@maone.net/flashgot-service;1"].
				getService(Components.interfaces.nsISupports).wrappedJSObject;
			this.core=Components.classes["@downloadhelper.net/core;1"].
				getService(Components.interfaces.dhICore);
			this.core.registerProcessor(this);
		} catch(e) {}

	} catch(e) {
		dump("[FDLProc] !!! constructor: "+e+"\n");
	}
}

FDLProc.prototype = {
	get name() { return "flashgot-download"; },
	get provider() { return "DownloadHelper"; },
	get title() { return Util.getText("processor.flashgot-download.title"); },
	get description() { return Util.getText("processor.flashgot-download.description"); },
	get enabled() { return true; },
}

FDLProc.prototype.canHandle=function(desc) {
	//dump("[FDLProc] canHandle()\n");
	return desc.has("media-url");
}

FDLProc.prototype.requireDownload=function(desc) {
	//dump("[FDLProc] requireDownload()\n");
	return false;
}

FDLProc.prototype.preDownload=function(desc) {
	//dump("[FDLProc] preDownload()\n");
	return false;
}

FDLProc.prototype.handle=function(desc) {
	//dump("[FDLProc] handle()\n");
	var mediaUrl=Util.getPropsString(desc,"media-url");
	var link={
			href: mediaUrl,
			description: ""
	}
    var windowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    		                                .getService(Components.interfaces.nsIWindowMediator);
	var window = windowMediator.getMostRecentWindow("navigator:browser");
	window.gFlashGot.download([link],window.gFlashGotService.OP_ONE,null);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

FDLProc.prototype.contractID="@downloadhelper.net/flashgot-download-processor;1";
FDLProc.prototype.classID=Components.ID("{6d2d4306-a218-4be4-bdc4-61630dd7df7e}");
FDLProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([FDLProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([FDLProc]);
