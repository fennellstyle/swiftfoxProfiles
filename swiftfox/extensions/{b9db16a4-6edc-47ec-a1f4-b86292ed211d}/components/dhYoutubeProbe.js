/******************************************************************************
 *            Copyright (c) 2006-2009 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_YTPROBE_CID = Components.ID("{506124c4-0076-48d2-bfee-14bb3187560e}");
const NS_YTPROBE_PROG_ID = "@downloadhelper.net/youtube-probe;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function YTProbe() {
	try {
		//dump("[YTProbe] constructor\n");
		if(!Util) Util=Components.classes["@downloadhelper.net/util-service;1"].getService(Components.interfaces.dhIUtilService);
		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
		                                   .getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		this.ytInfo=Components.classes["@downloadhelper.net/youtube-info;1"]
		                           	.getService(Components.interfaces.dhIYTInfo);
		this.core=Components.classes["@downloadhelper.net/core;1"].
			getService(Components.interfaces.dhICore);
		this.core.registerProbe(this);
	} catch(e) {
		dump("[YTProbe] !!! constructor: "+e+"\n");
	}
}

YTProbe.prototype = {}

YTProbe.prototype.handleDocument=function(document,window) {
	try {
		var availFormats={};
		//dump("[YTProbe] handleDocument("+document.URL+")\n");
		if(/^http:\/\/[^\/]*\.?youtube\.[^\/\.]+/.test(document.URL)) {
			var dom=document.documentElement;
			var scripts=Util.xpGetStrings(dom,".//script/text()",{});
			var videoId=null;
			var t=null;
			for(var i=0;i<scripts.length;i++) {
				var script=scripts[i];
				
				var match=/fmt_url_map=([^&\\\"]+)/.exec(script);
				if(match!=null && match.length==2) {
					var fum=decodeURIComponent(match[1]);
					var fmts=fum.split(",");
					for(var j in fmts) {
						var m2=/^([0-9]+)\|(.*)/.exec(fmts[j]);
						if(m2 && m2.length==3) {
							availFormats[m2[1]]=m2[2];
						}
					}
					
				}
			}
			
			for(var i=0;i<scripts.length;i++) {
				var script=scripts[i];
				var match=/\"video_id\": \"(.*?)\".*\"t(?:oken)?\": \"(.*?)\"/m.exec(script);
				if(match!=null && match.length==3) {
					videoId=match[1];
					t=match[2];
					break;
				}
				var match=/\"t(?:oken)?\": \"(.*?)\".*\"video_id\": \"(.*?)\"/m.exec(script);
				if(match!=null && match.length==3) {
					videoId=match[2];
					t=match[1];
					break;
				}
			}
			if(videoId==null || t==null) {
				for(var i=0;i<scripts.length;i++) {
					var script=scripts[i];
					var match=/[^_]video_id=([^&]+)(?:&.*)&t=([^&]+)/m.exec(script);
					if(match!=null && match.length==3) {
						videoId=match[1];
						t=match[2];
						break;
					}
					var match=/[&\?]t=(.*?)(?:&|&.*[^_])video_id=(.*?)(?:&|")/m.exec(script);
					if(match!=null && match.length==3) {
						videoId=match[2];
						t=match[1];
						break;
					}
				}
			}
			if(videoId==null || t==null) {
				var embeds=Util.xpGetStrings(dom,".//embed/@src",{});
				for(var i=0;i<embeds.length;i++) {
					var embed=embeds[i];
					var match=/[^_]video_id=(.*?)&.*t=(.*?)(?:&|")/m.exec(embed);
					if(match!=null && match.length==3) {
						videoId=match[1];
						t=match[2];
						break;
					}
				}
				if(videoId==null || t==null) {
					return;
				}
			}
			var title=Util.xpGetString(dom,"/html/head/meta[@name='title']/@content");
			if(title==null || title.length==0) {
				title=Util.xpGetString(dom,".//h3[@id='playnav-restricted-title']/text()");
			}
			if(title==null || title.length==0) {
				title=Util.xpGetString(dom,".//div[@class='content']/div/a/img[@title]/@title");
			}			
			if(title)
				title=title.replace(/"/g,"");
			var url="http://www.youtube.com/get_video?video_id="+videoId+"&t="+t+"&noflv=1&el=detailpage&asv=3&fmt=34";

			var fileName=title;
			var unmodifiedFilename=false;
			try {
				unmodifiedFilename=this.pref.getBoolPref("yt-unmodified-filename");		
			} catch(e) {}
			fileName=fileName.replace(/(?:[\/"\?\*:\|"'\\_]|&quot;|&amp;|&gt;|&lt;)+/g,"_");
			if(unmodifiedFilename==false) {
				var keepSpaces=false;
				try {
					keepSpaces=this.pref.getBoolPref("yt-keep-spaces");
				} catch(e) {}
				if(keepSpaces)
					fileName=fileName.replace(/[^a-zA-Z0-9\.\- ]+/g,"_");
				else
					fileName=fileName.replace(/[^a-zA-Z0-9\.\-]+/g,"_");
				fileName=fileName.replace(/^[^a-zA-Z0-9]+/,"");
				fileName=fileName.replace(/[^a-zA-Z0-9]+$/,"");
			}
			if(title) {
				title=title.replace(/&quot;/g,"\"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
			}

			function StreamListener(desc,service,document,window,availFormats) {
				this.desc=desc;
				this.service=service;
				this.document=document;
				this.window=window;
				this.availFormats=availFormats;
				var formats=this.service.pref.getCharPref("ythq-formats").split(",");
				this.formats=[];
				for(var i in formats) {
					if(formats[i].length>0) {
						this.formats.push(formats[i]);
					}
				}
			}

			StreamListener.prototype={
				QueryInterface: function(iid) {
				    if (!iid.equals(Components.interfaces.nsISupports) && 
				    	!iid.equals(Components.interfaces.nsIStreamListener)) {
				            throw Components.results.NS_ERROR_NO_INTERFACE;
				        }
				    return this;
				},
				onStartRequest: function(request,context) {
					this.httpChannel=request.QueryInterface(Components.interfaces.nsIHttpChannel);
					this.responseStatus=this.httpChannel.responseStatus;
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
					if(this.responseStatus==200) {
						var p=this.data.split("&");
						for(var i in p) {
							var m=/^(.*?)=(.*)$/.exec(p[i]);
							if(m!=null && m.length==3) {
								//dump(m[1]+"="+m[2]+"\n");
								if(m[1]=="fmt_url_map") {
									var fum=decodeURIComponent(m[2]);
									var fmts=fum.split(",");
									for(var j in fmts) {
										var m2=/^([0-9]+)\|(.*)/.exec(fmts[j]);
										if(m2 && m2.length==3) {
											this.availFormats[m2[1]]=m2[2];
										}
									}
								}
							} 
						}
						for(var j in this.formats) {
							if(typeof(this.availFormats[this.formats[j]])!="undefined") {
								var format=parseInt(this.formats[j]);
								var url=this.availFormats[this.formats[j]];
								var desc1=this.service.core.cloneEntry(desc);
								Util.setPropsString(desc1,"media-url",url);
								var extension=this.service.ytInfo.getExtension(format);
								var fileName=Util.getPropsString(desc,"base-name");
								Util.setPropsString(desc1,"file-name",fileName+"."+extension);
								Util.setPropsString(desc1,"file-extension",extension);
								var title=Util.getPropsString(desc,"youtube-title");
								var prefix=this.service.ytInfo.getFormatPrefix(format);
								Util.setPropsString(desc1,"label-prefix",prefix);
								Util.setPropsString(desc1,"label",prefix+title);
								this.service.core.addEntryForDocument(desc1,this.document,this.window);
							}
						}
					}
				}
			}

			var ioService = Components.classes["@mozilla.org/network/io-service;1"]
			                                   .getService(Components.interfaces.nsIIOService);
			var uri = ioService.newURI("http://www.youtube.com/get_video_info?video_id="+videoId+"&fmt=18", null, null);
			var channel = ioService.newChannelFromURI(uri);

			var desc=Components.classes["@mozilla.org/properties;1"].
				createInstance(Components.interfaces.nsIProperties);
			Util.setPropsString(desc,"page-url",document.URL);
			Util.setPropsString(desc,"label",title);
			Util.setPropsString(desc,"base-name",fileName);
			Util.setPropsString(desc,"capture-method","youtube-hq");
			Util.setPropsString(desc,"youtube-title",title);
			Util.setPropsString(desc,"icon-url","http://www.youtube.com/favicon.ico");
		     
			channel.asyncOpen(new StreamListener(desc,this,document,window,availFormats), null);
		} 
	} catch(e) {
		dump("!!! [YTProbe] handleDocument("+document.URL+"): "+e+"\n");
	}
}

YTProbe.prototype.handleRequest=function(request) {
}
	
YTProbe.prototype.handleResponse=function(request) {
}

Components.utils['import']("resource://gre/modules/XPCOMUtils.jsm");

YTProbe.prototype.contractID="@downloadhelper.net/youtube-probe;1";
YTProbe.prototype.classID=Components.ID("{506124c4-0076-48d2-bfee-14bb3187560e}");
YTProbe.prototype.QueryInterface=XPCOMUtils.generateQI([
                                       Components.interfaces.dhIProbe,
                                       ]);

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([YTProbe]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([YTProbe]);

