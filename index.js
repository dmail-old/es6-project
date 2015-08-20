/* global System, platform */

require('system-http');

global.platform.ready(function(){
	System.import('./node_modules/ressource/index.js').then(function(ressource){
		return ressource.get('./config.json').then(function(response){
			return response.json();
		});
	}).then(function(config){
		platform.info('use config', config);
		platform.config  = config;

		platform.observeFileSystem = function(){
			System.import('./node_modules/http/lib/event-source.js').then(function(EventSource){
				var url = config['server-url'] + '/filesystem-events.js';
				var source = EventSource.create(url);

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
			});
		};
	});
});