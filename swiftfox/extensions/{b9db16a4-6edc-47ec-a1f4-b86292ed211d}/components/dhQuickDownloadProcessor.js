/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_QDLPROC_CID = Components.ID("{38e2b849-ecf0-438b-b3a3-845d33f29b0c}");
const NS_QDLPROC_PROG_ID = "@downloadhelper.net/quick-download-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function QDLProc() {
	try {
		//dump("[QDLProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		        						.getService(Components.interfaces.mozIJSSubScriptLoader);
		jsLoader.loadSubScript("chrome://dwhelper/content/dlproc-helper.js");
		this.helper=new DLProcHelper();
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.core.registerProcessor(this);
	} catch(e) {
		dump("[QDLProc] !!! constructor: "+e+"\n");
	}
}

QDLProc.prototype = {
	get name() { return "quick-download"; },
	get provider() { return "DownloadHelper"; },
	get title() { return Util.getText("processor.quick-download.title"); },
	get description() { return Util.getText("processor.quick-download.description"); },
	get enabled() { return true; },
}

QDLProc.prototype.canHandle=function(desc) {
	//dump("[QDLProc] canHandle()\n");
	return this.helper.canHandle(desc);
}

QDLProc.prototype.requireDownload=function(desc) {
	//dump("[QDLProc] requireDownload()\n");
	return this.helper.requireDownload(desc);
}
	
QDLProc.prototype.preDownload=function(desc) {
	//dump("[QDLProc] preDownload()\n");
	return this.helper.preDownload(desc,false,false);
}

QDLProc.prototype.handle=function(desc) {
	//dump("[QDLProc] handle()\n");
	this.helper.handle(desc,false);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

QDLProc.prototype.contractID="@downloadhelper.net/quick-download-processor;1";
QDLProc.prototype.classID=Components.ID("{38e2b849-ecf0-438b-b3a3-845d33f29b0c}");
QDLProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([QDLProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([QDLProc]);

