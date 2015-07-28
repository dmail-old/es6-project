require('./main.js');

global.platform.ready(function(){
	System.import('./lib/module.js').then(console.log);
});