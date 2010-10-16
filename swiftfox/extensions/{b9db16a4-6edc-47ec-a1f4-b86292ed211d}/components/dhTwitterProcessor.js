/******************************************************************************
 *            Copyright (c) 2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_TWITTER_CID = Components.ID("{e7933021-dbbb-493f-8b68-e0b74c2c1fea}");
const NS_TWITTER_PROG_ID = "@downloadhelper.net/twitter-processor;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;
var IOS=null;

/**
* Object constructor
*/
function Twitter() {
	try {
		//dump("[Twitter] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		if(!IOS) IOS=Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		if(!Util.priorTo19()) {
			var prefService=Components.classes["@mozilla.org/preferences-service;1"]
			                                   .getService(Components.interfaces.nsIPrefService);
			this.pref=prefService.getBranch("dwhelper.twitter.");
			this.core=Components.classes["@downloadhelper.net/core;1"].
				getService(Components.interfaces.dhICore);
			this.core.registerProcessor(this);
		}
	} catch(e) {
		dump("[Twitter] !!! constructor: "+e+"\n");
	}
}

Twitter.prototype = {
		get username() { return this.pref.getCharPref("username"); },
		get password() { var pw=Util.getPassword("twitter"); if(pw==null) pw=""; return pw; },
		get name() { return "twitter-update"; },
		get provider() { return "DownloadHelper"; },
		get title() { return Util.getText("twitter.update.title"); },
		get description() { return Util.getText("twitter.update.description"); },
		get enabled() { return this.pref.getBoolPref("enabled"); },
}

Twitter.prototype.canHandle=function(desc) {
	//dump("[Twitter] canHandle()\n");
	var extension=Util.getPropsString(desc,"file-extension");
	if(extension=="flv" || extension=="mp4")
		return true;
	else
		return false;
}

Twitter.prototype.requireDownload=function(desc) {
	//dump("[Twitter] requireDownload()\n");
	return false;
}
	
Twitter.prototype.preDownload=function(desc) {
	//dump("[Twitter] preDownload()\n");
	return false;
}

Twitter.prototype.handle=function(desc) {
	//dump("[Twitter] handle()\n");
	if(this.username.length==0) {
		Util.alertWarning(Util.getText("twitter.message.configure-account"));
		this.openPreferences();
		return;
	}
	function VerifyCredentialsObserver(client) {
		this.client=client;
	}
	VerifyCredentialsObserver.prototype={
		observe: function(subject,topic,data) {
			if(topic=="twitter-credentials") {
				if(data=="succeeded") {
					try {
						var purl=Util.getPropsString(desc,"page-url");
						var murl=Util.getPropsString(desc,"media-url");
						var extension=Util.getPropsString(desc,"file-extension");
						var title=Util.getPropsString(desc,"file-name");
						var smartnaming=false;
						if(desc.has("sn-name")) {
							smartnaming=true;
							title=Util.getPropsString(desc,"sn-name");
						}
						var description="";
						if(desc.has("sn-descr")) {
							smartnaming=true;
							description=Util.getPropsString(desc,"sn-descr");
						}
						var xml=[
						         "<?xml version='1.0' encoding='utf-8'?>\n<media>\n",
						         "  <purl>",Util.xmlEscape(purl),"</purl>\n",
						         "  <murl>",Util.xmlEscape(murl),"</murl>\n",
						         "  <title>",Util.xmlEscape(title),"</title>\n",
						         "  <description>",Util.xmlEscape(description),"</description>\n",
						         "  <extension>",Util.xmlEscape(extension),"</extension>\n",
						         "  <smartname>",""+smartnaming,"</smartname>\n",
						         "</media>"
						         ].join("");
						var url="http://vdh.bz/set-xml.php";
						var uri = IOS.newURI(url, null, null);
						var channel = IOS.newChannelFromURI(uri);
						var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
						var listener = new XMLStreamListener(this.client,"gotLink",{entry: desc, purl: purl, murl: murl, title: title, description: description, 
							smartnaming: smartnaming });
						channel.notificationCallbacks = listener;

						var pipe=Components.classes["@mozilla.org/pipe;1"].
                        	createInstance(Components.interfaces.nsIPipe);
						pipe.init(true,false,1024,10,null);
						var charset = "UTF-8"; // Can be any character encoding name that Mozilla supports

						var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
						                   .createInstance(Components.interfaces.nsIConverterOutputStream);
						os.init(pipe.outputStream, charset, 0, 0x0000);
						os.writeString(xml);
						os.close();

						var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
						uploadChannel.setUploadStream(pipe.inputStream, "application/x-binary", -1);

						httpChannel.requestMethod = "POST";	
						channel.asyncOpen(listener, null);
					} catch(e) {
						dump("!!! [Twitter] handle()/getLink: "+e+"\n");
					}
				} else {
					Util.alertError(Util.getText("twitter.message.account-failed"));
					this.client.openPreferences();
				}
			}
		}
	}
	this.verifyCredentials(new VerifyCredentialsObserver(this));
}

