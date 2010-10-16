/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_COPYURL_CID = Components.ID("{93e81622-ce06-410e-bc10-4f3dd7617399}");
const NS_COPYURL_PROG_ID = "@downloadhelper.net/copyurl-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function CopyUrl() {
	try {
		//dump("[CopyUrl] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.core.registerProcessor(this);
	} catch(e) {
		dump("[CopyUrl] !!! constructor: "+e+"\n");
	}
}

CopyUrl.prototype = {
		get name() { return "copyurl"; },
		get provider() { return "DownloadHelper"; },
		get title() { return Util.getText("processor.copyurl.title"); },
		get description() { return Util.getText("processor.copyurl.description"); },
		get enabled() { return true; },
}

CopyUrl.prototype.canHandle=function(desc) {
	//dump("[CopyUrl] canHandle()\n");
	var ch=desc.has("media-url");
	return ch;
}

CopyUrl.prototype.requireDownload=function(desc) {
	//dump("[CopyUrl] requireDownload()\n");
	return false;
}

CopyUrl.prototype.preDownload=function(desc) {
	return true;
}

CopyUrl.prototype.handle=function(desc) {
	//dump("[CopyUrl] handle()\n");
	var mediaUrl=Util.getPropsString(desc,"media-url");
	if(mediaUrl) {
		var str = Components.classes["@mozilla.org/supports-string;1"].
			createInstance(Components.interfaces.nsISupportsString); 
		if (!str) return; 
		str.data = mediaUrl; 
		var trans = Components.classes["@mozilla.org/widget/transferable;1"].
			createInstance(Components.interfaces.nsITransferable);
		if (!trans) return; 
		trans.addDataFlavor("text/unicode"); 
		trans.setTransferData("text/unicode",str,mediaUrl.length * 2); 
		var clipid = Components.interfaces.nsIClipboard; 
		var clip = Components.classes["@mozilla.org/widget/clipboard;1"].
			getService(clipid); 
		if (!clip) return; 
		clip.setData(trans,null,clipid.kGlobalClipboard);
		//dump("[CopyUrl] handle(): to clipboard "+mediaUrl+"\n");
	}
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

CopyUrl.prototype.contractID="@downloadhelper.net/copyurl-processor;1";
CopyUrl.prototype.classID=Components.ID("{93e81622-ce06-410e-bc10-4f3dd7617399}");
CopyUrl.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       ]);

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([CopyUrl]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([CopyUrl]);
