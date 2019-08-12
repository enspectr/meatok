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
		measured: 'измерено',
		grades: {
			0: 'перемороженное мясо',
			1: 'мясо низкого качества',
			2: 'мясо среднего качества',
			3: 'мясо хорошего качества',
			4: 'свежее мясо',
		},
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
		measured: 'measured',
		grades: {
			0: 'frozen meat',
			1: 'low quality meat',
			2: 'medium quality meat',
			3: 'good quality meat',
			4: 'fresh meat',
		},
	};
}

})();
