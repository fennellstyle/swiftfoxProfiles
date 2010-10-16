/******************************************************************************
 *            Copyright (c) 2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DOMHOOK_CID = Components.ID("{7e757f8b-0a62-4e65-9339-4b4fd1cb9bcc}");
const NS_DOMHOOK_PROG_ID = "@downloadhelper.net/dom-hook;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function Hook() {
	try {
		//dump("[Hook] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
		                                   .getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
	} catch(e) {
		dump("[Hook] !!! constructor: "+e+"\n");
	}
}

Hook.prototype = {}

Hook.prototype.hook=function(document) {
	//dump("[Hook] hook("+document.URL+")\n");
	try {
		var ytInPage=this.pref.getBoolPref("yt-inpage");
		if(ytInPage) {
			this.ytHook(document);
		}
	} catch(e) {
		dump("!!! [Hook] hook("+document.URL+"): "+e+"\n");
	}
}

Hook.prototype.fmtSwitch=function(document,titleH1) {
	if(this.pref.getBoolPref("yt-fmt-switcher")==false)
		return;
	if(/^http:\/\/(?:[a-z]+\.)?youtube\.com\/watch\?/.test(document.URL)) {
		var xulNS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";		
		var switchTo="mp4";
		if(/(?:\?|&)fmt=18/.test(document.URL)) {
			switchTo="flv";
		}
		var img=document.createElementNS(xulNS,"xul:toolbarbutton");
		img.setAttribute("image","http://www.downloadhelper.net/yt-switch-to-"+switchTo+".png");
		img.setAttribute("type","menu-button");
		img.style.margin="0px 12px 0px 0px";
		img.style.position="relative";

		var menupopup=document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","xul:menupopup");
		menupopup.setAttribute("position","end_before");
		img.appendChild(menupopup);

		img.QueryInterface(Components.interfaces.nsIDOMNSEventTarget).
			addEventListener("command",{ 
				document: document,
				switchTo: switchTo,
				handleEvent: function(event) {
					if(event.originalTarget.tagName=="xul:toolbarbutton") {
						var url=this.document.URL.replace(/&?fmt=[0-9]+/g,"");
						if(switchTo=="mp4") {
							this.document.location=url+"&fmt=18";
						} else {
							this.document.location=url;
						}
					}
					event.stopPropagation(); 
				}
			},false,false);

		var menuitem=document.createElementNS(xulNS,"xul:menuitem");
		menuitem.setAttribute("label",Util.getText("what-is-this"));
		menuitem.QueryInterface(Components.interfaces.nsIDOMNSEventTarget).
			addEventListener("command",{ 
				handleEvent: function(event) {
	                var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	                                            .getService(Components.interfaces.nsIWindowMediator);
	                var window = wm.getMostRecentWindow("navigator:browser");
	                var browser=window.getBrowser();
	                browser.selectedTab=browser.addTab("http://www.downloadhelper.net/youtube-format-switcher.php");
					event.stopPropagation(); 
				}
			},false,false);
		menupopup.appendChild(menuitem);

		titleH1.insertBefore(img,titleH1.firstChild);
		img.style.MozBoxAlign="baseline";
		var nodes=document.getAnonymousNodes(img);
		for(var i=0;i<nodes.length;i++) {
			var node=nodes[i];
			node.style.padding="0";
			node.style.margin="0";
		}

	}

}

Hook.prototype.ytHook=function(document) {
	if(/^http:\/\/(?:[a-z]+\.)?youtube\.com\//.test(document.URL)) {
		//dump("[Hook] hook(): YouTube page\n");
		var titleH1=Util.xpGetSingleNode(document.documentElement,".//div[@id='watch-vid-title']/h1");
		if(!titleH1) {
			titleH1=Util.xpGetSingleNode(document.documentElement,".//h1[@id='watch-headline-title']");
		}
		if(!titleH1) {
			//dump("!!! [Hook] hook(): title not found\n");
			return;
		}
		
		try {
		this.fmtSwitch(document,titleH1);
		} catch(e) {
			dump("!!! [Hook] fmtSwitch(): "+e+"\n");
		}
		
		var xulNS="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";		
		
		var img=document.createElementNS(xulNS,"xul:toolbarbutton");
		img.setAttribute("image","http://www.downloadhelper.net/favicon.ico");
		img.setAttribute("type","menu-button");
		img.style.margin="0px 12px 0px 0px";
		img.style.position="relative";
		titleH1.style.paddingBottom="8px";
		var span=Util.xpGetSingleNode(titleH1,".//span");
		if(span) {
			span.style.verticalAlign="top";
		}
		
		var menupopup=document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","xul:menupopup");
		menupopup.setAttribute("position","end_before");
		img.appendChild(menupopup);

		function Listener(core,document,processor) {
			this.core=core;
			this.document=document;
			this.processor=processor;
		}
		Listener.prototype={
			handleEvent: function(event) {
				var i=this.core.getEntries().enumerate();
				while(i.hasMoreElements()) {
					var entry=i.getNext().QueryInterface(Components.interfaces.nsIProperties);
					if(entry.has("document") && entry.has("capture-method") && 
							Util.getPropsString(entry,"capture-method")=="youtube-hq" &&
							entry.get("document",Components.interfaces.nsIDOMDocument)==this.document) {
						this.core.processEntry(this.processor,entry);
						break;
					}
				}
				event.stopPropagation(); 
			},
		}

		var defProcName=this.pref.getCharPref("yt-inpage.default-processor");
		var defProcessor=null;
		
		var i=this.core.getProcessors().enumerate();
		while(i.hasMoreElements()) {
			var processor=i.getNext().QueryInterface(Components.interfaces.dhIProcessor);
			if(processor.name==defProcName)
				defProcessor=processor;
			var menuitem=document.createElementNS(xulNS,"xul:menuitem");
			menuitem.setAttribute("label",processor.title);
			menuitem.setAttribute("tooltiptext",processor.description);
			menuitem.QueryInterface(Components.interfaces.nsIDOMNSEventTarget).
				addEventListener("command",new Listener(this.core,document,processor),false,false);
			menupopup.appendChild(menuitem);
		}
		if(defProcessor)
			img.QueryInterface(Components.interfaces.nsIDOMNSEventTarget).
				addEventListener("command",new Listener(this.core,document,defProcessor),false,false);
		titleH1.insertBefore(img,titleH1.firstChild);
		img.style.MozBoxAlign="baseline";
		var nodes=document.getAnonymousNodes(img);
		for(var i=0;i<nodes.length;i++) {
			var node=nodes[i];
			node.style.padding="0";
			node.style.margin="0";
		}
	}
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

Hook.prototype.contractID="@downloadhelper.net/dom-hook;1";
Hook.prototype.classID=Components.ID("{7e757f8b-0a62-4e65-9339-4b4fd1cb9bcc}");
Hook.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIDOMHook,
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([Hook]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([Hook]);


