require('./main.js');

global.platform.ready(function(){
	System.import('./app/server/server.js').then(console.log);
});