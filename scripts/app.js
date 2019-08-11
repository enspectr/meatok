'use strict';

(() => {

const bt_svc_id   = 0xFFE0;
const bt_char_id  = 0xFFE1;

const share_btn   = document.getElementById("share-btn");
const connect_btn = document.getElementById("bluetooth-btn");
const finish_btn  = document.getElementById("finish-btn");
const bt_info     = document.getElementById("bluetooth-info");
const meter       = document.getElementById("meter-canvas");
const result_val  = document.getElementById("result-value");
const result_text = document.getElementById("result-text");
const result_info = document.getElementById("result-info");
const more_info   = document.getElementById("more-info");

const meter_h       = .3;   // aspect ratio
const meter_width   = 1000; // virtula width
const meter_height  = meter_width * meter_h;
const meter_f       = .25;  // the frozen part of the scale
const meter_v       = .1    // the vertical margins
const meter_margin  = meter_v * meter_height;
const meter_hscale  = meter_height - 2 * meter_margin;
const meter_line    = 8;    // marker line in virtual units

const conn_msg_color = '#FAFAD2';
const auto_finish    = 120;  // auto finish timeout in seconds

const grade_colors = [
	"#00BFFF", // DeepSkyBlue
	"#FFA07A", // LightSalmon
	"#F0E68C", // Khaki
	"#ADFF2F", // GreenYellow
	"#90EE90", // LightGreen
];

const grade_thresholds = {
	1: 0,
	2: .3,
	3: .6,
	4: .9,
};

const max_frozen_grade = 3;

var bt_device_       = null;
var bt_device        = null;
var bt_char          = null;
var bt_first_connect = false;

var res_count        = 0;
var res_min          = null;
var res_max          = null;
var res_sum          = 0;
var res_sum2         = 0;
var res_finished     = false;
var res_last_time    = null;
var res_last_tag     = null;

// Initialization routine
(() => {
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

	setInterval(timer, 5000);

	initPage();
})();

function setBTInfo(msg)
{
	bt_info.innerHTML = msg;
}

function setResultValue(msg, color)
{
	result_val.innerHTML = msg;
	result_val.style.color = color;
}

function setResultText(msg, color)
{
	result_text.innerHTML = msg;
	result_text.style.color = color;
}

function getResultValue()
{
	return result_val.innerHTML;
}

function getResultText()
{
	return result_text.innerHTML;
}

function setResultInfo(msg)
{
	result_info.innerHTML = msg;
}

function setMoreInfo(msg)
{
	more_info.innerHTML = msg;
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
	if (bt_first_connect) {
		bt_first_connect = false;
		setResultText(meatok.msgs.connected, conn_msg_color);
	}
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
	if (res_count) {
		var msg = getResultValue();
		if (msg)
			msg += '\n';
		msg += getResultText();
		navigator.share({title: "MeatOk", text: msg});
	}
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
		return characteristic.startNotifications().then(
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
	        	return Promise.reject(err);
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
		if (device !== bt_device) {
			if (!bt_device) {
				bt_first_connect = true;
				setResultText(meatok.msgs.connecting, conn_msg_color);
			}
			connectTo(device);
		}
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
    processMessage(msg);
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
	setResultText(meatok.msgs.connect_to_start, conn_msg_color);
}

function updateMoreInfo()
{
	if (!res_last_time) {
		setMoreInfo('');
	} else {
		var str = meatok.msgs.last_updated + ' ' + res_last_time.toLocaleTimeString();
		setMoreInfo(str);
	}
}

function updateResultInfo()
{
	if (!res_count) {
		setResultInfo('');
		return;
	}
	var str = meatok.msgs.samples + ': ' + String(res_count);
	str += ', ' + (res_finished ? meatok.msgs.finished : meatok.msgs.add_more);
	setResultInfo(str);
}

function finishResults()
{
	res_finished = true;
	updateResultInfo();
}

function onFinish()
{
	if (res_count && !res_finished) {
		finishResults();
	}
}

function timer()
{
	if (res_last_time && !res_finished && new Date() - res_last_time > 1000 * auto_finish) {
		finishResults();
	}
}

function clearResults()
{
	res_count = 0;
	res_min   = null;
	res_max   = null;
	res_sum   = 0;
	res_sum2  = 0; 
}

function processResultValue(val)
{
	if (res_finished) {
		clearResults();
		res_finished = false;
	}
	val /= 100;
	res_count++;
	if (res_min === null || val < res_min)
		res_min = val;
	if (res_max === null || val > res_max)
		res_max = val;
	res_sum  += val;
	res_sum2 += val * val;
}

function valToGrade(val)
{
	for (var i = grade_colors.length - 1; i > 0; i--) {
		if (val > grade_thresholds[i])
			return i;
	}
	return 0;
}

function showResult()
{
	var l, r, msg, color;
	if (res_min <= grade_thresholds[1]) {
		// frozen meat is treated separately
		var max_grade = valToGrade(res_max);
		max_grade = Math.min(max_grade, max_frozen_grade);
		l = res_min;
		r = res_max;
		msg = meatok.msgs.grades[max_grade];
		if (max_grade > 0) {
			msg += ', ' + meatok.msgs.frozen;
		}
		color = grade_colors[0];
	} else {
		var aver  = res_sum / res_count;
		var aver2 = res_sum2 / res_count;
		var disp  = aver2 - aver * aver;
		var sigma = disp > 0 ? Math.sqrt(disp) : 0;
		var grade = valToGrade(aver);
		l = aver - sigma;
		r = aver + sigma;
		msg = meatok.msgs.grades[grade];
		color = grade_colors[grade];
	}
	setResultText(msg, color);
	showMeterResult(l, r, color);
	if (r > 0) {
		r = Math.ceil(r * 100);
		l = Math.floor(l * 100);
		r = Math.min(r, 100);
		l = Math.min(l, 100);
		l = Math.max(l, 0);
		if (l != r)
			setResultValue(String(l) + ' .. ' + String(r) + '%', color);
		else
			setResultValue(String(r) + '%', color);
	} else {
		setResultValue('');
	}
}

function processResult(msg)
{
	console.log('processResult: ' + msg);
	var s = msg.split(' ');
	if (s.length < 2) {
		console.log('result string is invalid');
		return;
	}
	if (s[0] == res_last_tag) {
		console.log('duplicate, ignored');
		return;
	}
	var val = parseInt(s[1]);
	if (isNaN(val)) {
		console.log('result value is invalid');
		return;
	}
	res_last_tag = s[0];
	res_last_time = new Date();
	processResultValue(val);
	showResult();
	updateResultInfo();
	updateMoreInfo();
	setBTInfo(s[1]);
}

function processMessage(msg)
{
	switch (msg[0]) {
	case '#':
		processResult(msg.slice(1));
		break;
	default:
		console.log('unhandled message:', msg);
	}
}

})();
