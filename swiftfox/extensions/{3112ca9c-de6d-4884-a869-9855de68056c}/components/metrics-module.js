// Copyright 2009 Google Inc. All Rights Reserved.

/**
 * @fileoverview XPCOM module to load and register components of the usage
 * metrics collecting.
 * @author sergeyn@google.com (Sergey Novikov)
 */

try {
  Components.classes['@mozilla.org/moz/jssubscript-loader;1'].
      getService(Components.interfaces.mozIJSSubScriptLoader).
      loadSubScript('chrome://google-toolbar-lib/content/metrics.js');

} catch (err) {
  dump('************************************************************\n');
  dump('[metrics-module] exception: ' + err + ', stack: ' + err.stack + '\n');
  dump('************************************************************\n');
  throw err;
}

function NSGetModule() {
  return G_JSModule.getInstance();
}
