'use strict';

(() => {

const share_btn   = document.getElementById("share-btn");
const connect_btn = document.getElementById("bluetooth-btn");
const finish_btn  = document.getElementById("finish-btn");
const bt_info     = document.getElementById("bluetooth-info");
const meter       = document.getElementById("meter-canvas");

const meter_h       = .3;   // aspect ratio
const meter_width   = 1000; // virtula width
const meter_height  = meter_width * meter_h;
const meter_f       = .25;  // the frozen part of the scale
const meter_v       = .1    // the vertical margins
const meter_margin  = meter_v * meter_height;
const meter_hscale  = meter_height - 2 * meter_margin;
const meter_line    = 8;    // marker line in virtual units

const bt_svc_id     = 0xFFE0;
const bt_char_id    = 0xFFE1;

var bt_device_ = null;
var bt_device  = null;
var bt_char    = null;

if (!navigator.bluetooth) {
	document.body.innerHTML = '<div class="alert-page">The Bluetooth is not supported in this browser. Please try another one.</div>';
}

if (navigator.share) {
	share_btn.onclick = onShare;
} else {
	share_btn.hidden = true;
}

connect_btn.onclick = onConnect;
finish_btn.onclick  = onFinish;

initPage();

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
	console.log(device.name, 'connecting ...');

	disconnectBT();
	setBTInfo(device.name);
	bt_device_ = device;

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
		console.log(device.name, 'selected');
		if (device !== bt_device)
			connectTo(device);
	})
	.catch((err) => {console.log('No bluetooth device selected');});
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

function initMeter()
{
	var rect = meter.getBoundingClientRect();
	var avail_width  = document.documentElement.clientWidth  - 2 * rect.left;
	meter.style.width  = avail_width;
	meter.style.height = (meter_h * avail_width).toString() + "px";
	meter.width = meter_width;
	meter.height = meter_height;
}

function showMeterScale()
{
	var ctx = meter.getContext('2d');
	var grd = ctx.createLinearGradient(0, 0, meter_width, 0);
	grd.addColorStop(0,       'rgb(32, 32, 255)');
	grd.addColorStop(meter_f, 'rgb(255, 160, 0)');
	grd.addColorStop(1,       'rgb(32, 255, 32)');
	ctx.fillStyle = grd;
	ctx.fillRect(0, meter_margin, meter_width, meter_hscale);

	ctx.fillStyle = getComputedStyle(document.body)['background-color'];
	ctx.fillRect(0, 0, meter_width, meter_margin);
	ctx.fillRect(0, meter_margin + meter_hscale, meter_width, meter_margin);
}

function rescaleToMeter(x)
{
	var r = meter_f + x * (1 - meter_f);
	r = Math.max(r, 0);
	r = Math.min(r, 1);
	return meter_line / 2 + r * (meter_width - meter_line);
}

function showMeterResultRect(left, right, color)
{
	var l = rescaleToMeter(left);
	var r = rescaleToMeter(right);
	var ctx = meter.getContext('2d');
	ctx.strokeStyle = color;
	ctx.lineWidth = meter_line;
	ctx.strokeRect(l, meter_line, (r - l), meter_height - 2 * meter_line);
}

function showMeterResult(left, right, color)
{
	showMeterScale();
	showMeterResultRect(left, right, color);
}

function initMeterLabels()
{
	document.getElementById('label-fresh').innerHTML  = meatok.msgs.fresh;
	document.getElementById('label-frozen').innerHTML = meatok.msgs.frozen;
}

function initPage()
{
	initMeter();
	initMeterLabels();
	showMeterScale();
	showMeterResultRect(-5, 10, 'white'); // Test
}

function onFinish()
{
	showMeterResult(-.05, .05, 'white'); // Test
}

})();
