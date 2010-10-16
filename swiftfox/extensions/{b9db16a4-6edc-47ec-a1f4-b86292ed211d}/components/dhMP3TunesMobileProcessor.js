/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_MTMPROC_CID = Components.ID("{afc4a7aa-be25-4acb-bd64-999ece9b403c}");
const NS_MTMPROC_PROG_ID = "@downloadhelper.net/mp3tunes-mobile-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function MTMProc() {
	try {
		//dump("[MTMProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		        						.getService(Components.interfaces.mozIJSSubScriptLoader);
		jsLoader.loadSubScript("chrome://dwhelper/content/mp3tunes/mp3tunes-proc-helper.js");
		
		if(!Util.priorTo19()) {
			this.helper=new MTProcHelper(true);
			this.core=Components.classes["@downloadhelper.net/core;1"].
				getService(Components.interfaces.dhICore);
			this.core.registerProcessor(this);
		}
	} catch(e) {
		dump("[MTMProc] !!! constructor: "+e+"\n");
	}
}

MTMProc.prototype = {
	get name() { return "mp3tunes-mobile"; },
	get provider() { return "MP3Tunes"; },
	get title() { return Util.getText("mp3tunes.mobile-processor.title"); },
	get description() { return Util.getText("mp3tunes.mobile-processor.description"); },
	get enabled() { return this.helper.enabled; },
}

MTMProc.prototype.canHandle=function(desc) {
	//dump("[MTMProc] canHandle()\n");
	return this.helper.canHandle(desc);
}

MTMProc.prototype.requireDownload=function(desc) {
	//dump("[MTMProc] requireDownload()\n");
	return this.helper.requireDownload(desc);
}
	
MTMProc.prototype.preDownload=function(desc) {
	//dump("[MTMProc] preDownload()\n");
	return this.helper.preDownload(desc,false,false);
}

MTMProc.prototype.handle=function(desc) {
	//dump("[MTMProc] handle()\n");
	this.helper.handle(desc,false);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

MTMProc.prototype.contractID="@downloadhelper.net/mp3tunes-mobile-processor;1";
MTMProc.prototype.classID=Components.ID("{afc4a7aa-be25-4acb-bd64-999ece9b403c}");
MTMProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([MTMProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([MTMProc]);


