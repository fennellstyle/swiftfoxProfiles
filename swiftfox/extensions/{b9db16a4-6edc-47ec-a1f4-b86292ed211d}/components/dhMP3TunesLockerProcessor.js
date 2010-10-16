/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_MTLPROC_CID = Components.ID("{021d8a4d-5978-4632-b69a-9351bc827f01}");
const NS_MTLPROC_PROG_ID = "@downloadhelper.net/mp3tunes-locker-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function MTLProc() {
	try {
		//dump("[MTLProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		        						.getService(Components.interfaces.mozIJSSubScriptLoader);
       	jsLoader.loadSubScript("chrome://dwhelper/content/mp3tunes/mp3tunes-proc-helper.js");
		if(!Util.priorTo19()) {
			this.helper=new MTProcHelper(false);
			this.core=Components.classes["@downloadhelper.net/core;1"].
				getService(Components.interfaces.dhICore);
			this.core.registerProcessor(this);
		}
	} catch(e) {
		dump("[MTLProc] !!! constructor: "+e+"\n");
	}
}

MTLProc.prototype = {
	get name() { return "mp3tunes-locker"; },
	get provider() { return "MP3Tunes"; },
	get title() { return Util.getText("mp3tunes.locker-processor.title"); },
	get description() { return Util.getText("mp3tunes.locker-processor.description"); },
	get enabled() { return this.helper.enabled; },
}

MTLProc.prototype.canHandle=function(desc) {
	//dump("[MTLProc] canHandle()\n");
	return this.helper.canHandle(desc);
}

MTLProc.prototype.requireDownload=function(desc) {
	//dump("[MTLProc] requireDownload()\n");
	return this.helper.requireDownload(desc);
}
	
MTLProc.prototype.preDownload=function(desc) {
	//dump("[MTLProc] preDownload()\n");
	return this.helper.preDownload(desc,false,false);
}

MTLProc.prototype.handle=function(desc) {
	//dump("[MTLProc] handle()\n");
	this.helper.handle(desc,false);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

MTLProc.prototype.contractID="@downloadhelper.net/mp3tunes-locker-processor;1";
MTLProc.prototype.classID=Components.ID("{021d8a4d-5978-4632-b69a-9351bc827f01}");
MTLProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MTLProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([MTLProc]);

