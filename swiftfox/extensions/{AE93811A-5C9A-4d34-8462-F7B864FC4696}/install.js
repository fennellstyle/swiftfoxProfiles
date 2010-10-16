const APP_AUTHOR		= "Geoff Smith";
const APP_NAME			= "StumbleUpon";
const APP_CHROME_NAME		= "stumbleupon";
const APP_VERSION		= "3.73";
const APP_FILE 			= "chrome/stumbleupon.jar";
const APP_FILE2 		= "stumbleupon.jar";
const APP_XPCOM_SERVICE = "stumbleuponService.js";
const APP_CONTENTS_PATH		= "content/";
const APP_LOCALE_ENUS_PATH	= "locale/en-US/";
const APP_LOCALE_FRFR_PATH	= "locale/fr-FR/";
//const APP_SKIN_PATH		= "skin/classic/stumbleupon/";

initInstall(APP_NAME, APP_CHROME_NAME, APP_VERSION); 

// var chromeFolder = getFolder("Current User", "chrome");
var chromeFolder = getFolder("Profile", "chrome");
setPackageFolder(chromeFolder);
// error = addFile(APP_NAME, APP_FILE, chromeFolder, "");
error = addFile(APP_AUTHOR, APP_VERSION, APP_FILE, chromeFolder, null);
//if (error != SUCCESS)
//	alert('err1 ' + error);

var jarFolder = getFolder(chromeFolder, APP_FILE2);
registerChrome(CONTENT | PROFILE_CHROME, jarFolder, APP_CONTENTS_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ENUS_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_FRFR_PATH);
//registerChrome(SKIN | PROFILE_CHROME, jarFolder, APP_SKIN_PATH);


var result = getLastError(); 
if (result == SUCCESS) 
{
//	var componentsDir = getFolder("Components");
//	var xpcomErr = addFile(
//			APP_CHROME_NAME + " Components",
//			APP_VERSION,
//			"components/" + APP_XPCOM_SERVICE,
//			componentsDir,
//			APP_XPCOM_SERVICE,
//			true);

	var err = addFile(APP_NAME, ".autoreg", getFolder("Program"), "");

	error = performInstall();
	
	if (error != SUCCESS && error != REBOOT_NEEDED)
	{
		displayError(error);
		cancelInstall(error);
	}
//	alert("xpcomErr " + xpcomErr + " installErr " + error + " REBOOT_NEEDED " + REBOOT_NEEDED + " SUCCESS " + SUCCESS);
//	if (error != SUCCESS)
//		alert('err3 ' + error);
} 
else 
{
//	alert('err2 ' + result);
	cancelInstall(result);
}


// Displays the error message to the user
function displayError(error)
{
    // If the error code was -215
    if(error == READ_ONLY)
    {
        alert("The installation of " + APP_NAME +
            " failed.\nOne of the files being overwritten is read-only.");
    }
    // If the error code was -235
    else if(error == INSUFFICIENT_DISK_SPACE)
    {
        alert("The installation of " + APP_NAME +
            " failed.\nThere is insufficient disk space.");
    }
    // If the error code was -239
    else if(error == CHROME_REGISTRY_ERROR)
    {
        alert("The installation of " + APP_NAME +
            " failed.\nChrome registration failed.");
    }
    else
    {
        alert("The installation of " + APP_NAME +
            " failed.\nThe error code is: " + error);
    }
}