Twitter.prototype.gotLink=function(args,status,doc,httpStatus,text) {
	//dump("[Twitter] gotLink("+args+","+status+","+doc+","+httpStatus+",<text>)\n<text>="+text+")\n");
	try {
		if(httpStatus!=200 || doc==null || Util.xpGetString(doc.documentElement,"/result/status")!="success") {
			Util.alertError(Util.getText("twitter.message.cannot-get-short-url"));
		} else {
			var url=Util.xpGetString(doc.documentElement,"/result/url");
		    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
		                                .getService(Components.interfaces.nsIWindowMediator);
			var window = wm.getMostRecentWindow("navigator:browser");
		    var options="chrome,centerscreen,toolbar,modal";
		    
		    var message=url;
		    if(this.pref.getBoolPref("tag-message"))
		    	message+=" #vidohe";
		    
		    if(this.twitterLength(args.title+".. "+message)>140) {
		    	var title=args.title;
		    	var txt=title+".. "+message;
		    	while(this.twitterLength(txt)>140) {
		    		title=title.substr(0,title.length-1);
			    	txt=title+".. "+message;
		    	}
		    	message=txt;
		    } else {
		    	if(this.twitterLength(args.title+" "+args.description+" "+message)>140) {
			    	var description=args.description;
			    	var txt=args.title+" - "+description+".. "+message;
		    		while(this.twitterLength(txt)>140) {
			    		description=description.substr(0,description.length-1);
				    	txt=args.title+" - "+description+".. "+message;
		    		}
		    		message=txt;
		    	} else {
		    		message=args.title+" - "+args.description+" "+message;
		    	}
		    }
		    
		    var data={ url: url, message: message, user: this.username, smartnaming: args.smartnaming };
		    window.openDialog("chrome://dwhelper/content/twitter-message.xul",'',options, data );
		}
	} catch(e) {
		dump("[Twitter] gotLink(): "+e+"\n");
	}
}

Twitter.prototype.twitterLength=function(text) {

	var txt=text.replace(/&/g,"&amp;");
	var txt=txt.replace(/</g,"&lt;");
	var txt=txt.replace(/>/g,"&gt;");

	var string = txt.replace(/\r\n/g,"\n");
	var utftext = "";
	for (var n = 0; n < string.length; n++) {
		var c = string.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		}
		else if((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}
	return utftext.length;
}

Twitter.prototype.openPreferences=function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                .getService(Components.interfaces.nsIWindowMediator);
	var window = wm.getMostRecentWindow("navigator:browser");
    var options="chrome,centerscreen,toolbar,modal";
    var data={ selectedPanel: "panel-services", selectedTab: "tab-twitter" }
    window.openDialog("chrome://dwhelper/content/preferences-new.xul",'',options, data );	
}



Twitter.prototype.updateHandler=function(args,status,doc,httpStatus,text) {
	//dump("[Twitter] updateHandler("+args+","+status+","+doc+","+httpStatus+",<text>)\n<text>="+text+")\n");
}

