require('./main.js');

global.platform.ready(function(){
	platform.observeFileSystem();

	System.import('./app/server/server.js');
});