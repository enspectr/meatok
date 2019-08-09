'use strict';

const share_btn   = document.getElementById("share-btn");
const connect_btn = document.getElementById("bluetooth-btn");
const last_result = document.getElementById("last-result");

const bt_svc_id  = 0xFFE0;
const bt_char_id = 0xFFE1;

if (navigator.share) {
	share_btn.onclick = onShare;
} else {
	share_btn.hidden = true;
}

connect_btn.onclick = onConnect;

setResultText("no data");

function setResultText(str)
{
	last_result.innerHTML = str;
}

function getResultText(str)
{
	return last_result.innerHTML;
}

function onShare()
{
	console.log("onShare");
	navigator.share({title: "MeatOk", text: getResultText()});
}

function connectTo(device)
{
	console.log('Connecting to ' + device.name);
	device.gatt.connect().
	then((server) => {
		console.log('GATT server connected, getting service...');
		return server.getPrimaryService(bt_svc_id);
	}).
	then((service) => {
		console.log('Service found, getting characteristic...');
		return service.getCharacteristic(bt_char_id);
	}).
	then((characteristic) => {
		console.log('Characteristic found');
		characteristic.startNotifications().then(
			() => {
				characteristic.addEventListener('characteristicvaluechanged', onValueChanged);
				device.addEventListener('gattserverdisconnected', onDisconnection);
				setResultText('connected');
	        },
	        (err) => {
	        	console.log('Failed to subscribe to ' + device.name, err);
	        }
        );
	})
	.catch((err) => {console.log('Failed to connect to ' + device.name, err);});
}

function onConnect()
{
	console.log("onConnect");
	navigator.bluetooth.requestDevice({
		filters: [{services: [bt_svc_id]}],
	}).
	then((device) => {
		connectTo(device);
	})
	.catch((err) => {console.log('No bluetooth device selected:', err);});
}

function onDisconnection(event)
{
	const device = event.target;
	console.log(device.name + ' bluetooth device disconnected');
}

function onValueChanged(event) {
    const value = new TextDecoder().decode(event.target.value);
    console.log("New value: " + value);
    setResultText(value);
}
