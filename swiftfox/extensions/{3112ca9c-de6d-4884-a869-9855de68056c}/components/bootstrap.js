// Copyright 2006 and onwards, Google
// Author: Aaron Boodman
// Stolen and modified by: Fritz Schneider
//
// We run our application in a separate context from the browser. Our
// app gets its own context by virtue of the fact that it is an XPCOM
// component. Glue code in the overlay will call into our component
// to interact with the app.
//
// This file implements a loader for our component. It takes a list of
// js files and dynamically loads them into this context. It then
// registers to hear xpcom startup, at which point it instantiates our
// application in this context. This context is exposed to overlay
// code via a property of the object returned when you get the service
// from contract @google.com/toolbar/application;1.
//
// Lots of JS and XPCOM voodoo going on here; tread lightly unless you
// understand it.
//
// TODO: delete category entry for startup on shutdown?

// CSI library (javascript/timing) uses 'window' variable as a namespace.
var window = window || {};

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

/**
 * Profiler
 * @constructor
 */
function GTB_Timestamps(name, prefName) {
  this.data_ = [];
  this.data_.push({'name': name, 'time': Date.now()});
  this.prefName_ = prefName;
}

GTB_Timestamps.prototype.timestamp = function(name, opt_comment) {
  if (!this.enabled()) {
    return;
  }
  this.data_.push({'name': name, 'time': Date.now(), 'comment': opt_comment});
};

GTB_Timestamps.prototype.enabled = function() {
  var prefs = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefService).getBranch('google.toolbar.profiler.');
  var prefCommon = 'enabled';
  if (((prefs.getPrefType(prefCommon) == Ci.nsIPrefBranch.PREF_BOOL) &&
      prefs.getBoolPref(prefCommon)) ||
      ((prefs.getPrefType(this.prefName_) == Ci.nsIPrefBranch.PREF_BOOL) &&
      prefs.getBoolPref(this.prefName_))) {
    this.enabled = function() { return true; }
    return true;
  }
  return false;
};

GTB_Timestamps.prototype.stopAndDumpCollected = function(opt_window) {
  this.timestamp(' finished ===================');
  // Stop collecting timestamps.
  this.timestamp = function () {};
  if (!this.enabled()) {
    return;
  }
  var win = opt_window || window;
  win.dump('\n\nProfiler timestamps =============================\n');
  win.dump('Time, ms; time since start, ms; local same level diff, ms; name\n');

  this.flush(false, win);
};

/**
 * Flushes the current contents of the events log to the console.
 * @param {boolean} measureGaps if true, prints intervals between the events,
 *     otherwise prints duration since the beginning of logging.
 * @param {nsIChromeWindow} win Window.
 */
GTB_Timestamps.prototype.flush = function(measureGaps, win) {
  if (!this.enabled() || this.data_.length == 0) {
    return;
  }

  var start = this.data_[0].time;
  var indent = '';
  var prevTime = [];
  for(var i = 0; i < this.data_.length; ++i) {
    var d = this.data_[i];
    if (!d.name) {
      prevTime.push(d.time);
      continue;
    }
    if (d.name[0] == '+') {
      indent += '  ';
      prevTime.push(d.time);
    }
    var diffTimeStr = prevTime.length ? String(d.time - prevTime.pop()) : '';
    prevTime.push(d.time);

    var extraData =
        d.comment ? (this.padRight_(d.name, 40) + ' ' + d.comment ) : d.name;
    try {
      win.dump(String(d.time) + this.padLeft_(String(d.time - start), 6) +
               indent + '|' + this.padLeft_(diffTimeStr, 3) +
               ' ' + extraData + '\n');
    } catch (e) {}

    if (measureGaps) {
      start = d.time;
    }

    if (d.name[0] == '-') {
      indent = indent.substring(0, indent.length - 2);
      prevTime.pop();
      if (!indent) {
        win.dump('\n');
      }
    }
  }
  this.data_ = [];
};

