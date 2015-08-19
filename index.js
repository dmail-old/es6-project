require('system-platform');

function start(){
	var http, ressource;

	Promise.all([
		'./node_modules/http/index.js',
		'./node_modules/ressource/index.js',
	].map(function(name){
		return System.import(name);
	})).then(function(modules){
		http = modules[0];
		ressource = modules[1];

		return ressource.get('./config.json').then(function(response){
			return response.json();
		});
	}).then(function(config){
		platform.info('use config', config);
		platform.config  = config;

		platform.observeFileSystem = function(){
			var url = config['server-url'] + '/filesystem-events.js';
			var source = http.createEventSource(url);

			source.on('change', function(e){
				var file = e.data, module;

				console.log(file, 'has changed');


				//file = jsenv.loader.normalize(file);
				// le fichier modifié est bien un module que l'on utilise
				//module = jsenv.findModuleByURL(file);

				//console.log('trying to find', file);

				if( module ){
					jsenv.onmodulechange(module);
				}
			});
			source.on('error', function(e){
				console.log('event source connection error', e);
			});
		};
	});
}

global.platform.ready(function(){
	start();
});