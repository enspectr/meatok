'use strict';

(() => {

if (!window.meatok)
	window.meatok = {};

function getUserLang()
{
	var languageString = navigator.language || navigator.userLanguage || '';
	return languageString.split(/[_-]/)[0].toLowerCase();
}

if (getUserLang() == 'ru') {
	window.meatok.msgs = {
		fresh: 'свежее',
		frozen: 'перемороженное',
		connect_to_start: 'подключитесь к прибору прежде, чем начать',
		connecting: 'подключение к прибору, пожалуйста подождите ...',
		connected: 'прибор подключен, можно начинать',
	};
} else {
	window.meatok.msgs = {
		fresh: 'fresh',
		frozen: 'frozen',
		connect_to_start: 'please connect to device before you start',
		connecting: 'connecting, please wait ...',
		connected: 'connected, you can start measuring',
	};
}

})();