/**
 * Creates an instrumented closure to measure the timing of the function call.
 * @param {Function} method Method to call.
 * @param {Object} object 'this' object.
 * @param {strin} opt_label Event name or other meaningful id.
 */
GTB_Timestamps.prototype.bind = function(method, object, opt_label) {
  var bound = BindToObject(method, object);
  var label = object.debugZone || object.toString();
  if (opt_label) {
    label += ':' + opt_label;
  }
  var self = this;
  return function (e) {
    var doc = e.doc || e.target;
    var url = doc && doc.location && doc.location.href;

    self.timestamp(null);
    bound(e);
    self.timestamp(label, url);
  }
};

GTB_Timestamps.prototype.initFlush = function(window) {
  if (this.enabled()) {
    var period = GTB_GlobalPrefs.getPref(
        'google.toolbar.profiler.' + this.prefName_ + '.interval', 0);
    if (period) {
      new G_Alarm(BindToObject(this.flush, this, true, window),
                  period * 1000,
                  true /*repeat*/);
    }
  }
};

GTB_Timestamps.prototype.padLeft_ = function(str, minOutLength) {
  return ('          ' + str).slice(-Math.max(minOutLength, str.length));
};

GTB_Timestamps.prototype.padRight_ = function(str, minOutLength) {
  return (str + '                                   ').slice(0, minOutLength);
};

