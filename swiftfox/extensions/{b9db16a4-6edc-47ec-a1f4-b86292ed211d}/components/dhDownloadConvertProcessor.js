/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DLCPROC_CID = Components.ID("{f9f662a6-77d4-437e-8f53-4fcc39fddf47}");
const NS_DLCPROC_PROG_ID = "@downloadhelper.net/download-convert-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function DLCProc() {
	try {
		//dump("[DLCProc] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
		        						.getService(Components.interfaces.mozIJSSubScriptLoader);
		jsLoader.loadSubScript("chrome://dwhelper/content/dlproc-helper.js");
		this.helper=new DLProcHelper();
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.cvMgr=Components.classes["@downloadhelper.net/convert-manager-component"]
		              					.getService(Components.interfaces.dhIConvertMgr);
		this.core.registerProcessor(this);
	} catch(e) {
		dump("[DLCProc] !!! constructor: "+e+"\n");
	}
}

DLCProc.prototype = {
	get name() { return "convert-choice"; },
	get provider() { return "DownloadHelper"; },
	get title() { return Util.getText("processor.convert-choice.title"); },
	get description() { return Util.getText("processor.convert-choice.description"); },
	get enabled() { return true; },
}

DLCProc.prototype.canHandle=function(desc) {
	//dump("[DLCProc] canHandle()\n");
	if(!this.helper.canHandle(desc))
		return false;
	return true;
	//return this.cvMgr.checkConverter(false);
}

DLCProc.prototype.requireDownload=function(desc) {
	//dump("[DLCProc] requireDownload()\n");
	return this.helper.requireDownload(desc);
}

DLCProc.prototype.preDownload=function(desc) {
	//dump("[DLCProc] preDownload()\n");
	return this.helper.preDownload(desc,true,true);
}

DLCProc.prototype.handle=function(desc) {
	//dump("[DLCProc] handle()\n");
	this.helper.handle(desc,true);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

DLCProc.prototype.contractID="@downloadhelper.net/download-convert-processor;1";
DLCProc.prototype.classID=Components.ID("{f9f662a6-77d4-437e-8f53-4fcc39fddf47}");
DLCProc.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([DLCProc]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([DLCProc]);

