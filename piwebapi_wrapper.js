//
// piwebapi_wrapper.js
//
// (C) Convergio 2016 - www.convergio.com
//
// Written by G Strack
// Version: 1.0
//
// This script handles the authentication and data processing logic that is required
// to interface to the PI Web API, which provides a clean separation between the
// application's core functions, and its interface to the API
//

var afServerName = "AUSGRAAF1";
var afDatabaseName = "Metallurgy";

var piwebapi = (function () {
	// PRIVATE VARIABLES
	var basePIWebAPIUrl = null;
	var currentUserName = null;
	var currentPassword = null;
	var currentElementName = "Assays";
	var currentElementWebId = null;
    var currentAttributesWebId = null;	
	
	// PRIVATE METHODS
	
	// this function creates the http request header
	var processJsonContent = function (url, type, data, successCallBack, errorCallBack) {
		console.log("processJsonContent called");
		return $.ajax({
			url: url,
			type: type,
			data: data,
			contentType: "application/json; charset=UTF-8",
			// this sends the pre-flight request and populates the successCallBack and errorCallBack responses
			beforeSend: function (xhr) {
				xhr.setRequestHeader("Authorization", makeBasicAuth(currentUserName, currentPassword));
			},
			success: successCallBack,
			error: errorCallBack
		});
	};

	// this function creates the Basic encoded 64-bit authentication string for the http request header
	var makeBasicAuth = function (user, password) {
		var token = user + ':' + password;
		var hash = window.btoa(token);
		return "Basic " + hash;
	};
	
	// this function returns the WebID of an AF database
	var getDatabaseWebId = function (databaseName, successCallBack, errorCallBack) {
		console.log("getDatabaseWebId called");
		var url = basePIWebAPIUrl + "assetdatabases?path=\\\\" + afServerName + "\\" + databaseName;
        return processJsonContent(url, 'GET', null, successCallBack, errorCallBack);
    };

	// this function returns the WebID of an AF Element
	var getElementWebId = function (databaseName, elementName, successCallBack, errorCallBack) {
		console.log("getElementWebId called");
		var url = basePIWebAPIUrl + "elements?path=\\\\" + afServerName + "\\" + databaseName
             + "\\" + elementName;
        return processJsonContent(url, 'GET', null, successCallBack, errorCallBack);
    };
	
	// this function returns the WebID of an attribute
	var getAttributesWebId = function (elementWebId, successCallBack, errorCallBack) {
 		console.log("getAttributesWebId called");
		var url = basePIWebAPIUrl + "elements/" + elementWebId +"/attributes";
        return processJsonContent(url, 'GET', null, successCallBack, errorCallBack);
    };

	// this function accepts input and output grades and calculates recovery
	var calcRecovery = function (inputGrade, outputGrade, successCallBack, errorCallBack) {
		console.log("calcRecovery called");
		var recovery = null;
		if (outputGrade < inputGrade) {
			var recovery = ( outputGrade / inputGrade);			
		} else if (outputGrade >= inputGrade) {
			alert("Bad data. Output grade cannot be higher than input grade.");
		}
		return recovery;
	};
	
    var sendValuesToPI = function (assays) {
		console.log("sendValuesToPI called");
        var data = [];
        for (var key in attributesWebId) {
            var obj = {};
			var headGrade = 0;
			var tailGrade = 0;
            obj.WebId = attributesWebId[key];
            obj.Items = [];
			// append assays to array
            var newValue = {};
            newValue.Timestamp = "*";
            if (key == "Head Grade") {
                newValue.Value = assays.HeadGrade;
				headGrade = assays.HeadGrade;
				console.log("Head Grade assay updated")
            } else if (key == "Leach Grade") {
                newValue.Value = assays.LeachGrade;
				console.log("Leach Grade assay updated")
			}  else if (key == "Tail Grade") {
                newValue.Value = assays.TailGrade;
				tailGrade = assays.TailGrade;
				console.log("Tail Grade assay updated")
			}
            obj.Items.push(newValue);
			//append recovery to array
			obj.Items.push(calcRecovery(headGrade, tailGrade, null, null));
            data.push(obj);
        }
		
        var postData = JSON.stringify(data);
        var url = basePIWebAPIUrl + "streamsets/" + currentElementWebId + "/recorded";
		console.log(postData);
        var ajax = processJsonContent(url, 'POST', postData, null, null);
        $.when(ajax).fail(function () {
            console.log("Cannot write data to AF attributes.");
        });
        $.when(ajax).done(function () {
        });
    };
	
	// PUBLIC METHODS
	
	return {
		// this creates the base URL for the Pi Web API and handles the possibility of having extra / in url
		SetBaseUrl: function (baseUrl) {
			basePIWebAPIUrl = baseUrl;
			if (basePIWebAPIUrl.slice(-1) != '/') {
				basePIWebAPIUrl = basePIWebAPIUrl + "/";
			}
		},
		
		// Set username and password
		SetCredentials: function (user, password) {
			currentUserName = user;
			currentPassword = password;
		},
		
		// Check authentication
		Authorize: function (successCallBack, errorCallBack) {
			// Make ajax call
			return processJsonContent(basePIWebAPIUrl, 'GET', null, successCallBack, errorCallBack);
		},
		
		// Check data is within acceptable max/min limits
		Validate: function (assay, min, max) {
			if (assay <= max) {
				if ( assay >= min) {
					return assay;
				} else {
					return null;
				}
			} else {
				return null;
			}
		},
		
		Reset: function() {
			basePIWebAPIUrl = null;
			currentUserName = null;
			currentPassword = null;
			currentElementWebId = null;
            currentAttributesWebId = null;
		},
		
		SendValues: function (assays) {
            if (currentElementWebId == null || currentAttributesWebId == null) {
                // Get WebId of element
                var ajaxEL = getElementWebId(afDatabaseName, currentElementName, null, null);
                $.when(ajaxEL).fail(function () {
                    console.log("Cannot find element " + currentElementName);
                });

                // Get WebId of attributes
                $.when(ajaxEL).done(function (data) {
                    currentElementWebId = data.WebId;
                    var ajaxAttr = getAttributesWebId(currentElementWebId, null, null);
                    $.when(ajaxAttr).fail(function () {
                        console.log("Cannot find attributes from element.");
                    });
                    $.when(ajaxAttr).done(function (data) {
                        // Get attributes Web Id
                        attributesWebId = {};
                        for (i = 0; i < data.Items.length; i++) {
                            attributesWebId[data.Items[i].Name] = data.Items[i].WebId;
                        }
                        // Send values to attributes
                        sendValuesToPI(assays);
						console.log("Writing values to PI");
                    });
                });
                // Send Values to attributes
            }
            else {
                sendValuesToPI(assays);
				console.log("Writing values to PI");
            }
		}
	}
	
})();