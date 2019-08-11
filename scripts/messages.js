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
	};
} else {
	window.meatok.msgs = {
		fresh: 'fresh',
		frozen: 'frozen',
	};
}

})();
