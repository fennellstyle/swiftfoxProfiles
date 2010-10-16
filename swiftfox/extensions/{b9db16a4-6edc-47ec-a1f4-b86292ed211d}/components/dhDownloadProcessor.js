/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DLPROC_CID = Components.ID("{1f5c8528-c5b5-4b03-be0d-c8948028d9e6}");
const NS_DLPROC_PROG_ID = "@downloadhelper.net/download-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function DLProc() {
	try {
		//dump("[DLProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		                            	.getService(Components.interfaces.mozIJSSubScriptLoader);
		jsLoader.loadSubScript("chrome://dwhelper/content/dlproc-helper.js");
		this.helper=new DLProcHelper();
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.core.registerProcessor(this);
	} catch(e) {
		dump("[DLProc] !!! constructor: "+e+"\n");
	}
}

DLProc.prototype = {
	get name() { return "download"; },
	get provider() { return "DownloadHelper"; },
	get title() { return Util.getText("processor.download.title"); },
	get description() { return Util.getText("processor.download.description"); },
	get enabled() { return true; },
}

DLProc.prototype.canHandle=function(desc) {
	//dump("[DLProc] canHandle()\n");
	return this.helper.canHandle(desc);
}

DLProc.prototype.requireDownload=function(desc) {
	//dump("[DLProc] requireDownload()\n");
	return this.helper.requireDownload(desc);
}

DLProc.prototype.preDownload=function(desc) {
	//dump("[DLProc] preDownload()\n");
	return this.helper.preDownload(desc,true,false);
}

DLProc.prototype.handle=function(desc) {
	//dump("[DLProc] handle()\n");
	this.helper.handle(desc,true);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

DLProc.prototype.contractID="@downloadhelper.net/download-processor;1";
DLProc.prototype.classID=Components.ID("{1f5c8528-c5b5-4b03-be0d-c8948028d9e6}");
DLProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([DLProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([DLProc]);


