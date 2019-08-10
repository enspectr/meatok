'use strict';

const share_btn   = document.getElementById("share-btn");
const connect_btn = document.getElementById("bluetooth-btn");
const bt_info     = document.getElementById("bluetooth-info");

const bt_svc_id  = 0xFFE0;
const bt_char_id = 0xFFE1;

var bt_device_ = null;
var bt_device  = null;
var bt_char    = null;

if (navigator.share) {
	share_btn.onclick = onShare;
} else {
	share_btn.hidden = true;
}

connect_btn.onclick = onConnect;

function setBTInfo(msg)
{
	bt_info.innerHTML = msg;
}

function disconnectBT()
{
	if (bt_char) {
		bt_char.removeEventListener('characteristicvaluechanged', onValueChanged);
		bt_char = null;
	}
	if (bt_device) {
		console.log("Disconnecting from ", bt_device.name);
		bt_device.removeEventListener('gattserverdisconnected', onDisconnection);
		bt_device.gatt.disconnect();
		bt_device = null;
	}
	showDisconnectedStatus();
}

function onBTConnected(device, characteristic)
{
	characteristic.addEventListener('characteristicvaluechanged', onValueChanged);
	device.addEventListener('gattserverdisconnected', onDisconnection);
	bt_char = characteristic;
	bt_device = device;
	bt_device_ = null;
	setBTInfo(device.name);
	showConnectedStatus();
}

function showDisconnectedStatus()
{
	connect_btn.src = "images/icons/icon-bluetooth.png";
}

function showConnectedStatus()
{
	connect_btn.src = "images/icons/icon-bluetooth-connected.png";
}

function onShare()
{
	console.log("onShare");
	navigator.share({title: "MeatOk", text: "TBD"});
}

function connectTo(device)
{
	console.log('Connecting to ' + device.name);

	disconnectBT();
	setBTInfo(device.name);

	device.gatt.connect().
	then((server) => {
		console.log(device.name, 'GATT server connected, getting service...');
		return server.getPrimaryService(bt_svc_id);
	}).
	then((service) => {
		console.log(device.name, 'service found, getting characteristic...');
		return service.getCharacteristic(bt_char_id);
	}).
	then((characteristic) => {
		console.log(device.name, 'characteristic found');
		characteristic.startNotifications().then(
			() => {
				if (device === bt_device_) {
					onBTConnected(device, characteristic);
				} else if (device !== bt_device) {
					console.log(device.name, 'dropping obsolete connection');
					device.gatt.disconnect();
				}
	        },
	        (err) => {
	        	console.log('Failed to subscribe to ' + device.name + ':', err.message);
	        	// Fatal error. Typically it means BT is not supported
	        	if (device === bt_device_) {
	        		bt_device_ = null;
	        		setBTInfo('');
	        	}
	        }
        );
	})
	.catch((err) => {
		console.log('Failed to connect to ' + device.name + ':', err.message);
		setTimeout(() => { if (device === bt_device_) connectTo(device); }, 500);
	});
}

function onConnect()
{
	console.log("onConnect");
	navigator.bluetooth.requestDevice({
		filters: [{services: [bt_svc_id]}],
	}).
	then((device) => {
		bt_device_ = device;
		connectTo(device);
	})
	.catch((err) => {console.log('No bluetooth device selected:', err);});
}

function onDisconnection(event)
{
	const device = event.target;
	console.log(device.name + ' bluetooth device disconnected');
	if (device === bt_device) {
		connectTo(device);
	}
}

function onValueChanged(event) {
	var msg = '';
	var value = event.target.value;
	for (var i = 0; i < value.byteLength; i++) {
		const c = value.getUint8(i);
		if (c == 0)
			break;
		msg += String.fromCharCode(c);
	}
    console.log("New value: " + msg);
    setBTInfo(msg); // Debug
}
