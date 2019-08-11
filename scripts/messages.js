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
		samples: 'измерений',
		add_more: 'добавьте еще, чтобы повысить точность',
		finished: 'завершено',
		last_updated: 'обновлено',
	};
} else {
	window.meatok.msgs = {
		fresh: 'fresh',
		frozen: 'frozen',
		connect_to_start: 'please connect to device before you start',
		connecting: 'connecting, please wait ...',
		connected: 'connected, you can start measuring',
		samples: 'samples',
		add_more: 'please add more to improve accuracy',
		finished: 'finished',
		last_updated: 'last updated',
	};
}

})();
