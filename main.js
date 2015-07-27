(function(){

	var platform = {
		main: 'module.js'
	};

	if( typeof window !== 'undefined' ){
		platform.restart = function(){
			window.reload();
		};

		platform.include = function(url, done){
			var script = document.createElement('script');

			script.src = url;
			script.type = 'text/javascript';
			script.onload = function(){
				done();
			};
			script.onerror = function(error){
				done(error);
			};

			document.head.appendChild(script);
		};

		platform.type = 'browser';
		platform.global = window;
		platform.name = '';
		platform.os = navigator.platform.toLowerCase();

		platform.systemLocation = './node_modules/systemjs/dist/system.js';
	}
	else{
		platform.include = function(url, done){
			var error;

			try{
				require(url);
			}
			catch(e){
				error = e;
			}

			done(error);
		};

		platform.restart = function(){
			process.kill(2);
		};

		platform.type = 'process';
		platform.global = global;
		platform.name = 'node';
		// https://nodejs.org/api/process.html#process_process_platform
		// 'darwin', 'freebsd', 'linux', 'sunos', 'win32'
		platform.os = process.platform === 'win32' ? 'windows' : process.platform;

		platform.systemLocation = './system.js';
	}

	var dependencies = [];

	dependencies.push({
		name: 'setImmediate',
		url: './node_modules/@dmail/set-immediate/index.js',
		condition: function(){
			return false === 'setImmediate' in platform.global;
		}
	});

	dependencies.push({
		name: 'Promise',
		url: './node_modules/@dmail/promise-es6/index.js',
		condition: function(){
			return false === 'Promise' in platform.global;
		}
	});

	dependencies.push({
		name: 'System',
		url: platform.systemLocation,
		condition: function(){
			return false === 'System' in platform.global;
		},
		instantiate: function(){
			System.transpiler = 'babel';
			System.paths.babel = './node_modules/babel-core/browser.js';
			System.babelOptions = {

			};
		}
	});

	function includeDependencies(dependencies, callback){
		var i = 0, j = dependencies.length, dependency;

		function includeNext(error){
			if( error ){
				console.log('include error', error);
				callback(error);
			}
			else if( i === j ){
				console.log('all dependencies included');
				callback();
			}
			else{
				dependency = dependencies[i];
				i++;

				if( !dependency.condition || dependency.condition() ){
					console.log('loading', dependency.name);
					platform.include(dependency.url, function(error){
						if( error ){
							includeNext(error);
						}
						else{
							if( dependency.instantiate ){
								dependency.instantiate();
							}
							includeNext();
						}
					});
				}
				else{
					console.log('skipping', dependency.name);
					includeNext();
				}
			}
		}

		includeNext();
	}

	includeDependencies(dependencies, function(error){
		if( error ) throw error;

		System.paths.proto = 'lib/proto/index.js';
		System.platform = platform;

		var importMethod = System.import;
		System.import = function(normalizedName){
			return importMethod.apply(this, arguments).catch(function(error){
				setTimeout(function(){
					throw error;
				}, 0);
				console.log('import error', 'System.get()', System.failed[0]);
				return Promise.reject(error);
			});
		};

		System.import(platform.main).then(console.log);
	});

})();