Twitter.prototype.callAPI=function(path,method,callback,args) {
	//dump("[Twitter] callAPI("+path+","+method+",callback,args)\n");
	try {
		var url="http://twitter.com/"+path;
		var uri = IOS.newURI(url, null, null);
		var channel = IOS.newChannelFromURI(uri);
		var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
		httpChannel.setRequestHeader("Authorization","Basic "+Util.base64Encode(this.username+":"+this.password),false);
		httpChannel.requestMethod = method;	
		var listener = new XMLStreamListener(this,callback,args);
		channel.notificationCallbacks = listener;
		channel.asyncOpen(listener, null);
	} catch(e) {
		dump("!!! [Twitter] callAPI(): "+e+"\n");
	}
}

Twitter.prototype.update=function(message) {
	//dump("[Twitter] update("+message+")\n");
	this.callAPI("statuses/update.xml?status=" +encodeURIComponent(message),"POST","updateHandler",null);
}

Twitter.prototype.verifyCredentialsHandler=function(args,status,doc,httpStatus,text) {
	//dump("[Twitter] verifyCredentialsHandler("+args+","+status+","+doc+","+httpStatus+",<text>)\n<text>="+text+")\n");
	var status;
	if(httpStatus==200)
		status="succeeded";
	else
		status="failed";
	this.pref.setCharPref("last-status",status);
	args.observer.observe(this,"twitter-credentials",status);
}

Twitter.prototype.verifyCredentials=function(observer) {
	//dump("[Twitter] verifyCredentials()\n");
	this.callAPI("account/verify_credentials.xml","GET","verifyCredentialsHandler",{observer:observer});
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

Twitter.prototype.contractID="@downloadhelper.net/twitter-processor;1";
Twitter.prototype.classID=Components.ID("{e7933021-dbbb-493f-8b68-e0b74c2c1fea}");
Twitter.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProcessor,
                                       Components.interfaces.dhITwitter
                                       ]);


if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([Twitter]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([Twitter]);


function XMLStreamListener(service,callback,args) {
	this.service=service;
	this.callback=callback;
	this.args=args;
}

XMLStreamListener.prototype={
	QueryInterface: function(iid) {
	    if (iid.equals(Components.interfaces.nsISupports) || 
	    	iid.equals(Components.interfaces.nsIInterfaceRequestor) ||
	    	iid.equals(Components.interfaces.nsIStreamListener)) {
	    	return this;
	    }
        throw Components.results.NS_ERROR_NO_INTERFACE;
	},
	onStartRequest: function(request,context) {
		this.data="";
	},
	onDataAvailable: function(request,context,inputStream,offset,count) {
		var sstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
               .createInstance(Components.interfaces.nsIConverterInputStream);
		sstream.init(inputStream, "utf-8", 256, 
			Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

		var str={};
		var n=sstream.readString(128,str);
		while(n>0) {
			this.data+=str.value;
			str={};
			n=sstream.readString(128,str);
		}
	},
	onStopRequest: function(request,context,nsresult) {
		var responseStatus=request.QueryInterface(Components.interfaces.nsIHttpChannel).responseStatus;
		if(responseStatus==200) {
			var parser=Components.classes["@mozilla.org/xmlextras/domparser;1"].
				createInstance(Components.interfaces.nsIDOMParser);
			var doc=parser.parseFromString(this.data,"text/xml");
			this.service[this.callback](this.args,true,doc,responseStatus,this.data);
		} else {
			this.service[this.callback](this.args,false,null,responseStatus,this.data);
		}
	},
	getInterface: function(iid) {
	    if (iid.equals(Components.interfaces.nsISupports) || 
	    	iid.equals(Components.interfaces.nsIInterfaceRequestor) ||
	    	iid.equals(Components.interfaces.nsIStreamListener)) {
	    	return this;
	    }
	    return null;
	},
}

