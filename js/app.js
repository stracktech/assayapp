// GLOBAL VARIABLES
var baseServiceUrl = "https://ausgraaf1.gfau.gfiroot.local/piwebapi";
var assays;
var feedGrade = 5;
var leachGrade = 4.9;
var tailGrade = 4.8;
var recovery = 80;

var updateDataDOM = function () {
	console.log("updateDataDOM called");
    $("#feedGrade").text(feedGrade);
	$("#leachGrade").text(leachGrade);
	$("#tailGrade").text(tailGrade);
	$("#recovery").text(recovery);	
};

// code to be executed if http request authorised. Does this need to be 204?
var authSuccessCallBack = function(data, statusMessage, statusObj) {
	if (statusObj.status == 200) {
		console.log("Authentication successful.");
		// TODO - need to figure out how to pass user input into assays to create valid POST request
		assays = {
			HeadGrade: 5,
			//HeadGrade: $(#feedGrade).val()
			LeachGrade: 4.9,
			//LeachGrade: $(#leachGrade).val()
			TailGrade: 4.8
			//TailGrade: $(#tailGrade).val()
		}
	}
}

// code to be executed if http request not authorised.
var authErrorCallBack = function (data) {
	if (data.status == 401) {
		alert("Your account is not authorised to write data into the database.\nVerify your database permissions or security configuration.");
	} else {
		alert("Error during validation");
	}
}

// code to be executed when the login button is pressed
$("#login-btn").click(function () {
	console.log("login-btn called");
    var username = $("#username").val();
    var password = $("#password").val();


    $("#auth-view-mode").hide();
    $("#content-view-mode").show();
	
	piwebapi.SetBaseUrl(baseServiceUrl);
    piwebapi.SetCredentials(username, password);
    piwebapi.Authorize(authSuccessCallBack, authErrorCallBack);

});

// code to be executed when the update button is pressed
$("#submit-assay-btn").click(function () {
	console.log("submit-assay-btn called");
    updateDataDOM();
	piwebapi.SendValues(assays);
});

//
$("#back-btn").click(function () {
	console.log("back-btn called");
    $("#username").val('');
    $("#password").val('');

    $("#content-view-mode").hide();
    $("#auth-view-mode").show();

    piwebapi.Reset();
});