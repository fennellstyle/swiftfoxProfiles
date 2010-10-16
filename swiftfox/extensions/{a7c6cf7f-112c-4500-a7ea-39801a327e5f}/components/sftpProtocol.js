/*----------------------------------------------------------------------
 * nsChromeExtensionHandler
 * By Ed Anuff <ed@anuff.com>
 * Protocol handler code based on techniques from:
 *
 *  http://www.nexgenmedia.net/docs/protocol/
 *  http://simile.mit.edu/piggy-bank/
 *
 *----------------------------------------------------------------------
 */

// Custom protocol related
const kSCHEME = "sftp";
const kPROTOCOL_CID = Components.ID("{8ca39389-a7a8-43f1-a502-bf9ce9fdada9}");
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kPROTOCOL_NAME = "FireFTP SFTP Handler";

// Dummy chrome URL used to obtain a valid chrome channel
// This one was chosen at random and should be able to be substituted
// for any other well known chrome URL in the browser installation
const kDUMMY_CHROME_URL = "chrome://mozapps/content/xpinstall/xpinstallConfirm.xul";

// Mozilla defined
const kCHROMEHANDLER_CID_STR = "{61ba33c0-3031-11d3-8cd0-0060b0fc14a3}";
const kCONSOLESERVICE_CONTRACTID = "@mozilla.org/consoleservice;1";
const kIOSERVICE_CID_STR = "{9ac9e770-18bc-11d3-9337-00104ba0fd40}";
const kIOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const kNS_BINDING_ABORTED = 0x804b0002;
const kSIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const kSTANDARDURL_CONTRACTID = "@mozilla.org/network/standard-url;1";
const kURLTYPE_STANDARD = 1;
const nsIComponentRegistrar = Components.interfaces.nsIComponentRegistrar;
const nsIConsoleService = Components.interfaces.nsIConsoleService;
const nsIFactory = Components.interfaces.nsIFactory;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIRequest = Components.interfaces.nsIRequest;
const nsIStandardURL = Components.interfaces.nsIStandardURL;
const nsISupports = Components.interfaces.nsISupports;
const nsIURI = Components.interfaces.nsIURI;

var ChromeExtensionModule = {

  /* CID for this class */
  cid: kPROTOCOL_CID,

  /* Contract ID for this class */
  contractId: kPROTOCOL_CONTRACTID,

  registerSelf : function(compMgr, fileSpec, location, type) {
    compMgr = compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.registerFactoryLocation(
      kPROTOCOL_CID,
      kPROTOCOL_NAME,
      kPROTOCOL_CONTRACTID,
      fileSpec,
      location,
      type
    );
  },

  getClassObject : function(compMgr, cid, iid) {
    if (!cid.equals(kPROTOCOL_CID)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    if (!iid.equals(nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
    return this.myFactory;
  },

  canUnload : function(compMgr) {
    return true;
  },

  myFactory : {
    createInstance : function(outer, iid) {
      if (outer != null) {
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      }

      return new ChromeExtensionHandler().QueryInterface(iid);
    }
  }
};

function NSGetModule(compMgr, fileSpec) {
  return ChromeExtensionModule;
}

/*----------------------------------------------------------------------
 * The ChromeExtension Handler
 *----------------------------------------------------------------------
 */

function ChromeExtensionHandler() {
  this.wrappedJSObject = this;
  this._system_principal = null;
}

ChromeExtensionHandler.prototype = {
  scheme: kSCHEME,
  defaultPort : -1,
  protocolFlags : nsIProtocolHandler.URI_STD,
  registerExtension : function(ext) { },
  allowPort : function(port, scheme) { return false; },

  newURI : function(spec, charset, baseURI) {
    var new_url = Components.classes[kSTANDARDURL_CONTRACTID].createInstance(nsIStandardURL);
    new_url.init(kURLTYPE_STANDARD, -1, spec, charset, baseURI);
    var new_uri = new_url.QueryInterface(nsIURI);
    return new_uri;
  },

  newChannel : function(uri) {
    var chrome_service = Components.classesByID[kCHROMEHANDLER_CID_STR].getService();
    chrome_service = chrome_service.QueryInterface(nsIProtocolHandler);
    var new_channel = null;

    try {
      if (uri.schemeIs(kSCHEME)) {
        var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        var prefBranch  = prefService.getBranch("fireftp.");
        var sString  = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
        sString.data = uri.spec;
        prefBranch.setComplexValue("loadurl", Components.interfaces.nsISupportsString, sString);

        var uri_string = "chrome://fireftp/content/fireftp.xul";
        uri = chrome_service.newURI(uri_string, null, null);
      }

      new_channel = chrome_service.newChannel(uri);
    } catch (e) {
      throw Components.results.NS_ERROR_FAILURE;
    }

    return new_channel;
  },

  QueryInterface : function(iid) {
    if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
      !iid.equals(Components.interfaces.nsISupports)) {

      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
};

