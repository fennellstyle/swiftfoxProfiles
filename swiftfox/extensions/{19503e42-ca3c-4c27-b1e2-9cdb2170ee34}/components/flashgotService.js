/***** BEGIN LICENSE BLOCK *****

    FlashGot - a Firefox extension for external download managers integration
    Copyright (C) 2004-2010 Giorgio Maone - g.maone@informaction.com

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
                             
***** END LICENSE BLOCK *****/

const CI = Components.interfaces;
const CC = Components.classes;
const NS_BINDING_ABORTED = 0x804b0002;



const EXTENSION_ID = "{19503e42-ca3c-4c27-b1e2-9cdb2170ee34}";
const EXTENSION_NAME = "FlashGot";
const CHROME_NAME = "flashgot";
const VERSION = "1.2.2.1";
const SERVICE_NAME = EXTENSION_NAME + " Service";
const SERVICE_CTRID = "@maone.net/flashgot-service;1";
const SERVICE_ID = "{2a55fc5c-7b31-4ee1-ab15-5ee2eb428cbe}";
    
const SERVICE_CONSTRUCTOR = FlashGotService;

// interfaces implemented by this component
const SERVICE_IIDS = 
[ 
  CI.nsISupports,
  CI.nsISupportsWeakReference,
  CI.nsIObserver,
  CI.nsIURIContentListener
];

// categories which this component is registered in
const SERVICE_CATS = ["app-startup"];

const IOS = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService);

const IO = {
  readFile: function(file) {
    const is = CC["@mozilla.org/network/file-input-stream;1"]
      .createInstance(CI.nsIFileInputStream );
    is.init(file ,0x01, 0400, null);
    const sis = CC["@mozilla.org/scriptableinputstream;1"]
      .createInstance(CI.nsIScriptableInputStream );
    sis.init(is);
    const res = sis.read(sis.available());
    is.close();
    return res;
  },
  writeFile: function(file, content, charset) {
    const unicodeConverter = CC["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(CI.nsIScriptableUnicodeConverter);
    try {
      unicodeConverter.charset = charset ? charset : "UTF-8";
    } catch(ex) {
      unicodeConverter.charset = "UTF-8";
    }
    
    content = unicodeConverter.ConvertFromUnicode(content);
    const os = CC["@mozilla.org/network/file-output-stream;1"]
      .createInstance(CI.nsIFileOutputStream);
    os.init(file, 0x02 | 0x08 | 0x20, 0700, 0);
    os.write(content, content.length);
    os.flush();
    os.close();
  }
};

const LOADER = CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI.mozIJSSubScriptLoader);
const _INCLUDED = {};
const INCLUDE = function(name) {
  if (arguments.length > 1)
    for (var j = 0, len = arguments.length; j < len; j++)
      arguments.callee(arguments[j]);
  else if (!_INCLUDED[name]) {
    try {
      LOADER.loadSubScript("chrome://flashgot/content/"+ name + ".js");
      _INCLUDED[name] = true;
    } catch(e) {
      dump("INCLUDE " + name + ": " + e + "\n");
    }
  }
}

INCLUDE('XPCOM', 'DOM', 'DMS', 'HttpInterceptor', 'MediaSniffer');

const SHUTDOWN = "profile-before-change";
const STARTUP = ("nsISessionStore" in CI && typeof(/ /) === "object")
  ? "sessionstore-windows-restored"
  : "profile-after-change";

var fg, singleton; // singleton

function FlashGotService() {
  this.wrappedJSObject = fg = singleton = this;
  
  if ("nsIChromeRegistrySea" in CI) INCLUDE("SMUninstaller");
  
  this.register();
  
  return this;
}