try {
  var GTB_StartupProfiler =
      new GTB_Timestamps(
          '+bootstrap.js: GTB_StartupProfiler created', 'startup');

  var GTB_EventProfiler =
      new GTB_Timestamps('bootstrap.js: GTB_EventProfiler created', 'events');

  //Mozila drag and drop helpers
  Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader)
    .loadSubScript('chrome://global/content/nsDragAndDrop.js');
  GTB_StartupProfiler.timestamp('nsDragAndDrop.js loaded');

  Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader)
    .loadSubScript('chrome://global/content/nsTransferable.js');
  GTB_StartupProfiler.timestamp('nsTransferable.js loaded');

  // Load our component JS file.
  Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader)
    .loadSubScript('chrome://google-toolbar-lib/content/toolbar.js');
  GTB_StartupProfiler.timestamp('toolbar.js loaded');

  // Load Google domain information
  Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader)
    .loadSubScript('chrome://google-toolbar/locale/domains.js');
  GTB_StartupProfiler.timestamp('domains.js loaded');


  // Now we can make our js module
  var GTB_module = new G_JSModule();
  GTB_StartupProfiler.timestamp('new G_JSModule()');

  // global instance of preferences object
  var GTB_GlobalPrefs = new G_Preferences();
  GTB_StartupProfiler.timestamp('new G_Preferences()');

  // Register the application.
  var application = new GTB_Application();
  GTB_module.registerObject('{66f4ea38-ca54-4c81-b145-858a27aea21b}',
                            '@google.com/toolbar/application;1',
                            'GTB_Context',
                            application,
                            ['xpcom-startup']);
  GTB_StartupProfiler.timestamp('application');
  var localeFeatureListService = new GTB_LocaleFeatureListService();
  GTB_module.registerObject('{42495560-aa41-11db-abbd-0800200c9a66}',
                            '@google.com/toolbar/locale-features-list-service;1',
                            'Google Toolbar Locale Features List Service',
                            localeFeatureListService);
  GTB_StartupProfiler.timestamp('locale-features-list-service');
  GTB_module.registerObject('{4a44b81d-633f-4fc2-9b87-40bb74a98e97}',
                            '@google.com/toolbar/caps-manager;1',
                            'Google Toolbar CAPS manager',
                            new GTB_Security());
  GTB_StartupProfiler.timestamp('caps-manager');
  if (Ci.gtbIHtmlSuggest) {
    GTB_module.registerFactory(new GTB_HtmlSuggestObjectFactory());
  }
  GTB_StartupProfiler.timestamp('GTB_HtmlSuggestObjectFactory');
  GTB_module.registerObject('{71631a52-b676-4628-8831-f777932b82ec}',
                            '@mozilla.org/autocomplete/search;1?name=google-search-suggest',
                            'Google Search Suggest',
                            new SearchSuggestAutoComplete());
  GTB_StartupProfiler.timestamp('google-search-suggest');
  GTB_module.registerObject('{0706d4a9-df9a-4d57-9b5f-c2c050006db8}',
                            '@google.com/toolbar/search-history;1',
                            'Google Toolbar Search History',
                            new GTB_SearchHistoryService());
  GTB_StartupProfiler.timestamp('search-history');
  GTB_module.registerObject('{2de1131b-01de-42e8-99d3-4b34654e491f}',
                            '@google.com/toolbar/gaia-service;1',
                            'Google Toolbar Gaia Service',
                            new GTB_GaiaService());
  GTB_StartupProfiler.timestamp('gaia-service');
  GTB_module.registerObject('{dbb5b4b6-1094-4160-8c77-5df04583f420}',
                            '@google.com/toolbar/bookmarks;1',
                            'Google Toolbar Server Bookmarks',
                            new GTB_BookmarksService());
  GTB_StartupProfiler.timestamp('bookmarks');
  GTB_module.registerObject('{2f2f5706-4145-437e-9959-a0f3072bd1af}',
                            '@mozilla.org/autocomplete/search;1?name=bookmark-labels-suggest',
                            'Google Toolbar Bookmark Label Suggest',
                            new LabelAutoComplete());
  GTB_StartupProfiler.timestamp('bookmark-labels-suggest');
  GTB_module.registerObject('{caf13f42-59e6-4d0e-abd0-8d0587c7e320}',
                            '@mozilla.org/network/protocol;1?name=mailto',
                            'Google Mail Protocol',
                            new GTB_MailtoProtocolHandler());
  GTB_StartupProfiler.timestamp('GTB_MailtoProtocolHandler');
  GTB_module.registerObject('{af2bee5f-bb24-53e0-f922-5288ed0180fe}',
                            '@google.com/toolbar/custom-buttons-service;1',
                            'Google Toolbar Custom Buttons Service',
                            new GTB_CustomButtonsService());
  GTB_StartupProfiler.timestamp('custom-buttons-service');
  GTB_module.registerObject('{f1d3ee04-9baa-4f2b-96ed-23cd17f8a96f}',
                            '@google.com/toolbar/search-service;1',
                            'Google Toolbar Search Service',
                            new GTB_SearchService());
  GTB_StartupProfiler.timestamp('search-service');
  GTB_module.registerObject('{e6b41bd3-817b-4287-9244-d27b70384e72}',
                            '@google.com/toolbar/linkdoctor;1',
                            'Google Toolbar LinkDoctor',
                            new GTB_LinkDoctor());
  GTB_StartupProfiler.timestamp('linkdoctor');
  GTB_module.registerObject('{C317780E-E958-11DD-9931-195F56D89593}',
                            '@mozilla.org/network/protocol;1?name=toolbar',
                            'Google Toolbar Protocol',
                            new GTB_ToolbarProtocolHandler());
  GTB_StartupProfiler.timestamp('GTB_ToolbarProtocolHandler');
  GTB_module.registerObject('{8F1ED9EC-7CFC-11DE-B421-E96656D89593}',
                            '@google.com/toolbar/components;1',
                            'Google Toolbar Components Registry',
                            new GTB_StaticComponentRegistry());
  GTB_StartupProfiler.timestamp('GTB_StaticComponentRegistry');
  var chPrefs = new GTB_ContentPrefsService();
  GTB_module.registerObject('{034f1b81-d347-4485-ad25-a75ac5fa9017}',
                            '@google.com/toolbar/content-prefs;1',
                            'Google Toolbar Content Prefs Helper',
                            chPrefs);
  GTB_StartupProfiler.timestamp('content-prefs');
  GTB_module.registerObject('{BB71BDBE-C240-11DE-876C-33FB55D89593}',
                            '@google.com/toolbar/sharing-service;1',
                            'Google Toolbar Sharing Service',
                            new GTB_SharingService());
  GTB_StartupProfiler.timestamp('sharing-service');
  chPrefs.registerHandlers(GTB_module, localeFeatureListService);
  GTB_StartupProfiler.timestamp('chPrefs.registerHandlers');

  GTB_module.registerObject('{251e6f99-12c3-4935-8f22-75832f87baf9}',
                            '@google.com/toolbar/command-line-handler;1',
                            'Google Toolbar Command Line Handler',
                            new GTB_CommandLineHandler());
  // Register the command line handler
  var catMgr = Cc['@mozilla.org/categorymanager;1']
                 .getService(Ci.nsICategoryManager);

  catMgr.addCategoryEntry('command-line-handler',
                          'm-googletoolbar', // priority(a-z)-name
                          '@google.com/toolbar/command-line-handler;1',
                          true, true);
  GTB_StartupProfiler.timestamp('command-line-handler');

  // For the "content-policy" topic, the name for the category entry must be
  // the contract ID of the component.
  // http://www.opensubscriber.com/message/mozilla-xpcom@mozilla.org/924255.html
  GTB_module.registerObject('{f4c526c9-d4e9-a521-0f7c-eef1e979e811}',
                            '@google.com/toolbar/custom-buttons-urlchecker;1',
                            '@google.com/toolbar/custom-buttons-urlchecker;1',
                            new GTB_CB_UrlChecker(),
                            ['content-policy']);
  GTB_StartupProfiler.timestamp('custom-buttons-urlchecker');
  GTB_module.registerObject('{33f776e5-004d-4f25-a24b-e60d93251058}',
                            '@google.com/toolbar/web-progress-listener;1',
                            'Google Toolbar WebProgressListener',
                            new GTB_WebProgress());
  GTB_StartupProfiler.timestamp('web-progress-listener');

  if (Ci.gtbIClientSideInstrumentation) {
    GTB_module.registerFactory(new GTB_CSI_ObjectFactory());
    GTB_StartupProfiler.timestamp('GTB_CSI_ObjectFactory');
  }

  var autofill = new GTB_AF_Autofill();
  var autofillService = new GTB_AF_FormController(autofill);
  GTB_module.registerObject('{d6b783f9-9881-4f65-afdb-1face21044ae}',
                            '@mozilla.org/satchel/form-fill-controller;1',
                            'Google Toolbar Autofill Form Fill controller',
                            autofillService);

  GTB_AF_registerSearches(GTB_module);
  GTB_StartupProfiler.timestamp('form-fill-controller');

  GTB_module.registerObject('{0a8b8dbe-7340-11dc-8314-0800200c9a66}',
                            '@google.com/sidewiki/core;1',
                            'ANNOTE_Context',
                            GTB_SidewikiApplication.getInstance());
  GTB_StartupProfiler.timestamp('sidewiki/core');

  //make autofill service available trough the application
  application.wrappedJSObject.autofillService = autofillService;

  //set a flag of first window opened for AU
  application.wrappedJSObject.firstAUCheck = true;

  GTB_module.registerObject('{7378f7a1-c235-4201-a1ff-0faebe932aec}',
                            '@google.com/toolbar/unfrozen-adapter-service;1',
                            'Google Toolbar Unfrozen Interfaces Adapter',
                            new GTB_UA_AdapterFactory());
  GTB_StartupProfiler.timestamp('unfrozen-adapter-service');

  if (IsPlatformWin()) {
    GTB_module.registerObject('{b779a3e2-3004-4628-b213-1ba5ccdeafd0}',
                              '@google.com/fileassociation;1',
                              'Google Toolbar File Association Utilities',
                              new GTB_FileAssociation());
    GTB_StartupProfiler.timestamp('fileassociation');
  }
  GTB_StartupProfiler.timestamp('-bootstap.js');
} catch (err) {
  dump('[GTB-bootstrap] exception: ' + err + ', stack: ' + err.stack + '\n');
  throw err;
}

function NSGetModule() {
  return GTB_module;
}
