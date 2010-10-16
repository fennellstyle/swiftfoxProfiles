/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_ADD2BLPROC_CID = Components.ID("{0c392af1-68a0-4a66-b7ca-8ce72a01f2ad}");
const NS_ADD2BLPROC_PROG_ID = "@downloadhelper.net/add-to-blacklist-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function Add2BL() {
	try {
		//dump("[Add2BL] constructor\n");

		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);

		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
		                                   .getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.core.registerProcessor(this);
	} catch(e) {
		dump("[Add2BL] !!! constructor: "+e+"\n");
	}
}

Add2BL.prototype = {
		get name() { return "add-to-blacklist"; },
		get provider() { return "DownloadHelper"; },
		get title() { return Util.getText("processor.add2bl.title"); },
		get description() { return Util.getText("processor.add2bl.description"); },
		get enabled() { return true; },
}

Add2BL.prototype.canHandle=function(desc) {
	//dump("[Add2BL] canHandle()\n");
	if(!desc.has("media-url"))
		return false;
	var mediaUrl=Util.getPropsString(desc,"media-url");
	if(/\/\/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(?::[0-9]{1,5})?\//.test(mediaUrl))
		return false;
	return true;
}

Add2BL.prototype.requireDownload=function(desc) {
	//dump("[Add2BL] requireDownload()\n");
	return false;
}

Add2BL.prototype.preDownload=function(desc) {
	//dump("[Add2BL] preDownload()\n");
	return true;
}

Add2BL.prototype.handle=function(desc) {
	//dump("[Add2BL] handle()\n");
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator);
	var w = wm.getMostRecentWindow("navigator:browser");
	w.openDialog('chrome://dwhelper/content/add-to-blacklist.xul','_blank',"chrome,centerscreen",desc);
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

Add2BL.prototype.contractID="@downloadhelper.net/add-to-blacklist-processor;1";
Add2BL.prototype.classID=Components.ID("{0c392af1-68a0-4a66-b7ca-8ce72a01f2ad}");
Add2BL.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([Add2BL]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([Add2BL]);