FlashGotService.prototype = {
  OP_ONE: 0, 
  OP_SEL: 1,
  OP_ALL: 2,
  OP_QET: 3
,
  VERSION: VERSION
,
  set fileSpec(f) { // hooked from component registration
    delete this.fileSpec;
    this.fileSpec = f;
    try {
      f = this._sothinkFile(f.parent);
      if ((f instanceof CI.nsILocalFile) && f.exists()) {
        var s = IO.readFile(f);
        if (s.indexOf(SERVICE_CTRID) > -1) {
          f.moveTo(f.parent.parent, null);
          dump("Sothink illegal clone " + f.path + " removed\n");
        }
      }
    } catch(e) {
      dump(e + "\n");
    }
    return this.fileSpec;
  },
  _sothinkFile: function(f) {
    f = f.parent.parent;
    f.append("{FCAB6FDD-5585-425b-95C1-5ED856F3FD08}");
    f.append("components");
    f.append("SWVDService.js");
    return f;
  },
  sothinkRestore: function() {
    try {
      var f = this._sothinkFile(this.home);
      var sothink = f.parent.parent;
      sothink.append(f.leafName);
      if (sothink.exists()) {
        f = sothink.parent;
        f.append("components");
        sothink.moveTo(f, null)
      }
      dump("Sothink illegal clone restored in " + f.path + "\n");
    } catch(e) {
      dump(e + "\n");
    }
  }
  
,
  dom: DOM,
  register: function() {
    const os = this.observerService;
    os.addObserver(this, SHUTDOWN, false);
    os.addObserver(this, "xpcom-shutdown", false);
    os.addObserver(this, STARTUP, false);
    os.addObserver(this, "private-browsing", false);
     os.addObserver(this, "browser:purge-session-history", false);
  },
  unregister: function() {
    try {
      const os = this.observerService;
      os.removeObserver(this, "em-action-requested");
      os.removeObserver(this, SHUTDOWN);
      os.removeObserver(this, "xpcom-shutdown");
      os.removeObserver(this, STARTUP);
      os.removeObserver(this, "private-browsing");
      os.removeObserver(this, "browser:purge-session-history");
    } catch(ex) {
      this.log("Error unregistering service as observer: "+ex);
    }
  }
,
  QueryInterface: function(iid) {
     xpcom_checkInterfaces(iid, SERVICE_IIDS, Components.results.NS_ERROR_NO_INTERFACE);
     return this;
  }
,
  observerService: CC['@mozilla.org/observer-service;1'].getService(CI.nsIObserverService),

  observe: function(subject, topic, data) {
    if (subject == this.prefs) {
      this.syncPrefs(data);
    } else {
      switch (topic) {
        case "xpcom-shutdown":
          this.unregister();
          break;
        case SHUTDOWN: 
          this.cleanup();
          break;
        case STARTUP:
          this.delayExec(this.init, 0);
          break;
        case "em-action-requested":
          if ((subject instanceof CI.nsIUpdateItem)
              && subject.id == EXTENSION_ID) {
            if (data == "item-uninstalled" || data == "item-disabled") {
              this.uninstalling = true;
              this.sothinkRestore();
            } else if (data == "item-enabled" || data == "item-cancel-action") {
              this.uninstalling = false;
            }
          }
        break;
        case "private-browsing":
          if (data == "exit") {
            this.inPrivate = false;
            this._shredTempFiles();
          } else if (data == "enter") {
            this.inPrivate = true;
          }
        break;
        case "browser:purge-session-history":
          this._shredTempFiles();
        break;
      }
    }
  },
  
  
  inPrivate: false,
  uninstalling: false
,
  syncPrefs: function(name) {
    this.logEnabled = this.getPref("logEnabled", true);
    if (name) {
      switch (name) {
        case "hide-icons":
          var w;
          for (var wins = this.windowMediator.getEnumerator(null); wins.hasMoreElements();) {
             w=wins.getNext();
             if (typeof(w.gFlashGot)=="object" && w.gFlashGot.toggleMainMenuIcon) {
               w.gFlashGot.toggleMainMenuIcon();
             }
          }
        break;
        
        case "autoStart":
        case "interceptAll":
          this.interceptor[name] = this.getPref(name);
        break;
      
      }
    }
  }
,
  
  get defaultDM() {
    return this.getUPref("defaultDM", null);
  },
  set defaultDM(name) {
    return this.setUPref("defaultDM", name);
  },

  get isWindows() {
    delete this.__proto__.isWindows;
    var is = false;
    try {
      this.directoryService.get("WinD", CI.nsIFile);
      is = true;
    } catch(e) {}
    return this.__proto__.isWindows = is;
  },
  
  get isMac() {
    delete this.__proto__.isMac;
    var is = false;
    try {
      is = this.directoryService.get("UsrDsk", CI.nsIFile);
    } catch(e) {}
    return this.__proto__.isMac = is;
  },
  
  get directoryService() {
    delete this.__proto__.directoryService;
    return this.__proto__.directoryService = CC["@mozilla.org/file/directory_service;1"]
      .getService(CI.nsIProperties);
  },
  
  get java() {
    var java;
    
    try {
      java = this.prefs.getComplexValue("java", CI.nsILocalFile);
    } catch(e) {
    
      if (this.isWindows) {
        java = this.directoryService.get("WinD", CI.nsIFile);
        java.append("System32");
        java.append("javaw.exe");
      } else {
      
        java = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
        
        if (this.isMac) {
          java.initWithPath("/usr/bin/java");
        } else {
          try {
            java.initWithPath(DOM.mostRecentBrowserWindow.java.lang.System.getProperty("java.home"));
            java.append("bin");
            java.append("java");
          } catch (e) {
            java.initWithPath("/usr/bin/java");
          }
        }
      }
    }
    
    delete this.__proto__.java;
    return this.__proto__.java = java;
  }
,

  get extensions() {
    var s = this.getPref("extensions", "");
    return s ? s.split(/[\s,]+/) : [];
  },
  set extensions(v) {
    var arr = ((typeof(v) == "object" && v.join)
        ? v
        : typeof(v) == "string" && v && v.toLowerCase().split(',') || []
        ).map(function(e) { return e && e.replace(/[^\w\-]/g, '') })
         .filter(function(e) { return e });
    arr.sort();
    this.setPref("extensions", arr.join(','));
    return arr || [];
  },
  addExtension: function(e) {
    this.extensions = this.extensions.concat(e);
  }
,
  extractIds: function(css) {
    var ids = css.match(/#[^ ,]+/g);
    for(var j = ids.length; j-- > 0; ids[j] = ids[j].substring(1));
    return ids;
  },
  hideNativeUI: function(document, selectors) {
    var s = selectors + " {display: none !important}";
    if("nsIDownloadManagerUI" in CI) { // Toolkit, sync stylesheets
      DOM.updateStyleSheet(s, true);
    } else {
      for each (var id in this.extractIds(selectors)) try {
        document.getElementById(id).style.display = "none";
      } catch(e) {}
    }
    (document._FlashGot_NativeUI_styleSheets || 
      (document._FlashGot_NativeUI_styleSheets = [])
    ).push(s);
  },
  restoreNativeUIs: function(document) {
     var ss = document._FlashGot_NativeUI_styleSheets;
     if(!ss) return;
     var toolkit = "nsIDownloadManagerUI" in CI;
     var id;
     for each (var s in ss) {
       if(toolkit) {
         DOM.updateStyleSheet(s, false);
       } else {
          for each (id in this.extractIds(s)) try {
            document.getElementById(id).style.display = "";
          } catch(e) {}
       }
     }
     document._FlashGot_NativeUI_styleSheets = null;
  },
  _httpServer: null,
  get httpServer() {
    if (typeof(FlashGotHttpServer) != "function") {
      INCLUDE("flashgotHttpServer");
    }
    return ((!this._httpServer) || this._httpServer.isDown) ?
       this._httpServer=new FlashGotHttpServer(this)
      :this._httpServer;
  }
,
  createDownloadFile: function(parentFile, fileSpec, overwrite) {
    
    if (fileSpec instanceof CI.nsIURL) {
     
      fileSpec = fileSpec.fileName || fileSpec.filePath.replace(/.*?([^\/]*)\/?$/, '$1') || fileSpec.query || fileSpec.host;
      try {
        fileSpec = decodeURIComponent(fileSpec);
      } catch(e) {
        fileSpec = unescape(fileSpec);
      }
      fileSpec = fileSpec.replace(/[\u0000-\u001f\/]/g, '_');
    } else if (fileSpec instanceof CI.nsIURI) {
      return null;
    }
    
    if (!fileSpec) return null;
    
    var file = parentFile.clone();
    file.append(fileSpec);
            
    if (!overwrite || file.exists() && file.isDirectory()) {
      for (;;) {
        if(!file.exists()) {
          file.create(0, 0644);
          break;
        } else { // rename
          var m = file.leafName.match(/(.*?)(?:\((\d+)\))?(\.[^\.]+$|$)/);
          file.leafName = m[1] + "(" + ((m[2] && parseInt(m[2]) || 0) + 1) + ")" + m[3]; 
        }
      }
    }
    return file;
  }
,
  download: function(links, opType, dmName) {
    
    switch (links.length) {
      case 0: 
        return false;
      case 1: 
        opType = this.OP_ONE; 
        break;
      default:
        if (!opType) opType = this.OP_SEL;
    }
    
    if (!dmName) dmName = this.defaultDM;
    const dm = this.DMS[dmName];
    if (!dm) {
      this.log("FlashGot error: no download manager selected!");
      return false;
    }
    
    // surrogate missing attributes
    
    if (!links.progress) {
      links.progress = { update: function() {} };
    } else {
      links.progress.update(12);
    }
    
  
    this.delayExec(function(t) { fg._downloadDelayed(links, opType, dm); }); 
    return true;
  },
  
  _downloadDelayed: function(links, opType, dm) {
    
     if (!links.postData) { 
      links.postData = null;
    } else if(!dm.postSupport) {
      // surrogate POST parameters as query string
      links[0].href += (links[0].href.indexOf("?") > -1 ?  "&" : "?") + links.postData;
    }

    const encodedURLs = this.getPref(dm.getPref("encode"), this.getPref("encode", true));

    const extFilter = this.getPref("extfilter", false) && !this.interceptor.interceptAll ?
        new RegExp("\.(" +
          this.extensions.join("|").replace(/[^\w-|]/,"") + 
          ")\\b", "i") : null;
    
    var logMsg = "Processing " + links.length + " links ";
    if (this.logEnabled && typeof(links.startTime) == "number") {
      logMsg += "scanned in ms" + (Date.now() - links.startTime);
    }
    
    

    if (!links.startTime) links.startTime = Date.now();
    const pg = links.progress;
    
    var len = links.length;
    
    var filters = null;
    
    if (len > 1) {
      filters = [];
      
      const isValid = dm.isValidLink; 
      if (isValid)  filters.push(function(href) { return isValid(href) });
      if (extFilter) filters.push(function(href) { return extFilter.test(href) });

      if (filters.length) {
        filters.doFilter = function(href) {
          for (var j = this.length; j-- > 0;) if(!this[j](href)) return false;
          return true;
        }
      } else {
        filters = null;
      }
    }
    
    
    const map = {};
    pg.update(10);
    
    const stripHash = dm.getPref("stripHash", false);
    var cs = links.document && links.document.characterSet || null;
    
    var j, l, href, ol, pos1, pos2;
    for (j = 0; j < len; j++) {
      l = links[j];
      
      href = l.href;
      
      if (/^javascript:/i.test(href)) {
        try {
          l.href = href = href.match(/(['"])(https?:\/\/.*?)\1/)[2];
        } catch(e) {
          continue;
        }
        if (!href) continue;
      }
      
      if (filters && !filters.doFilter(href)) continue;
      
      if (l.description) l.description = l.description.replace(/\s+/g, ' ');
      l._pos = j;
      
      ol = map[href];
      if (ol) { // duplicate, keep the longest description
        if (ol.description.length < l.description.length) {
          map[href] = l;
          l.href = ol.href; // keep sanitizations
        }
      } else {
        map[href] = l;
        
        // encoding checks
        try {
          if (encodedURLs) { 
            href = IOS.newURI(href, cs, null).asciiSpec; // punycode + % encoding
            // workaround for malformed hash urls
           
            while ((pos1 = href.indexOf("#")) > -1 // has fragment?
              && href[pos1 + 1] != "!" // skip metalinks!
              && (href.indexOf("?") > pos1 || pos1 != href.lastIndexOf('#')) // fragment before query or double fragment ? 
            ) {
              href = href.substring(0, pos1) + '%23' + href.substring(pos1 + 1);
            }
            
            l.href = href;
          } else {  
            l.href = decodeURI(href);
          }
          if (stripHash) l.href = l.href.replace(/#.*/g, '');
          
        } catch(e) {
          dump("Problem "
            + ( encodedURLs ? "escaping" : "unescaping")
            + " URL " + href + ": "+ e.message + "\n");
        }
      }
    }
    pg.update(25);
    
    links.length = 0;
    for (href in map) links[links.length] = map[href];
    
    if (this.getPref("noDesc", false) || dm.getPref("noDesc", false)) {
      for (j = links.length; j-- > 0;) links[j].description = '';
    } else if(dm.asciiFilter) {
      for (j = links.length; j-- > 0;) {
        l = links[j];
        if(l.description) 
          l.description = l.description.replace(/[^\u0020-\u007f]/g, "") || l.href;
      }
    }
    
    
    this._processRedirects(links, opType, dm);
  },
  
  get RedirectContext() {
    delete this.__proto__.RedirectContext;
    INCLUDE('RedirectContext');
    return this.__proto__.RedirectContext = RedirectContext;
  },
  _processRedirects: function(links, opType, dm) {
    links.progress.update(30);
    this.delayExec(function() {  
      new fg.RedirectContext(links, opType, dm, function(processedBy) {
        links.redirProcessedBy = processedBy;
        fg._sendToDM(links, opType, dm);
      }).process();
    });
  },
  
  _sendToDM: function(links, opType, dm) {
    
    if (this.getPref("httpauth", false)) {
      dm.log("Adding authentication info");
      this._addAuthInfo(links);
    }
    
    if (dm.metalinkSupport && this.getPref("metalink", true)) {
      dm.log("Adding metalink info");
      if (this._processMetalinks(links)) {
        opType = this.OP_SEL; // force "ask path"
      }
    }
    
    if (links.length > 1) {
      dm.log("Sorting again "+links.length+" links");
      links.sort(function(a,b) {
        a=a._pos; b=b._pos;
        return a>b?1:a<b?-1:0;
      });
    }
    
    this._addQsSuffix(links);
    
    links.progress.update(70);
    
    dm.log("Preprocessing done in ms" + (Date.now() - links.startTime) );
    
    // "true" download
    this.delayExec(function() {
        dm.log("Starting dispatch");
        var startTime = Date.now();
    
        dm.download(links, opType);

        var now = Date.now();
        var logMsg = "Dispatch done in ms" + (now - startTime);
        if (typeof(links.startTime) == "number") { 
          logMsg += "\nTotal processing time: ms" + (now - links.startTime);
        }  
        dm.log(logMsg);
      });
  },
  
  _addQsSuffix: function(links) {
    var suffix = this.getPref("queryStringSuffix");
    if (suffix) {
      var rep = function(url, most, qs, hash) {
        return most + (qs ? qs + "&" : "?") + suffix + hash;
      }
      var l;
      for (var j = links.length; j-- > 0;) {
        l = links[j];
        l.href = l.href.replace(/^(.*?)(\?[^#]*)?(#.*)?$/, rep);
      }
    }
  },
  
  _addAuthInfo: function(links) {
    const httpAuthManager = CC['@mozilla.org/network/http-auth-manager;1']
                              .getService(CI.nsIHttpAuthManager);
    var uri;
    var udom = {};
    var uname = {};
    var upwd = {};
    var l;
    for (var j = links.length; j-- > 0;) {
      l = links[j];
      try {
        uri = IOS.newURI(l.href, null, null);
        if (l.userPass && l.userPass.indexOf(":") > -1) continue;
        httpAuthManager.getAuthIdentity(uri.scheme, uri.host, uri.port < 0 ? (uri.scheme == "https" ? 443 : 80) : uri.port, null, null, uri.path, udom, uname, upwd);
        this.log("Authentication data for " + uri + " added.");
        l.href = uri.scheme + "://" + uname.value + ":" + upwd.value + "@" + 
                 uri.host + (uri.port < 0 ? "" : (":" + uri.port)) + uri.spec.substring(uri.prePath.length);
      } catch(e) {}
    }
  },
  _processMetalinks: function(links) {
    var hasMetalinks = false;
    var l, k, href, pos, parts, couple, key;
    for (var j = links.length; j-- > 0;) {
       l = links[j];
       href = l.href;
       pos = href.indexOf("#!");
       if (pos < 0) continue;
       parts = href.substring(pos + 2).split("#!");
       if (parts[0].indexOf("metalink3!") == 0) continue; // per Ant request
       
       hasMetalinks = true;
       l.metalinks = [];
       for (k = 0; k < parts.length; k++) {
         couple = parts[k].split("!");
         if (couple.length != 2) continue;
         key = couple[0].toLowerCase();
         switch (key) {
           case "md5": case "sha1":
             l[key] = couple[1];
             break;
           case "metalink":
            if (/^(https?|ftp):/i.test(couple[1])) {
              l.metalinks.push(couple[1]);
            }
            break;
         }
       }
    }
    return links.hasMetalinks = hasMetalinks;
  }
,

  _timers: [],
  delayExec: function(callback, delay) {
    var timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
    timer.initWithCallback({ 
        notify: this.delayedRunner,
        context: { callback: callback, args: Array.prototype.slice.call(arguments, 2), self: this }
      }, delay || 1, 0);
    this._timers.push(timer);
  },
  
  
  delayedRunner: function(timer) {
    var ctx = this.context;
    try {
      ctx.callback.apply(ctx.self, ctx.args);
    } catch(e) {
     fg.log("Delayed Runner error: " + e + ", " + e.stack);
    } finally {
      ctx.args = null;
      ctx.callback = null;

      var tt = fg._timers;
      var pos = tt.indexOf(timer);
      if (pos > -1) tt.splice(pos, 1);
      timer.cancel();
    }
  }
,
  yield: function() {
    try {
      const eqs = CI.nsIEventQueueService;
      if (eqs) {
        CC["@mozilla.org/event-queue-service;1"]
          .getService(eqs).getSpecialEventQueue(eqs.UI_THREAD_EVENT_QUEUE)
          .processPendingEvents();
      } else {
        const curThread = CC["@mozilla.org/thread-manager;1"].getService().currentThread;
        while (curThread.hasPendingEvents()) curThread.processNextEvent(false);
      }
    } catch(e) {}
  }
,
  
  get prefService() {
    delete this.__proto__.prefService;
    return this.__proto__.prefService = CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefService);
  }
,
  savePrefs: function() {
    return this.prefService.savePrefFile(null);
  }
,
  getPref: function(name, def) {
    const IPC = CI.nsIPrefBranch;
    const prefs = this.prefs;
    try {
      switch (prefs.getPrefType(name)) {
        case IPC.PREF_STRING:
          return prefs.getCharPref(name);
        case IPC.PREF_INT:
          return prefs.getIntPref(name);
        case IPC.PREF_BOOL:
          return prefs.getBoolPref(name);
      }
    } catch(e) {}
    return def;
  }
,
  setPref: function(name, value) {
    const prefs = this.prefs;
    switch (typeof(value)) {
      case "string":
          prefs.setCharPref(name,value);
          break;
      case "boolean":
        prefs.setBoolPref(name,value);
        break;
      case "number":
        prefs.setIntPref(name,value);
        break;
      default:
        throw new Error("Unsupported type "+typeof(value)+" for preference "+name);
    }
  }
,
  getUPref: function(name, def) {
    try {
      return this.prefs.getComplexValue(name, CI.nsISupportsString).data;
    } catch(e) {
      return def;
    }
  },
  setUPref: function(name, value) {
    var str = CC["@mozilla.org/supports-string;1"]
        .createInstance(CI.nsISupportsString);
    str.data = value;
    this.prefs.setComplexValue(name, CI.nsISupportsString, str);
    return value;
  },

  get getString() {
    delete this.__proto__.getString;
    INCLUDE('Strings');
    const ss = new Strings("flashgot");
    return this.__proto__.getString = function(name, parms) { return ss.getString(name, parms) };
  },

  get logFile() {
    delete this.__proto__.logFile;
    var logFile = this.profDir.clone();
    logFile.append("flashgot.log");
    return this.__proto__.logFile = logFile;
  }
,
  logStream: null,
  logEnabled: false,
  logInit: function() {
    const logFile = this.logFile;
    const stream = CC["@mozilla.org/network/file-output-stream;1"]
      .createInstance(CI.nsIFileOutputStream);
    stream.init(logFile, 0x02 | 0x08 | 0x10, 0600, 0);
    const bufferedStream = CC["@mozilla.org/network/buffered-output-stream;1"]
      .createInstance(CI.nsIBufferedOutputStream);
    bufferedStream.init(stream, 32768);
    const charStream = CC["@mozilla.org/intl/converter-output-stream;1"]
      .createInstance(CI.nsIConverterOutputStream);
    charStream.init(bufferedStream, "UTF-8", 0, 0);
    charStream.writeString("*** FlashGot " + this.VERSION + " started at " + new Date().toGMTString() + " ***\n");
    this.logStream = charStream;
    this.logFlush = function() {
      if (this.logStream) {
        this.logStream.flush();
        bufferedStream.flush();
      }
    };
  },
  log: function(msg) {
    if (this.logEnabled) {
      try {
        if (!this.logStream) this.logInit();
        
        if (msg !== null && !this.inPrivate) {
          msg += "\n";
          this.logStream.writeString(msg);
        }

      } catch(ex) {
        dump(ex.message + "\noccurred logging this message:\n" + msg);
      }
    }
  }
,
  dumpStack: function(msg) {
    dump( (msg?msg:"")+"\n"+new Error().stack+"\n");
  }
,
  clearLog: function() {
    try {
      if (this.logStream) {
        try {
          this.logStream.close();
        } catch(eexx) {
          dump(eexx.message);
        }
      }
      if (this.logFile) this.logFile.remove(true);
      this.logStream = null;
      this.log(null);
    } catch(ex) { dump(ex.message); }
  } 
,
  get windowMediator() {
    return CC["@mozilla.org/appshell/window-mediator;1"
      ].getService(CI.nsIWindowMediator);
  }
,
  getWindow: function() {
    return this.windowMediator.getMostRecentWindow(null);
  }
,
  getBrowserWindow: function(document) {
    if (!document) return null;
    var w = DOM.getChromeWindow(document.defaultView.top);
    return w.wrappedJSObject || w; 
  }
,
  get prefs() {
    delete this.__proto__.prefs;
    return this.__proto__.prefs = this.prefService.getBranch("flashgot.").QueryInterface(CI.nsIPrefBranchInternal);
  }
,
  DMS: null,
  tmpDir: null,
  profDir: null,
  _initialized: false,
  init: function() {
    if (this._initialized) return;

    if (this.smUninstaller) this.smUninstaller.check();
    
    try {
      this.prefService.getDefaultBranch("flashgot.").getBoolPref("autoStart"); // test for default pref existance
    } catch(e) {
      dump("[FlashGot] Bug 576492 work-around!\n");
      var defFile = __LOCATION__.parent.parent;
      defFile.append("defaults");
      defFile.append("preferences");
      defFile.append("flashgot.js");
      this.prefService.readUserPrefs(defFile);
      this.prefService.readUserPrefs(null);
    }
    
    
    const os = this.observerService;
    
    os.addObserver(this, "em-action-requested", false);
    
    try {
      const startTime = Date.now();
      
      
      if (SERVICE_INSTALLING) this.setPref("installing", true);
      
      const fileLocator = this.directoryService;
      
      var profDir = this.profDir = fileLocator.get("ProfD", CI.nsIFile);
      
      function prepareTmp(t, create) {
        if (!(create || t.exists())) throw t.path + " does not exist!";
        
        t.append("flashgot." + encodeURI(profDir.leafName).replace(/%/g,"_"));
        if (t.exists()) {
         if (!(t.isDirectory() && t.isWritable())) t.createUnique(1, 0700);
        } else {
          t.create(1, 0700);
        } 
        return t;
      }
      
      
      try {
        this.tmpDir = prepareTmp(this.prefs.getComplexValue("tmpDir", CI.nsILocalFile), false);
      } catch(ex) {
        this.tmpDir = prepareTmp(fileLocator.get("TmpD", CI.nsILocalFile), true);
      }
      
      this.prefs.addObserver("", this, false);
      this.syncPrefs();
      
      this.log("Per-session init started");
        
      this._setupLegacyPrefs();

      this.DMS = this.checkDownloadManagers(true, false);
      
      
      this.interceptor = new HttpInterceptor();
      os.addObserver(this.interceptor, "http-on-modify-request", true);
      if (this.getPref("media.enabled", true)) {
        os.addObserver(MediaSniffer, "http-on-examine-response", true);
        os.addObserver(MediaSniffer, "http-on-examine-cached-response", true);
        CC['@mozilla.org/docloaderservice;1'].getService(CI.nsIWebProgress)
          .addProgressListener(MediaSniffer, CI.nsIWebProgress.NOTIFY_STATE_NETWORK);
      }
      this.interceptor.setup();
    
      this.log("Per-session init done in " + (Date.now() - startTime) + "ms");
    } catch(initEx) {
      this._initException = initEx;
      try { this.log(initEx); } catch(e) {}
    }
    this._initialized = true; 
  },

  dispose: function() {
    this.prefs.removeObserver("", this);
    const os = this.observerService;
    os.removeObserver(this.interceptor, "http-on-modify-request");
    this.interceptor.dispose();
    delete this.interceptor;
    try {
      os.removeObserver(MediaSniffer, "http-on-examine-response");
      os.removeObserver(MediaSniffer, "http-on-examine-cached-response");
      CC['@mozilla.org/docloaderservice;1'].getService(CI.nsIWebProgress)
        .removeProgressListener(MediaSniffer);
    } catch(e) {}
    
    this._initialized = false;
  }
,
  createCustomDM: function(name) {
    const dm = new FlashGotDMCust(name);
    if (name && name.length) {
      FlashGotDMCust.persist(this);
      this.sortDMS();
      this.checkDownloadManagers(false, false);
    }
    return dm;
  }
,
 removeCustomDM: function(name) {
   const dms = FlashGotDM.dms;
   for (var j = dms.length; j-->0;) {
     if (dms[j].custom && dms[j].name == name) {
       dms.splice(j, 1);
       delete dms[name];
     }
   }
   FlashGotDMCust.persist(this);
   this.checkDownloadManagers(false, false);
 }
,
  sortDMS: function() {
    FlashGotDM.dms.sort(function(a,b) { 
      a = a.priority || a.name.toLowerCase(); 
      b = b.priority || b.name.toLowerCase();
      return a > b ? 1 : a < b ?-1 : 0; 
    });
  }
, 
  checkDownloadManagers: function(init, detect) {
    
    if (init || detect) FlashGotDM.init(this);
    
    const dms = FlashGotDM.dms;
    dms.found = false;
    var defaultDM = this.defaultDM;
    if (!dms[defaultDM]) defaultDM = null;
    
    detect = detect || this.getPref("detect.auto", true);
 
    var j, dm;
    var cache = this.getUPref('detect.cache', '').split(',');
    
    var cacheLen = cache.length;
    if (!detect) {
      for (j = dms.length; j-- > 0;) {
        dm = dms[j];
        if (!dm.custom) dm._supported = false;
      }
      var name;
      for (j = cache.length; j-- > 0;) {
        name = cache[j];
        if (name.length && typeof(dm = dms[name]) == "object" && dm.name == name) {
          dm._supported = true;
        }
      }
    }
    
    cache = [];

    var firstSupported = null;
    for (j = dms.length; j-- >0;) {
      dm = dms[j];
      if (dm.supported) {
        dms.found = true;
        cache.push(firstSupported = dm);
      } else {
        this.log("Warning: download manager " + dm.name + " not found");
        if (defaultDM == dm.name) {
          defaultDM = null;
          this.log(dm.name + " was default download manager: resetting.");
        }
      }
    }
    
    this.setUPref("detect.cache", cache.map(function(dm) { return dm.name; }).join(","));
    
    if (cacheLen > 0 && cache.length > cacheLen && defaultDM && !dms[defaultDM].autoselect) { // new DM added
      defaultDM = null;
    }
    
    if (!defaultDM && firstSupported) {
      while (!firstSupported.autoselect && cache.length) {
        firstSupported = cache.pop();
      }
      this.defaultDM = firstSupported.name;
      this.log("Default download manager set to " + this.defaultDM);
    } else if(!dms.found) {
      this.log("Serious warning! no supported download manager found...");
    }
    
    
    if (this.getPref("installing", false)) {
      this.setPref("installing", false);
      this.savePrefs();
    }
    
    return dms;
  }
,
  _cleaningup: false
,
  _shredTempFiles: function() {
    try {
      var files = [];
      var fen = this.tmpDir.directoryEntries;
      var f;
      while (fen.hasMoreElements()) {
        f = fen.getNext();
        if (f instanceof CI.nsIFile) files.push(f);
      }
      if (files.length) this.shredFiles(files);
    } catch(e) {
      dump("Error shredding temp files: " + e + "\n");
    }
  },
  
  doomPrivateFile: function(f) {
    if (this.inPrivate || this.getPref("shredding"))
      this.delayExec(function() { fg.shredFiles(f); }, 5000);
  },
  
  shredFiles: function(files) {
    INCLUDE("Shredder");
    if (!("push" in files)) files = [files];
    Shredder.shred(files);
  },
  
  
  cleanup: function() {
    if (this._cleaningup) return;
    try {
      this._cleaningup = true;
      this.log("Starting cleanup");
      if (this._httpServer) {
        this._httpServer.shutdown();
      }
      
      try {
        FlashGotDM.cleanup(this.uninstalling);
      } catch(eexx) {
        dump(eexx.message);
      }
      
      if (this.tmpDir && this.tmpDir.exists()) {
        try {
          if ((this.inPrivate || this.getPref("shredding")))
          {
            this._shredTempFiles(); 
          } else {
            this.tmpDir.remove(true);
          }
        } catch(eexx) {
          this.log("Can't remove " + this.tmpDir.path + ", maybe still in use: " + eexx);
        }
      }
      this._bundle = null;
      this.log("Cleanup done");
      if (this.logFile) try {
        if (this.logStream) this.logStream.close();
        var maxLogSize = Math.max(Math.min(this.getPref('maxLogSize', 100000), 1000000), 50000);
        const logFile = this.logFile;
        const logSize = logFile.fileSize;
        const logBak = logFile.clone();
        logBak.leafName = logBak.leafName + ".bak";
        if (logBak.exists()) logBak.remove(true);

        if (this.uninstalling) {
          logFile.remove(false);
        } else if (logSize > maxLogSize) { // log rotation
          // dump("Cutting log (size: "+logSize+", max: "+maxLogSize+")");

          logFile.copyTo(logBak.parent, logBak.leafName);
          const is=CC['@mozilla.org/network/file-input-stream;1'].createInstance(
            CI.nsIFileInputStream);
          is.init(logBak, 0x01, 0400, null);
          is.QueryInterface(CI.nsISeekableStream);
          is.seek(CI.nsISeekableStream.NS_SEEK_END,-maxLogSize);
          const sis=CC['@mozilla.org/scriptableinputstream;1'].createInstance(
          CI.nsIScriptableInputStream);
          sis.init(is);
          var buffer;
          var content="\n";
          var logStart=-1;
          while ((buffer = sis.read(5000))) {
            content += buffer;
            if ((logStart=content.indexOf("\n*** Log start at ")) > -1) { 
              content=content.substring(logStart);
              break;
            }
            content=buffer;
          }
          if (logStart > -1) {
             const os=CC["@mozilla.org/network/file-output-stream;1"].createInstance(
              CI.nsIFileOutputStream);
            os.init(logFile,0x02 | 0x08 | 0x20, 0700, 0);
            os.write(content,content.length);
            while ((buffer = sis.read(20000))) {
              os.write(buffer,buffer.length);
            } 
            os.close();
          }
          sis.close();
        }
      } catch(eexx) {
        dump("Error cleaning up log: "+eexx);
      }
      this.logStream = null;
    } catch(ex) {
       this.log(ex);
    }
    this._cleaningup = false;
    this.dispose();
  }
,  
  logHex: function(s) {
    var cc = [];
    for(var j = 0, len = s.length; j < len; j++) {
      cc.push(s.charCodeAt(j).toString(16));
    }
    this.log(cc.join(","));
  }
,
  _lookupMethod: null,
  get lookupMethod() {
    return this._lookupMethod?this._lookupMethod:(this._lookupMethod = 
      (Components.utils && Components.utils.lookupMethod)
        ?Components.utils.lookupMethod:Components.lookupMethod);
  }
,
  _setupLegacyPrefs: function() {
    // check and move flashgot.flashgot.dmsopts branch from previous bug
    try {
      for each (var key in this.prefs.getChildList("flashgot.dmsopts.", {})) {
        this.setPref(key.replace(/^flashgot\./, ""), this.getPref(key));
      }
      this.prefs.deleteBranch("flashgot.dmsopts.");
    } catch(e) {
      dump(e + "\n");
    }
  }
,
  showDMSReference: function() {
    this.getWindow().open("http://www.flashgot.net/dms","_blank");
  }
, 
  dirtyJobsDone: false,
  
  versionChecked: false,
  checkVersion: function() {
    if (this.versionChecked) return;
    
    this.versionChecked = true;
    
    const ver =  this.VERSION;
    const prevVer = this.getPref("version", "");
    const betaRx = /(?:a|alpha|b|beta|pre|rc)\d*$/; // see http://viewvc.svn.mozilla.org/vc/addons/trunk/site/app/config/constants.php?view=markup#l431
    if (prevVer.replace(betaRx, "") != ver.replace(betaRx, "")) {
  
      this.setPref("version", ver);
      this.savePrefs();
      
      if (this.getPref("firstRunRedirection", true)) {
        this.delayExec(function() {
          
          var browser = DOM.mostRecentBrowserWindow.getBrowser();
          if (!(browser && browser.addTab)) return;
          
          const name = EXTENSION_NAME;
          const domain = name.toLowerCase() + ".net";
          var url = "http://" + domain + "/?ver=" + ver;
          var hh = "X-IA-Post-Install: " + name + " " + ver;
          if (prevVer) {
            url += "&prev=" + prevVer;
            hh += "; updatedFrom=" + prevVer;
          }
          hh += "\r\n";
          
          var hs = CC["@mozilla.org/io/string-input-stream;1"] .createInstance(CI.nsIStringInputStream);
          hs.setData(hh, hh.length); 
          
          
          var b = (browser.selectedTab = browser.addTab()).linkedBrowser;
          b.stop();
          b.webNavigation.loadURI(url, CI.nsIWebNavigation.FLAGS_NONE, null, null, hs);
          
        }, 500);
      }
    }
  }
}

