'use strict';

var share_btn = document.getElementById("share-btn");

function onShare()
{
	console.log("onShare");
	navigator.share({title: "MeatOk", text: "Test"});
}

if (navigator.share) {
	share_btn.onclick = onShare;
} else {
	share_btn.hidden = true;
}
