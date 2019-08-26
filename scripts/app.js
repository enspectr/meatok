'use strict';

(() => {

const bt_svc_id   = 0xFFE0;
const bt_char_id  = 0xFFE1;

const share_btn     = document.getElementById("share-btn");
const connect_btn   = document.getElementById("bluetooth-btn");
const new_btn       = document.getElementById("new-btn");
const bt_info       = document.getElementById("bluetooth-info");
const bt_indicator  = document.getElementById("connecting-indicator");
const msg_indicator = document.getElementById("msg-indicator");
const batt_info     = document.getElementById("battery-info");
const meter         = document.getElementById("meter-canvas");
const result_val    = document.getElementById("result-value");
const result_text   = document.getElementById("result-text");
const result_info   = document.getElementById("result-info");
const more_info     = document.getElementById("more-info");
const journal       = document.getElementById("journal");
const j_delimiter   = document.getElementById("journal-delimiter");
const j_hint        = document.getElementById("journal-hint");
const j_record      = document.getElementById("journal-record");
const j_image       = document.getElementById("journal-image");
const j_text        = document.getElementById("journal-text");
const j_add_btn     = document.getElementById("journal-add-btn");
const j_file_inp    = document.getElementById("journal-file-input");
const j_input_box   = document.getElementById("journal-info-input-box");
const j_input       = document.getElementById("journal-info-input");
const j_comment     = document.getElementById("journal-comment");

const def_msg_color = '#FAFAD2';

const meter_h       = .3;   // aspect ratio
const meter_width   = 1000; // virtula width
const meter_height  = meter_width * meter_h;
const meter_f       = .25;  // the frozen part of the scale
const meter_v       = .1    // the vertical margins
const meter_margin  = meter_v * meter_height;
const meter_hscale  = meter_height - 2 * meter_margin;
const meter_line    = 8;    // marker line in virtual units

const meter_rect_opacity = 0;
const meter_rect_color   = undefined;

const auto_finish = 120;  // auto finish timeout in seconds

const test_mode = new URLSearchParams(window.location.search).has('test');
const on_iOS = navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

const grade_colors = [
	"#00BFFF", // DeepSkyBlue
	"#FFA07A", // LightSalmon
	"#F0E68C", // Khaki
	"#ADFF2F", // GreenYellow
	"#90EE90", // LightGreen
];

const grade_thresholds = {
	1: 0,
	2: .15,
	3: .5,
	4: .75,
};

const max_frozen_grade = 3;

var bt_device_       = null;
var bt_device        = null;
var bt_char          = null;
var bt_connected     = false;

var res_count        = 0;
var res_min          = null;
var res_max          = null;
var res_sum          = 0;
var res_sum2         = 0;
var res_finished     = false;
var res_last_time    = null;
var res_last_tag     = null;

initPage();

function setBTInfo(msg)
{
	bt_info.innerHTML = msg;
}

function setBattInfo(msg)
{
	batt_info.innerHTML = msg;
}

function setResultValue(msg)
{
	result_val.innerHTML = msg;
}

function setResultText(msg, color)
{
	if (color === undefined)
		color = def_msg_color;
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

function getResultColor()
{
	return result_text.style.color;
}

function setResultInfo(msg)
{
	result_info.innerHTML = msg;
}

function setMoreInfo(msg)
{
	more_info.innerHTML = msg;
}

function getMoreInfo()
{
	return more_info.innerHTML;
}

function onHashChanged(e)
{
	console.log('onHashChanged:', e);
	if (e.oldURL.indexOf('#') !== -1 && e.newURL.indexOf('#') === -1) {
		setTimeout(() => {
			window.location = e.oldURL;
		}, 0);
	}
}

function blockBackwardNavigation()
{
	window.location = '#conn';
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
	if (res_count && !res_finished) {
		finishResults();
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
	if (!bt_connected) {
		bt_connected = true;
		initConnected();
	}
	bt_indicator.classList.remove('connecting');
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
		let msg = getResultValue();
		if (msg)
			msg += '\n';
		msg += getResultText();
		navigator.share({title: "MeatOk", text: msg});
	}
}

function showConnectingIndicator()
{
	bt_indicator.classList.add('connecting');
}

function connectingBT(device)
{
	console.log(device.name, 'connecting ...');
	setBTInfo(device.name);
	showConnectingIndicator();
	bt_device_ = device;
}

function connectTo(device)
{
	disconnectBT();
	connectingBT(device);

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

function connectInteractive(devname)
{
	let filters = [{services: [bt_svc_id]}];
	if (devname) {
		filters.push({name: devname});
	}
	navigator.bluetooth.requestDevice({
		filters: filters,
	}).
	then((device) => {
		console.log(device.name, 'selected');
		if (device !== bt_device) {
			if (!bt_connected) {
				setResultText(meatok.msgs.connecting);
			}
			connectTo(device);
		}
	})
	.catch((err) => {console.log('No bluetooth device selected');});
}

function onConnect(event)
{
	console.log("onConnect");
	event.stopPropagation();
	connectInteractive();
}

function onDisconnection(event)
{
	const device = event.target;
	console.log(device.name + ' bluetooth device disconnected');
	if (device === bt_device) {
		if (!on_iOS) {
			connectTo(device);
		} else {
			showDisconnectedStatus();
			showConnectingIndicator();
			connectInteractive(device.name);
		}
	}
}

function onValueChanged(event) {
	let msg = '';
	let value = event.target.value;
	for (let i = 0; i < value.byteLength; i++) {
		const c = value.getUint8(i);
		if (c == 0)
			break;
		msg += String.fromCharCode(c);
	}
    processMessage(msg);
}

function initMeter()
{
	let rect = meter.getBoundingClientRect();
	let avail_width  = document.documentElement.clientWidth  - 2 * rect.left;
	meter.style.width  = avail_width;
	meter.style.height = (meter_h * avail_width).toString() + "px";
	meter.width = meter_width;
	meter.height = meter_height;
}

function showMeterScale()
{
	let ctx = meter.getContext('2d');
	let grd = ctx.createLinearGradient(0, 0, meter_width, 0);
	grd.addColorStop(0,       'rgb(48, 48, 255)');
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
	let r = meter_f + x * (1 - meter_f);
	r = Math.max(r, 0);
	r = Math.min(r, 1);
	return meter_line / 2 + r * (meter_width - meter_line);
}

function showMeterResultRect(left, right, color)
{
	let l = rescaleToMeter(left);
	let r = rescaleToMeter(right);
	let w = r - l;
	let h = meter_height - 2 * meter_line;
	let ctx = meter.getContext('2d');
	if (w) {
		if (meter_rect_opacity) {
			ctx.globalAlpha = meter_rect_opacity;
			ctx.fillStyle   = color;
			ctx.fillRect(l, meter_line, w, h);
		}
		ctx.lineWidth = meter_line;
	} else {
		ctx.lineWidth = 2 * meter_line;
	}
	ctx.globalAlpha = 1;
	ctx.strokeStyle = meter_rect_color ? meter_rect_color : color;
	ctx.strokeRect(l, meter_line, w, h);
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

function unconnectedHint()
{
	setResultText(meatok.msgs.use_bt_icon);
}

function pulseMsgIndicator()
{
	msg_indicator.classList.remove('active');
	setTimeout(() => {
		msg_indicator.classList.add('active');
	}, 500);
}

function initPage()
{
	if (!navigator.bluetooth && !test_mode) {
		document.body.innerHTML = '<div class="alert-page">The Bluetooth is not supported in this browser. Please try another one.</div>';
		return;
	}

	initMeter();
	initMeterLabels();
	showMeterScale();
	setResultText(meatok.msgs.connect_to_start);
	journalInit();

	if (window.location.href.indexOf('#') !== -1)
		window.location = '';

	window.addEventListener("hashchange", onHashChanged);

	connect_btn.onclick = onConnect;
	document.body.onclick = unconnectedHint;

	if (!navigator.share && !test_mode) {
		share_btn.hidden = true;
	}

	setInterval(timer, 5000);
}

function initConnected()
{
	new_btn.onclick   = onNew;
	share_btn.onclick = onShare;
	document.body.onclick = undefined;

	setResultText(meatok.msgs.connected);
	blockBackwardNavigation();
}

function updateMoreInfo()
{
	if (!res_last_time) {
		setMoreInfo('');
	} else {
		let str = meatok.msgs.measured + ' ' + res_last_time.toLocaleTimeString();
		setMoreInfo(str);
	}
}

function updateResultInfo()
{
	if (!res_count) {
		setResultInfo('');
		return;
	}
	let str = meatok.msgs.samples + ': ' + String(res_count);
	str += ', ' + (res_finished ? meatok.msgs.finished : meatok.msgs.add_more);
	setResultInfo(str);
}

function finishResults()
{
	res_finished = true;
	updateResultInfo();
}

function onNew()
{
	clearResults();
	showMeterScale();
	setResultValue('');
	setResultText(meatok.msgs.use_dev_btn);
	setResultInfo('');
	setMoreInfo('');
	journalDisable();
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
	res_finished = false;
	res_last_time = null;
}

function processResultValue(val)
{
	if (res_finished) {
		clearResults();
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
	for (let i = grade_colors.length - 1; i > 0; i--) {
		if (val > grade_thresholds[i])
			return i;
	}
	return 0;
}

function showResult()
{
	let l, r, msg, color;
	if (res_min <= grade_thresholds[1]) {
		// frozen meat is treated separately
		let max_grade = valToGrade(res_max);
		max_grade = Math.min(max_grade, max_frozen_grade);
		l = res_min;
		r = res_max;
		msg = meatok.msgs.grades[max_grade];
		if (max_grade > 0) {
			msg += ', ' + meatok.msgs.frozen;
		}
		color = grade_colors[0];
	} else {
		let aver  = res_sum / res_count;
		let aver2 = res_sum2 / res_count;
		let disp  = aver2 - aver * aver;
		let sigma = disp > 0 ? Math.sqrt(disp) : 0;
		let grade = valToGrade(aver);
		l = Math.max(aver - sigma, res_min);
		r = Math.min(aver + sigma, res_max);
		msg = meatok.msgs.grades[grade];
		color = grade_colors[grade];
	}
	setResultText(msg, color);
	showMeterResult(l, r, color);
	if (r > 0) {
		r = Math.round(r * 100);
		l = Math.round(l * 100);
		r = Math.min(r, 100);
		l = Math.min(l, 100);
		l = Math.max(l, 0);
		if (l != r)
			setResultValue(String(l) + ' .. ' + String(r) + '%');
		else
			setResultValue(String(r) + '%');
	} else {
		setResultValue('');
	}
}

function processResult(msg)
{
	console.log('processResult: ' + msg);
	let s = msg.split(' ');
	if (s.length < 2) {
		console.log('result string is invalid');
		return;
	}
	if (s[0] == res_last_tag) {
		console.log('duplicate, ignored');
		return;
	}
	let val = parseInt(s[1]);
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
	journalEnable();
	pulseMsgIndicator();
	if (test_mode)
		setBTInfo(s[1]);

	// Process optional tail
	for (let i = 2; i < s.length; i++) {
		processMessage(s[i]);
	}
}

function processBatteryReport(msg)
{
	let val = parseInt(msg.slice(1));
	if (isNaN(val) || val < 0 || val > 100) {
		console.log('battery level is invalid');
		return;
	}
	setBattInfo(String(val) + '%');
}

function processMessage(msg)
{
	if (!msg) {
		console.log('empty message ignored');
		return;
	}
	switch (msg[0]) {
	case '#':
		processResult(msg.slice(1));
		break;
	case 'b':
		processBatteryReport(msg);
		break;
	default:
		console.log('unhandled message:', msg);
	}
}

function getImageFile(fileList)
{
	let file = null;
	for (let i = 0; i < fileList.length; i++) {
		if (fileList[i].type.match(/^image\//))
			return fileList[i];
	}
	return null;
}

function editComment(rec)
{
	let inp     = rec.getElementsByClassName('journal-info-input')[0];
	let inp_box = rec.getElementsByClassName('journal-info-input-box')[0];
	let comment = rec.getElementsByClassName('journal-comment')[0];
	inp.value = comment.innerHTML;
	inp_box.hidden = false;
	inp.focus();
}

function editCommentDone(rec)
{
	let inp     = rec.getElementsByClassName('journal-info-input')[0];
	let inp_box = rec.getElementsByClassName('journal-info-input-box')[0];
	let comment = rec.getElementsByClassName('journal-comment')[0];
	comment.innerHTML = inp.value;
	comment.hidden = !inp.value;
	inp_box.hidden = true;
}

function onRecordShare(rec, text, img)
{
	let comment = rec.getElementsByClassName('journal-comment')[0];
	if (comment.innerHTML) {
		text += '\n' + comment.innerHTML;
	}
	navigator.share({title: "MeatOk", text: text, files: [img]});
}

function journalAddImage(fileList)
{
	let img = getImageFile(fileList);
	if (img === null)
		return;
	let rec_text = getResultText();
	let rec_val = getResultValue();
	if (rec_val)
		rec_text = '[' + rec_val + '] ' + rec_text;
	let more_info = getMoreInfo();
	if (more_info)
		rec_text += ', ' + more_info;
	j_image.src = URL.createObjectURL(img);
	j_text.innerHTML = rec_text;
	j_text.style.color = j_comment.style.color = getResultColor();

	let rec = j_record.cloneNode(true);
	let share_btn   = rec.getElementsByClassName('journal-share-btn')[0];
	let del_btn     = rec.getElementsByClassName('journal-delete-btn')[0];
	let comment_btn = rec.getElementsByClassName('journal-comment-btn')[0];
	let comment_inp = rec.getElementsByClassName('journal-info-input')[0];
	if (navigator.share || test_mode) {
		share_btn.onclick = function () {
			onRecordShare(rec, rec_text, img);
		};
	} else {
		share_btn.hidden = true;
	}
	del_btn.onclick = function () {
		rec.remove();
	};
	comment_btn.onclick = function () {
		editComment(rec);
	};
	comment_inp.addEventListener('focusout', () => {
		editCommentDone(rec);
	});
	rec.classList.remove('journal-record-template');
	journal.insertBefore(rec, journal.firstChild);
}

function journalInit()
{
	if (!test_mode && on_iOS) {
		j_delimiter.hidden = true;
		return;
	}

	j_record.removeAttribute("id");
	j_text.removeAttribute("id");
	j_image.removeAttribute("id");
	j_input_box.removeAttribute("id");
	j_input.removeAttribute("id");
	j_comment.removeAttribute("id");
	j_input.placeholder = meatok.msgs.enter_comment;
	j_input_box.hidden = true;
	j_comment.hidden = true;
	j_file_inp.addEventListener('change', (e) => journalAddImage(e.target.files));
	j_hint.innerHTML = meatok.msgs.jhint;

	if (test_mode)
		journalEnable();
}

function journalDisable()
{
	j_file_inp.disabled = true;
}

function journalEnable()
{
	j_file_inp.disabled = false;
	j_hint.hidden = true;
}

})();
