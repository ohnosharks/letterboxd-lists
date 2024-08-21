chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		// if (typeof request.imdbCode !== 'undefined') {
		// 	getIMDBHTML(request.imdbCode, sendResponse);
		// 	return true;
		// }
		if (typeof request.pageUrl !== 'undefined') {
			getPage(request.pageUrl, sendResponse);
			return true;
		}
	}
);


function getPage(uri, callback){
	var pageUrl = "https://letterboxd.com" + uri;
	var request = new XMLHttpRequest();
	request.open('GET', pageUrl, true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			callback(request.responseText);
		} else {
			callback(false);
		}
	};
	request.onerror = function() {
		callback(false)
	};
	request.send();
}